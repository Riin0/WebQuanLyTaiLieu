export type Section = 'overview' | 'users' | 'documents' | 'review' | 'subjects' | 'comments'

export interface AdminOverview {
  totalUsers: number
  verifiedUsers: number
  totalDocuments: number
  totalDownloads: number
  documentsToday: number
  totalComments: number
}

export interface AdminUserSummary {
  id: number
  username?: string
  email: string
  avatarUrl?: string | null
  role?: string
  roleId?: number
  verified: boolean
  accountLocked: boolean
  lockReason?: string | null
  createdAt?: string
  lastUpload?: string
  totalDocuments: number
  totalDownloads: number
}

export interface AdminDocumentSummary {
  id: number
  title?: string
  subject?: string
  subjectId?: number
  type?: string
  uploader?: string
  uploaderEmail?: string
  downloadCount?: number
  uploadedAt?: string
  pendingSubject?: boolean
  reviewStatus?: string
  reportCount?: number
  reported?: boolean
}

export interface AdminCommentSummary {
  id: number
  documentId?: number
  documentTitle?: string
  author?: string
  content?: string
  createdAt?: string
  reportCount?: number
  flagged?: boolean
}

export interface AdminSubjectSummary {
  id: number
  tenMonHoc: string
  documentCount?: number
}

export interface AdminSubjectPayload {
  tenMonHoc: string
}

export interface WeekOption {
  value: string
  label: string
  order: number
}
