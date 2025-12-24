import React from 'react'
import { LuBookOpen, LuCompass } from 'react-icons/lu'
import type { Subject } from '../types/subject'
import '../styles/home.css'

interface SubjectsProps {
  subjects: Subject[]
  palette: string[]
  loading: boolean
  error: string
  onViewDocuments: (subject?: Subject) => void
  onSubjectSelect: (subject: Subject) => void
}

export default function Subjects({ subjects, palette, loading, error, onViewDocuments, onSubjectSelect }: SubjectsProps) {
  return (
    <div className="subjects-view">
      <div className="subjects-header">
        <div>
          <p className="section-eyebrow">Môn học</p>
          <h3 className="section-title">Quản lý danh sách môn</h3>
        </div>
        <button className="btn-cta" onClick={() => onViewDocuments()}>
          <LuCompass size={18} />
          <span>Đi tới thư viện</span>
        </button>
      </div>

      {loading ? (
        <div className="subjects-placeholder">Đang tải danh sách môn học...</div>
      ) : error ? (
        <div className="subjects-error">{error}</div>
      ) : subjects.length === 0 ? (
        <div className="subjects-placeholder">Chưa có môn học nào.</div>
      ) : (
        <div className="subjects-grid">
          {subjects.map((subject, index) => {
            const accent = palette[index % palette.length]
            return (
              <article key={subject.id ?? index} className="subjects-card">
                <header>
                  <div className="subject-dot" style={{ backgroundColor: accent }} />
                  <span className="subject-badge">
                    {(subject.documentCount ?? 0).toLocaleString('vi-VN')}
                  </span>
                </header>
                <h3>{subject.tenMonHoc}</h3>
                <div className="subjects-card-actions">
                  <button className="subject-card-button" onClick={() => onSubjectSelect(subject)}>
                    <LuBookOpen size={16} />
                    <span>Xem tài liệu</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
