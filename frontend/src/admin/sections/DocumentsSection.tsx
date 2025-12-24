import React from 'react'
import axios from 'axios'
import { LuTriangleAlert, LuEye } from 'react-icons/lu'
import type { AdminDocumentSummary, AdminSubjectSummary } from '../types'
import type { DocumentItem } from '../../types/document'
import DocumentDetailPanel from '../../components/DocumentDetailPanel'
import { formatDate } from '../utils'
import { getFileIcon, formatFileSize, formatRelativeDate } from '../utils/docHelpers'

interface DocumentsSectionProps {
  documents: AdminDocumentSummary[]
  loading: boolean
  onDeleteDocument: (documentId: number) => void
  onChangeSubject: (documentId: number, subjectId: number) => Promise<void>
  subjects: AdminSubjectSummary[]
  token: string | null
}

export default function DocumentsSection({
  documents,
  loading,
  onDeleteDocument,
  onChangeSubject,
  subjects,
  token
}: DocumentsSectionProps) {
  const [detailDocumentId, setDetailDocumentId] = React.useState<number | null>(null)
  const [subjectSelections, setSubjectSelections] = React.useState<Record<number, string>>({})
  const [updatingSubjectId, setUpdatingSubjectId] = React.useState<number | null>(null)
  const [subjectSuccessMap, setSubjectSuccessMap] = React.useState<Record<number, string>>({})
  const downloadDocument = React.useCallback(async (doc: DocumentItem) => {
    try {
      const filename = getDownloadFilename(doc)
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const { data } = await axios.get(`/api/documents/${doc.id}/download`, {
        responseType: 'blob',
        headers
      })
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      alert('Không thể tải xuống tài liệu')
    }
  }, [token])

  const hasSubjects = subjects.length > 0

  React.useEffect(() => {
    const initialSelections: Record<number, string> = {}
    documents.forEach((doc) => {
      initialSelections[doc.id] = doc.subjectId ? String(doc.subjectId) : ''
    })
    setSubjectSelections(initialSelections)
  }, [documents])

  async function handleApplySubject(docId: number) {
    const selectedValue = subjectSelections[docId]
    if (!selectedValue) {
      window.alert('Vui lòng chọn môn học mới trước khi áp dụng')
      return
    }
    const parsed = Number(selectedValue)
    if (Number.isNaN(parsed)) {
      window.alert('Môn học không hợp lệ')
      return
    }
    setUpdatingSubjectId(docId)
    try {
      await onChangeSubject(docId, parsed)
      const doc = documents.find((item) => item.id === docId)
      const subjectName = subjects.find((subject) => subject.id === parsed)?.tenMonHoc
      const docLabel = doc?.title || doc?.type || `Tài liệu #${docId}`
      const successMessage = subjectName
        ? `Đã gán "${docLabel}" vào môn "${subjectName}"`
        : `Đã cập nhật môn học cho "${docLabel}"`
      setSubjectSuccessMap((prev) => ({ ...prev, [docId]: successMessage }))
      window.setTimeout(() => {
        setSubjectSuccessMap((prev) => {
          const next = { ...prev }
          delete next[docId]
          return next
        })
      }, 3000)
    } catch (error) {
      console.error('Cannot change subject', error)
    } finally {
      setUpdatingSubjectId(null)
    }
  }

  function handleSubjectSelect(docId: number, value: string) {
    setSubjectSelections((prev) => ({ ...prev, [docId]: value }))
  }

  if (loading) {
    return <div className="admin-placeholder">Đang tải tài liệu...</div>
  }

  if (!documents.length) {
    return <div className="admin-placeholder">Chưa có tài liệu nào.</div>
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Tên tài liệu</th>
            <th>Môn học</th>
            <th>Loại</th>
            <th>Người đăng</th>
            <th>Lượt tải</th>
            <th>Ngày</th>
            <th>Trạng thái</th>
            <th>Đổi môn</th>
            <th>Cảnh báo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className={doc.reported ? 'reported-document-row' : ''}>
              <td>{doc.title || 'Không tên'}</td>
              <td>{doc.subject || 'Chưa rõ'}</td>
              <td>{doc.type || '—'}</td>
              <td>
                <div className="admin-user-cell">
                  <strong>{doc.uploader || 'Ẩn danh'}</strong>
                  <span>{doc.uploaderEmail || ''}</span>
                </div>
              </td>
              <td>{(doc.downloadCount ?? 0).toLocaleString('vi-VN')}</td>
              <td>{formatDate(doc.uploadedAt)}</td>
              <td>{doc.pendingSubject ? 'Đang xét chọn môn' : 'Đã gán môn'}</td>
              <td>
                <div className="admin-subject-select">
                  <div className="subject-select-controls">
                    <select
                      value={subjectSelections[doc.id] ?? ''}
                      onChange={(event) => handleSubjectSelect(doc.id, event.target.value)}
                      disabled={!hasSubjects || updatingSubjectId === doc.id}
                    >
                      <option value="">{hasSubjects ? 'Chọn môn' : 'Chưa có môn'}</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.tenMonHoc}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-soft"
                      onClick={() => handleApplySubject(doc.id)}
                      disabled={!hasSubjects || updatingSubjectId === doc.id}
                    >
                      {updatingSubjectId === doc.id ? 'Đang lưu...' : 'Áp dụng'}
                    </button>
                  </div>
                  {subjectSuccessMap[doc.id] && (
                    <p className="subject-change-success">{subjectSuccessMap[doc.id]}</p>
                  )}
                </div>
              </td>
              <td>
                <span className={`report-chip ${doc.reported ? 'danger' : 'neutral'}`}>
                  {doc.reported ? (
                    <>
                      <LuTriangleAlert size={14} />
                      <span>{doc.reportCount ?? 0} báo cáo</span>
                    </>
                  ) : (
                    'An toàn'
                  )}
                </span>
              </td>
              <td>
                <div className="admin-table-actions">
                  <button type="button" className="btn-soft" onClick={() => setDetailDocumentId(doc.id)}>
                    <LuEye />
                    Chi tiết
                  </button>
                  <button type="button" className="btn-danger" onClick={() => onDeleteDocument(doc.id)}>
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {detailDocumentId && (
        <DocumentDetailPanel
          documentId={detailDocumentId}
          token={token}
          summary={null}
          onClose={() => setDetailDocumentId(null)}
          onRequireAuth={() => {
            window.alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
          }}
          onDownload={downloadDocument}
          getFileIcon={getFileIcon}
          formatFileSize={formatFileSize}
          formatDate={formatRelativeDate}
          showDownloadButton={false}
          showComments={false}
          viewerIsAdmin
        />
      )}
    </div>
  )
}

function getDownloadFilename(doc: DocumentItem) {
  const fallback = doc.filename || 'document'
  const originalExt = fallback.includes('.') ? fallback.substring(fallback.lastIndexOf('.')) : ''
  const baseTitle = doc.title?.trim()
  if (!baseTitle) return fallback
  const sanitized = baseTitle.replace(/[\\/:*?"<>|]/g, '').trim()
  if (!sanitized) return fallback
  if (!originalExt) return sanitized
  if (sanitized.toLowerCase().endsWith(originalExt.toLowerCase())) return sanitized
  return `${sanitized}${originalExt}`
}

