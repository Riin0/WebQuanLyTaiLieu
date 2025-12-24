import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuDownload,
  LuFileText,
  LuImagePlus,
  LuRefreshCcw,
  LuShieldCheck,
  LuUser
} from 'react-icons/lu'
import type { DocumentItem } from '../types/document'

export interface UserProfileData {
  id: number
  name?: string | null
  email: string
  role?: string | null
  avatarUrl?: string | null
  createdAt?: string | null
  lastUpload?: string | null
  totalDocuments?: number
  totalDownloads?: number
  documents: DocumentItem[]
}

interface ProfilePanelProps {
  token: string
  profile: UserProfileData | null
  loading: boolean
  error: string
  avatarVersion: number
  onReload: () => Promise<void> | void
  onAvatarUpdated: () => void
  onOpenDocument: (doc: DocumentItem) => void
  onDownload: (doc: DocumentItem) => void
  formatDate: (value: string) => string
  formatFileSize: (value: number) => string
  getFileIcon: (contentType: string) => string
}

type Feedback = { type: 'success' | 'error'; message: string }

export default function ProfilePanel({
  token,
  profile,
  loading,
  error,
  avatarVersion,
  onReload,
  onAvatarUpdated,
  onOpenDocument,
  onDownload,
  formatDate,
  formatFileSize,
  getFileIcon
}: ProfilePanelProps) {
  const [historyQuery, setHistoryQuery] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [avatarStatus, setAvatarStatus] = useState<Feedback | null>(null)
  const [passwordStatus, setPasswordStatus] = useState<Feedback | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: ''
  })

  const documents = profile?.documents ?? []
  const filteredDocuments = useMemo(() => {
    const normalizedHistoryQuery = historyQuery.trim().toLowerCase()
    if (!normalizedHistoryQuery) return documents
    return documents.filter((doc) => {
      const titleSource = (doc.title || doc.filename || '').toLowerCase()
      return titleSource.includes(normalizedHistoryQuery)
    })
  }, [documents, historyQuery])

  const HISTORY_PAGE_SIZE = 5
  const totalHistoryPages = Math.max(1, Math.ceil(filteredDocuments.length / HISTORY_PAGE_SIZE))
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE
    return filteredDocuments.slice(start, start + HISTORY_PAGE_SIZE)
  }, [filteredDocuments, historyPage])

  useEffect(() => {
    setHistoryPage(1)
  }, [historyQuery, documents])

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages)
    }
  }, [historyPage, totalHistoryPages])

  if (loading) {
    return (
      <div className="profile-view">
        <div className="profile-loading">Đang tải hồ sơ...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="profile-view">
        <div className="profile-error">{error}</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-view">
        <div className="profile-placeholder">Không có dữ liệu hồ sơ để hiển thị.</div>
      </div>
    )
  }

  const avatarSrc = profile.avatarUrl ? `${profile.avatarUrl}?v=${avatarVersion}` : undefined

  async function handleAvatarChange(file: File | undefined) {
    if (!file) return
    setAvatarStatus(null)
    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await axios.post('/api/profile/avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      setAvatarStatus({ type: 'success', message: 'Cập nhật ảnh đại diện thành công' })
      onAvatarUpdated()
      await Promise.resolve(onReload())
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Không thể cập nhật ảnh đại diện'
      setAvatarStatus({ type: 'error', message })
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordStatus(null)
    setChangingPassword(true)
    try {
      await axios.post(
        '/api/profile/change-password',
        {
          currentPassword: passwordForm.current,
          newPassword: passwordForm.next,
          confirmPassword: passwordForm.confirm
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      setPasswordStatus({ type: 'success', message: 'Đổi mật khẩu thành công' })
      setPasswordForm({ current: '', next: '', confirm: '' })
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Không thể đổi mật khẩu'
      setPasswordStatus({ type: 'error', message })
    } finally {
      setChangingPassword(false)
    }
  }

  function handlePasswordFieldChange(field: 'current' | 'next' | 'confirm', value: string) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
  }

  const joinedAt = profile.createdAt ? formatDate(profile.createdAt) : 'Chưa xác định'
  const lastUpload = profile.lastUpload ? formatDate(profile.lastUpload) : 'Chưa có'
  const totalDocuments = profile.totalDocuments ?? documents.length
  const totalDownloads = profile.totalDownloads ?? 0

  function formatReviewStatus(value?: string) {
    const normalized = (value || '').trim().toUpperCase()
    if (!normalized || normalized === 'APPROVED') return 'Đã duyệt'
    if (normalized === 'PENDING') return 'Chờ duyệt'
    if (normalized === 'REJECTED') return 'Từ chối'
    return 'Đã duyệt'
  }

  function getReviewStatusVariant(value?: string) {
    const normalized = (value || '').trim().toUpperCase()
    if (normalized === 'PENDING') return 'pending'
    if (normalized === 'REJECTED') return 'rejected'
    return 'approved'
  }

  return (
    <div className="profile-view">
      <section className="profile-card">
        <div className="profile-card-body">
          <div className="profile-avatar-block">
            <div className="profile-avatar-frame">
              {avatarSrc ? <img src={avatarSrc} alt="Ảnh đại diện" /> : <LuUser size={48} />}
            </div>
            <label className="profile-avatar-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  handleAvatarChange(event.target.files?.[0])
                  event.target.value = ''
                }}
                disabled={avatarUploading}
              />
              <LuImagePlus size={18} />
              <span>{avatarUploading ? 'Đang tải...' : 'Đổi ảnh'}</span>
            </label>
            {avatarStatus && (
              <p className={`profile-feedback ${avatarStatus.type}`}>{avatarStatus.message}</p>
            )}
          </div>

          <div className="profile-details">
            <p className="profile-eyebrow">Thông tin cá nhân</p>
            <h2>{profile.name || 'Chưa cập nhật tên'}</h2>
            <p className="profile-email">{profile.email}</p>
            <div className="profile-tags">
              <span className="profile-tag">
                <LuShieldCheck size={14} />
                {profile.role || 'Thành viên'}
              </span>
              <span className="profile-tag">
                <LuClock size={14} />
                Tham gia: {joinedAt}
              </span>
              <span className="profile-tag">
                <LuRefreshCcw size={14} />
                Lần đăng gần nhất: {lastUpload}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <strong>{totalDocuments.toLocaleString('vi-VN')}</strong>
            <span>Tổng tài liệu</span>
          </div>
          <div className="profile-stat">
            <strong>{totalDownloads.toLocaleString('vi-VN')}</strong>
            <span>Tổng lượt tải</span>
          </div>
        </div>
      </section>

      <section className="profile-history-card">
        <header className="profile-history-header">
          <div>
            <p className="profile-eyebrow">Lịch sử đăng bài</p>
            <h3>Tài liệu bạn đã chia sẻ</h3>
          </div>
          <div className="profile-history-search">
            <LuFileText size={16} />
            <input
              type="text"
              placeholder="Tìm theo tên, môn học, loại tài liệu"
              value={historyQuery}
              onChange={(event) => setHistoryQuery(event.target.value)}
            />
          </div>
        </header>

        <div className="profile-history-list">
          {filteredDocuments.length === 0 ? (
            <p className="profile-placeholder">Chưa có tài liệu nào phù hợp với bộ lọc.</p>
          ) : (
            paginatedHistory.map((doc) => (
              <article key={doc.id} className="profile-history-row">
                <div className="profile-history-icon">{getFileIcon(doc.contentType)}</div>
                <div className="profile-history-body">
                  <div className="profile-history-top">
                    <button
                      type="button"
                      className="profile-history-title"
                      onClick={() => onOpenDocument(doc)}
                    >
                      {doc.title || doc.filename}
                    </button>
                    <span className={`review-status-badge ${getReviewStatusVariant(doc.reviewStatus)}`}>
                      {formatReviewStatus(doc.reviewStatus)}
                    </span>
                  </div>
                  <div className="profile-history-meta">
                    <span>{doc.loaiTaiLieu || 'Chưa phân loại'}</span>
                    <span>•</span>
                    <span>{doc.monHocTen || 'Chưa gán môn'}</span>
                    <span>•</span>
                    <span>{formatDate(doc.uploadDate)}</span>
                    <span>•</span>
                    <span>{(doc.downloadCount ?? 0).toLocaleString('vi-VN')} lượt tải</span>
                    <span>•</span>
                    <span>{formatFileSize(doc.size)}</span>
                    {doc.pendingSubject && (
                      <>
                        <span>•</span>
                        <span className="pending-flag">Đang xét chọn môn</span>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
          {filteredDocuments.length > HISTORY_PAGE_SIZE && (
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                disabled={historyPage === 1}
                aria-label="Trang trước"
              >
                <LuChevronLeft aria-hidden="true" />
              </button>
              <span className="pagination-status">
                Trang {historyPage}/{totalHistoryPages}
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setHistoryPage((prev) => Math.min(totalHistoryPages, prev + 1))}
                disabled={historyPage === totalHistoryPages}
                aria-label="Trang sau"
              >
                <LuChevronRight aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="profile-password-card">
        <header>
          <div>
            <p className="profile-eyebrow">Bảo mật</p>
            <h3>Đổi mật khẩu</h3>
          </div>
        </header>
        <form className="profile-password-form" onSubmit={handlePasswordSubmit}>
          <label>
            <span>Mật khẩu hiện tại</span>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(event) => handlePasswordFieldChange('current', event.target.value)}
              required
            />
          </label>
          <label>
            <span>Mật khẩu mới</span>
            <input
              type="password"
              value={passwordForm.next}
              onChange={(event) => handlePasswordFieldChange('next', event.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            <span>Nhập lại mật khẩu mới</span>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(event) => handlePasswordFieldChange('confirm', event.target.value)}
              required
              minLength={8}
            />
          </label>
          {passwordStatus && (
            <p className={`profile-feedback ${passwordStatus.type}`}>{passwordStatus.message}</p>
          )}
          <button type="submit" className="btn-primary" disabled={changingPassword}>
            {changingPassword ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
          </button>
        </form>
      </section>
    </div>
  )
}
