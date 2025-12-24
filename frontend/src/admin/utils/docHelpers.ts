export function getFileIcon(contentType: string): string {
  const normalized = contentType.toLowerCase()
  if (normalized.includes('pdf')) return '📄'
  if (normalized.includes('word') || normalized.includes('document')) return '📝'
  if (normalized.includes('excel') || normalized.includes('spreadsheet')) return '📊'
  if (normalized.includes('powerpoint') || normalized.includes('presentation')) return '📽️'
  if (normalized.includes('image')) return '🖼️'
  if (normalized.includes('video')) return '🎥'
  if (normalized.includes('audio')) return '🎵'
  if (normalized.includes('zip') || normalized.includes('compressed')) return '📦'
  return '📎'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}

export function formatRelativeDate(dateString: string) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (diff < 60 * 1000) return 'Vừa xong'
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ngày trước`

  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
