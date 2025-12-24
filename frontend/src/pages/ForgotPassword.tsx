import React from 'react'
import axios from 'axios'
import '../styles/auth.css'

interface ForgotPasswordProps {
  onBack: () => void
  onBackHome?: () => void
}

export default function ForgotPassword({ onBack, onBackHome }: ForgotPasswordProps) {
  const [step, setStep] = React.useState<'email' | 'reset'>('email')
  const [email, setEmail] = React.useState('')
  const [code, setCode] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [msgType, setMsgType] = React.useState<'info' | 'error' | 'success'>('info')
  const [loading, setLoading] = React.useState(false)

  async function sendResetCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const res = await axios.post('/api/auth/forgot-password', { email })
      setMsg(res.data?.message || 'Mã đặt lại mật khẩu đã được gửi tới email của bạn')
      setMsgType('success')
      setStep('reset')
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error || err?.message
      setMsg(serverMsg || 'Không thể gửi mã reset')
      setMsgType('error')
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    
    if (newPassword !== confirmPassword) {
      setMsg('Mật khẩu xác nhận không khớp')
      setMsgType('error')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('/api/auth/reset-password', {
        email,
        code,
        newPassword,
        confirmPassword
      })
      setMsg(res.data?.message || '✅ Đặt lại mật khẩu thành công!')
      setMsgType('success')
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        onBack()
      }, 2000)
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error || err?.message
      setMsg(serverMsg || 'Đặt lại mật khẩu thất bại')
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

      {onBackHome && (
        <div className="auth-back-home">
          <button type="button" className="link-button" onClick={onBackHome}>
            ← Về trang chủ
          </button>
        </div>
      )}

      <div className="auth-layout">
        <div className="auth-showcase">
          <span className="brand-pill">Khôi phục truy cập</span>
          <h2>Đặt lại mật khẩu chỉ với vài thao tác.</h2>
          <p className="showcase-copy">
            Hệ thống bảo vệ hai lớp đảm bảo mọi yêu cầu đặt lại mật khẩu đều được xác minh rõ ràng và ghi nhận trong nhật ký bảo mật.
          </p>
          <ul className="showcase-list">
            <li>
              <span className="list-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5V2" />
                  <path d="M17 7l3-3-3-3" />
                  <path d="M7 17l-3 3 3 3" />
                  <path d="M12 19v3" />
                </svg>
              </span>
              Theo dõi tiến trình từng bước
            </li>
            <li>
              <span className="list-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 6 9 6 9-6" />
                  <path d="M21 18H3V6" />
                </svg>
              </span>
              Mã OTP hiệu lực 3 phút
            </li>
          </ul>

        </div>

        <div className="auth-card form-card">
          <div className="auth-header">
            <p className="form-eyebrow">Khôi phục quyền truy cập</p>
            <h1>Quên mật khẩu</h1>
            <p className="auth-subtitle">
              {step === 'email' 
                ? 'Nhập email để nhận mã xác nhận bảo mật.' 
                : 'Điền mã OTP và đặt lại mật khẩu an toàn.'}
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={sendResetCode} className="auth-form">
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
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi Mã Xác Nhận'}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="auth-form">
              <div className="form-group">
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
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Mật khẩu mới</label>
                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input 
                    id="newPassword"
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Nhập lại mật khẩu mới</label>
                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 11v6" />
                      <path d="M9 14h6" />
                    </svg>
                  </span>
                  <input 
                    id="confirmPassword"
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đặt Lại Mật Khẩu'}
              </button>

              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setStep('email')}
                disabled={loading}
              >
                Gửi Lại Mã
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
              Nhớ mật khẩu? <button type="button" className="link-button" onClick={onBack}>Đăng nhập ngay</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
