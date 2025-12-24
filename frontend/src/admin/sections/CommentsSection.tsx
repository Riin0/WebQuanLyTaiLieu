import React from 'react'
import type { AdminCommentSummary } from '../types'
import DocumentDetailPanel from '../../components/DocumentDetailPanel'
import type { DocumentItem } from '../../types/document'
import { getFileIcon, formatFileSize, formatRelativeDate } from '../utils/docHelpers'

interface CommentsSectionProps {
  comments: AdminCommentSummary[]
  loading: boolean
  token: string | null
  onDeleteComment: (commentId: number) => void
}

function buildDocumentKey(comment: AdminCommentSummary) {
  const documentId = comment.documentId ?? null
  if (documentId) return `doc-${documentId}`
  const fallback = comment.documentTitle?.trim() || 'unknown'
  return `unknown-${fallback}`
}

interface DocumentAggregate {
  key: string
  title: string
  totalComments: number
  documentId: number | null
  flaggedComments: number
}

export default function CommentsSection({ comments, loading, token, onDeleteComment }: CommentsSectionProps) {
  const [detailDocumentId, setDetailDocumentId] = React.useState<number | null>(null)

  const documentStats = React.useMemo(() => {
    const map = new Map<string, DocumentAggregate>()
    comments.forEach((comment) => {
      const key = buildDocumentKey(comment)
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: comment.documentTitle || 'Tài liệu không xác định',
          totalComments: 0,
          documentId: comment.documentId ?? null,
          flaggedComments: 0
        })
      }
      const entry = map.get(key)!
      entry.totalComments += 1
      if ((comment.flagged ?? false) || (comment.reportCount ?? 0) > 0) {
        entry.flaggedComments += 1
      }
    })
    return Array.from(map.values()).sort((a, b) => b.totalComments - a.totalComments || a.title.localeCompare(b.title))
  }, [comments])

  if (loading) {
    return <div className="admin-placeholder">Đang tải bình luận...</div>
  }

  if (!comments.length) {
    return <div className="admin-placeholder">Chưa có bình luận nào.</div>
  }

  return (
    <section className="admin-comment-layout">
      <div className="admin-comment-doc-panel">
        <header>
          <div>
            <h3>Tài liệu & tổng bình luận</h3>
            <p>{documentStats.length} tài liệu có phản hồi</p>
          </div>
        </header>
        {documentStats.length ? (
          <ul className="admin-comment-doc-list">
            {documentStats.map((doc) => {
              const canOpenDetail = typeof doc.documentId === 'number'
              const itemClassName = doc.flaggedComments > 0 ? 'admin-comment-doc flagged' : 'admin-comment-doc'
              return (
                <li key={doc.key} className={itemClassName}>
                  <div className="admin-comment-doc-info">
                    <strong>{doc.title}</strong>
                    <span>{doc.totalComments.toLocaleString('vi-VN')} bình luận</span>
                    {doc.flaggedComments > 0 && (
                      <span className="admin-comment-doc-flag">
                        {doc.flaggedComments.toLocaleString('vi-VN')} đang bị báo cáo
                      </span>
                    )}
                  </div>
                  <button
                    className="btn-outline"
                    disabled={!canOpenDetail}
                    onClick={() => canOpenDetail && setDetailDocumentId(doc.documentId!)}
                  >
                    Xem chi tiết
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="admin-placeholder">Chưa có dữ liệu bình luận.</div>
        )}
      </div>

      {detailDocumentId && (
        <DocumentDetailPanel
          documentId={detailDocumentId}
          token={token}
          summary={null}
          onClose={() => setDetailDocumentId(null)}
          onRequireAuth={() => {}}
          onDownload={noopDownload}
          getFileIcon={getFileIcon}
          formatFileSize={formatFileSize}
          formatDate={formatRelativeDate}
          showDownloadButton={false}
          showComments
          readonlyComments
          onDeleteComment={onDeleteComment}
          viewerIsAdmin
        />
      )}
    </section>
  )
}

const noopDownload = (_doc: DocumentItem) => {}
