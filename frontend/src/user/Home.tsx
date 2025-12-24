import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import axios from 'axios'
import {
  LuBell,
  LuBookOpen,
  LuCompass,
  LuFileText,
  LuLayoutDashboard,
  LuDownload,
  LuLogIn,
  LuSearch,
  LuShieldCheck,
  LuUpload,
  LuTrash2,
  LuX
} from 'react-icons/lu'
import UserLayout from './UserLayout'
import AllDocuments from '../components/AllDocuments'
import UploadPanel from '../components/UploadPanel'
import DocumentDetailPanel from '../components/DocumentDetailPanel'
import ProfilePanel, { UserProfileData } from '../components/ProfilePanel'
import type { SidebarItem } from '../layouts/LayoutShell'
import Subjects from './Subjects'
import type { Subject } from '../types/subject'
import type { SubjectDocument } from '../types/subject-document'
import type { DocumentItem } from '../types/document'
import type { DocumentCategory } from '../types/document-category'
import type { NotificationItem } from '../types/notification'
import '../styles/home.css'

interface HomeProps {
  token: string | null
  onLogout: () => void
  onShowLogin: () => void
  onShowRegister: () => void
  onShowAdmin: () => void
}

type ViewType = 'dashboard' | 'all-documents' | 'upload' | 'subjects' | 'profile'

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default function Home({ token, onLogout, onShowLogin, onShowRegister, onShowAdmin }: HomeProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [userInfo, setUserInfo] = useState<any>(null)
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [subjectsError, setSubjectsError] = useState('')
  const [subjectPanelOpen, setSubjectPanelOpen] = useState(false)
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null)
  const [subjectDocuments, setSubjectDocuments] = useState<SubjectDocument[]>([])
  const [subjectDocumentsLoading, setSubjectDocumentsLoading] = useState(false)
  const [subjectDocumentsError, setSubjectDocumentsError] = useState('')
  const [subjectDocumentsQuery, setSubjectDocumentsQuery] = useState('')
  const [subjectDocumentsPage, setSubjectDocumentsPage] = useState(1)
  const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([])
  const [documentCategoriesError, setDocumentCategoriesError] = useState('')
  const [detailDocument, setDetailDocument] = useState<DocumentItem | null>(null)
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [avatarVersion, setAvatarVersion] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const notificationPanelRef = useRef<HTMLDivElement | null>(null)
  const isGuest = !token
  const isAdmin = !isGuest && profileData?.role?.toUpperCase() === 'ADMIN'

  useEffect(() => {
    loadDocuments()
    loadSubjects()
    loadDocumentCategories()
  }, [])

  useEffect(() => {
    loadUserInfo()
  }, [token])

  useEffect(() => {
    if (!token) {
      setProfileData(null)
      setProfileError('')
      setAvatarVersion(0)
      return
    }
    loadProfile()
    setAvatarVersion((prev) => prev + 1)
  }, [token])

  useEffect(() => {
    if (!token) {
      setNotifications([])
      setNotificationPanelOpen(false)
      return
    }
    loadNotifications()
    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true })
    }, 60000)
    return () => window.clearInterval(intervalId)
  }, [token])

  useEffect(() => {
    if (!notificationPanelOpen) {
      return
    }
    const handleClick = (event: MouseEvent) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
        setNotificationPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notificationPanelOpen])

  useEffect(() => {
    if (isGuest && currentView === 'profile') {
      setCurrentView('dashboard')
    }
  }, [isGuest, currentView])

  async function loadDocuments() {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get('/api/documents', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      setDocuments(res.data)
    } catch (err: any) {
      setError('Không thể tải danh sách tài liệu')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadUserInfo() {
    if (!token) {
      setUserInfo(null)
      return
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const email = payload.sub
      const res = await axios.get('/api/auth/user-info', {
        params: { email },
        headers: { Authorization: `Bearer ${token}` }
      })
      setUserInfo(res.data)
    } catch (err) {
      console.error('Cannot load user info', err)
    }
  }

  async function loadProfile(options: { silent?: boolean } = {}) {
    if (!token) return
    const silent = options.silent ?? false
    if (!silent) {
      setProfileLoading(true)
    }
    setProfileError('')
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const { data } = await axios.get('/api/profile/me', { headers })
      const documents = Array.isArray(data.documents) ? data.documents : []
      const normalizedDocuments = documents.map((doc: any) => mapProfileDocument(doc))
      setProfileData({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        avatarUrl: data.avatarUrl,
        createdAt: data.createdAt,
        lastUpload: data.lastUpload,
        totalDocuments:
          typeof data.totalDocuments === 'number' ? data.totalDocuments : normalizedDocuments.length,
        totalDownloads: typeof data.totalDownloads === 'number' ? data.totalDownloads : 0,
        documents: normalizedDocuments
      })
    } catch (err) {
      console.error('Cannot load profile', err)
      setProfileError('Không thể tải thông tin hồ sơ')
    } finally {
      if (!silent) {
        setProfileLoading(false)
      }
    }
  }

  async function loadSubjects() {
    setSubjectsLoading(true)
    setSubjectsError('')
    try {
      const res = await axios.get('/api/monhoc')
      setSubjects(res.data)
    } catch (err) {
      console.error('Cannot load subjects', err)
      setSubjectsError('Không thể tải danh sách môn học')
    } finally {
      setSubjectsLoading(false)
    }
  }

  async function loadDocumentCategories() {
    setDocumentCategoriesError('')
    try {
      const res = await axios.get('/api/loaitailieu')
      const normalized: DocumentCategory[] = res.data?.map((item: any) => ({
        id: item.id,
        name: item.tenLoaiTaiLieu || 'Khác'
      })) || []
      setDocumentCategories(normalized)
    } catch (err) {
      console.error('Cannot load document categories', err)
      setDocumentCategoriesError('Không thể tải loại tài liệu')
    }
  }

  async function loadNotifications(options: { silent?: boolean } = {}) {
    if (!token) {
      return
    }
    const silent = options.silent ?? false
    if (!silent) {
      setNotificationsLoading(true)
    }
    if (!silent) {
      setNotificationsError('')
    }
    try {
      const headers = { Authorization: `Bearer ${token}` }
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
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    try {
      await axios.post(`/api/notifications/${notificationId}/read`, null, { headers })
      setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)))
    } catch (err) {
      console.warn('Cannot mark notification as read', err)
    }
  }

  async function markAllNotificationsRead() {
    if (!token || notifications.length === 0) return
    const headers = { Authorization: `Bearer ${token}` }
    try {
      await axios.post('/api/notifications/read-all', null, { headers })
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
    } catch (err) {
      console.warn('Cannot mark notifications as read', err)
    }
  }

  async function deleteNotificationItem(notificationId: number) {
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    try {
      await axios.delete(`/api/notifications/${notificationId}`, { headers })
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId))
    } catch (err) {
      console.warn('Cannot delete notification', err)
      setNotificationsError('Không thể xóa thông báo')
    }
  }

  async function openSubjectDocuments(subject: Subject) {
    setActiveSubject(subject)
    setSubjectDocuments([])
    setSubjectDocumentsError('')
    setSubjectDocumentsQuery('')
    setSubjectDocumentsPage(1)
    setSubjectPanelOpen(true)
    setSubjectDocumentsLoading(true)

    try {
      const res = await axios.get(`/api/monhoc/${subject.id}/documents`)
      setSubjectDocuments(res.data)
    } catch (err) {
      console.error('Cannot load subject documents', err)
      setSubjectDocumentsError('Không thể tải tài liệu cho môn này')
    } finally {
      setSubjectDocumentsLoading(false)
    }
  }

  function closeSubjectDocuments() {
    setSubjectPanelOpen(false)
    setActiveSubject(null)
    setSubjectDocuments([])
    setSubjectDocumentsError('')
    setSubjectDocumentsQuery('')
    setSubjectDocumentsPage(1)
  }

  function handleSubjectDocumentOpen(doc: SubjectDocument) {
    openDocumentDetailById(doc.id, {
      title: doc.tenTaiLieu,
      filename: doc.fileName || doc.tenTaiLieu,
      loaiTaiLieu: doc.loaiTaiLieu,
      monHocId: doc.monHocId,
      monHocTen: doc.monHoc,
      uploaderName: doc.nguoiDang,
      downloadCount: doc.soLuongNguoiTai,
      uploadDate: doc.thoiGianDang,
      contentType: 'application/octet-stream',
      size: 0
    })
    closeSubjectDocuments()
  }

  function buildDocumentSnapshot(partial: Partial<DocumentItem> & { id: number }): DocumentItem {
    return {
      id: partial.id,
      filename: partial.filename || partial.title || `document-${partial.id}`,
      title: partial.title,
      contentType: partial.contentType || 'application/octet-stream',
      size: partial.size ?? 0,
      uploadDate: partial.uploadDate || new Date().toISOString(),
      uploaderName: partial.uploaderName,
      uploaderEmail: partial.uploaderEmail,
      uploaderRole: partial.uploaderRole,
      loaiTaiLieu: partial.loaiTaiLieu,
      monHocId: partial.monHocId,
      monHocTen: partial.monHocTen,
      downloadCount: partial.downloadCount,
      pendingSubject: partial.pendingSubject,
      reviewStatus: partial.reviewStatus,
      reviewReason: partial.reviewReason
    }
  }

  function mapProfileDocument(doc: any): DocumentItem {
    return buildDocumentSnapshot({
      id: doc.id,
      filename: doc.filename || doc.title || `document-${doc.id}`,
      title: doc.title,
      contentType: doc.contentType || 'application/octet-stream',
      size: doc.size ?? 0,
      uploadDate: doc.uploadDate || doc.createdAt || new Date().toISOString(),
      uploaderName: doc.uploaderName,
      uploaderEmail: doc.uploaderEmail,
      uploaderRole: doc.uploaderRole,
      loaiTaiLieu: doc.loaiTaiLieu,
      monHocId: doc.monHocId,
      monHocTen: doc.monHocTen,
      downloadCount: doc.downloadCount,
      pendingSubject: doc.pendingSubject,
      reviewStatus: doc.reviewStatus,
      reviewReason: doc.reviewReason
    })
  }

  function openDocumentDetail(doc: DocumentItem) {
    setDetailDocument(doc)
  }

  function openDocumentDetailFromPartial(partial: Partial<DocumentItem> & { id: number }) {
    setDetailDocument(buildDocumentSnapshot(partial))
  }

  function closeDocumentDetail() {
    setDetailDocument(null)
  }

  function openDocumentDetailById(id: number, fallback?: Partial<DocumentItem>) {
    const existing = documents.find((doc) => doc.id === id)
    if (existing) {
      setDetailDocument(existing)
      return
    }
    if (fallback) {
      openDocumentDetailFromPartial({ ...fallback, id })
    }
  }

  function handleNotificationSelect(item: NotificationItem) {
    if (!item.read) {
      markNotificationRead(item.id)
    }
    if (item.documentId) {
      openDocumentDetailById(item.documentId, {
        id: item.documentId,
        title: item.documentTitle || undefined,
        filename: item.documentTitle || `document-${item.documentId}`,
        contentType: 'application/octet-stream',
        size: 0,
        uploadDate: new Date().toISOString(),
        pendingSubject: true
      })
    }
    setNotificationPanelOpen(false)
  }

  function goToLibrary(subject?: Subject) {
    if (subject?.tenMonHoc) {
      setSearchTerm(subject.tenMonHoc)
    }
    setCurrentView('all-documents')
    closeSubjectDocuments()
  }

  function handleUploadSuccess() {
    loadDocuments()
    loadSubjects()
    loadProfile({ silent: true })
    setCurrentView('all-documents')
  }

  function handleUploadCancel() {
    setCurrentView('dashboard')
  }

  function handleUploadNavigation() {
    if (isGuest) {
      onShowLogin()
      return
    }
    setCurrentView('upload')
  }

  function handleProfileEntry() {
    if (isGuest) {
      onShowLogin()
      return
    }
    setCurrentView('profile')
  }

  function handleAdminEntry() {
    if (isGuest) {
      onShowLogin()
      return
    }
    onShowAdmin()
  }


  async function handleDownload(doc: DocumentItem) {
    try {
      const filename = getDownloadFilename(doc)
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const res = await axios.get(`/api/documents/${doc.id}/download`, {
        headers,
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      bumpDownloadCount(doc.id)
      await refreshDocumentMeta(doc.id, headers)
    } catch (err) {
      alert('Không thể tải xuống tài liệu')
    }
  }

  function bumpDownloadCount(id: number) {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, downloadCount: (doc.downloadCount ?? 0) + 1 } : doc
      )
    )
    setSubjectDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              soLuongNguoiTai: (doc.soLuongNguoiTai ?? 0) + 1
            }
          : doc
      )
    )
  }

  async function refreshDocumentMeta(id: number, headers?: Record<string, string>) {
    try {
      const { data } = await axios.get(`/api/documents/${id}`, { headers })
      setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, ...data } : doc)))
      setSubjectDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                soLuongNguoiTai:
                  typeof data.downloadCount === 'number'
                    ? data.downloadCount
                    : (doc.soLuongNguoiTai ?? 0)
              }
            : doc
        )
      )
    } catch (err) {
      // đã tăng optimistic nên không cần xử lý thêm
    }
  }

  const handleDocumentSubjectUpdated = useCallback(
    (docId: number, subjectId: number | null, subjectName?: string) => {
      const resolvedName = subjectId ? subjectName || 'Môn học chưa rõ' : undefined
      const updateDoc = (doc: DocumentItem) =>
        doc.id === docId
          ? {
              ...doc,
              monHocId: subjectId ?? undefined,
              monHocTen: resolvedName,
              pendingSubject: false
            }
          : doc

      setDocuments((prev) => prev.map(updateDoc))
      setDetailDocument((prev) =>
        prev && prev.id === docId
          ? {
              ...prev,
              monHocId: subjectId ?? undefined,
              monHocTen: resolvedName,
              pendingSubject: false
            }
          : prev
      )
      setProfileData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          documents: prev.documents.map(updateDoc)
        }
      })
    },
    []
  )

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (diff < 60 * 1000) {
      return 'Vừa xong'
    }
    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes < 60) {
      return `${minutes} phút trước`
    }
    if (hours < 24) {
      return `${hours} giờ trước`
    }
    const days = Math.floor(hours / 24)
    if (days < 7) {
      return `${days} ngày trước`
    }

    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  function getFileIcon(contentType: string): string {
    if (contentType.includes('pdf')) return '📄'
    if (contentType.includes('word') || contentType.includes('document')) return '📝'
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊'
    if (contentType.includes('powerpoint') || contentType.includes('presentation')) return '📽️'
    if (contentType.includes('image')) return '🖼️'
    if (contentType.includes('video')) return '🎥'
    if (contentType.includes('audio')) return '🎵'
    if (contentType.includes('zip') || contentType.includes('compressed')) return '📦'
    return '📎'
  }

  function formatCategoryCount(value: number): string {
    if (value >= 1000) {
      const display = (value / 1000).toFixed(1)
      return `${display.endsWith('.0') ? display.slice(0, -2) : display}K`
    }
    return value.toLocaleString('vi-VN')
  }

  function getDownloadFilename(doc: DocumentItem): string {
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

  function renderUploaderInfo(
    doc: DocumentItem,
    fallback = 'N/A',
    layout: 'inline' | 'stacked' = 'inline'
  ) {
    const label = doc.uploaderName || doc.uploaderEmail || fallback
    return (
      <div className={`uploader-pill ${layout === 'stacked' ? 'stacked' : ''}`}>
        <span className="uploader-name">{label}</span>
        {doc.uploaderRole && <span className="role-badge">{doc.uploaderRole}</span>}
      </div>
    )
  }

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 5)

  const featuredDoc = useMemo(() => {
    if (!documents.length) return undefined
    return [...documents].sort((a, b) => (b.downloadCount ?? 0) - (a.downloadCount ?? 0))[0]
  }, [documents])

  const storageCapacityBytes = 200 * 1024 * 1024 * 1024
  const totalSizeBytes = documents.reduce((sum, doc) => sum + (doc.size || 0), 0)
  const storagePercent = Math.max(
    0,
    Math.min(100, Math.round(storageCapacityBytes === 0 ? 0 : (totalSizeBytes / storageCapacityBytes) * 100) || 0)
  )
  const libraryImageSrc = new URL('../assets/library.jpg', import.meta.url).href
  const pillTones = ['primary', 'secondary', 'accent', 'neutral']
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    documents.forEach((doc) => {
      if (!doc.loaiTaiLieu) return
      counts[doc.loaiTaiLieu] = (counts[doc.loaiTaiLieu] || 0) + 1
    })
    return counts
  }, [documents])

  const fallbackCategories = [
    { label: 'Giáo trình', count: 2100 },
    { label: 'Bài giảng', count: 1400 },
    { label: 'Đề thi', count: 1200 },
    { label: 'Bài tập', count: 845 },
    { label: 'Luận văn', count: 634 },
    { label: 'Tham khảo', count: 512 }
  ]

  const categoryPills = (documentCategories.length ? documentCategories : fallbackCategories)
    .slice(0, 6)
    .map((category, index) => {
      const label = 'name' in category ? category.name : category.label
      const count = 'count' in category ? category.count : categoryCounts[label] || 0
      return {
        label,
        count,
        tone: pillTones[index % pillTones.length]
      }
    })

  const subjectPalette = ['#6366f1', '#22c55e', '#fbbf24', '#f97316', '#ec4899', '#0ea5e9', '#a855f7']
  const timelineEntries = recentDocuments.slice(0, 5)
  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])
  const trimmedSubjectQuery = subjectDocumentsQuery.trim()
  const normalizedSubjectQuery = trimmedSubjectQuery.toLowerCase()
  const highlightSubjectDocText = useCallback((text?: string | null) => {
    if (text == null) return null
    if (!trimmedSubjectQuery) return text
    const regex = new RegExp(`(${escapeRegExp(trimmedSubjectQuery)})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, index) => {
      if (normalizedSubjectQuery && part.toLowerCase() === normalizedSubjectQuery) {
        return (
          <mark key={`${text}-${index}`} className="search-highlight">
            {part}
          </mark>
        )
      }
      return <React.Fragment key={`${text}-${index}`}>{part}</React.Fragment>
    })
  }, [trimmedSubjectQuery, normalizedSubjectQuery])
  const filteredSubjectDocuments = subjectDocuments.filter((doc) => {
    if (!normalizedSubjectQuery) return true
    const titleSource = (doc.tenTaiLieu || doc.fileName || '').toLowerCase()
    return titleSource.includes(normalizedSubjectQuery)
  })

  const SUBJECT_DOC_PAGE_SIZE = 5
  const totalSubjectDocPages = Math.max(1, Math.ceil(filteredSubjectDocuments.length / SUBJECT_DOC_PAGE_SIZE))
  const visibleSubjectDocuments = filteredSubjectDocuments.slice(
    (subjectDocumentsPage - 1) * SUBJECT_DOC_PAGE_SIZE,
    subjectDocumentsPage * SUBJECT_DOC_PAGE_SIZE
  )

  useEffect(() => {
    if (subjectDocumentsPage > totalSubjectDocPages) {
      setSubjectDocumentsPage(totalSubjectDocPages)
    }
  }, [subjectDocumentsPage, totalSubjectDocPages])

  const navItems: SidebarItem[] = [
    {
      label: 'Trang chủ',
      icon: LuLayoutDashboard,
      active: currentView === 'dashboard',
      onClick: () => setCurrentView('dashboard')
    },
    {
      label: 'Tất cả tài liệu',
      icon: LuFileText,
      active: currentView === 'all-documents',
      onClick: () => setCurrentView('all-documents')
    },
    {
      label: 'Môn học',
      icon: LuBookOpen,
      active: currentView === 'subjects',
      onClick: () => setCurrentView('subjects')
    }
  ]

  if (!isGuest) {
    navItems.push({
      label: 'Tải lên tài liệu',
      icon: LuUpload,
      active: currentView === 'upload',
      onClick: () => setCurrentView('upload')
    })
  }

  if (isAdmin) {
    navItems.push({
      label: 'Trang admin',
      icon: LuShieldCheck,
      active: false,
      onClick: handleAdminEntry
    })
  }

  const topActions = isGuest ? (
    <>
      <button className="btn-dark" onClick={onShowLogin}>
        Đăng nhập
      </button>
      <button className="btn-cta" onClick={onShowRegister}>
        Đăng ký
      </button>
    </>
  ) : (
    <>
      {/** notification panel */}
      <div className="notification-control" ref={notificationPanelRef}>
        <button
          className={`btn-icon ${notificationPanelOpen ? 'active' : ''}`}
          title="Thông báo"
          onClick={() => {
            if (!notificationPanelOpen && !notificationsLoading) {
              loadNotifications()
            }
            setNotificationPanelOpen((prev) => !prev)
          }}
        >
          <LuBell />
          {unreadNotifications > 0 && (
            <span className="notification-dot">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
          )}
        </button>
        {notificationPanelOpen && (
          <div className="notification-panel">
            <header className="notification-panel-header">
              <div>
                <p>Thông báo</p>
                <span>{unreadNotifications > 0 ? `${unreadNotifications} chưa đọc` : 'Đã đọc tất cả'}</span>
              </div>
              <button
                type="button"
                className="link-button"
                onClick={markAllNotificationsRead}
                disabled={unreadNotifications === 0}
              >
                Đánh dấu đã đọc
              </button>
            </header>
            <div className="notification-panel-body">
              {notificationsLoading ? (
                <p className="notification-empty">Đang tải...</p>
              ) : notifications.length === 0 ? (
                <p className="notification-empty">Chưa có thông báo</p>
              ) : (
                <ul>
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <div className={`notification-item ${item.read ? 'read' : ''}`}>
                        <button
                          type="button"
                          className="notification-item-main"
                          onClick={() => handleNotificationSelect(item)}
                        >
                          {renderNotificationContent(item)}
                        </button>
                        <button
                          type="button"
                          className="notification-item-delete"
                          title="Xóa thông báo"
                          onClick={(event) => {
                            event.stopPropagation()
                            event.preventDefault()
                            deleteNotificationItem(item.id)
                          }}
                        >
                          <LuTrash2 size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {notificationsError && <p className="notification-error">{notificationsError}</p>}
            </div>
          </div>
        )}
      </div>
      {isAdmin && (
        <button className="btn-cta" onClick={handleAdminEntry}>
          <LuShieldCheck size={18} />
          <span>Trang admin</span>
        </button>
      )}
    </>
  )

  const displayName =
    userInfo?.fullName ||
    userInfo?.username ||
    userInfo?.email?.split('@')[0] ||
    (isGuest ? 'Khách' : undefined)

  const userRoleLabel = isGuest ? 'Truy cập công khai' : profileData?.role || 'Thành viên'
  const sidebarAvatar = profileData?.avatarUrl
    ? (
        <img
          src={`${profileData.avatarUrl}?v=${avatarVersion}`}
          alt="Ảnh đại diện"
        />
      )
    : undefined

  // Render Dashboard View
  const renderDashboard = () => (
    <div className="dashboard-view">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="hero-eyebrow">Trung tâm học liệu</p>
          <h2>Xin chào, {displayName || 'bạn'}.</h2>
          <p className="hero-description">
            Tất cả giáo trình, ghi chú và đề cương của bạn được gom về một nơi duy nhất. Theo dõi tiến độ và chia sẻ tri thức chỉ trong vài thao tác.
          </p>
          <div className="hero-actions">
            <button
              className="btn-cta"
              onClick={() => (isGuest ? onShowLogin() : setCurrentView('upload'))}
            >
              <LuUpload size={18} />
              <span>Tải lên tài liệu</span>
            </button>
            <button className="btn-ghost" onClick={() => setCurrentView('all-documents')}>
              <LuCompass size={18} />
              <span>Khám phá thư viện</span>
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orb" />
          <div className="hero-image-card">
            <div className="hero-image-border">
              <img src={libraryImageSrc} alt="Thư viện số" loading="lazy" />
            </div>
            <div className="hero-image-fog" />
          </div>
        </div>
      </section>

      <section className="subject-section">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Môn học</p>
            <h3 className="section-title">Danh sách môn đang có</h3>
          </div>
        </div>
        {subjectsError && <p className="subject-error">{subjectsError}</p>}
        {subjectsLoading ? (
          <p className="subject-placeholder">Đang tải danh sách môn học...</p>
        ) : subjects.length === 0 ? (
          <p className="subject-placeholder">Chưa có môn học nào được thêm.</p>
        ) : (
          <div className="subject-grid">
            {subjects.slice(0, 6).map((subject, index) => {
              const accent = subjectPalette[index % subjectPalette.length]
              return (
                <article key={subject.id || index} className="subject-card">
                  <div className="subject-card-head">
                    <div className="subject-dot" style={{ backgroundColor: accent }} />
                    <div className="subject-card-body">
                      <h3>{subject.tenMonHoc}</h3>
                    </div>
                    <span className="subject-badge">{(subject.documentCount ?? 0).toLocaleString('vi-VN')}</span>
                  </div>
                  <button className="subject-card-button" onClick={() => openSubjectDocuments(subject)}>
                    <LuBookOpen size={16} />
                    <span>Xem tài liệu</span>
                  </button>
                </article>
              )
            })}
          </div>
        )}
        {subjects.length > 6 && !subjectsLoading && (
          <button
            className="subject-view-all"
            onClick={() => setCurrentView('subjects')}
          >
            Xem tất cả môn
          </button>
        )}
      </section>

      <section className="panels-grid">
        <article className="panel categories-panel">
          <div className="panel-header">
            <div>
              <p className="section-eyebrow">Các loại tài liệu</p>
              <h3>Tài liệu tiêu biểu</h3>
            </div>
            <button className="btn-inline" onClick={() => setCurrentView('all-documents')}>
              Quản lý
            </button>
          </div>
          <div className="pill-grid">
            {categoryPills.map((category) => (
              <button key={category.label} className={`pill pill-${category.tone}`}>
                <span>{category.label}</span>
                <strong>{formatCategoryCount(category.count)}</strong>
              </button>
            ))}
            {documentCategoriesError && <p className="filter-error">{documentCategoriesError}</p>}
          </div>
        </article>

        <article className="panel timeline-panel">
          <div className="panel-header">
            <div>
              <p className="section-eyebrow">Dòng chảy</p>
              <h3>Hoạt động gần đây</h3>
            </div>
          </div>
          <div className="timeline">
            {timelineEntries.length === 0 ? (
              <p className="empty-copy">Chưa có hoạt động nào trong 24 giờ qua.</p>
            ) : (
              timelineEntries.map((doc) => (
                <div key={doc.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-body">
                    <button
                      type="button"
                      className="timeline-title link"
                      onClick={() => openDocumentDetail(doc)}
                    >
                      {doc.title || doc.filename}
                    </button>
                    <div className="timeline-meta">
                      <span>{formatDate(doc.uploadDate)}</span>
                      <span className="meta-separator">•</span>
                      <span>{doc.loaiTaiLieu || 'Chưa phân loại'}</span>
                      {typeof doc.downloadCount === 'number' && (
                        <>
                          <span className="meta-separator">•</span>
                          <span>{doc.downloadCount.toLocaleString('vi-VN')} lượt tải</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel highlight-panel">
          <div className="panel-header">
            <div>
              <p className="section-eyebrow">Nhấn mạnh</p>
              <h3>Tài liệu nổi bật</h3>
            </div>
          </div>
          {featuredDoc ? (
            <div className="highlight-body">
              <div className="highlight-icon">{getFileIcon(featuredDoc.contentType)}</div>
              <div>
                <h4>{featuredDoc.title || featuredDoc.filename}</h4>
                <div className="highlight-meta">
                  {renderUploaderInfo(featuredDoc, 'Ai đó')}
                  <span className="meta-separator">•</span>
                  <span>{formatDate(featuredDoc.uploadDate)}</span>
                  {typeof featuredDoc.downloadCount === 'number' && (
                    <>
                      <span className="meta-separator">•</span>
                      <span>{featuredDoc.downloadCount.toLocaleString('vi-VN')} lượt tải</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="empty-copy">Chưa có tài liệu nào để đề xuất.</p>
          )}
        </article>
      </section>

      <section className="recent-documents-section">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Danh sách mới</p>
            <h3 className="section-title">Tài liệu vừa cập nhật</h3>
          </div>
          <button className="btn-view-all" onClick={() => setCurrentView('all-documents')}>
            Xem tất cả
          </button>
        </div>
        <div className="documents-table">
          <table>
            <thead>
              <tr>
                <th>Tên tài liệu</th>
                <th>Người tải lên</th>
                <th>Phân loại</th>
                <th>Lượt tải</th>
                <th>Kích thước</th>
                <th>Ngày tải lên</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {recentDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="doc-cell">
                      <span className="doc-icon">{getFileIcon(doc.contentType)}</span>
                        <div className="doc-info">
                          <button
                            type="button"
                            className="doc-title-link"
                            onClick={() => openDocumentDetail(doc)}
                          >
                            {doc.title || doc.filename}
                          </button>
                        </div>
                    </div>
                  </td>
                  <td>{renderUploaderInfo(doc, 'N/A', 'stacked')}</td>
                  <td>
                    <div className="doc-meta-badges">
                      <span className="badge">{doc.loaiTaiLieu || 'Chưa phân loại'}</span>
                      <span className="doc-subject-hint">{doc.monHocTen || 'Chưa gán môn'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="download-count-chip">
                      {(doc.downloadCount ?? 0).toLocaleString('vi-VN')} lượt
                    </span>
                  </td>
                  <td>{formatFileSize(doc.size)}</td>
                  <td>{formatDate(doc.uploadDate)}</td>
                  <td className="text-center">
                    <button
                      className="btn-action download"
                      onClick={() => handleDownload(doc)}
                      title="Tải xuống"
                    >
                      <LuDownload size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )

  function renderNotificationContent(item: NotificationItem) {
    const [mainText, reasonInMessage] = item.message.split('Lý do:')
    const derivedReason = (item.reason ?? '').trim() || reasonInMessage?.trim()
    const baseMessage = derivedReason ? (mainText?.trim() || item.message) : item.message
    const isReviewRejection = item.type === 'DOCUMENT_REVIEW_REJECTED'

    return (
      <>
        <span className={`notification-message ${isReviewRejection ? 'rejection' : ''}`}>
          {baseMessage}
        </span>
        {derivedReason && <span className="notification-meta">Lý do: {derivedReason}</span>}
        <span className="notification-meta">
          {(item.documentTitle || 'Tài liệu') + ' • ' + formatDate(item.createdAt)}
        </span>
        {item.subjectName && <span className="notification-meta">Môn: {item.subjectName}</span>}
      </>
    )
  }


  const renderSubjectDocumentsPanel = () => {
    if (!subjectPanelOpen || !activeSubject) return null

    return (
      <div className="subject-doc-overlay" onClick={closeSubjectDocuments}>
        <div className="subject-doc-panel" onClick={(e) => e.stopPropagation()}>
          <div className="subject-doc-header">
            <div>
              <p className="section-eyebrow">Tài liệu theo môn</p>
              <h3>{activeSubject.tenMonHoc}</h3>
              <p className="subject-doc-subtitle">
                {(activeSubject.documentCount ?? 0).toLocaleString('vi-VN')} tài liệu đã được ghi nhận
              </p>
            </div>
            <button className="subject-doc-close" onClick={closeSubjectDocuments}>
              <LuX size={18} />
            </button>
          </div>

          <form className="subject-doc-filter" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="subject-doc-search">Tìm kiếm nhanh</label>
            <div className="subject-doc-search">
              <LuSearch size={16} />
              <input
                id="subject-doc-search"
                type="text"
                placeholder="Nhập tên tài liệu..."
                value={subjectDocumentsQuery}
                onChange={(e) => {
                  setSubjectDocumentsQuery(e.target.value)
                  setSubjectDocumentsPage(1)
                }}
              />
            </div>
            <div className="subject-doc-filter-actions">
              <button
                type="button"
                className="subject-doc-reset"
                onClick={() => {
                  setSubjectDocumentsQuery('')
                  setSubjectDocumentsPage(1)
                }}
              >
                Xóa lọc
              </button>
              <button
                type="button"
                className="subject-doc-library"
                onClick={() => {
                  if (activeSubject) goToLibrary(activeSubject)
                }}
              >
                Đi tới thư viện
              </button>
            </div>
          </form>

          <div className="subject-doc-list">
            {subjectDocumentsLoading ? (
              <div className="subjects-placeholder">Đang tải tài liệu...</div>
            ) : subjectDocumentsError ? (
              <div className="subjects-error">{subjectDocumentsError}</div>
            ) : filteredSubjectDocuments.length === 0 ? (
              <div className="subject-doc-empty">Không có tài liệu phù hợp cho bộ lọc hiện tại.</div>
            ) : (
              <>
                {visibleSubjectDocuments.map((doc) => (
                <article key={doc.id} className="subject-doc-card">
                  <header>
                    <div>
                      <button
                        type="button"
                        className="subject-doc-title"
                        onClick={() => handleSubjectDocumentOpen(doc)}
                      >
                        {highlightSubjectDocText(doc.tenTaiLieu || doc.fileName || '')}
                      </button>
                      {doc.moTa && <p className="subject-doc-description">{doc.moTa}</p>}
                    </div>
                    {doc.loaiTaiLieu && <span className="subject-doc-pill">{doc.loaiTaiLieu}</span>}
                  </header>
                  <div className="subject-doc-meta">
                    <span>{doc.nguoiDang || 'Chưa rõ người đăng'}</span>
                    {doc.thoiGianDang && <span>{formatDate(doc.thoiGianDang)}</span>}
                    {typeof doc.soLuongNguoiTai === 'number' && (
                      <span>{doc.soLuongNguoiTai.toLocaleString('vi-VN')} lượt tải</span>
                    )}
                  </div>
                </article>
                ))}
                {filteredSubjectDocuments.length > SUBJECT_DOC_PAGE_SIZE && (
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setSubjectDocumentsPage((prev) => Math.max(1, prev - 1))}
                      disabled={subjectDocumentsPage === 1}
                    >
                      Trước
                    </button>
                    <span className="pagination-status">
                      Trang {subjectDocumentsPage}/{totalSubjectDocPages}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() =>
                        setSubjectDocumentsPage((prev) => Math.min(totalSubjectDocPages, prev + 1))
                      }
                      disabled={subjectDocumentsPage === totalSubjectDocPages}
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const pageTitle =
    currentView === 'dashboard'
      ? 'Dashboard'
      : currentView === 'all-documents'
        ? 'Tất Cả Tài Liệu'
        : currentView === 'subjects'
          ? 'Danh Sách Môn'
          : currentView === 'profile'
            ? 'Trang Cá Nhân'
            : 'Tải Lên Tài Liệu'

  return (
    <>
      <UserLayout
        logoText="EduDocs"
        logoSubtitle="Hệ Thống Tài Liệu"
        navItems={navItems}
        userName={displayName}
        userRole={userRoleLabel}
        userAvatar={sidebarAvatar}
        logoutIcon={isGuest ? <LuLogIn /> : undefined}
        userActionLabel={isGuest ? 'Đăng nhập' : 'Đăng xuất'}
        onLogout={isGuest ? onShowLogin : onLogout}
        topTitle={pageTitle}
        topActions={topActions}
        onProfileClick={handleProfileEntry}
      >
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'all-documents' && (
          <AllDocuments
            documents={documents}
            loading={loading}
            searchTerm={searchTerm}
            isGuest={isGuest}
            categories={documentCategories}
            categoriesError={documentCategoriesError}
            onSearchTermChange={setSearchTerm}
            onUploadClick={handleUploadNavigation}
            onDownload={handleDownload}
            onShowLogin={onShowLogin}
            onShowRegister={onShowRegister}
            getFileIcon={getFileIcon}
            formatFileSize={formatFileSize}
            formatDate={formatDate}
            onOpenDetail={openDocumentDetail}
          />
        )}
        {currentView === 'subjects' && (
          <Subjects
            subjects={subjects}
            palette={subjectPalette}
            loading={subjectsLoading}
            error={subjectsError}
            onViewDocuments={goToLibrary}
            onSubjectSelect={openSubjectDocuments}
          />
        )}
        {currentView === 'profile' && (
          token ? (
            <ProfilePanel
              token={token}
              profile={profileData}
              loading={profileLoading}
              error={profileError}
              avatarVersion={avatarVersion}
              onReload={() => loadProfile({ silent: true })}
              onAvatarUpdated={() => setAvatarVersion((prev) => prev + 1)}
              onOpenDocument={openDocumentDetail}
              onDownload={handleDownload}
              formatDate={formatDate}
              formatFileSize={formatFileSize}
              getFileIcon={getFileIcon}
            />
          ) : (
            <div className="profile-view placeholder">
              <p>Vui lòng đăng nhập để xem hồ sơ.</p>
            </div>
          )
        )}
        {currentView === 'upload' && (
          <UploadPanel
            token={token}
            isGuest={isGuest}
            getFileIcon={getFileIcon}
            formatFileSize={formatFileSize}
            onShowLogin={onShowLogin}
            onShowRegister={onShowRegister}
            onCancel={handleUploadCancel}
            onSuccess={handleUploadSuccess}
          />
        )}

        {renderSubjectDocumentsPanel()}
      </UserLayout>

      <DocumentDetailPanel
        documentId={detailDocument?.id ?? null}
        token={token}
        summary={detailDocument}
        onClose={closeDocumentDetail}
        onRequireAuth={onShowLogin}
        onDownload={handleDownload}
        getFileIcon={getFileIcon}
        formatFileSize={formatFileSize}
        formatDate={formatDate}
        subjects={subjects}
        onSubjectUpdated={handleDocumentSubjectUpdated}
        viewerIsAdmin={isAdmin}
      />
    </>
  )
}
