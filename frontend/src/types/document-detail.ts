import type { DocumentItem } from './document'
import type { CommentItem } from './comment'
import type { RatingSummary } from './rating'

export interface DocumentDetail extends DocumentItem {
  description?: string
  rating?: RatingSummary
  comments: CommentItem[]
  viewerIsUploader?: boolean
  reportCount?: number
  reportedByViewer?: boolean
}
