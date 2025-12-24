import React from 'react'
import { LuEye } from 'react-icons/lu'
import { MdWarning } from 'react-icons/md'
import type { AdminDocumentSummary } from '../types'
import DocumentDetailPanel from '../../components/DocumentDetailPanel'
import type { DocumentItem } from '../../types/document'
import { formatDate } from '../utils'
import { getFileIcon, formatFileSize, formatRelativeDate } from '../utils/docHelpers'

interface ReviewSectionProps {
  documents: AdminDocumentSummary[]
  loading: boolean
  token: string | null
  onApprove: (documentId: number) => Promise<void>
  onReject: (documentId: number, reason: string) => Promise<void>
}

export default function ReviewSection({
  documents,
  loading,
  token,
  onApprove,
  onReject
}: ReviewSectionProps) {
  const [detailDocumentId, setDetailDocumentId] = React.useState<number | null>(null)
  const [busyId, setBusyId] = React.useState<number | null>(null)

  const noopDownload = React.useCallback((_doc: DocumentItem) => {
    // download is intentionally disabled in review flow
  }, [])

  async function handleApprove(id: number) {
    if (!window.confirm('Duyệt tài liệu này và cho phép hiển thị công khai?')) return
    setBusyId(id)
    try {
      await onApprove(id)
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: number) {
    const reason = window.prompt('Nhập lý do từ chối (bắt buộc)')
    if (reason === null) return
    const trimmed = reason.trim()
    if (!trimmed) {
      window.alert('Vui lòng nhập lý do hợp lệ')
      return
    }
    setBusyId(id)
    try {
      await onReject(id, trimmed)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <div className="admin-placeholder">Đang tải danh sách kiểm duyệt...</div>
  }

  if (!documents.length) {
    return <div className="admin-placeholder">Không có tài liệu cần kiểm duyệt.</div>
  }

  const pending = documents.filter((doc) => (doc.reviewStatus || '').toUpperCase() === 'PENDING' || !doc.reviewStatus)

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Tên tài liệu</th>
            <th>Môn học</th>
            <th>Người đăng</th>
            <th>Ngày đăng</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pending.map((doc) => (
            <tr key={doc.id} className={doc.reported ? 'reported-document-row' : ''}>
              <td>
                <div className="admin-doc-title">
                  <span>{doc.title || 'Không tên'}</span>
                  {doc.reported && (
                    <span className="report-chip danger compact">
                      <MdWarning size={12} />
                      <span>{doc.reportCount ?? 0} báo cáo</span>
                    </span>
                  )}
                </div>
              </td>
              <td>{doc.subject || 'Chưa rõ'}</td>
              <td>
                <div className="admin-user-cell">
                  <strong>{doc.uploader || 'Ẩn danh'}</strong>
                  <span>{doc.uploaderEmail || ''}</span>
                </div>
              </td>
              <td>{formatDate(doc.uploadedAt)}</td>
              <td>
                <div className="admin-table-actions">
                  <button type="button" className="btn-soft" onClick={() => setDetailDocumentId(doc.id)}>
                    <LuEye />
                    Xem
                  </button>
                  <button
                    type="button"
                    className="btn-soft"
                    disabled={busyId === doc.id}
                    onClick={() => handleApprove(doc.id)}
                  >
                    {busyId === doc.id ? 'Đang xử lý...' : 'Duyệt'}
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={busyId === doc.id}
                    onClick={() => handleReject(doc.id)}
                  >
                    {busyId === doc.id ? 'Đang xử lý...' : 'Từ chối'}
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
          onRequireAuth={() => {}}
          onDownload={noopDownload}
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
