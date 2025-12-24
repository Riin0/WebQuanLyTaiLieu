import React from 'react'
import axios from 'axios'
import '../styles/auth.css'

interface LoginProps {
  onLogin: (t: string | null) => void
  onShowRegister?: () => void
  onShowForgotPassword?: () => void
  onBackHome?: () => void
}

export default function Login({ onLogin, onShowRegister, onShowForgotPassword, onBackHome }: LoginProps) {
  const [email,setEmail] = React.useState('')
  const [password,setPassword] = React.useState('')
  const [msg,setMsg] = React.useState('')
  const [msgType,setMsgType] = React.useState<'info'|'error'|'success'>('info')
  const [loading,setLoading] = React.useState(false)
  const redirectTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
    }
  }, [])

  async function submit(e:React.FormEvent){
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try{
      const res = await axios.post('/api/auth/login',{email,password})
      setMsgType('success')
      setMsg('Đăng nhập thành công! Đang chuyển hướng...')
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
      redirectTimer.current = setTimeout(() => onLogin(res.data.accessToken), 650)
    }catch(err:any){
      setMsgType('error')
      setMsg(err.response?.data?.error || 'Đăng nhập thất bại')
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

      <div className="auth-layout">
        <div className="auth-showcase">
          <span className="brand-pill">WebDocs Platform</span>
          <h2>Quản lý tài liệu trở nên thanh lịch và thông minh.</h2>
          <p className="showcase-copy">
            Đồng bộ tài nguyên học tập, phân quyền truy cập, và theo dõi hoạt động trong một giao diện tối giản nhưng đầy cảm hứng.
          </p>
          <ul className="showcase-list">
            <li>
              <span className="list-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              Mã hóa đăng nhập và phân quyền linh hoạt
            </li>
            <li>
              <span className="list-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20v-6" />
                  <circle cx="12" cy="10" r="4" />
                </svg>
              </span>
              Giao diện phản hồi nhanh trên mọi thiết bị
            </li>
          </ul>

        </div>

        <div className="auth-card form-card">
          <div className="auth-header">
            <p className="form-eyebrow">Mời bạn quay lại</p>
            <h1>Đăng nhập hệ thống</h1>
            <p className="auth-subtitle">Kết nối tài khoản để truy cập kho tài liệu được cá nhân hóa.</p>
          </div>
          
          <form onSubmit={submit} className="auth-form">
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
                  onChange={e=>setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
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
                  onChange={e=>setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {onShowForgotPassword && (
              <div className="form-meta">
                <button type="button" className="link-button" onClick={onShowForgotPassword}>
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
            </button>
          </form>

          {onBackHome && (
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: '16px' }}
              onClick={onBackHome}
            >
              ← Quay lại trang chủ
            </button>
          )}

          {onShowRegister && (
            <div className="auth-footer">
              <p>Chưa có tài khoản? <button type="button" className="link-button" onClick={onShowRegister}>Tạo tài khoản mới</button></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
