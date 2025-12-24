import React from 'react'
import type { AdminUserSummary } from '../types'
import { formatDate } from '../utils'

interface AccountsSectionProps {
  users: AdminUserSummary[]
  loading: boolean
  onToggleLock: (userId: number, accountLocked: boolean, reason?: string) => void
}

export default function AccountsSection({ users, loading, onToggleLock }: AccountsSectionProps) {
  if (loading) {
    return <div className="admin-placeholder">Đang tải tài khoản...</div>
  }

  if (!users.length) {
    return <div className="admin-placeholder">Không có tài khoản cần quản lý (đã lọc tài khoản quản trị).</div>
  }

  return (
    <div className="admin-account-grid">
      {users.map((user) => (
        <article key={user.id} className="admin-account-card">
          <div className="admin-account-role">{user.role || 'Không rõ'}</div>
          <h3>{user.username || 'Không tên'}</h3>
          <p>{user.email}</p>
          <dl>
            <div>
              <dt>Tài liệu</dt>
              <dd>{user.totalDocuments.toLocaleString('vi-VN')}</dd>
            </div>
            <div>
              <dt>Lượt tải</dt>
              <dd>{user.totalDownloads.toLocaleString('vi-VN')}</dd>
            </div>
            <div>
              <dt>Lần cuối đăng</dt>
              <dd>{formatDate(user.lastUpload)}</dd>
            </div>
          </dl>
          <button
            type="button"
            className={`btn-outline ${user.accountLocked ? 'success' : 'warning'}`}
            onClick={() => {
              if (user.accountLocked) {
                if (window.confirm(`Mở khóa tài khoản ${user.username || user.email}?`)) {
                  onToggleLock(user.id, false)
                }
                return
              }
              const reason = window.prompt(`Nhập lý do khóa tài khoản ${user.username || user.email}`)
              if (reason === null) return
              const trimmedReason = reason.trim()
              if (!trimmedReason) {
                window.alert('Vui lòng nhập lý do hợp lệ trước khi khóa')
                return
              }
              onToggleLock(user.id, true, trimmedReason)
            }}
          >
            {user.accountLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
          </button>
          {user.accountLocked && user.lockReason && (
            <p className="admin-status-note">Lý do: {user.lockReason}</p>
          )}
        </article>
      ))}
    </div>
  )
}
