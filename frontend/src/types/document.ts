export interface DocumentItem {
  id: number
  filename: string
  title?: string
  contentType: string
  size: number
  uploadDate: string
  uploaderName?: string
  uploaderEmail?: string
  uploaderRole?: string
  loaiTaiLieu?: string
  monHocId?: number
  monHocTen?: string
  downloadCount?: number
  pendingSubject?: boolean
  reviewStatus?: string
  reviewReason?: string
}
