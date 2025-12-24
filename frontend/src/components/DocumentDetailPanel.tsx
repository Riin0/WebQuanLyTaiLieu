import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  LuTriangleAlert,
  LuChevronDown,
  LuDownload,
  LuExternalLink,
  LuMessageSquare,
  LuStar,
  LuUser,
  LuX
} from 'react-icons/lu'
import type { DocumentItem } from '../types/document'
import type { DocumentDetail } from '../types/document-detail'
import type { CommentItem } from '../types/comment'
import type { RatingSummary } from '../types/rating'
import type { Subject } from '../types/subject'

const STAR_SCALE = [1, 2, 3, 4, 5]

type DocumentDetailPanelProps = {
  documentId: number | null
  token: string | null
  summary?: DocumentItem | null
  onClose: () => void
  onRequireAuth: () => void
  onDownload: (doc: DocumentItem) => void
  getFileIcon: (contentType: string) => string
  formatFileSize: (bytes: number) => string
  formatDate: (dateString: string) => string
  showDownloadButton?: boolean
  showComments?: boolean
  readonlyComments?: boolean
  onDeleteComment?: (commentId: number) => void
  subjects?: Subject[]
  onSubjectUpdated?: (documentId: number, subjectId: number | null, subjectName?: string) => void
  viewerIsAdmin?: boolean
}

type ReportFeedbackState = { type: 'success' | 'error'; message: string } | null

type AdminDocumentReport = {
  id: number
  reporterName: string
  reporterEmail: string
  reason: string
  createdAt: string
}

export default function DocumentDetailPanel({
  documentId,
  token,
  summary,
  onClose,
  onRequireAuth,
  onDownload,
  getFileIcon,
  formatFileSize,
  formatDate,
  showDownloadButton = true,
  showComments = true,
  readonlyComments = false,
  onDeleteComment,
  subjects,
  onSubjectUpdated,
  viewerIsAdmin = false
}: DocumentDetailPanelProps) {
  const [detail, setDetail] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [commentInput, setCommentInput] = useState('')
  const [commentRating, setCommentRating] = useState<number | null>(null)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [replyTargets, setReplyTargets] = useState<Partial<Record<number, boolean>>>({})
  const [replyDrafts, setReplyDrafts] = useState<Partial<Record<number, string>>>({})
  const [replySubmittingId, setReplySubmittingId] = useState<number | null>(null)
  const [reportingCommentId, setReportingCommentId] = useState<number | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<Partial<Record<number, boolean>>>({})
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [subjectSelection, setSubjectSelection] = useState('')
  const [subjectAssignError, setSubjectAssignError] = useState('')
  const [subjectAssigning, setSubjectAssigning] = useState(false)
  const [reportingDocument, setReportingDocument] = useState(false)
  const [reportFeedback, setReportFeedback] = useState<ReportFeedbackState>(null)
  const [adminReports, setAdminReports] = useState<AdminDocumentReport[]>([])
  const [adminReportsLoading, setAdminReportsLoading] = useState(false)
  const [adminReportsError, setAdminReportsError] = useState('')
  const [adminClearingReports, setAdminClearingReports] = useState(false)
  const previewObjectUrlRef = useRef<string | null>(null)

  const commentsReadOnly = Boolean(readonlyComments)
  const canAdminDeleteComments = Boolean(commentsReadOnly && typeof onDeleteComment === 'function')

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token])

  const releasePreviewUrl = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = null
    }
  }, [])

  const fetchDetail = useCallback(async () => {
    if (!documentId) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get<DocumentDetail>(`/api/documents/${documentId}/detail`, {
        headers: authHeaders
      })
      setDetail(data)
    } catch (err) {
      console.error('Cannot load document detail', err)
      setError('Không tải được chi tiết tài liệu. Thử lại sau.')
    } finally {
      setLoading(false)
    }
  }, [documentId, authHeaders])

  const fetchAdminReports = useCallback(async () => {
    if (!documentId || !viewerIsAdmin) return
    if (!token) return
    setAdminReportsLoading(true)
    setAdminReportsError('')
    try {
      const { data } = await axios.get<AdminDocumentReport[]>(`/api/documents/${documentId}/reports`, {
        headers: authHeaders
      })
      setAdminReports(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Cannot load document reports', err)
      let message = 'Không tải được danh sách báo cáo. Thử lại sau.'
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { error?: string } | undefined
        if (payload?.error) {
          message = payload.error
        }
      }
      setAdminReportsError(message)
      setAdminReports([])
    } finally {
      setAdminReportsLoading(false)
    }
  }, [documentId, viewerIsAdmin, token, authHeaders])

  useEffect(() => {
    setSubjectSelection('')
    setSubjectAssignError('')
    setSubjectAssigning(false)
    setReportFeedback(null)
    setReportingDocument(false)
  }, [documentId])

  const refreshComments = useCallback(async () => {
    if (!documentId) return
    try {
      const { data } = await axios.get<CommentItem[]>(`/api/documents/${documentId}/comments`, {
        headers: authHeaders
      })
      setDetail((prev) => (prev ? { ...prev, comments: data } : prev))
    } catch (err) {
      console.warn('Cannot refresh comments', err)
    }
  }, [documentId, authHeaders])

  const refreshRatingSummary = useCallback(async () => {
    if (!documentId) return
    try {
      const { data } = await axios.get<RatingSummary>(`/api/documents/${documentId}/rating`, {
        headers: authHeaders
      })
      setDetail((prev) => (prev ? { ...prev, rating: data } : prev))
    } catch (err) {
      console.warn('Cannot refresh rating summary', err)
    }
  }, [documentId, authHeaders])

  const handleReportComment = useCallback(async (commentId: number) => {
    if (!documentId) return
    if (!token) {
      onRequireAuth()
      return
    }
    const reasonInput = window.prompt('Hãy mô tả lý do báo cáo (tùy chọn):', '')
    if (reasonInput === null) {
      return
    }
    const trimmedReason = reasonInput.trim()
    setReportingCommentId(commentId)
    setError('')
    try {
      const payload = trimmedReason.length > 0 ? { reason: trimmedReason } : {}
      await axios.post(`/api/documents/${documentId}/comments/${commentId}/report`, payload, {
        headers: authHeaders
      })
      await refreshComments()
    } catch (err) {
      console.error('Cannot report comment', err)
      let message = 'Không thể báo cáo bình luận. Vui lòng thử lại.'
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { error?: string } | undefined
        if (payload?.error) {
          message = payload.error
        }
      }
      setError(message)
    } finally {
      setReportingCommentId(null)
    }
  }, [documentId, token, onRequireAuth, authHeaders, refreshComments])

  useEffect(() => {
    setReplyTargets({})
    setReplyDrafts({})
    setReplySubmittingId(null)
    setReportingCommentId(null)
    setExpandedReplies({})
    if (!documentId) {
      setDetail(null)
      setError('')
      setCommentInput('')
      setCommentRating(null)
      setPreviewUrl('')
      setPreviewError('')
      setPreviewLoading(false)
      return
    }
    fetchDetail()
    fetchAdminReports()
    setCommentInput('')
  }, [documentId, fetchDetail, fetchAdminReports])

  useEffect(() => {
    if (detail?.viewerIsUploader) {
      setCommentRating(null)
    }
  }, [detail?.viewerIsUploader])

  const displayedDoc: DocumentItem | DocumentDetail | null = detail || summary || null
  const documentContentType = displayedDoc?.contentType?.toLowerCase() || ''
  const documentName = (displayedDoc?.filename || displayedDoc?.title || '').toLowerCase()
  const pendingSubject = Boolean((displayedDoc as DocumentItem | null)?.pendingSubject)
  const subjectOptions = subjects ?? []
  const viewerIsUploader = detail?.viewerIsUploader ?? false
  const viewerReportedDocument = detail?.reportedByViewer ?? false
  const totalDocumentReports = detail?.reportCount ?? 0
  const reportButtonDisabled = !detail || viewerReportedDocument || reportingDocument || viewerIsUploader
  const reportButtonTitle = viewerIsUploader
    ? 'Tác giả không thể báo cáo tài liệu của mình'
    : viewerReportedDocument
      ? 'Bạn đã báo cáo tài liệu này'
      : 'Báo cáo tài liệu vi phạm'

  const isPowerPointDocument = useMemo(() => {
    if (!displayedDoc) return false
    if (documentContentType.includes('powerpoint') || documentContentType.includes('presentation')) {
      return true
    }
    return documentName.endsWith('.ppt') || documentName.endsWith('.pptx')
  }, [displayedDoc, documentContentType, documentName])

  const isIconOnlyDocument = useMemo(() => {
    if (!displayedDoc) return false
    const archiveMatch =
      documentContentType.includes('zip') ||
      documentContentType.includes('rar') ||
      documentContentType.includes('compressed') ||
      documentName.endsWith('.zip') ||
      documentName.endsWith('.rar') ||
      documentName.endsWith('.7z')
    const excelMatch =
      documentContentType.includes('excel') ||
      documentContentType.includes('spreadsheet') ||
      documentName.endsWith('.xls') ||
      documentName.endsWith('.xlsx')
    return archiveMatch || excelMatch
  }, [displayedDoc, documentContentType, documentName])

  const canFullPreviewDocument = useMemo(() => {
    if (!displayedDoc) return false
    const isPdf = documentContentType.includes('pdf') || documentName.endsWith('.pdf')
    const isWord =
      documentContentType.includes('word') ||
      documentContentType.includes('officedocument.wordprocessingml') ||
      documentName.endsWith('.doc') ||
      documentName.endsWith('.docx')
    const isPowerPoint =
      documentContentType.includes('powerpoint') ||
      documentContentType.includes('presentation') ||
      documentName.endsWith('.ppt') ||
      documentName.endsWith('.pptx')
    return !isIconOnlyDocument && (isPdf || isWord || isPowerPoint)
  }, [displayedDoc, documentContentType, documentName, isIconOnlyDocument])

  const previewHref = useMemo(() => {
    if (!documentId) return ''
    return `/preview.html#documentId=${encodeURIComponent(String(documentId))}`
  }, [documentId])

  useEffect(() => {
    releasePreviewUrl()
    setPreviewUrl('')
    setPreviewError('')
    setPreviewLoading(false)
    if (!documentId || isIconOnlyDocument) {
      return
    }
    let cancelled = false
    const fetchPreview = async () => {
      setPreviewLoading(true)
      setPreviewError('')
      try {
        const { data } = await axios.get<Blob>(`/api/documents/${documentId}/preview`, {
          responseType: 'blob',
          headers: authHeaders
        })
        const objectUrl = URL.createObjectURL(data)
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        previewObjectUrlRef.current = objectUrl
        setPreviewUrl(objectUrl)
      } catch (err) {
        if (!cancelled) {
          setPreviewError('Không hiển thị được trang bìa.')
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false)
        }
      }
    }
    fetchPreview()
    return () => {
      cancelled = true
      releasePreviewUrl()
    }
  }, [documentId, authHeaders, releasePreviewUrl, isIconOnlyDocument])

  const ratingSummary: RatingSummary | undefined = detail?.rating
  const averageScore = ratingSummary?.average ?? null
  const totalRatings = ratingSummary?.total ?? 0
  const userScore = ratingSummary?.userScore ?? null
  const comments: CommentItem[] = detail?.comments ?? []

  const totalCommentCount = useMemo(() => {
    const countReplies = (items: CommentItem[]): number =>
      items.reduce((sum, item) => sum + 1 + countReplies(item.replies ?? []), 0)
    return countReplies(comments)
  }, [comments])

  const canReassignSubject = pendingSubject && (viewerIsUploader || viewerIsAdmin)
  const trimmedCommentInput = commentInput.trim()
  const userHasExistingRating = Boolean(ratingSummary?.userScore)
  const commentRequiresRating = Boolean(
    !viewerIsUploader && trimmedCommentInput && !userHasExistingRating && commentRating === null
  )
  const selectedCommentRating = viewerIsUploader ? null : (commentRating ?? userScore ?? null)

  const coverFrameClassName = [
    'detail-cover-frame',
    previewUrl ? 'has-image' : 'no-preview',
    previewLoading ? 'loading' : '',
    previewUrl && isPowerPointDocument ? 'landscape' : ''
  ]
    .filter(Boolean)
  .join(' ')

  const metaItems = [
    {
      key: 'uploader',
      label: 'Người đăng',
      value: displayedDoc?.uploaderName || displayedDoc?.uploaderEmail || 'Không rõ'
    },
    {
      key: 'size',
      label: 'Kích thước',
      value: displayedDoc ? formatFileSize(displayedDoc.size) : '—'
    },
    {
      key: 'downloads',
      label: 'Lượt tải',
      value: (displayedDoc?.downloadCount ?? 0).toLocaleString('vi-VN')
    },
    {
      key: 'uploadedAt',
      label: 'Ngày đăng',
      value: displayedDoc ? formatDate(displayedDoc.uploadDate) : '—'
    }
  ]

  const classificationItems = [
    {
      key: 'type',
      label: 'Loại tài liệu',
      value: displayedDoc?.loaiTaiLieu || 'Chưa phân loại'
    },
    {
      key: 'subject',
      label: 'Môn học',
      value: displayedDoc?.monHocTen || 'Chưa rõ'
    }
  ]

  if (pendingSubject) {
    classificationItems.push({
      key: 'status',
      label: 'Trạng thái',
      value: 'Đang xét chọn môn'
    })
  }

  if (viewerIsAdmin && totalDocumentReports > 0) {
    classificationItems.push({
      key: 'reports',
      label: 'Báo cáo',
      value: `${totalDocumentReports} lần`
    })
  }

  const handleReportDocument = useCallback(async () => {
    if (!documentId || !detail) return
    if (detail.viewerIsUploader) {
      setReportFeedback({ type: 'error', message: 'Bạn không thể báo cáo tài liệu do chính mình đăng tải.' })
      return
    }
    if (!token) {
      onRequireAuth()
      return
    }
    if (detail.reportedByViewer) {
      setReportFeedback({ type: 'success', message: 'Bạn đã báo cáo tài liệu này trước đó.' })
      return
    }
    const reasonInput = window.prompt('Hãy mô tả lý do báo cáo (tùy chọn):', '')
    if (reasonInput === null) {
      return
    }
    const trimmedReason = reasonInput.trim()
    setReportingDocument(true)
    setReportFeedback(null)
    try {
      const payload = trimmedReason.length > 0 ? { reason: trimmedReason } : {}
      await axios.post(`/api/documents/${documentId}/report`, payload, { headers: authHeaders })
      setDetail((prev) => (
        prev
          ? {
              ...prev,
              reportedByViewer: true,
              reportCount: (prev.reportCount ?? 0) + 1
            }
          : prev
      ))
      setReportFeedback({ type: 'success', message: 'Đã ghi nhận báo cáo của bạn. Cảm ơn bạn đã thông báo.' })
    } catch (err) {
      let message = 'Không thể gửi báo cáo. Vui lòng thử lại.'
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { error?: string } | undefined
        if (payload?.error) {
          message = payload.error
        }
      }
      setReportFeedback({ type: 'error', message })
    } finally {
      setReportingDocument(false)
    }
  }, [documentId, detail, token, authHeaders, onRequireAuth])

  const handleClearReports = useCallback(async () => {
    if (!documentId || !viewerIsAdmin) return
    if (!token) {
      onRequireAuth()
      return
    }
    setAdminClearingReports(true)
    setAdminReportsError('')
    try {
      await axios.delete(`/api/documents/${documentId}/reports`, { headers: authHeaders })
      setAdminReports([])
      setDetail((prev) => (prev ? { ...prev, reportCount: 0 } : prev))
    } catch (err) {
      console.error('Cannot clear document reports', err)
      let message = 'Không thể bác bỏ báo cáo. Vui lòng thử lại.'
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { error?: string } | undefined
        if (payload?.error) {
          message = payload.error
        }
      }
      setAdminReportsError(message)
    } finally {
      setAdminClearingReports(false)
    }
  }, [documentId, viewerIsAdmin, token, authHeaders, onRequireAuth])

  if (!documentId) {
    return null
  }

  const handleCommentSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!documentId) return
    const trimmedComment = commentInput.trim()
    const hadRatingBeforeSubmit = Boolean(detail?.rating?.userScore)
    if (!trimmedComment && (viewerIsUploader || commentRating === null)) {
      setError('Vui lòng chọn số sao hoặc nhập nội dung bình luận.')
      return
    }
    if (!token) {
      onRequireAuth()
      return
    }
    if (trimmedComment && !viewerIsUploader && !hadRatingBeforeSubmit && commentRating === null) {
      setError('Bạn cần chọn số sao trước khi bình luận.')
      return
    }
    setCommentSubmitting(true)
    setError('')
    try {
      let ratingSubmitted = false
      if (!viewerIsUploader && commentRating !== null) {
        await axios.post(`/api/documents/${documentId}/rating`, { score: commentRating }, { headers: authHeaders })
        ratingSubmitted = true
        await Promise.all([refreshRatingSummary(), refreshComments()])
      }
      if (trimmedComment) {
        const payload = { content: trimmedComment }
        const { data } = await axios.post<CommentItem>(`/api/documents/${documentId}/comments`, payload, {
          headers: authHeaders
        })
        setDetail((prev) => (prev ? { ...prev, comments: [data, ...(prev.comments || [])] } : prev))
        setCommentInput('')
      }
      if (ratingSubmitted) {
        setCommentRating(null)
      }
    } catch (err) {
      console.error('Cannot submit comment', err)
      let message = 'Không thể gửi bình luận. Vui lòng thử lại.'
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { error?: string } | undefined
        if (payload?.error) {
          message = payload.error
        }
      }
      setError(message)
    } finally {
      setCommentSubmitting(false)
    }
  }

  const toggleReplyBox = (commentId: number) => {
    if (commentsReadOnly) return
    if (!token) {
      onRequireAuth()
      return
    }
    setReplyTargets((prev) => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
    setError('')
  }

  const handleReplyInputChange = (commentId: number, value: string) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [commentId]: value
    }))
  }

  const handleReplySubmit = async (event: React.FormEvent, parentId: number) => {
    event.preventDefault()
    if (!documentId) return
    if (!token) {
      onRequireAuth()
      return
    }
    const trimmed = (replyDrafts[parentId] || '').trim()
    if (!trimmed) {
      setError('Vui lòng nhập nội dung phản hồi.')
      return
    }
    setReplySubmittingId(parentId)
    setError('')
    try {
      await axios.post(`/api/documents/${documentId}/comments`, { content: trimmed, parentId }, { headers: authHeaders })
      await refreshComments()
      setReplyDrafts((prev) => ({
        ...prev,
        [parentId]: ''
      }))
      setReplyTargets((prev) => ({
        ...prev,
        [parentId]: false
      }))
      setExpandedReplies((prev) => ({
        ...prev,
        [parentId]: true
      }))
    } catch (err) {
      console.error('Cannot submit reply', err)
      let message = 'Không thể gửi phản hồi. Vui lòng thử lại.'
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { error?: string } | undefined
        if (payload?.error) {
          message = payload.error
        }
      }
      setError(message)
    } finally {
      setReplySubmittingId(null)
    }
  }

  const toggleReplyThread = (commentId: number) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }

  const handleDownloadClick = () => {
    if (!displayedDoc) return
    onDownload(displayedDoc)
  }

  const handleSubjectAssign = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!documentId) return
    if (!token) {
      onRequireAuth()
      return
    }
    if (!canReassignSubject) {
      setSubjectAssignError('Bạn không có quyền gán môn cho tài liệu này')
      return
    }
    if (!subjectSelection) {
      setSubjectAssignError('Vui lòng chọn môn học')
      return
    }
    const subjectId = Number(subjectSelection)
    if (Number.isNaN(subjectId)) {
      setSubjectAssignError('Lựa chọn môn học không hợp lệ')
      return
    }
    const targetSubject = subjectOptions.find((item) => item.id === subjectId)
    setSubjectAssigning(true)
    setSubjectAssignError('')
    try {
      const { data } = await axios.patch<DocumentItem>(
        `/api/documents/${documentId}/subject`,
        { subjectId },
        { headers: authHeaders }
      )
      const resolvedName = data?.monHocTen || targetSubject?.tenMonHoc || 'Chưa rõ'
      setDetail((prev) => (
        prev
          ? {
              ...prev,
              monHocId: data?.monHocId ?? subjectId,
              monHocTen: resolvedName,
              pendingSubject: data?.pendingSubject ?? false
            }
          : prev
      ))
      onSubjectUpdated?.(documentId, subjectId, resolvedName)
      setSubjectSelection('')
    } catch (err) {
      let message = 'Không thể cập nhật môn học. Vui lòng thử lại.'
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { error?: string } | undefined
        if (payload?.error) {
          message = payload.error
        }
      }
      setSubjectAssignError(message)
    } finally {
      setSubjectAssigning(false)
    }
  }

  const renderComment = (comment: CommentItem, depth = 0) => {
    const commentKey = comment.id ?? `${comment.authorEmail || 'unknown'}-${comment.createdAt}`
    const trimmedContent = (comment.content || '').trim()
    const hasContent = trimmedContent.length > 0
    const ratingScore = typeof comment.ratingScore === 'number' ? comment.ratingScore : null
    const hasRating = Boolean(ratingScore && ratingScore > 0)
    const authorInitial = comment.authorName ? comment.authorName.charAt(0).toUpperCase() : null
    const childReplies = comment.replies ?? []
    const canReply = Boolean(!commentsReadOnly && token && !comment.ratingOnly && comment.id > 0)
    const canDelete = Boolean(canAdminDeleteComments && comment.id && comment.id > 0)
    const reportCount = typeof comment.reportCount === 'number' ? comment.reportCount : 0
    const viewerReported = Boolean(comment.reportedByViewer)
    const canReport = Boolean(!commentsReadOnly && token && comment.id > 0 && !comment.ratingOnly && !viewerReported)
    const isReplyFormOpen = Boolean(replyTargets[comment.id])
    const currentReplyDraft = replyDrafts[comment.id] || ''
    const isSubmittingReply = replySubmittingId === comment.id
    const isReportingThisComment = reportingCommentId === comment.id
    const hasReplies = childReplies.length > 0
    const repliesExpanded = Boolean(expandedReplies[comment.id])
    const showReportInfo = viewerReported || reportCount > 0
    const showActionBar = canReply || canReport || showReportInfo
    const highlightReported = commentsReadOnly && reportCount > 0
    const itemClassName = ['comment-item', depth > 0 ? 'nested-comment' : '', highlightReported ? 'reported-comment' : '']
      .filter(Boolean)
      .join(' ')

    return (
      <li key={commentKey} className={itemClassName}>
        <div className="comment-avatar" aria-hidden={true}>
          {comment.authorAvatarUrl ? (
            <img
              src={comment.authorAvatarUrl}
              alt={`Ảnh đại diện của ${comment.authorName || 'người dùng'}`}
              loading="lazy"
            />
          ) : authorInitial ? (
            <span>{authorInitial}</span>
          ) : (
            <LuUser size={16} />
          )}
        </div>
        <div className="comment-body">
          <div className="comment-head">
            <div>
              <p className="comment-author">
                {comment.authorName || 'Ẩn danh'}
                {comment.authorIsUploader && <span className="comment-author-badge">Tác giả</span>}
              </p>
              {comment.authorRole && <span className="comment-role">{comment.authorRole}</span>}
              {highlightReported && (
                <span className="comment-report-flag">Đang bị báo cáo</span>
              )}
            </div>
            <div className="comment-head-meta">
              <span className="comment-time">{formatDate(comment.createdAt)}</span>
              {canDelete && (
                <button
                  type="button"
                  className="comment-delete-inline"
                  onClick={() => onDeleteComment?.(comment.id)}
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
          {hasRating && (
            <div className="comment-rating-display" aria-label={`Người dùng đánh giá ${ratingScore} sao`}>
              {STAR_SCALE.map((value) => (
                <LuStar
                  key={value}
                  size={14}
                  className={`comment-rating-display-star ${ratingScore && value <= ratingScore ? 'active' : ''}`}
                />
              ))}
              <span>{ratingScore}/5</span>
            </div>
          )}
          {hasContent ? (
            <p className="comment-content">{comment.content}</p>
          ) : hasRating ? (
            <p className="comment-content rating-only-note">Đã đánh giá {ratingScore} sao</p>
          ) : null}
          {showActionBar && (
            <div className="comment-actions">
              {canReply && (
                <button
                  type="button"
                  className="comment-reply-button"
                  onClick={() => toggleReplyBox(comment.id)}
                  disabled={isSubmittingReply}
                >
                  {isReplyFormOpen ? 'Đóng phản hồi' : 'Phản hồi'}
                </button>
              )}
              {canReport && (
                <button
                  type="button"
                  className="comment-report-button"
                  onClick={() => handleReportComment(comment.id)}
                  disabled={isReportingThisComment}
                >
                  {isReportingThisComment ? 'Đang báo cáo...' : 'Báo cáo'}
                </button>
              )}
              {!canReport && viewerReported && (
                <span className="comment-report-indicator confirmed">Đã báo cáo</span>
              )}
              {reportCount > 0 && (
                <span className="comment-report-indicator">{reportCount} báo cáo</span>
              )}
            </div>
          )}
          {isReplyFormOpen && (
            <form className="comment-reply-form" onSubmit={(event) => handleReplySubmit(event, comment.id)}>
              <textarea
                value={currentReplyDraft}
                onChange={(event) => handleReplyInputChange(comment.id, event.target.value)}
                placeholder="Viết phản hồi của bạn..."
              />
              <div className="comment-reply-actions">
                <button
                  type="submit"
                  className="btn-cta subtle"
                  disabled={
                    isSubmittingReply ||
                    currentReplyDraft.trim().length === 0
                  }
                >
                  {isSubmittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          )}
          {hasReplies && (
            <button
              type="button"
              className="comment-reply-summary"
              onClick={() => toggleReplyThread(comment.id)}
              aria-expanded={repliesExpanded}
            >
              <span>{repliesExpanded ? 'Ẩn phản hồi' : `${childReplies.length} phản hồi`}</span>
              <LuChevronDown size={14} className={repliesExpanded ? 'expanded' : ''} />
            </button>
          )}
          {hasReplies && repliesExpanded && (
            <ul className="comment-replies">{childReplies.map((reply) => renderComment(reply, depth + 1))}</ul>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="document-detail-overlay" onClick={onClose}>
      <div className="document-detail-panel" onClick={(event) => event.stopPropagation()}>
        <header className="document-detail-header">
          <div>
            <p className="section-eyebrow">Chi tiết tài liệu</p>
            <h2>{displayedDoc?.title || displayedDoc?.filename || 'Tài liệu'}</h2>
          </div>
          <button className="detail-close" onClick={onClose}>
            <LuX size={18} />
          </button>
        </header>

        {loading ? (
          <div className="detail-loading">Đang tải chi tiết...</div>
        ) : error ? (
          <div className="detail-error">{error}</div>
        ) : (
          <>
            {pendingSubject && (
              <div className="detail-alert warning">
                <p>
                  {viewerIsUploader
                    ? 'Môn học cũ đã bị xóa. Vui lòng chọn lại môn học để tài liệu được duyệt.'
                    : viewerIsAdmin
                      ? 'Tài liệu này đang chờ được gán vào môn học mới. Bạn có thể gán giúp người dùng.'
                      : 'Tài liệu này đang chờ được gán vào môn học mới.'}
                </p>
              </div>
            )}
            {viewerIsAdmin && totalDocumentReports > 0 && (
              <div className="detail-alert danger">
                <p>
                  {totalDocumentReports === 1
                    ? 'Tài liệu này đã bị báo cáo một lần. Hãy kiểm tra nội dung trước khi tiếp tục xử lý.'
                    : `Tài liệu này đã bị báo cáo ${totalDocumentReports} lần. Hãy kiểm tra nội dung trước khi tiếp tục xử lý.`}
                </p>
              </div>
            )}
            {canReassignSubject && (
              <div className="subject-reassign-block">
                <p className="subject-reassign-title">
                  {viewerIsUploader
                    ? 'Chọn môn học mới để đưa tài liệu trở lại hàng duyệt.'
                    : 'Chọn môn học mới để giúp người dùng hoàn tất quy trình kiểm duyệt.'}
                </p>
                {subjectOptions.length === 0 ? (
                  <p className="subject-reassign-empty">Hiện chưa có môn học nào để gán.</p>
                ) : (
                  <form className="subject-reassign-form" onSubmit={handleSubjectAssign}>
                    <label className="subject-reassign-label" htmlFor="subject-reassign-select">
                      Môn học
                    </label>
                    <div className="subject-reassign-row">
                      <select
                        id="subject-reassign-select"
                        value={subjectSelection}
                        onChange={(event) => {
                          setSubjectSelection(event.target.value)
                          setSubjectAssignError('')
                        }}
                        disabled={subjectAssigning}
                      >
                        <option value="">— Chọn môn học —</option>
                        {subjectOptions.map((subject) => (
                          <option key={subject.id} value={String(subject.id)}>
                            {subject.tenMonHoc}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn-cta" disabled={subjectAssigning}>
                        {subjectAssigning ? 'Đang cập nhật...' : 'Gán môn'}
                      </button>
                    </div>
                    {subjectAssignError && (
                      <p className="subject-reassign-error" role="alert">
                        {subjectAssignError}
                      </p>
                    )}
                  </form>
                )}
              </div>
            )}
            <section className="detail-hero">
              <div className="detail-cover">
                <div className={coverFrameClassName}>
                  {previewUrl ? (
                    <img src={previewUrl} alt={`Trang đầu tiên của ${displayedDoc?.title || displayedDoc?.filename || 'tài liệu'}`} />
                  ) : (
                    <div className="detail-icon">{displayedDoc ? getFileIcon(displayedDoc.contentType) : '📄'}</div>
                  )}
                </div>
                {previewLoading && <span className="detail-cover-status">Đang dựng trang bìa...</span>}
                {!previewLoading && previewError && (
                  <span className="detail-cover-status error" role="status" aria-live="polite">
                    {previewError}
                  </span>
                )}
                {!previewLoading && !previewUrl && !previewError && isIconOnlyDocument && (
                  <span className="detail-cover-status" role="status" aria-live="polite">
                    Định dạng này chỉ hiển thị biểu tượng mặc định.
                  </span>
                )}
              </div>
              <div className="detail-meta">
                {metaItems.map((item) => (
                  <div key={item.key} className="detail-meta-item">
                    <span className="meta-label">{item.label}</span>
                    <p>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="detail-classification">
                {classificationItems.map((item) => (
                  <div key={item.key} className="classification-pill">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              {(showDownloadButton || detail) && (
                <>
                  <div className="detail-actions">
                    {showDownloadButton && (
                      <button className="btn-cta" onClick={handleDownloadClick} disabled={!displayedDoc}>
                        <LuDownload size={16} />
                        <span>Tải xuống</span>
                      </button>
                    )}
                    {canFullPreviewDocument && (
                      <a
                        className="btn-cta subtle preview-button"
                        href={previewHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Xem trước trong tab mới"
                        onClick={(event) => {
                          if (!token) {
                            event.preventDefault()
                            onRequireAuth()
                          }
                        }}
                      >
                        <LuExternalLink size={16} />
                        <span>Xem trước</span>
                      </a>
                    )}
                    {detail && (
                        viewerIsAdmin ? null : (
                          <button
                            type="button"
                            className={`btn-ghost danger report-button ${viewerReportedDocument ? 'reported' : ''}`}
                            onClick={handleReportDocument}
                            disabled={reportButtonDisabled}
                            title={reportButtonTitle}
                          >
                            <LuTriangleAlert size={16} />
                            <span>{viewerReportedDocument ? 'Đã báo cáo' : 'Báo cáo tài liệu'}</span>
                          </button>
                        )
                    )}
                  </div>
                    {detail && !viewerIsAdmin && (reportFeedback || viewerReportedDocument) && (
                    <p
                      className={`detail-report-feedback ${reportFeedback?.type || 'success'}`}
                      role="status"
                    >
                      {reportFeedback?.message ||
                        'Bạn đã báo cáo tài liệu này. Quản trị viên sẽ xem xét trong thời gian sớm nhất.'}
                    </p>
                  )}

                    {detail && viewerIsAdmin && (
                      <div className="detail-section admin-report-section">
                        <p className="meta-label">Danh sách báo cáo</p>
                        {adminReportsLoading ? (
                          <p>Đang tải báo cáo...</p>
                        ) : adminReportsError ? (
                          <p className="detail-cover-status error" role="status" aria-live="polite">{adminReportsError}</p>
                        ) : adminReports.length === 0 ? (
                          <p>Chưa có báo cáo nào.</p>
                        ) : (
                          <div className="detail-meta admin-report-list">
                            {adminReports.map((report) => (
                              <div key={report.id} className="detail-meta-item">
                                <span className="meta-label">
                                  {report.reporterName || 'Ẩn danh'}{report.reporterEmail ? ` (${report.reporterEmail})` : ''}
                                </span>
                                <p>{report.reason || 'Không có lý do'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="detail-actions">
                          <button
                            type="button"
                            className="btn-ghost danger"
                            onClick={handleClearReports}
                            disabled={adminReportsLoading || adminClearingReports || adminReports.length === 0}
                            title="Bác bỏ tất cả báo cáo của tài liệu này"
                          >
                            {adminClearingReports ? 'Đang bác bỏ...' : 'Bác bỏ báo cáo'}
                          </button>
                        </div>
                      </div>
                    )}
                </>
              )}
            </section>

            {detail?.description && (
              <section className="detail-section">
                <h3>Mô tả</h3>
                <p className="detail-description">{detail.description}</p>
              </section>
            )}

            <section className="detail-section rating-section">
              <div>
                <p className="meta-label">Đánh giá trung bình</p>
                <div className="rating-score">
                  <strong>
                    {averageScore !== null ? averageScore.toFixed(1) : '—'}
                    <LuStar
                      size={18}
                      className={`rating-score-icon ${averageScore === null ? 'muted' : ''}`}
                    />
                  </strong>
                  <span>{totalRatings} lượt đánh giá</span>
                </div>
              </div>
            </section>

            {showComments && (
              <section className="detail-section comments-section">
                <header className="comments-header">
                  <div>
                    <p className="meta-label">Bình luận</p>
                    <h3>{totalCommentCount} phản hồi</h3>
                  </div>
                  <LuMessageSquare size={18} />
                </header>

                {commentsReadOnly ? null : token ? (
                  <div className="comment-form-wrapper">
                    <form className="comment-form" onSubmit={handleCommentSubmit}>
                      {!viewerIsUploader ? (
                        <>
                          <div className="comment-rating-row">
                            <span>Đánh giá tài liệu</span>
                            <div className="comment-rating-stars" role="group" aria-label="Chọn số sao khi bình luận">
                              {STAR_SCALE.map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={`comment-rating-star ${
                                    selectedCommentRating && value <= selectedCommentRating ? 'active' : ''
                                  }`}
                                  onClick={() => setCommentRating((prev) => (prev === value ? null : value))}
                                  disabled={commentSubmitting}
                                >
                                  <LuStar size={18} />
                                </button>
                              ))}
                            </div>
                          </div>
                          {commentRequiresRating && (
                            <p className="comment-require-rating">Bạn cần đánh giá trước khi gửi bình luận.</p>
                          )}
                        </>
                      ) : (
                        <p className="comment-author-only-note">
                          Bạn là tác giả nên chỉ có thể phản hồi bình luận, không thể tự đánh giá tài liệu này.
                        </p>
                      )}
                      <textarea
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Chia sẻ cảm nhận hoặc góp ý của bạn..."
                      />
                      <div className="comment-form-actions">
                        <button
                          type="submit"
                          className="btn-cta subtle"
                          disabled={
                            commentSubmitting ||
                            (!trimmedCommentInput && (viewerIsUploader || commentRating === null)) ||
                            (trimmedCommentInput && !viewerIsUploader && !userHasExistingRating && commentRating === null)
                          }
                        >
                          {commentSubmitting ? 'Đang gửi...' : 'Gửi bình luận'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="comment-form-wrapper">
                    <div className="comment-guest-note">
                      <p>Đăng nhập để bình luận và tham gia thảo luận.</p>
                      <button type="button" className="btn-ghost" onClick={onRequireAuth}>
                        Đăng nhập ngay
                      </button>
                    </div>
                  </div>
                )}

                {comments.length === 0 ? (
                  <p className="comment-empty">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                ) : (
                  <ul className="comment-list">{comments.map((comment) => renderComment(comment))}</ul>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
