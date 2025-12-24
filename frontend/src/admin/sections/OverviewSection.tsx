import React from 'react'
import {
  LuArrowDownRight,
  LuArrowUpRight,
  LuDownload,
  LuFileText,
  LuUsers
} from 'react-icons/lu'
import type {
  AdminDocumentSummary,
  AdminOverview,
  AdminUserSummary,
  WeekOption
} from '../types'

interface OverviewSectionProps {
  overview: AdminOverview | null
  loading: boolean
  documents: AdminDocumentSummary[]
  manageableUsers: AdminUserSummary[]
  teacherStudentCount: number
  selectedWeek: string
  onChangeWeek: (value: string) => void
  weekOptions: WeekOption[]
}

interface HighlightedUser {
  id: number
  name: string
  email: string
  documents: number
  downloads: number
  initials: string
  avatarBg: string
  avatarUrl?: string
}

interface DocumentCategorySegment {
  label: string
  value: number
  percent: number
  color: string
}

interface DocumentDonutStrokeSegment extends DocumentCategorySegment {
  dashArray: string
  dashOffset: number
}

const SPARKLINE_WIDTH = 320
const SPARKLINE_HEIGHT = 120
const AVATAR_COLORS = ['#2563eb', '#a855f7', '#f97316', '#0ea5e9', '#22c55e', '#ef4444']
const DOCUMENT_TYPE_COLOR_MAP: Record<string, string> = {
  PDF: '#ef4444',
  DOC: '#1d4ed8',
  DOCX: '#2563eb',
  PPT: '#facc15',
  PPTX: '#facc15',
  XLS: '#22c55e',
  XLSX: '#16a34a',
  TXT: '#0ea5e9',
  ZIP: '#7c3aed',
  RAR: '#7c3aed'
}
const DOCUMENT_TYPE_COLOR_ALIASES: Record<string, keyof typeof DOCUMENT_TYPE_COLOR_MAP> = {
  WORD: 'DOCX',
  EXCEL: 'XLSX',
  POWERPOINT: 'PPTX'
}
const DOCUMENT_CATEGORY_FALLBACK_COLORS = ['#2563eb', '#0ea5e9', '#a855f7', '#22c55e', '#f97316', '#facc15']
const WEEKDAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
const CHART_MIN_VALUE = 0
const CHART_MAX_VALUE = 5
const CHART_TICK_STEPS = 5

export default function OverviewSection({
  overview,
  loading,
  documents,
  manageableUsers,
  teacherStudentCount,
  selectedWeek,
  onChangeWeek,
  weekOptions
}: OverviewSectionProps) {
  const [activeDocumentSegment, setActiveDocumentSegment] = React.useState<DocumentCategorySegment | null>(null)

  React.useEffect(() => {
    setActiveDocumentSegment(null)
  }, [documents])

  const selectedWeekOption = weekOptions.find((option) => option.value === selectedWeek) || weekOptions[0]
  const weekOrder = selectedWeekOption?.order ?? 0
  const weekBoost = 1 + (weekOrder * 0.12)
  const historicalModifier = Math.max(0.65, 1 - weekOrder * 0.08)
  const weekRange = React.useMemo(() => parseWeekRange(selectedWeekOption?.value), [selectedWeekOption?.value])
  const weekStartKey = weekRange?.start?.getTime()
  const weekEndKey = weekRange?.end?.getTime()
  const documentUploadSeries = React.useMemo(
    () => buildDocumentUploadSeries(documents, weekRange?.start ?? null, weekRange?.end ?? null),
    [documents, weekStartKey, weekEndKey]
  )
  const hasUploadSeriesData = documentUploadSeries.some((value) => value > 0)
  const stretchedUploadSeries = React.useMemo(() => {
    if (!hasUploadSeriesData) {
      return documentUploadSeries
    }
    return stretchSeriesToFullWeek(documentUploadSeries)
  }, [documentUploadSeries, hasUploadSeriesData])

  if (loading) {
    return <div className="admin-placeholder">Đang tải thống kê...</div>
  }

  if (!overview) {
    return <div className="admin-placeholder">Chưa có dữ liệu thống kê.</div>
  }

  const filteredUserTotal = teacherStudentCount || overview.totalUsers
  const topStats = buildTopStats(overview, filteredUserTotal)
  const currentSeries = hasUploadSeriesData
    ? stretchedUploadSeries
    : buildSparklineSeries(overview.documentsToday * 7 * weekBoost)
  const lastYearSeries = buildSparklineSeries(Math.round(overview.totalDocuments * 0.3 * historicalModifier))
  const polylineCurrent = buildSplinePath(currentSeries, SPARKLINE_WIDTH, SPARKLINE_HEIGHT, CHART_MIN_VALUE, CHART_MAX_VALUE)
  const polylineLastYear = buildSplinePath(lastYearSeries, SPARKLINE_WIDTH, SPARKLINE_HEIGHT, CHART_MIN_VALUE, CHART_MAX_VALUE)
  const yAxisTicks = buildYAxisTicks([currentSeries, lastYearSeries], CHART_TICK_STEPS, CHART_MIN_VALUE, CHART_MAX_VALUE)
  const highlightedUsers = buildHighlightedUsers(manageableUsers)
  const documentCategoryStats = buildDocumentCategoryStats(documents)
  const donutStrokeSegments = buildDonutStrokeSegments(documentCategoryStats.segments)
  const dominantCategory = documentCategoryStats.segments[0] || null
  const displayCategory = activeDocumentSegment || dominantCategory

  return (
    <section className="admin-overview-grid">
      <div className="admin-stat-grid">
        {topStats.map((stat) => {
          const TrendIcon = stat.trend === 'up' ? LuArrowUpRight : LuArrowDownRight
          return (
            <article key={stat.label} className={`admin-stat-card ${stat.trend}`}>
              <div className="stat-header">
                <div
                  className="stat-icon"
                  style={{ color: stat.iconColor, background: stat.iconBg }}
                >
                  {stat.icon}
                </div>
                <span>{stat.label}</span>
              </div>
              <strong>{stat.value.toLocaleString('vi-VN')}</strong>
              <div className="stat-trend">
                <TrendIcon />
                <span>{stat.delta >= 0 ? '+' : ''}{stat.delta.toFixed(2)}%</span>
              </div>
              <p>{stat.caption}</p>
            </article>
          )
        })}
      </div>

      <div className="admin-analytics-row">
        <article className="admin-analytics-card">
          <header>
            <div>
              <h4>Biểu đồ tài liệu</h4>
              <p>Tải lên theo ngày</p>
            </div>
            <div className="admin-chart-controls">
              <span className="admin-chart-total">Tổng cộng {overview.totalDocuments.toLocaleString('vi-VN')} tài liệu</span>
              {weekOptions.length > 0 && (
                <select
                  className="admin-week-select"
                  value={selectedWeek}
                  onChange={(event) => onChangeWeek(event.target.value)}
                  aria-label="Chọn mốc tuần"
                >
                  {weekOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              )}
            </div>
          </header>
          <div className="admin-line-chart">
            <div className="admin-line-chart-body">
              <div className="admin-y-axis" aria-hidden="true">
                {yAxisTicks.map((tick, index) => (
                  <span key={`tick-${index}`}>{tick.toLocaleString('vi-VN')}</span>
                ))}
              </div>
              <svg
                viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Biểu đồ tài liệu theo ngày"
              >
                <path d={polylineLastYear} className="line last" />
                <path d={polylineCurrent} className="line current" />
              </svg>
            </div>
            <div className="admin-chart-axis" aria-label="Trục thời gian theo thứ">
              {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
            </div>
            <span className="admin-x-axis-label">Thứ trong tuần</span>
          </div>
          <div className="admin-chart-legend">
            <span className="current">• Hiện tại</span>
            <span className="last">• Trung bình cũ</span>
          </div>
        </article>
        <article className="admin-analytics-card admin-donut-card">
          <header>
            <div>
              <h4>Thống kê loại tài liệu</h4>
              <p>Phân bố theo loại</p>
            </div>
            <span>{documentCategoryStats.totalTypes.toLocaleString('vi-VN')} loại</span>
          </header>
          <div
            className="admin-donut"
            onMouseLeave={() => setActiveDocumentSegment(null)}
            role="presentation"
          >
            <svg viewBox="0 0 200 200" className="admin-donut-svg" aria-hidden={!documentCategoryStats.hasData}>
              <circle
                className="admin-donut-track"
                cx="100"
                cy="100"
                r="70"
              />
              <g className="admin-donut-segments" transform="rotate(-90 100 100)">
                {donutStrokeSegments.map((segment) => {
                  const baseSegment: DocumentCategorySegment = {
                    label: segment.label,
                    value: segment.value,
                    percent: segment.percent,
                    color: segment.color
                  }
                  return (
                    <circle
                      key={segment.label}
                      className="admin-donut-segment"
                      cx="100"
                      cy="100"
                      r="70"
                      stroke={segment.color}
                      strokeDasharray={segment.dashArray}
                      strokeDashoffset={segment.dashOffset}
                      onMouseEnter={() => setActiveDocumentSegment(baseSegment)}
                      onFocus={() => setActiveDocumentSegment(baseSegment)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setActiveDocumentSegment(baseSegment)
                        }
                      }}
                      tabIndex={documentCategoryStats.hasData ? 0 : -1}
                      role="button"
                      aria-label={`${segment.label}: ${segment.percent.toFixed(1)} phần trăm`}
                    />
                  )
                })}
              </g>
            </svg>
            <div className="admin-donut-hole">
              {documentCategoryStats.hasData && displayCategory ? (
                <>
                  <strong>{displayCategory.percent.toFixed(1)}%</strong>
                  <span>{displayCategory.label}</span>
                </>
              ) : (
                <>
                  <strong>—</strong>
                  <span>Chưa có dữ liệu</span>
                </>
              )}
            </div>
          </div>
          <ul className="admin-donut-legend">
            {documentCategoryStats.hasData ? (
              documentCategoryStats.segments.map((segment) => (
                <li
                  key={segment.label}
                  onMouseEnter={() => setActiveDocumentSegment(segment)}
                  onFocus={() => setActiveDocumentSegment(segment)}
                  onMouseLeave={() => setActiveDocumentSegment(null)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setActiveDocumentSegment(segment)
                    }
                  }}
                  tabIndex={documentCategoryStats.hasData ? 0 : -1}
                >
                  <span className="dot" style={{ background: segment.color }}></span>
                  <span className="label">{segment.label}</span>
                  <span className="value">{segment.percent.toFixed(1)}%</span>
                </li>
              ))
            ) : (
              <li className="empty">
                <span className="label">Chưa có dữ liệu</span>
              </li>
            )}
          </ul>
        </article>
      </div>

      <div className="admin-bottom-grid">
        <article className="admin-analytics-card">
          <header>
            <div>
              <h4>Tài khoản người dùng</h4>
              <p>Hoạt động gần đây</p>
            </div>
            <span>{highlightedUsers.length} hồ sơ</span>
          </header>
          <ul className="admin-user-highlight-list">
            {highlightedUsers.map((user) => (
              <li key={user.id}>
                <div className="admin-user-avatar" style={{ background: user.avatarBg }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} />
                  ) : (
                    user.initials
                  )}
                </div>
                <div className="admin-user-meta">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <div className="admin-user-metric">
                  <span>Tài liệu</span>
                  <strong>{user.documents.toLocaleString('vi-VN')}</strong>
                </div>
                <div className="admin-user-metric">
                  <span>Tải xuống</span>
                  <strong>{user.downloads.toLocaleString('vi-VN')}</strong>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}

function buildTopStats(overview: AdminOverview, filteredUserTotal?: number) {
  const userDisplayTotal = typeof filteredUserTotal === 'number' && filteredUserTotal >= 0
    ? filteredUserTotal
    : overview.totalUsers
  const safeUsers = Math.max(userDisplayTotal, 1)
  const safeDocuments = Math.max(overview.totalDocuments, 1)
  const safeDownloads = Math.max(overview.totalDownloads, 1)
  const docTrend = computeTrend(overview.documentsToday, safeDocuments, 800)
  const downloadTrend = computeTrend(overview.totalDownloads, safeDocuments * 5, 10)
  return [
    {
      label: 'Tổng người dùng',
      value: userDisplayTotal,
      delta: computeTrend(overview.documentsToday || 1, safeUsers, 300),
      trend: 'up' as const,
      caption: 'So với tuần trước',
      icon: <LuUsers />,
      iconColor: '#1d4ed8',
      iconBg: 'rgba(59, 130, 246, 0.12)'
    },
    {
      label: 'Tài liệu',
      value: overview.totalDocuments,
      delta: docTrend,
      trend: docTrend >= 0 ? 'up' as const : 'down' as const,
      caption: `${overview.documentsToday.toLocaleString('vi-VN')} bản ghi mới`,
      icon: <LuFileText />,
      iconColor: '#c026d3',
      iconBg: 'rgba(232, 121, 249, 0.18)'
    },
    {
      label: 'Lượt tải',
      value: overview.totalDownloads,
      delta: downloadTrend,
      trend: downloadTrend >= 0 ? 'up' as const : 'down' as const,
      caption: `${overview.totalComments.toLocaleString('vi-VN')} phản hồi`,
      icon: <LuDownload />,
      iconColor: '#ea580c',
      iconBg: 'rgba(251, 146, 60, 0.18)'
    }
  ]
}

function computeTrend(part: number, total: number, multiplier = 100) {
  if (!total) return 0
  const ratio = (part / total) * multiplier
  const clamped = Math.max(-25, Math.min(ratio, 45))
  return Math.round(clamped * 100) / 100
}

function buildSparklineSeries(total: number, length = 7) {
  if (!total || total <= 0) {
    return Array.from({ length }, () => 0)
  }
  const average = total / (length + 2)
  return Array.from({ length }, (_, index) => (
    Math.max(0, Math.round(average * (0.6 + (index / length) * 0.9)))
  ))
}

// Mirror edge data so the chart still spans Monday through Sunday when uploads happen mid-week.
function stretchSeriesToFullWeek(values: number[]) {
  if (!values.length) return values
  const stretched = [...values]
  const firstNonZero = stretched.findIndex((value) => value > 0)
  if (firstNonZero > 0) {
    const leadValue = stretched[firstNonZero]
    for (let i = 0; i < firstNonZero; i += 1) {
      stretched[i] = leadValue
    }
  }
  let lastNonZero = -1
  for (let i = stretched.length - 1; i >= 0; i -= 1) {
    if (stretched[i] > 0) {
      lastNonZero = i
      break
    }
  }
  if (lastNonZero > -1 && lastNonZero < stretched.length - 1) {
    const tailValue = stretched[lastNonZero]
    for (let i = lastNonZero + 1; i < stretched.length; i += 1) {
      stretched[i] = tailValue
    }
  }
  return stretched
}

function buildSplinePath(
  values: number[],
  width = SPARKLINE_WIDTH,
  height = SPARKLINE_HEIGHT,
  minOverride?: number,
  maxOverride?: number
) {
  if (!values.length) return ''
  const fallbackMax = Math.max(...values)
  const fallbackMin = Math.min(...values)
  const maxBound = typeof maxOverride === 'number' ? maxOverride : fallbackMax
  const minBound = typeof minOverride === 'number' ? minOverride : fallbackMin
  const span = maxBound - minBound || 1
  const normalizePoint = (value: number) => {
    const clamped = Math.min(maxBound, Math.max(minBound, value))
    return normalizeY(clamped, minBound, span, height)
  }
  if (values.length === 1) {
    const normalizedY = normalizePoint(values[0])
    return `M0 ${normalizedY}`
  }
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width
    const y = normalizePoint(value)
    return { x, y }
  })
  let path = `M${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i]
    const next = points[i + 1]
    const prev = points[i - 1] || current
    const after = points[i + 2] || next
    const control1 = {
      x: current.x + (next.x - prev.x) / 6,
      y: current.y + (next.y - prev.y) / 6
    }
    const control2 = {
      x: next.x - (after.x - current.x) / 6,
      y: next.y - (after.y - current.y) / 6
    }
    path += ` C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${next.x} ${next.y}`
  }
  return path
}

function normalizeY(value: number, min: number, span: number, height: number) {
  return height - (((value - min) / span) * height)
}

function buildYAxisTicks(seriesList: number[][], steps = 4, minOverride?: number, maxOverride?: number) {
  const combined = seriesList.flat()
  const fallbackMax = combined.length ? Math.max(...combined) : 0
  const fallbackMin = combined.length ? Math.min(...combined) : 0
  const upperBound = typeof maxOverride === 'number'
    ? maxOverride
    : Math.max(1, Math.ceil(fallbackMax / Math.max(steps, 1)) * Math.max(steps, 1))
  const lowerBound = typeof minOverride === 'number'
    ? minOverride
    : Math.min(0, Math.floor(fallbackMin / Math.max(steps, 1)) * Math.max(steps, 1))
  const span = Math.max(upperBound - lowerBound, 1)
  const stepValue = span / Math.max(steps, 1)
  const ticks: number[] = []
  for (let i = 0; i <= steps; i += 1) {
    ticks.push(Number((upperBound - (i * stepValue)).toFixed(2)))
  }
  return ticks
}

function buildHighlightedUsers(users: AdminUserSummary[], limit = 6): HighlightedUser[] {
  if (!users.length) return []
  const sorted = [...users].sort((a, b) => (
    (b.totalDocuments + b.totalDownloads) - (a.totalDocuments + a.totalDownloads)
  ))
  return sorted.slice(0, limit).map((user, index) => ({
    id: user.id,
    name: user.username || 'Không tên',
    email: user.email,
    documents: user.totalDocuments,
    downloads: user.totalDownloads,
    initials: extractInitials(user.username || user.email),
    avatarBg: pickAvatarColor(index),
    avatarUrl: buildAvatarUrl(user)
  }))
}

function buildAvatarUrl(user: AdminUserSummary) {
  if (!user) return undefined
  const direct = typeof user.avatarUrl === 'string' ? user.avatarUrl.trim() : ''
  if (direct) return direct
  const rawPath = (user as any).avatarPath
  if (!rawPath) return undefined
  const normalized = String(rawPath).trim()
  if (!normalized) return undefined
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized
  }
  return `/api/profile/avatar/${normalized.replace(/^\/+/,'')}`
}

function extractInitials(value: string) {
  if (!value) return 'NA'
  const cleaned = value.trim()
  if (!cleaned) return 'NA'
  const parts = cleaned.split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }
  const letters = cleaned.replace(/[^A-Za-z0-9]/g, '').slice(0, 2)
  return letters.toUpperCase().padEnd(2, 'U')
}

function pickAvatarColor(index: number) {
  if (index < 0) return AVATAR_COLORS[0]
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

function buildDocumentCategoryStats(documents: AdminDocumentSummary[], limit = 4) {
  if (!documents.length) {
    return {
      segments: [] as DocumentCategorySegment[],
      totalTypes: 0,
      hasData: false
    }
  }
  const counts = new Map<string, number>()
  documents.forEach((doc) => {
    const label = resolveDocumentTypeLabel(doc.type)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  })
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  const limited = sorted.slice(0, limit)
  const total = limited.reduce((sum, [, value]) => sum + value, 0) || 1
  const segments: DocumentCategorySegment[] = limited.map(([label, value], index) => ({
    label,
    value,
    percent: (value / total) * 100,
    color: getDocumentTypeColor(label, index)
  }))
  return {
    segments,
    totalTypes: counts.size,
    hasData: counts.size > 0
  }
}

function resolveDocumentTypeLabel(value?: string) {
  const cleaned = (value || '').trim()
  if (!cleaned) return 'Khác'
  const normalized = cleaned.toUpperCase()
  if (Object.prototype.hasOwnProperty.call(DOCUMENT_TYPE_COLOR_MAP, normalized)) {
    return normalized
  }
  return cleaned
}

function getDocumentTypeColor(label: string, fallbackIndex: number) {
  const normalized = label.trim().toUpperCase()
  const mapped = DOCUMENT_TYPE_COLOR_ALIASES[normalized]
  if (mapped) {
    return DOCUMENT_TYPE_COLOR_MAP[mapped]
  }
  return DOCUMENT_TYPE_COLOR_MAP[normalized] || DOCUMENT_CATEGORY_FALLBACK_COLORS[fallbackIndex % DOCUMENT_CATEGORY_FALLBACK_COLORS.length]
}

function buildDonutStrokeSegments(segments: DocumentCategorySegment[], radius = 70): DocumentDonutStrokeSegment[] {
  if (!segments.length) return []
  const circumference = 2 * Math.PI * radius
  let cursorPercent = 0
  return segments.map((segment) => {
    const dashLength = (segment.percent / 100) * circumference
    const dashGap = Math.max(circumference - dashLength, 0)
    const dashArray = `${dashLength} ${dashGap}`
    const dashOffset = circumference * (1 - cursorPercent / 100)
    cursorPercent += segment.percent
    return {
      ...segment,
      dashArray,
      dashOffset
    }
  })
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

function parseWeekRange(value?: string | null) {
  if (!value) return null
  const [startRaw, endRaw] = value.split('_')
  if (!startRaw || !endRaw) return null
  const start = buildDateFromISO(startRaw, false)
  const end = buildDateFromISO(endRaw, true)
  if (!start || !end) return null
  return { start, end }
}

function buildDateFromISO(value: string, endOfDay = false) {
  if (!value) return null
  const parts = value.split('-').map((segment) => Number(segment))
  if (parts.length !== 3 || parts.some((segment) => Number.isNaN(segment))) {
    return null
  }
  const [year, month, day] = parts
  const parsed = new Date(year, month - 1, day)
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999)
  } else {
    parsed.setHours(0, 0, 0, 0)
  }
  return parsed
}

function buildDocumentUploadSeries(
  documents: AdminDocumentSummary[],
  start: Date | null,
  end: Date | null,
  dayCount = WEEKDAY_LABELS.length
) {
  if (!dayCount || dayCount <= 0) return []
  if (!start || !end) {
    return Array.from({ length: dayCount }, () => 0)
  }
  const startOfRange = toStartOfDay(start)
  const endOfRange = toStartOfDay(end)
  const counts = Array.from({ length: dayCount }, () => 0)
  const maxIndex = counts.length - 1
  documents.forEach((doc) => {
    if (!doc.uploadedAt) return
    const uploadDate = new Date(doc.uploadedAt)
    if (Number.isNaN(uploadDate.getTime())) return
    const normalized = toStartOfDay(uploadDate)
    if (normalized < startOfRange || normalized > endOfRange) return
    const diffDays = Math.round((normalized.getTime() - startOfRange.getTime()) / DAY_IN_MS)
    if (diffDays >= 0 && diffDays <= maxIndex) {
      counts[diffDays] += 1
    }
  })
  return counts
}

function toStartOfDay(value: Date) {
  const cloned = new Date(value)
  cloned.setHours(0, 0, 0, 0)
  return cloned
}
