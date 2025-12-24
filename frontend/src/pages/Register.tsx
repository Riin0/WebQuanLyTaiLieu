import React from 'react'
import axios from 'axios'
import '../styles/auth.css'

interface RoleOption {
  id: number
  name: string
  slug: string
  selfAssignable: boolean
}

const FALLBACK_ROLE_OPTIONS: RoleOption[] = [
  { id: 2, name: 'Quản trị viên', slug: 'ADMIN', selfAssignable: true },
  { id: 3, name: 'Giảng viên', slug: 'GIANGVIEN', selfAssignable: true },
  { id: 4, name: 'Sinh viên', slug: 'SINHVIEN', selfAssignable: true }
]

interface RegisterProps {
  onRegistered?: () => void
  onBackHome?: () => void
}

export default function Register({ onRegistered, onBackHome }: RegisterProps) {
  const [email, setEmail] = React.useState('')
  const [name, setName] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [roles, setRoles] = React.useState<RoleOption[]>([])
  const [selectedRoleId, setSelectedRoleId] = React.useState<number | null>(null)
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [rolesError, setRolesError] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [msgType, setMsgType] = React.useState<'info' | 'error' | 'success'>('info')
  const [code, setCode] = React.useState('')
  const [resendLoading, setResendLoading] = React.useState(false)
  const [verified, setVerified] = React.useState(false)
  const [loading, setLoading] = React.useState(false) 

  React.useEffect(() => {
    let cancelled = false
    async function fetchRoles() {
      setRolesLoading(true)
      setRolesError('')
      try {
        const res = await axios.get<RoleOption[]>('/api/roles')
        if (cancelled) return
        setRoles(res.data)
        const defaultRole = res.data.find(r => r.selfAssignable)
        setSelectedRoleId(defaultRole?.id ?? null)
      } catch (err: any) {
        if (cancelled) return
        const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message
        setRolesError(serverMsg || 'Không thể tải danh sách vai trò')
        setRoles(prev => {
          if (prev.length > 0) return prev
          return FALLBACK_ROLE_OPTIONS
        })
        setSelectedRoleId(prev => prev ?? FALLBACK_ROLE_OPTIONS[0]?.id ?? null)
      } finally {
        if (!cancelled) setRolesLoading(false)
      }
    }
    fetchRoles()
    return () => { cancelled = true }
  }, [])

  async function sendCode() {
    if (!email) return setMsg('Vui lòng nhập email trước khi gửi mã')
    setResendLoading(true)
    setMsg('')
    try {
      const res = await axios.post('/api/auth/send-code', { email })
      setMsg(res.data?.message || 'Mã xác nhận đã được gửi tới email của bạn')
      setMsgType('success')
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message
      setMsg(serverMsg || 'Gửi mã thất bại')
      setMsgType('error')
    } finally {
      setResendLoading(false)
    }
  }

  async function verifyCode() {
    if (!email || !code) return setMsg('Vui lòng nhập email và mã xác nhận')
    try {
      const res = await axios.post('/api/auth/verify', { email, code })
      setVerified(true)
      setMsg('Xác thực email thành công! Bạn có thể tiếp tục đăng ký.')
      setMsgType('success')
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message
      setMsg(serverMsg || 'Mã xác thực không hợp lệ')
      setMsgType('error')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setMsgType('info')
    if (!verified) {
      setMsg('Vui lòng xác thực email trước khi đăng ký')
      setMsgType('error')
      return
    }
    if (password !== confirm) {
      setMsg('Mật khẩu không khớp')
      setMsgType('error')
      return
    }
    if (!name.trim()) {
      setMsg('Vui lòng nhập tên đăng nhập')
      setMsgType('error')
      return
    }
    if (!selectedRoleId) {
      setMsg('Vui lòng chọn vai trò hợp lệ')
      setMsgType('error')
      return
    }
    setLoading(true)
    try {
      const selectedRole = roles.find(r => r.id === selectedRoleId)
      await axios.post('/api/auth/register', { 
        email, 
        name: name,
        password, 
        confirmPassword: confirm,
        roleId: selectedRoleId,
        role: selectedRole?.slug
      })
      setMsg('Đăng ký thành công!')
      setMsgType('success')
      if (onRegistered) setTimeout(() => onRegistered(), 1500)
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message
      setMsg(serverMsg || 'Đăng ký thất bại')
      setMsgType('error')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="auth-page">
      {msg && (
        <div className={`auth-toast auth-toast--${msgType}`} role="status" aria-live="polite">
          {msg}
        </div>
      )}
      <div className="ambient-shape shape-one" />
      <div className="ambient-shape shape-two" />

      <div className="auth-layout register-layout">
        <div className="auth-showcase">
          <span className="brand-pill">Tạo tài khoản mới</span>
          <h2>Trải nghiệm quản lý tài liệu đồng bộ ngay từ ngày đầu.</h2>
          <p className="showcase-copy">
            Quy trình đăng ký gồm xác nhận email, chọn vai trò, và khóa học được cá nhân hóa cho từng nhóm người dùng.
          </p>
          <ul className="showcase-list">
            <li>
              <span className="list-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20c0-3.333 2.667-5 8-5s8 1.667 8 5" />
                </svg>
              </span>
              Vai trò linh hoạt: Sinh viên, Giảng viên, Quản trị
            </li>
            <li>
              <span className="list-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12h16" />
                  <path d="M12 4v16" />
                </svg>
              </span>
              OTP 2 bước bảo vệ tài khoản
            </li>
          </ul>

        </div>

        <div className="auth-card form-card register-card">
          <div className="auth-header">
            <p className="form-eyebrow">3 bước hoàn tất</p>
            <h1>Đăng ký tài khoản</h1>
            <p className="auth-subtitle">Xác thực email, đặt tên đăng nhập và phân quyền để bắt đầu.</p>
          </div>
          
          <form onSubmit={submit} className="auth-form">
            {/* Email Verification Section */}
            <div className={`verification-section ${verified ? 'verified' : ''}`}>
              <div className="verification-heading">
                <h4>Xác nhận email</h4>
                <p>Gửi mã OTP đến email để mở khóa bước tiếp theo.</p>
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16v12H4z" />
                      <path d="m22 6-10 7L2 6" />
                    </svg>
                  </span>
                  <input 
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="your.email@example.com"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    disabled={verified}
                    required
                  />
                </div>
              </div>

              <div className="verification-row">
                <div className="form-group flex-grow">
                  <label htmlFor="code">Mã xác nhận</label>
                  <div className="input-with-icon">
                    <span className="input-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="6" width="18" height="12" rx="2" />
                        <path d="M7 10h10" />
                      </svg>
                    </span>
                    <input 
                      id="code"
                      type="text"
                      className="form-input"
                      placeholder="Nhập mã từ email"
                      value={code} 
                      onChange={e => setCode(e.target.value)} 
                      disabled={verified}
                    />
                  </div>
                </div>
                <div className="verification-buttons">
                  <button 
                    type="button" 
                    className="btn-secondary btn-small"
                    onClick={sendCode} 
                    disabled={resendLoading || verified}
                  >
                    {resendLoading ? '...' : 'Gửi mã'}
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary btn-small"
                    onClick={verifyCode} 
                    disabled={verified}
                  >
                    {verified ? '✓ Đã xác thực' : 'Xác nhận'}
                  </button>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Registration Form */}
            <div className="form-group">
              <label htmlFor="name">Tên đăng nhập</label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M6 20c0-3.333 2.667-5 6-5s6 1.667 6 5" />
                  </svg>
                </span>
                <input 
                  id="name"
                  type="text"
                  className="form-input"
                  placeholder="VD: nguyenanh" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="password">Mật khẩu</label>
                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input 
                    id="password"
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm">Nhập lại mật khẩu</label>
                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 11v6" />
                      <path d="M9 14h6" />
                    </svg>
                  </span>
                  <input 
                    id="confirm"
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={confirm} 
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="role">Vai trò</label>
              <select 
                id="role"
                className="form-select"
                value={selectedRoleId ?? ''}
                onChange={e => setSelectedRoleId(e.target.value ? Number(e.target.value) : null)}
                disabled={rolesLoading}
              >
                {rolesLoading && <option value="">Đang tải...</option>}
                {!rolesLoading && roles.length === 0 && <option value="">Không có vai trò</option>}
                {!rolesLoading && roles.map(roleOption => (
                  <option 
                    key={roleOption.id} 
                    value={roleOption.id}
                    disabled={!roleOption.selfAssignable}
                  >
                    {roleOption.name}
                    {!roleOption.selfAssignable ? ' (Chỉ quản trị cấp cao)' : ''}
                  </option>
                ))}
              </select>
              {rolesError && (
                <p className="error-message" style={{ marginTop: '8px' }}>
                  {rolesError}
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={!verified || loading || !selectedRoleId}
            >
              {loading ? 'Đang đăng ký...' : 'Đăng Ký'}
            </button>
          </form>

          {onRegistered && (
            <div className="auth-footer">
              <p>Đã có tài khoản? <button type="button" className="link-button" onClick={onRegistered}>Đăng nhập ngay</button></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}