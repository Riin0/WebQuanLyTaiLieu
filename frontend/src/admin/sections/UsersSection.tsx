import React from 'react'
import type { AdminUserSummary } from '../types'
import { formatDate } from '../utils'

interface RoleOption {
  id: number
  label: string
}

interface UsersSectionProps {
  users: AdminUserSummary[]
  loading: boolean
  roleOptions: RoleOption[]
  onChangeRole: (userId: number, roleId: number) => void
  onToggleLock: (userId: number, accountLocked: boolean, reason?: string) => void
}

export default function UsersSection({
  users,
  loading,
  roleOptions,
  onChangeRole,
  onToggleLock
}: UsersSectionProps) {
  const handleLockToggle = React.useCallback((user: AdminUserSummary) => {
    const targetName = user.username || user.email
    if (user.accountLocked) {
      const confirmed = window.confirm(`Mở khóa tài khoản ${targetName}?`)
      if (!confirmed) return
      onToggleLock(user.id, false)
      return
    }

    const reason = window.prompt(`Nhập lý do khóa tài khoản ${targetName}`)
    if (reason === null) return
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      window.alert('Vui lòng nhập lý do hợp lệ trước khi khóa')
      return
    }
    onToggleLock(user.id, true, trimmedReason)
  }, [onToggleLock])

  if (loading) {
    return <div className="admin-placeholder">Đang tải người dùng...</div>
  }

  if (!users.length) {
    return <div className="admin-placeholder">Không có người dùng cần quản lý (đã lọc tài khoản quản trị).</div>
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Người dùng</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Tài liệu</th>
            <th>Lượt tải</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <div className="admin-user-cell">
                  <strong>{user.username || 'Không tên'}</strong>
                  <span>Đăng ký: {formatDate(user.createdAt)}</span>
                </div>
              </td>
              <td>{user.email}</td>
              <td>
                <select
                  value={user.roleId ?? ''}
                  onChange={(event) => onChangeRole(user.id, Number(event.target.value))}
                  className="admin-select"
                >
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </select>
              </td>
              <td>{user.totalDocuments.toLocaleString('vi-VN')}</td>
              <td>{user.totalDownloads.toLocaleString('vi-VN')}</td>
              <td>
                <div className="admin-status-cell">
                  <span className={`admin-pill ${user.accountLocked ? 'warning' : 'success'}`}>
                    {user.accountLocked ? 'Đã khóa' : 'Đang hoạt động'}
                  </span>
                  {user.accountLocked && user.lockReason && (
                    <p className="admin-status-note">Lý do: {user.lockReason}</p>
                  )}
                </div>
              </td>
              <td>
                <button
                  type="button"
                  className={`btn-outline ${user.accountLocked ? 'success' : 'warning'}`}
                  onClick={() => handleLockToggle(user)}
                >
                  {user.accountLocked ? 'Mở khóa' : 'Khóa tài khoản'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
