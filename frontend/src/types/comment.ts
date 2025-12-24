export interface CommentItem {
  id: number
  content: string | null
  authorName?: string
  authorEmail?: string
  authorRole?: string
  authorAvatarUrl?: string | null
  createdAt: string
  ratingScore?: number | null
  ratingOnly?: boolean
  authorIsUploader?: boolean
  parentId?: number | null
  replies?: CommentItem[]
  reportCount?: number
  reportedByViewer?: boolean
}
