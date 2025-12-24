import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url'
import JSZip from 'jszip'
import { read as readXlsx, utils as xlsxUtils } from 'xlsx'

GlobalWorkerOptions.workerSrc = pdfWorker

interface UploadPanelProps {
  token: string | null
  isGuest: boolean
  getFileIcon: (contentType: string) => string
  formatFileSize: (bytes: number) => string
  onShowLogin: () => void
  onShowRegister: () => void
  onCancel: () => void
  onSuccess: () => void
}

interface SubjectOption {
  id: number
  tenMonHoc: string
  documentCount: number
}

const uploadHighlights = [
  { label: 'Dung lượng tối đa', value: '200MB' },
  { label: 'Định dạng hỗ trợ', value: 'PDF · DOCX · XLSX · PPTX' },
  { label: 'Trang bìa tạm thời', value: 'Lấy từ trang đầu' }
]

const uploadGuidelines = [
  'Đặt tên rõ ràng, dễ tìm kiếm',
  'Ưu tiên file dưới 100MB để tải nhanh',
  'Đính kèm mô tả súc tích nếu có'
]

const uploadChecks = [
  'Quét virus trước khi tải',
  'Không chứa thông tin nhạy cảm',
  'Đã kiểm tra nội dung chính xác'
]

const MAX_PREVIEW_LINES = 6
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'rar']
const ICON_ONLY_EXTENSIONS = ['xls', 'xlsx', 'csv', 'zip', 'rar', '7z']

type CoverThemeKey = 'PDF' | 'WORD' | 'PPT' | 'EXCEL' | 'ZIP' | 'DEFAULT'

const coverThemes: Record<CoverThemeKey, { accent: string; gradient: string; badgeBg: string }> = {
  PDF: { accent: '#d14343', gradient: 'linear-gradient(135deg,#ffe9e7,#fff4ef)', badgeBg: 'rgba(209,67,67,0.12)' },
  WORD: { accent: '#1a73e8', gradient: 'linear-gradient(135deg,#e8f0ff,#f6f9ff)', badgeBg: 'rgba(26,115,232,0.12)' },
  PPT: { accent: '#d24726', gradient: 'linear-gradient(135deg,#ffe7dd,#fff4ee)', badgeBg: 'rgba(210,71,38,0.12)' },
  EXCEL: { accent: '#0f9d58', gradient: 'linear-gradient(135deg,#e1f3eb,#f3fff5)', badgeBg: 'rgba(15,157,88,0.12)' },
  ZIP: { accent: '#6f42c1', gradient: 'linear-gradient(135deg,#f1e9ff,#faf6ff)', badgeBg: 'rgba(111,66,193,0.12)' },
  DEFAULT: { accent: '#111c4e', gradient: 'linear-gradient(135deg,#edf2ff,#fdfbff)', badgeBg: 'rgba(17,28,78,0.12)' }
}

function getFileExtension(name: string) {
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.substring(idx + 1).toLowerCase()
}

function isAllowedExtension(extension: string) {
  return ALLOWED_EXTENSIONS.includes(extension)
}

function isIconOnlyExtension(extension: string) {
  return ICON_ONLY_EXTENSIONS.includes(extension)
}

function trimName(name: string, limit = 42) {
  return name.length <= limit ? name : name.slice(0, limit - 1) + '…'
}

function sanitizeSvgText(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildSvgCover({
  theme,
  title,
  subtitle,
  lines
}: {
  theme: CoverThemeKey
  title: string
  subtitle?: string
  lines: string[]
}) {
  const palette = coverThemes[theme] || coverThemes.DEFAULT
  const safeLines = lines.length ? lines : ['Không thể trích xuất nội dung từ tệp này.']
  const lineSpans = safeLines
    .slice(0, MAX_PREVIEW_LINES)
    .map((line, index) => `<tspan x="80" dy="${index === 0 ? 0 : 32}">${sanitizeSvgText(line)}</tspan>`)
    .join('')
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <defs>
      <style>
        .title { font: 700 64px 'Space Grotesk', 'Segoe UI', sans-serif; fill: #101125; }
        .subtitle { font: 500 24px 'Space Grotesk', 'Segoe UI', sans-serif; fill: #6d6f80; }
        .body { font: 400 22px 'Space Grotesk', 'Segoe UI', sans-serif; fill: #2d2e3a; }
        .badge { font: 700 24px 'Space Grotesk', 'Segoe UI', sans-serif; text-transform: uppercase; letter-spacing: 6px; }
      </style>
    </defs>
    <rect width="1200" height="675" rx="40" fill="${palette.gradient}" />
    <rect x="70" y="70" width="1060" height="535" rx="32" fill="#fff" stroke="rgba(16,17,37,0.08)" />
    <rect x="70" y="150" width="1060" height="110" fill="${palette.badgeBg}" />
    <text x="90" y="215" class="badge" fill="${palette.accent}">${sanitizeSvgText(subtitle || '')}</text>
    <text x="90" y="320" class="title">${sanitizeSvgText(trimName(title))}</text>
    <text x="90" y="380" class="body">${lineSpans}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

async function loadZipFromFile(file: File) {
  const buffer = await file.arrayBuffer()
  return JSZip.loadAsync(buffer)
}

async function extractDocxParagraphs(file: File) {
  const zip = await loadZipFromFile(file)
  const entry = zip.file('word/document.xml')
  if (!entry) throw new Error('Không tìm thấy nội dung tài liệu.')
  const xml = await entry.async('text')
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xml, 'application/xml')
  const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'))
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const texts = Array.from(paragraph.getElementsByTagName('w:t'))
      .map((node) => node.textContent || '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    if (texts) {
      lines.push(trimName(texts, 80))
    }
    if (lines.length >= MAX_PREVIEW_LINES) break
  }
  return lines
}

async function generateWordCover(file: File, extension: string) {
  if (extension === 'doc') {
    return buildSvgCover({
      theme: 'WORD',
      title: file.name,
      subtitle: 'Định dạng .doc cũ',
      lines: ['Định dạng .doc không hỗ trợ xem nhanh trong trình duyệt.', 'Vui lòng lưu tệp dưới dạng .docx để xem trước.']
    })
  }
  const lines = await extractDocxParagraphs(file)
  return buildSvgCover({
    theme: 'WORD',
    title: file.name,
    subtitle: 'Trang 1 · Word',
    lines: lines.length ? lines : ['Không trích xuất được nội dung từ tài liệu này.']
  })
}

async function generatePptCover(file: File, extension: string) {
  if (extension === 'ppt') {
    return buildSvgCover({
      theme: 'PPT',
      title: file.name,
      subtitle: 'Định dạng .ppt cũ',
      lines: ['Định dạng .ppt cần lưu lại dưới .pptx để xem nhanh được.', 'Vẫn có thể tải lên bình thường.']
    })
  }
  const zip = await loadZipFromFile(file)
  const entry = zip.file('ppt/slides/slide1.xml')
  if (!entry) throw new Error('Không tìm thấy trang trình chiếu đầu tiên.')
  const xml = await entry.async('text')
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xml, 'application/xml')
  const nodes = Array.from(xmlDoc.getElementsByTagName('a:t'))
  const lines = nodes
    .map((node) => (node.textContent || '').trim())
    .filter(Boolean)
    .map((text) => trimName(text, 80))
    .slice(0, MAX_PREVIEW_LINES)
  return buildSvgCover({
    theme: 'PPT',
    title: file.name,
    subtitle: 'Slide 1 · PowerPoint',
    lines: lines.length ? lines : ['Không có nội dung văn bản trong trang đầu.']
  })
}

async function generateExcelCover(file: File, extension: string) {
  if (extension === 'xls') {
    return buildSvgCover({
      theme: 'EXCEL',
      title: file.name,
      subtitle: 'Định dạng .xls cũ',
      lines: ['Vui lòng lưu file dưới .xlsx để xem nhanh.', 'Tệp vẫn được tải lên bình thường.']
    })
  }
  const buffer = await file.arrayBuffer()
  const workbook = readXlsx(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error('Không tìm thấy dữ liệu trong sheet đầu tiên.')
  const rows = (xlsxUtils.sheet_to_json(sheet, { header: 1, blankrows: false }) as (string | number | null)[][])
    .map((row) => row.filter((cell) => cell !== null && cell !== undefined && `${cell}`.trim() !== ''))
    .filter((row) => row.length)
    .map((row) => row.map((cell) => `${cell}`).join(' • '))
  const lines = rows.slice(0, MAX_PREVIEW_LINES).map((value) => trimName(value, 70))
  return buildSvgCover({
    theme: 'EXCEL',
    title: file.name,
    subtitle: `Sheet: ${sheetName}`,
    lines: lines.length ? lines : ['Không có dữ liệu đọc được trong vài dòng đầu.']
  })
}

async function generateArchiveCover(file: File) {
  const zip = await loadZipFromFile(file)
  const files = Object.keys(zip.files)
    .filter((key) => !zip.files[key].dir)
    .slice(0, MAX_PREVIEW_LINES)
    .map((name) => trimName(name, 70))
  return buildSvgCover({
    theme: 'ZIP',
    title: file.name,
    subtitle: 'Danh sách tệp nén',
    lines: files.length ? files : ['Không thể liệt kê nội dung (có thể đã mã hóa).']
  })
}

function generateGenericCover(file: File, label: string) {
  return buildSvgCover({
    theme: 'DEFAULT',
    title: file.name,
    subtitle: label,
    lines: ['Định dạng này chưa hỗ trợ dựng trang bìa động.', 'Ảnh đại diện sẽ được cập nhật sau khi xử lý.']
  })
}

export default function UploadPanel({
  token,
  isGuest,
  getFileIcon,
  formatFileSize,
  onShowLogin,
  onShowRegister,
  onCancel,
  onSuccess
}: UploadPanelProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [isActualCover, setIsActualCover] = useState(false)
  const [iconOnlyPreview, setIconOnlyPreview] = useState(false)
  const [detectedCategory, setDetectedCategory] = useState('')
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('')
  const objectUrlRef = useRef<string | null>(null)
  const successTimeoutRef = useRef<number | null>(null)
  const selectedSubjectName = selectedSubjectId
    ? subjects.find((subject) => `${subject.id}` === selectedSubjectId)?.tenMonHoc || ''
    : ''

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await axios.get<SubjectOption[]>('/api/monhoc')
      setSubjects(response.data)
    } catch (error) {
      console.error('Không tải được danh sách môn học', error)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  async function requestServerPreview(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    const response = await axios.post<Blob>('/api/documents/preview', formData, {
      responseType: 'blob',
      headers
    })
    const objectUrl = URL.createObjectURL(response.data)
    objectUrlRef.current = objectUrl
    return objectUrl
  }

  async function buildFallbackCover(file: File, extension: string) {
    try {
      let coverUrl = ''
      if (['doc', 'docx'].includes(extension)) {
        coverUrl = await generateWordCover(file, extension)
      } else if (['ppt', 'pptx'].includes(extension)) {
        coverUrl = await generatePptCover(file, extension)
      } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
        coverUrl = await generateExcelCover(file, extension)
      } else if (extension === 'zip') {
        coverUrl = await generateArchiveCover(file)
      } else {
        coverUrl = generateGenericCover(file, 'Định dạng chưa hỗ trợ')
      }
      setPreviewUrl(coverUrl)
      setPreviewError('Không dựng được ảnh thật, đang dùng trang bìa tạm thời.')
      setIsActualCover(false)
    } catch (fallbackError) {
      console.error('Fallback preview failed', fallbackError)
      setPreviewUrl('')
      setPreviewError('Không thể dựng trang bìa, hệ thống sẽ dùng biểu tượng mặc định.')
      setIsActualCover(false)
    }
  }

  function resetPreview() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPreviewUrl('')
    setPreviewError('')
    setPreviewLoading(false)
    setIsActualCover(false)
    setIconOnlyPreview(false)
  }

  function detectCategory(file: File): string {
    const name = file.name.toLowerCase()
    const type = file.type?.toLowerCase() || ''
    if (type.includes('pdf') || name.endsWith('.pdf')) return 'PDF'
    if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'Word'
    if (type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'PowerPoint'
    if (type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'Excel'
    if (type.includes('zip') || name.endsWith('.zip')) return 'ZIP'
    if (type.includes('rar') || name.endsWith('.rar')) return 'RAR'
    if (name.endsWith('.7z')) return '7z'
    if (type.startsWith('image/')) return 'Ảnh'
    return 'Khác'
  }

  function shouldUseIconOnlyPreview(file: File, extension: string) {
    if (isIconOnlyExtension(extension)) {
      return true
    }
    const type = file.type?.toLowerCase() || ''
    return (
      type.includes('excel') ||
      type.includes('spreadsheet') ||
      type.includes('zip') ||
      type.includes('rar') ||
      type.includes('compressed')
    )
  }

  async function generatePdfCover(file: File) {
    const buffer = await file.arrayBuffer()
    const pdf = await getDocument({ data: buffer }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1.2 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas không khả dụng')
    canvas.height = viewport.height
    canvas.width = viewport.width
    await page.render({ canvasContext: context, viewport, canvas }).promise
    return canvas.toDataURL('image/png')
  }

  async function buildPreview(file: File) {
    resetPreview()
    const extension = getFileExtension(file.name)
    const isPdfFile = file.type?.includes('pdf') || extension === 'pdf'
    if (shouldUseIconOnlyPreview(file, extension)) {
      setIconOnlyPreview(true)
      setPreviewError('')
      setPreviewUrl('')
      setIsActualCover(false)
      return
    }
    setIconOnlyPreview(false)
    if (extension === 'doc') {
      await buildFallbackCover(file, extension)
      return
    }

    if (file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file)
      objectUrlRef.current = objectUrl
      setPreviewUrl(objectUrl)
      setPreviewError('')
      setIsActualCover(true)
      return
    }

    if (isPdfFile) {
      setPreviewLoading(true)
      try {
        const cover = await generatePdfCover(file)
        setPreviewUrl(cover)
        setPreviewError('')
        setIsActualCover(true)
      } catch (err) {
        console.error('Cannot build PDF preview', err)
        setPreviewError('Không thể dựng trang bìa PDF tạm thời.')
        setIsActualCover(false)
      } finally {
        setPreviewLoading(false)
      }
      return
    }

    setPreviewLoading(true)
    try {
      const url = await requestServerPreview(file)
      setPreviewUrl(url)
      setPreviewError('')
      setIsActualCover(true)
    } catch (serverError) {
      console.warn('Server preview unavailable, falling back to template', serverError)
      await buildFallbackCover(file, extension)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleFileChange(file: File | null) {
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = null
    }
    setUploadSuccessMessage('')
    if (!file) {
      setUploadFile(null)
      setDetectedCategory('')
      resetPreview()
      return
    }
    const extension = getFileExtension(file.name)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`Dung lượng tối đa 200MB. Tệp hiện tại có kích thước ${formatFileSize(file.size)}.`)
      setUploadFile(null)
      setDetectedCategory('')
      resetPreview()
      return
    }
    if (!isAllowedExtension(extension)) {
      setUploadError('Chỉ hỗ trợ định dạng PDF, Word (DOC/DOCX), PowerPoint (PPT/PPTX), Excel (XLS/XLSX), ZIP hoặc RAR theo danh mục tài liệu.')
      setUploadFile(null)
      setDetectedCategory('')
      resetPreview()
      return
    }
    setUploadFile(file)
    setUploadError('')
    const category = detectCategory(file)
    setDetectedCategory(category)
    if (!uploadTitle) {
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      setUploadTitle(baseName)
    }
    await buildPreview(file)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      onShowLogin()
      return
    }
    if (!uploadFile) {
      setUploadError('Vui lòng chọn tệp để tải lên')
      return
    }
    const extension = getFileExtension(uploadFile.name)
    if (uploadFile.size > MAX_FILE_SIZE_BYTES) {
      setUploadError('Dung lượng tệp vượt quá giới hạn 200MB. Vui lòng chọn tệp nhỏ hơn.')
      return
    }
    if (!isAllowedExtension(extension)) {
      setUploadError('Định dạng tệp không nằm trong danh mục cho phép (PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, ZIP, RAR).')
      return
    }
    if (!selectedSubjectId) {
      setUploadError('Vui lòng chọn môn học phù hợp')
      return
    }

    setUploadLoading(true)
    setUploadError('')

    const formData = new FormData()
    formData.append('file', uploadFile)
    if (uploadTitle) formData.append('title', uploadTitle)
    formData.append('subjectId', selectedSubjectId)

    try {
      await axios.post('/api/documents/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      setUploadFile(null)
      setUploadTitle('')
      setDetectedCategory('')
      setSelectedSubjectId('')
      resetPreview()
      fetchSubjects()
      setUploadSuccessMessage('Tải lên thành công! Đang chuyển sang danh sách sau ít giây...')
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current)
      }
      successTimeoutRef.current = window.setTimeout(() => {
        setUploadSuccessMessage('')
        onSuccess()
      }, 3000)
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Tải lên thất bại')
    } finally {
      setUploadLoading(false)
    }
  }

  if (isGuest) {
    return (
      <div className="upload-view">
        <div className="upload-guest-card">
          <div>
            <p className="section-eyebrow">Chia sẻ tài nguyên</p>
            <h2>Bạn cần đăng nhập để tiếp tục</h2>
            <p className="upload-subtitle">
              Thành viên đã xác thực có thể tải lên, bình luận và quản lý tài liệu trong kho chung.
            </p>
          </div>
          <div className="upload-guest-actions">
            <button className="btn-dark" onClick={onShowLogin}>
              Đăng nhập
            </button>
            <button className="btn-cta" onClick={onShowRegister}>
              Tạo tài khoản mới
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="upload-view">
      <div className="upload-page-header">
        <div>
          <p className="section-eyebrow">Không gian chia sẻ</p>
          <h1>Tải lên tài liệu</h1>
          <p className="upload-lede">
            Chọn file từ thiết bị của bạn. Trình tải lên mới giúp kiểm tra định dạng, dung lượng và
            mô tả trước khi hoàn tất.
          </p>
        </div>
        <div className="upload-summary">
          {uploadHighlights.map((item) => (
            <div key={item.label} className="upload-summary-pill">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="upload-layout-grid">
        <div className="upload-card-large">
          <div className="upload-card-head">
            <h2>Thông tin tệp</h2>
            <p>Hoàn tất các bước bên dưới để hệ thống xử lý nhanh hơn.</p>
          </div>

          <form onSubmit={handleUpload} className="upload-form-large">
            <div className={`file-drop-zone ${uploadFile ? 'has-file' : ''}`}>
              <input
                id="file"
                type="file"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="file-input-hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
                required
              />
              {uploadFile ? (
                <div className="file-preview-large">
                  <div className="file-preview-header">
                    <span className="file-icon-large">{getFileIcon(uploadFile.type)}</span>
                    <div className="file-details-large">
                      <p className="file-name-large">{uploadFile.name}</p>
                      <p className="file-size-large">{formatFileSize(uploadFile.size)}</p>
                      <div className="file-quick-tags">
                        <span className="file-meta-badge">{detectedCategory || 'Đang nhận diện định dạng'}</span>
                        {selectedSubjectName && (
                          <span className="file-meta-badge subtle">{selectedSubjectName}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-remove-file"
                      onClick={() => handleFileChange(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="file-preview-visual">
                    {previewLoading && <p>Đang dựng trang bìa...</p>}
                    {!previewLoading && previewUrl && (
                      <div className="upload-preview-pane">
                        <img src={previewUrl} alt="Trang bìa đầu tiên" />
                        <span>{isActualCover ? 'Trang bìa đầu tiên từ tệp của bạn' : 'Trang bìa tạm thời từ tệp của bạn'}</span>
                      </div>
                    )}
                    {!previewLoading && !previewUrl && !previewError && (
                      <div className={`upload-preview-pane placeholder${iconOnlyPreview ? ' icon-only' : ''}`}>
                        <p>
                          {iconOnlyPreview
                            ? 'Định dạng này không dựng trang bìa mẫu. Biểu tượng sẽ đại diện cho tệp.'
                            : 'Không tạo được trang bìa xem trước. Hệ thống sẽ sử dụng biểu tượng mặc định.'}
                        </p>
                      </div>
                    )}
                    {previewError && <p className="upload-preview-error">{previewError}</p>}
                  </div>
                </div>
              ) : (
                <label htmlFor="file" className="file-drop-label">
                  <span className="upload-icon-large">📁</span>
                  <h3>Tải file vào đây</h3>
                  <p>bấm để chọn từ thư mục của bạn</p>
                  <span className="file-types">PDF · DOC/DOCX · XLS/XLSX · PPT/PPTX · ZIP · RAR</span>
                </label>
              )}
            </div>

            <div className="form-group-large">
              <label htmlFor="title">Tiêu đề tài liệu</label>
              <input
                id="title"
                type="text"
                placeholder="Ví dụ: Bài giảng Đại số tuyến tính - Chương 3"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="form-input-large"
              />
            </div>

            <div className="form-group-large">
              <label htmlFor="subject">Môn học</label>
              <select
                id="subject"
                className="form-input-large"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                required
              >
                <option value="">Chọn môn phù hợp</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.tenMonHoc}
                  </option>
                ))}
              </select>
              {!subjects.length && (
                <small className="form-helper-text">Không tải được danh sách môn học. Thử tải lại trang.</small>
              )}
            </div>

            {uploadError && <div className="error-alert-large">{uploadError}</div>}
            {uploadSuccessMessage && (
              <div className="success-alert-large">{uploadSuccessMessage}</div>
            )}

            <div className="form-actions-large">
              <button
                type="button"
                onClick={() => {
                  setUploadFile(null)
                  setUploadTitle('')
                  setUploadError('')
                  setDetectedCategory('')
                  setSelectedSubjectId('')
                  if (successTimeoutRef.current) {
                    window.clearTimeout(successTimeoutRef.current)
                    successTimeoutRef.current = null
                  }
                  setUploadSuccessMessage('')
                  resetPreview()
                  onCancel()
                }}
                className="btn-cancel-large"
                disabled={uploadLoading}
              >
                Hủy thao tác
              </button>
              <button
                type="submit"
                className="btn-submit-large"
                disabled={uploadLoading || !uploadFile || !selectedSubjectId}
              >
                {uploadLoading ? 'Đang tải lên...' : 'Hoàn tất tải lên'}
              </button>
            </div>
          </form>
        </div>
        <aside className="upload-side-panel">
          <div className="upload-guideline-card">
            <h3>Hướng dẫn nhanh</h3>
            <ul className="upload-guideline-list">
              {uploadGuidelines.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
          <div className="upload-checklist-card">
            <h4>Kiểm tra trước khi gửi</h4>
            <ul>
              {uploadChecks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="upload-meta-card">
            <p>
              Sau khi tải lên, tài liệu cần được xét duyệt bởi quản trị viên trước khi hiển thị công khai .
            </p>
            <button type="button" className="btn-ghost" onClick={onCancel}>
              Quay lại bảng điều khiển
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
