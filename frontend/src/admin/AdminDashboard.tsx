import React from 'react'
import axios from 'axios'
import {
  LuBell,
  LuBookOpen,
  LuFileText,
  LuMessageSquare,
  LuPanelTop,
  LuTrash2,
  LuShieldCheck,
  LuUsers
} from 'react-icons/lu'
import AdminLayout from './AdminLayout'
import type { SidebarItem } from '../layouts/LayoutShell'
import OverviewSection from './sections/OverviewSection'
import UsersSection from './sections/UsersSection'
import DocumentsSection from './sections/DocumentsSection'
import ReviewSection from './sections/ReviewSection'
import CommentsSection from './sections/CommentsSection'
import SubjectsSection from './sections/SubjectsSection'
import type {
  AdminCommentSummary,
  AdminDocumentSummary,
  AdminOverview,
  AdminSubjectPayload,
  AdminSubjectSummary,
  AdminUserSummary,
  Section,
  WeekOption
} from './types'
import type { NotificationItem } from '../types/notification'
import '../styles/admin.css'

interface AdminProps {
  token: string | null
  onLogout: () => void
  onBackHome: () => void
}

interface ToastState {
  type: 'success' | 'error'
  message: string
}

const ROLE_OPTIONS = [
  { id: 3, label: 'Giảng viên' },
  { id: 4, label: 'Sinh viên' }
]

export default function AdminDashboard({ token, onLogout, onBackHome }: AdminProps) {
  const [section, setSection] = React.useState<Section>('overview')
  const [overview, setOverview] = React.useState<AdminOverview | null>(null)
  const [users, setUsers] = React.useState<AdminUserSummary[]>([])
  const [documents, setDocuments] = React.useState<AdminDocumentSummary[]>([])
  const [reviewDocuments, setReviewDocuments] = React.useState<AdminDocumentSummary[]>([])
  const [comments, setComments] = React.useState<AdminCommentSummary[]>([])
  const [subjects, setSubjects] = React.useState<AdminSubjectSummary[]>([])
  const [loading, setLoading] = React.useState<Record<string, boolean>>({})
  const [toast, setToast] = React.useState<ToastState | null>(null)
  const [selectedWeek, setSelectedWeek] = React.useState('')
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [notificationsLoading, setNotificationsLoading] = React.useState(false)
  const [notificationsError, setNotificationsError] = React.useState('')
  const [notificationPanelOpen, setNotificationPanelOpen] = React.useState(false)
  const notificationPanelRef = React.useRef<HTMLDivElement | null>(null)
  const weekOptions = React.useMemo(() => buildWeekOptions(), [])

  const headers = React.useMemo(() => (
    token ? { Authorization: `Bearer ${token}` } : undefined
  ), [token])

  const manageableUsers = React.useMemo(() => (
    users.filter((user) => {
      const normalizedRole = user.role?.toUpperCase()
      return (user.roleId ?? 0) !== 2 && normalizedRole !== 'ADMIN'
    })
  ), [users])

  const teacherStudentCount = React.useMemo(() => (
    users.filter((user) => {
      const roleId = user.roleId ?? 0
      if (roleId === 3 || roleId === 4) return true
      const normalizedRole = user.role?.toUpperCase()
      return normalizedRole === 'GIẢNG VIÊN' || normalizedRole === 'GIANG VIEN' || normalizedRole === 'SINH VIÊN'
    }).length
  ), [users])

  React.useEffect(() => {
    if (!token) return
    refreshOverview()
    refreshUsers()
    refreshDocuments()
    refreshReviewDocuments()
    refreshComments()
    refreshSubjects()
    loadNotifications()
    const intervalId = window.setInterval(() => loadNotifications({ silent: true }), 60000)
    return () => window.clearInterval(intervalId)
  }, [token])

  React.useEffect(() => {
    if (!selectedWeek && weekOptions.length) {
      setSelectedWeek(weekOptions[0].value)
    }
  }, [selectedWeek, weekOptions])

  React.useEffect(() => {
    if (!notificationPanelOpen) {
      return
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
        setNotificationPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notificationPanelOpen])

  function setModuleLoading(key: string, value: boolean) {
    setLoading((prev) => ({ ...prev, [key]: value }))
  }

  function notify(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  async function refreshOverview() {
    if (!headers) return
    setModuleLoading('overview', true)
    try {
      const { data } = await axios.get<AdminOverview>('/api/admin/overview', { headers })
      setOverview(data)
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không tải được thống kê')
    } finally {
      setModuleLoading('overview', false)
    }
  }

  async function refreshUsers() {
    if (!headers) return
    setModuleLoading('users', true)
    try {
      const { data } = await axios.get<AdminUserSummary[]>('/api/admin/users', { headers })
      setUsers(data)
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không tải được danh sách người dùng')
    } finally {
      setModuleLoading('users', false)
    }
  }

  async function refreshDocuments() {
    if (!headers) return
    setModuleLoading('documents', true)
    try {
      const { data } = await axios.get<AdminDocumentSummary[]>('/api/admin/documents', { headers })
      setDocuments(data)
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không tải được tài liệu')
    } finally {
      setModuleLoading('documents', false)
    }
  }

  async function refreshReviewDocuments() {
    if (!headers) return
    setModuleLoading('review', true)
    try {
      const { data } = await axios.get<AdminDocumentSummary[]>('/api/admin/review/documents', { headers })
      setReviewDocuments(data)
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không tải được danh sách kiểm duyệt')
    } finally {
      setModuleLoading('review', false)
    }
  }

  async function handleApproveDocument(documentId: number) {
    if (!headers) return
    try {
      await axios.patch(`/api/admin/review/documents/${documentId}`, { action: 'APPROVE' }, { headers })
      notify('success', 'Đã duyệt tài liệu và gửi thông báo cho người đăng')
      await Promise.all([
        refreshReviewDocuments(),
        refreshDocuments(),
        refreshOverview()
      ])
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không duyệt được tài liệu')
      throw err
    }
  }

  async function handleRejectDocument(documentId: number, reason: string) {
    if (!headers) return
    try {
      await axios.patch(`/api/admin/review/documents/${documentId}`, { action: 'REJECT', reason }, { headers })
      notify('success', 'Đã từ chối và gửi thông báo cho người đăng')
      await Promise.all([
        refreshReviewDocuments(),
        refreshDocuments(),
        refreshOverview()
      ])
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không từ chối được tài liệu')
      throw err
    }
  }

  async function refreshComments() {
    if (!headers) return
    setModuleLoading('comments', true)
    try {
      const { data } = await axios.get<AdminCommentSummary[]>('/api/admin/comments', { headers })
      setComments(data)
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không tải được bình luận')
    } finally {
      setModuleLoading('comments', false)
    }
  }

  async function refreshSubjects() {
    if (!headers) return
    setModuleLoading('subjects', true)
    try {
      const { data } = await axios.get<AdminSubjectSummary[]>('/api/monhoc', { headers })
      setSubjects(data)
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không tải được danh sách môn học')
    } finally {
      setModuleLoading('subjects', false)
    }
  }

  async function handleCreateSubject(payload: AdminSubjectPayload) {
    if (!headers) return
    try {
      await axios.post('/api/monhoc', payload, { headers })
      notify('success', 'Đã thêm môn học')
      refreshSubjects()
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không thêm được môn học')
      throw err
    }
  }

  async function handleUpdateSubject(subjectId: number, payload: AdminSubjectPayload) {
    if (!headers) return
    try {
      await axios.put(`/api/monhoc/${subjectId}`, payload, { headers })
      notify('success', 'Đã cập nhật môn học')
      refreshSubjects()
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không cập nhật được môn học')
      throw err
    }
  }

  async function handleDeleteSubject(subjectId: number) {
    if (!headers) return
    try {
      await axios.delete(`/api/monhoc/${subjectId}`, { headers })
      notify('success', 'Đã xóa môn học')
      refreshSubjects()
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không xóa được môn học')
      throw err
    }
  }

  async function handleRoleChange(userId: number, roleId: number) {
    if (!headers) return
    try {
      await axios.patch(`/api/admin/users/${userId}`, { roleId }, { headers })
      notify('success', 'Đã cập nhật vai trò')
      refreshUsers()
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không cập nhật được vai trò')
    }
  }

  async function handleAccountLockChange(userId: number, accountLocked: boolean, lockReason?: string) {
    if (!headers) return
    const payload: Record<string, unknown> = { accountLocked }
    if (lockReason !== undefined) {
      payload.lockReason = lockReason
    }
    try {
      await axios.patch(`/api/admin/users/${userId}`, payload, { headers })
      notify('success', accountLocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản')
      refreshUsers()
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không cập nhật được trạng thái khóa')
    }
  }

  async function handleDeleteDocument(documentId: number) {
    if (!headers) return
    if (!window.confirm('Xóa tài liệu này? Thao tác không thể hoàn tác.')) return
    const reason = window.prompt('Nhập lý do xóa tài liệu (bắt buộc)')
    if (reason === null) {
      return
    }
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      notify('error', 'Vui lòng nhập lý do hợp lệ trước khi xóa')
      return
    }
    try {
      await axios.delete(`/api/admin/documents/${documentId}`, { headers, data: { reason: trimmedReason } })
      notify('success', 'Đã xóa tài liệu và cập nhật dữ liệu')
      await Promise.all([
        refreshDocuments(),
        refreshOverview(),
        refreshUsers(),
        refreshComments(),
        refreshSubjects()
      ])
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không xóa được tài liệu')
    }
  }

  async function handleChangeDocumentSubject(documentId: number, subjectId: number) {
    if (!headers) return
    try {
      await axios.patch(`/api/admin/documents/${documentId}/subject`, { subjectId }, { headers })
      notify('success', 'Đã cập nhật môn học cho tài liệu')
      await Promise.all([
        refreshDocuments(),
        refreshOverview(),
        refreshSubjects()
      ])
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không đổi được môn học')
      throw err
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!headers) return
    if (!window.confirm('Xóa bình luận này?')) return
    const reason = window.prompt('Nhập lý do xóa bình luận (bắt buộc)')
    if (reason === null) {
      return
    }
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      notify('error', 'Vui lòng nhập lý do hợp lệ trước khi xóa')
      return
    }
    try {
      await axios.delete(`/api/admin/comments/${commentId}`, { headers, data: { reason: trimmedReason } })
      notify('success', 'Đã xóa bình luận')
      refreshComments()
      refreshOverview()
    } catch (err: any) {
      notify('error', err?.response?.data?.error || 'Không xóa được bình luận')
    }
  }

  async function loadNotifications(options: { silent?: boolean } = {}) {
    if (!headers) return
    const silent = options.silent ?? false
    if (!silent) {
      setNotificationsLoading(true)
      setNotificationsError('')
    }
    try {
      const { data } = await axios.get<NotificationItem[]>('/api/notifications', { headers })
      setNotifications(data)
    } catch (err) {
      console.error('Cannot load notifications', err)
      if (!silent) {
        setNotificationsError('Không thể tải thông báo')
      }
    } finally {
      if (!silent) {
        setNotificationsLoading(false)
      }
    }
  }

  async function markNotificationRead(notificationId: number) {
    if (!headers) return
    try {
      await axios.post(`/api/notifications/${notificationId}/read`, null, { headers })
      setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)))
    } catch (err) {
      console.warn('Cannot mark notification as read', err)
    }
  }

  async function markAllNotificationsRead() {
    if (!headers) return
    if (!notifications.length) return
    try {
      await axios.post('/api/notifications/read-all', null, { headers })
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
    } catch (err) {
      console.warn('Cannot mark all notifications as read', err)
    }
  }

  async function deleteNotificationItem(notificationId: number) {
    if (!headers) return
    try {
      await axios.delete(`/api/notifications/${notificationId}`, { headers })
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId))
    } catch (err) {
      console.warn('Cannot delete notification', err)
      setNotificationsError('Không thể xóa thông báo')
    }
  }

  const actionableNotifications = React.useMemo(
    () => notifications.filter((item) => item.type === 'COMMENT_REPORT' || item.type === 'DOCUMENT_REVIEW_PENDING'),
    [notifications]
  )

  const unreadActionables = React.useMemo(
    () => actionableNotifications.filter((item) => !item.read).length,
    [actionableNotifications]
  )

  if (!token) {
    return (
      <div className="admin-guard">
        <div className="admin-guard-card">
          <LuShieldCheck size={42} />
          <h2>Yêu cầu đăng nhập</h2>
          <p>Bạn cần đăng nhập bằng tài khoản quản trị để xem trang này.</p>
          <button className="btn-primary" onClick={onBackHome}>Quay lại trang chính</button>
        </div>
      </div>
    )
  }

  function handleNotificationClick(notification: NotificationItem) {
    if (!notification.read) {
      markNotificationRead(notification.id)
    }
    if (notification.type === 'COMMENT_REPORT') {
      setSection('comments')
    } else if (notification.type === 'DOCUMENT_REVIEW_PENDING') {
      setSection('review')
    }
    setNotificationPanelOpen(false)
  }

  const navItems: SidebarItem[] = [
    { label: 'Thống kê', icon: LuPanelTop, active: section === 'overview', onClick: () => setSection('overview') },
    { label: 'Người dùng', icon: LuUsers, active: section === 'users', onClick: () => setSection('users') },
    { label: 'Tài liệu', icon: LuFileText, active: section === 'documents', onClick: () => setSection('documents') },
    { label: 'Kiểm duyệt', icon: LuShieldCheck, active: section === 'review', onClick: () => setSection('review') },
    { label: 'Môn học', icon: LuBookOpen, active: section === 'subjects', onClick: () => setSection('subjects') },
    { label: 'Bình luận', icon: LuMessageSquare, active: section === 'comments', onClick: () => setSection('comments') }
  ]

  const sectionTitle: Record<Section, string> = {
    overview: 'Bảng thống kê',
    users: 'Quản lý người dùng',
    documents: 'Quản lý tài liệu',
    review: 'Kiểm duyệt tài liệu',
    subjects: 'Quản lý môn học',
    comments: 'Quản lý bình luận'
  }

  function renderContent() {
    switch (section) {
      case 'overview':
        return (
          <OverviewSection
            overview={overview}
            loading={!!loading.overview}
            documents={documents}
            manageableUsers={manageableUsers}
            teacherStudentCount={teacherStudentCount}
            selectedWeek={selectedWeek}
            onChangeWeek={setSelectedWeek}
            weekOptions={weekOptions}
          />
        )
      case 'users':
        return (
          <UsersSection
            users={manageableUsers}
            loading={!!loading.users}
            roleOptions={ROLE_OPTIONS}
            onChangeRole={handleRoleChange}
            onToggleLock={handleAccountLockChange}
          />
        )
      case 'documents':
        return (
          <DocumentsSection
            documents={documents}
            loading={!!loading.documents}
            onDeleteDocument={handleDeleteDocument}
            onChangeSubject={handleChangeDocumentSubject}
            subjects={subjects}
            token={token}
          />
        )
      case 'review':
        return (
          <ReviewSection
            documents={reviewDocuments}
            loading={!!loading.review}
            token={token}
            onApprove={handleApproveDocument}
            onReject={handleRejectDocument}
          />
        )
      case 'subjects':
        return (
          <SubjectsSection
            subjects={subjects}
            loading={!!loading.subjects}
            onRefresh={refreshSubjects}
            onCreate={handleCreateSubject}
            onUpdate={handleUpdateSubject}
            onDelete={handleDeleteSubject}
          />
        )
      case 'comments':
        return (
          <CommentsSection
            comments={comments}
            loading={!!loading.comments}
            token={token}
            onDeleteComment={handleDeleteComment}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="admin-dashboard">
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
      <AdminLayout
        logoText="EduDocs Admin"
        logoSubtitle="Điều hành hệ thống"
        navItems={navItems}
        topTitle={sectionTitle[section]}
        topActions={(
          <div className="admin-top-actions-group" ref={notificationPanelRef}>
            <button
              className={`btn-icon admin-notification-button ${notificationPanelOpen ? 'active' : ''}`}
              title="Thông báo hệ thống"
              onClick={() => setNotificationPanelOpen((prev) => !prev)}
            >
              <LuBell />
              {unreadActionables > 0 && (
                <span className="admin-notification-badge">{unreadActionables > 99 ? '99+' : unreadActionables}</span>
              )}
            </button>
            {notificationPanelOpen && (
              <div className="admin-notification-panel">
                <header>
                  <div>
                    <p>Thông báo</p>
                    <span>{unreadActionables > 0 ? `${unreadActionables} chưa đọc` : 'Đã đọc tất cả'}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-soft btn-compact"
                    disabled={unreadActionables === 0}
                    onClick={markAllNotificationsRead}
                  >
                    Đánh dấu đã đọc
                  </button>
                </header>
                <div className="panel-body">
                  {notificationsLoading ? (
                    <p className="admin-notification-empty">Đang tải...</p>
                  ) : notificationsError ? (
                    <p className="admin-notification-error">{notificationsError}</p>
                  ) : actionableNotifications.length === 0 ? (
                    <p className="admin-notification-empty">Chưa có thông báo nào.</p>
                  ) : (
                    <ul>
                      {actionableNotifications.map((notification) => (
                        <li
                          key={notification.id}
                          className={notification.read ? 'read' : 'unread'}
                        >
                          <div className="admin-notification-item">
                            <button
                              type="button"
                              className="admin-notification-main"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <span className="message">{notification.message}</span>
                              <span className="meta">{new Date(notification.createdAt).toLocaleString('vi-VN')}</span>
                            </button>
                            <button
                              type="button"
                              className="admin-notification-delete"
                              title="Xóa thông báo"
                              onClick={(event) => {
                                event.stopPropagation()
                                event.preventDefault()
                                deleteNotificationItem(notification.id)
                              }}
                            >
                              <LuTrash2 size={16} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        userName="Quản trị viên"
        userRole="ADMIN"
        userActionLabel="Đăng xuất"
        onLogout={onLogout}
      >
        {renderContent()}
      </AdminLayout>
    </div>
  )
}

function buildWeekOptions(count = 4): WeekOption[] {
  const today = new Date()
  const mondayOffset = (today.getDay() + 6) % 7
  const currentMonday = new Date(today)
  currentMonday.setHours(0, 0, 0, 0)
  currentMonday.setDate(today.getDate() - mondayOffset)
  const options: WeekOption[] = []
  for (let i = 0; i < count; i += 1) {
    const start = new Date(currentMonday)
    start.setDate(currentMonday.getDate() - (i * 7))
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const startLabel = formatIsoDateLocal(start)
    const endLabel = formatIsoDateLocal(end)
    options.push({
      value: `${startLabel}_${endLabel}`,
      label: `${formatShortDate(start)} - ${formatShortDate(end)}`,
      order: i
    })
  }
  return options
}

function formatShortDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function formatIsoDateLocal(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
