export interface NotificationItem {
  id: number
  message: string
  type: string
  read: boolean
  createdAt: string
  documentId?: number
  documentTitle?: string
  subjectName?: string
  reason?: string
}
