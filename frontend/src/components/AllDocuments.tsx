import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LuChevronLeft,
  LuChevronRight,
  LuDownload,
  LuInbox,
  LuRefreshCcw,
  LuSearch,
  LuUpload
} from 'react-icons/lu'
import type { DocumentItem } from '../types/document'
import type { DocumentCategory } from '../types/document-category'

type AllDocumentsProps = {
  documents: DocumentItem[]
  loading: boolean
  searchTerm: string
  isGuest: boolean
  categories: DocumentCategory[]
  categoriesError?: string
  onSearchTermChange: (value: string) => void
  onUploadClick: () => void
  onDownload: (doc: DocumentItem) => void
  onShowLogin: () => void
  onShowRegister: () => void
  getFileIcon: (contentType: string) => string
  formatFileSize: (bytes: number) => string
  formatDate: (dateString: string) => string
  onOpenDetail: (doc: DocumentItem) => void
}

type SortOption = 'latest' | 'name' | 'size'
type FilterOption = { label: string; value: string }

const fallbackFilters: FilterOption[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'PDF', value: 'PDF' },
  { label: 'Word', value: 'Word' },
  { label: 'PowerPoint', value: 'PowerPoint' },
  { label: 'Excel', value: 'Excel' },
  { label: 'ZIP', value: 'ZIP' }
]

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchesFallback(contentType: string | undefined, value: string) {
  if (!contentType) return false
  const lower = contentType.toLowerCase()
  switch (value) {
    case 'PDF':
      return lower.includes('pdf')
    case 'Word':
      return lower.includes('word') || lower.includes('msword') || lower.includes('doc')
    case 'PowerPoint':
      return lower.includes('powerpoint') || lower.includes('presentation') || lower.includes('ppt')
    case 'Excel':
      return lower.includes('excel') || lower.includes('sheet') || lower.includes('xls')
    case 'ZIP':
      return lower.includes('zip') || lower.includes('compressed')
    default:
      return false
  }
}

export default function AllDocuments({
  documents,
  loading,
  searchTerm,
  isGuest,
  categories,
  categoriesError,
  onSearchTermChange,
  onUploadClick,
  onDownload,
  onShowLogin,
  onShowRegister,
  getFileIcon,
  formatFileSize,
  formatDate,
  onOpenDetail
}: AllDocumentsProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [sortOption, setSortOption] = useState<SortOption>('latest')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  const trimmedSearch = searchTerm.trim()
  const normalizedSearch = trimmedSearch.toLowerCase()

  const highlightTitle = useCallback((text?: string | null) => {
    if (text == null) {
      return null
    }
    if (!trimmedSearch) {
      return text
    }
    const regex = new RegExp(`(${escapeRegExp(trimmedSearch)})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, index) => {
      if (normalizedSearch.length > 0 && part.toLowerCase() === normalizedSearch) {
        return (
          <mark key={`${text}-${index}`} className="search-highlight">
            {part}
          </mark>
        )
      }
      return <React.Fragment key={`${text}-${index}`}>{part}</React.Fragment>
    })
  }, [trimmedSearch, normalizedSearch]);

  const hasCategoryData = categories && categories.length > 0
  const quickFilters: FilterOption[] = useMemo(() => {
    if (!hasCategoryData) {
      return fallbackFilters
    }
    return [{ label: 'Tất cả', value: 'all' }, ...categories.map((category) => ({ label: category.name, value: category.name }))]
  }, [categories, hasCategoryData])

  const filteredBySearch = normalizedSearch
    ? documents.filter((doc) => {
        const source = (doc.title || doc.filename || '').toLowerCase()
        return source.includes(normalizedSearch)
      })
    : documents

  const filteredByCategory = filteredBySearch.filter((doc) => {
    if (activeFilter === 'all') return true
    if (hasCategoryData) {
      return doc.loaiTaiLieu ? doc.loaiTaiLieu.toLowerCase() === activeFilter.toLowerCase() : false
    }
    return matchesFallback(doc.contentType, activeFilter)
  })

  const sortedDocuments = useMemo(() => {
    return [...filteredByCategory].sort((a, b) => {
      if (sortOption === 'name') {
        return (a.title || a.filename).localeCompare(b.title || b.filename, 'vi')
      }
      if (sortOption === 'size') {
        return (b.size || 0) - (a.size || 0)
      }
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    })
  }, [filteredByCategory, sortOption])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, activeFilter, sortOption, documents])

  const totalPages = Math.max(1, Math.ceil(sortedDocuments.length / PAGE_SIZE))
  const visibleDocuments = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sortedDocuments.slice(start, start + PAGE_SIZE)
  }, [sortedDocuments, page])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const weeklyNew = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return documents.filter((doc) => new Date(doc.uploadDate).getTime() >= sevenDaysAgo).length
  }, [documents])

  const renderUploader = (doc: DocumentItem, layout: 'inline' | 'stacked' = 'inline') => {
    const label = doc.uploaderName || doc.uploaderEmail || 'N/A'
    return (
      <div className={`uploader-pill ${layout === 'stacked' ? 'stacked' : ''}`}>
        <span className="uploader-name">{label}</span>
        {doc.uploaderRole && <span className="role-badge">{doc.uploaderRole}</span>}
      </div>
    )
  }

  return (
    <div className="all-documents-page">
      <header className="page-header">
        <div>
          <p className="section-eyebrow">Thư viện số</p>
          <h1>Tất cả tài liệu</h1>
          <p className="page-subtitle">
            Theo dõi, lọc và tải xuống mọi tài liệu đã được chia sẻ trong hệ thống.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="btn-ghost"
            onClick={() => {
              onSearchTermChange('')
              setActiveFilter('all')
              setSortOption('latest')
            }}
          >
            <LuRefreshCcw size={16} />
            <span>Làm mới bộ lọc</span>
          </button>
          <button className="btn-cta" onClick={onUploadClick}>
            <LuUpload size={18} />
            <span>Tải lên ngay</span>
          </button>
        </div>
      </header>

      <section className="panels-grid">
        <article className="panel">
          <p className="section-eyebrow">Tổng tài liệu</p>
          <h3>{documents.length.toLocaleString('vi-VN')}</h3>
          <p className="panel-meta">Số lượng hiện có trong kho</p>
        </article>
        <article className="panel">
          <p className="section-eyebrow">Cập nhật trong 7 ngày</p>
          <h3>{weeklyNew.toLocaleString('vi-VN')}</h3>
          <p className="panel-meta">Tệp mới được thêm gần đây</p>
        </article>
      </section>

      <section className="documents-controls">
        <div className="search-box-large">
          <span className="search-icon">
            <LuSearch size={18} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên tài liệu..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="search-input-large"
          />
        </div>
        <div className="control-actions">
          <div className="filter-pills">
            {quickFilters.map((filter) => (
              <button
                key={filter.value}
                className={`pill ${activeFilter === filter.value ? 'pill-primary' : 'pill-neutral'}`}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
            {categoriesError && <p className="filter-error">{categoriesError}</p>}
          </div>
          <div className="sort-control">
            <label htmlFor="sort-select">Sắp xếp</label>
            <select
              id="sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
            >
              <option value="latest">Mới nhất</option>
              <option value="name">Theo tên</option>
              <option value="size">Dung lượng</option>
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải tài liệu...</p>
        </div>
      ) : sortedDocuments.length === 0 ? (
        <div className="empty-state emphasized">
          <div className="empty-icon">
            <LuInbox size={32} />
          </div>
          <h3>Không tìm thấy tài liệu phù hợp</h3>
          <p>Thử thay đổi bộ lọc hoặc sắp xếp để xem những tài liệu khác.</p>
          <div className="guest-note-actions">
            <button className="btn-ghost" onClick={() => setActiveFilter('all')}>
              Hiển thị tất cả
            </button>
            {!isGuest && (
              <button className="btn-cta" onClick={onUploadClick}>
                Thêm tài liệu mới
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="documents-table">
          <table>
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                aria-label="Trang trước"
              >
                <LuChevronLeft aria-hidden="true" />
              </button>
              <span className="pagination-status">
                Trang {page}/{totalPages}
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                aria-label="Trang sau"
              >
                <LuChevronRight aria-hidden="true" />
              </button>
            </div>
          )}
            <thead>
              <tr>
                <th>Tên tài liệu</th>
                <th>Người tải lên</th>
                <th>Loại</th>
                <th>Lượt tải</th>
                <th>Kích thước</th>
                <th>Ngày tải lên</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="doc-cell">
                      <span className="doc-icon">{getFileIcon(doc.contentType)}</span>
                      <div className="doc-info">
                        <button
                          type="button"
                          className="doc-title-link"
                          onClick={() => onOpenDetail(doc)}
                        >
                          {highlightTitle(doc.title || doc.filename)}
                        </button>
                        <div className="doc-status-line">
                          <span className="doc-subject-tag">{doc.monHocTen || 'Chưa gán môn'}</span>
                          {doc.pendingSubject && <span className="doc-state-chip">Đang xét chọn môn</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{renderUploader(doc, 'stacked')}</td>
                  <td><span className="badge">{doc.loaiTaiLieu || doc.contentType?.split('/')[1] || 'Khác'}</span></td>
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
                      onClick={() => onDownload(doc)}
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
      )}

      {isGuest && (
        <div className="guest-note">
          <p>
            Bạn đang xem chế độ khách. Đăng nhập để bình luận, đánh giá và tải lên tài liệu mới.
          </p>
          <div className="guest-note-actions">
            <button className="btn-cta" onClick={onShowLogin}>
              Đăng nhập
            </button>
            <button className="btn-ghost" onClick={onShowRegister}>
              Tạo tài khoản
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
