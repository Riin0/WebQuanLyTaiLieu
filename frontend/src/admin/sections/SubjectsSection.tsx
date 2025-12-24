import React from 'react'
import { LuPencil, LuRefreshCcw, LuSearch, LuTrash2, LuX } from 'react-icons/lu'
import type { AdminSubjectPayload, AdminSubjectSummary } from '../types'

interface SubjectsSectionProps {
  subjects: AdminSubjectSummary[]
  loading: boolean
  onRefresh: () => void
  onCreate: (payload: AdminSubjectPayload) => Promise<void>
  onUpdate: (id: number, payload: AdminSubjectPayload) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

type FormMode = 'hidden' | 'create' | 'edit'

export default function SubjectsSection({
  subjects,
  loading,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete
}: SubjectsSectionProps) {
  const [query, setQuery] = React.useState('')
  const [formMode, setFormMode] = React.useState<FormMode>('hidden')
  const [draftName, setDraftName] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [editingSubject, setEditingSubject] = React.useState<AdminSubjectSummary | null>(null)
  const [pendingActionId, setPendingActionId] = React.useState<number | null>(null)

  const normalizedQuery = query.trim().toLowerCase()
  const filteredSubjects = React.useMemo(() => (
    !normalizedQuery
      ? subjects
      : subjects.filter((subject) => (
        subject.tenMonHoc.toLowerCase().includes(normalizedQuery)
      ))
  ), [subjects, normalizedQuery])

  const totalDocuments = React.useMemo(() => (
    subjects.reduce((sum, subject) => sum + (subject.documentCount ?? 0), 0)
  ), [subjects])

  function resetForm() {
    setFormMode('hidden')
    setDraftName('')
    setFormError(null)
    setEditingSubject(null)
  }

  function startCreate() {
    setFormMode('create')
    setDraftName('')
    setFormError(null)
    setEditingSubject(null)
  }

  function startEdit(subject: AdminSubjectSummary) {
    setFormMode('edit')
    setEditingSubject(subject)
    setDraftName(subject.tenMonHoc)
    setFormError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = draftName.trim().replace(/\s+/g, ' ')
    if (!normalizedName) {
      setFormError('Vui lòng nhập tên môn học')
      return
    }

    setSubmitting(true)
    try {
      if (formMode === 'create') {
        await onCreate({ tenMonHoc: normalizedName })
      } else if (formMode === 'edit' && editingSubject) {
        await onUpdate(editingSubject.id, { tenMonHoc: normalizedName })
      }
      resetForm()
    } catch (error) {
      setFormError('Không thể lưu thay đổi, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(subject: AdminSubjectSummary) {
    if (!window.confirm(`Xóa môn học "${subject.tenMonHoc}"?`)) return
    setPendingActionId(subject.id)
    try {
      await onDelete(subject.id)
    } catch (error) {
      // toast ở cấp cha sẽ hiển thị lỗi
    } finally {
      setPendingActionId(null)
    }
  }

  if (loading) {
    return <div className="admin-placeholder">Đang tải danh sách môn học...</div>
  }

  return (
    <section className="admin-section subjects">
      <header className="admin-section-header">
        <div>
          <h3>Quản lý môn học</h3>
          <p>{subjects.length} môn học &bull; {totalDocuments.toLocaleString('vi-VN')} tài liệu</p>
        </div>
        <div className="admin-section-actions">
          <button className="btn-outline" onClick={onRefresh}>
            <LuRefreshCcw />
            Làm mới
          </button>
          <button className="btn-primary btn-subject-add" onClick={startCreate}>
            Thêm môn
          </button>
        </div>
      </header>

      {formMode !== 'hidden' && (
        <div className="admin-subject-form">
          <form onSubmit={handleSubmit}>
            <div className="admin-form-row">
              <label htmlFor="subjectName">Tên môn học</label>
              <input
                id="subjectName"
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="VD: Giải tích 1"
                disabled={submitting}
                autoFocus
              />
            </div>
            {formError && <p className="admin-form-error">{formError}</p>}
            <div className="admin-form-actions">
              <button type="button" className="btn-soft" onClick={resetForm} disabled={submitting}>
                <LuX />
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Đang lưu...' : formMode === 'create' ? 'Thêm mới' : 'Cập nhật'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-subject-toolbar">
        <div className="admin-input-with-icon">
          <LuSearch />
          <input
            type="text"
            placeholder="Tìm nhanh theo tên môn học"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="admin-toolbar-hint">
          {filteredSubjects.length} kết quả
        </span>
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="admin-placeholder">Không tìm thấy môn học phù hợp.</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên môn học</th>
                <th>Tổng tài liệu</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((subject) => (
                <tr key={subject.id}>
                  <td>{subject.tenMonHoc}</td>
                  <td>{(subject.documentCount ?? 0).toLocaleString('vi-VN')}</td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        type="button"
                        className="btn-soft"
                        onClick={() => startEdit(subject)}
                        disabled={pendingActionId === subject.id}
                      >
                        <LuPencil />
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleDelete(subject)}
                        disabled={pendingActionId === subject.id}
                      >
                        <LuTrash2 />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
