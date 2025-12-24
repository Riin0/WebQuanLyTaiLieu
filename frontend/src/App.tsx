import React from 'react'
import axios from 'axios'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Home from './user/Home'
import AdminDashboard from './admin/AdminDashboard'

type View = 'home' | 'login' | 'register' | 'forgot' | 'admin'

export default function App() {
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem('accessToken'))
  const [view, setView] = React.useState<View>('home')
  const [userRole, setUserRole] = React.useState<string | null>(null)
  const [shouldAutoRouteAdmin, setShouldAutoRouteAdmin] = React.useState(() => Boolean(localStorage.getItem('accessToken')))

  function handleLogin(t: string | null) {
    setToken(t)
    if (t) {
      localStorage.setItem('accessToken', t)
      setShouldAutoRouteAdmin(true)
      setView('home')
    } else {
      localStorage.removeItem('accessToken')
      setUserRole(null)
      setShouldAutoRouteAdmin(false)
      setView('home')
    }
  }

  function handleLogout() {
    handleLogin(null)
    setView('home')
  }

  React.useEffect(() => {
    if (!token) {
      setUserRole(null)
      return
    }

    let cancelled = false

    async function syncRole() {
      try {
        const { data } = await axios.get('/api/profile/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (cancelled) return
        const role = data?.role ?? null
        setUserRole(role)
        if (shouldAutoRouteAdmin) {
          if (role?.toUpperCase() === 'ADMIN') {
            setView('admin')
          } else {
            setView('home')
          }
        }
      } catch (err) {
        console.error('Cannot determine user role', err)
        if (!cancelled && shouldAutoRouteAdmin) {
          setView('home')
        }
      } finally {
        if (!cancelled && shouldAutoRouteAdmin) {
          setShouldAutoRouteAdmin(false)
        }
      }
    }

    syncRole()

    return () => {
      cancelled = true
    }
  }, [token, shouldAutoRouteAdmin])

  return (
    <div>
      {view === 'home' && (
        <Home
          token={token}
          onLogout={handleLogout}
          onShowLogin={() => setView('login')}
          onShowRegister={() => setView('register')}
          onShowAdmin={() => setView('admin')}
        />
      )}

      {view === 'login' && (
        <Login
          onLogin={(t) => handleLogin(t)}
          onShowRegister={() => setView('register')}
          onShowForgotPassword={() => setView('forgot')}
          onBackHome={() => setView('home')}
        />
      )}

      {view === 'register' && (
        <Register
          onRegistered={() => setView('login')}
          onBackHome={() => setView('home')}
        />
      )}

      {view === 'forgot' && (
        <ForgotPassword
          onBack={() => setView('login')}
          onBackHome={() => setView('home')}
        />
      )}

      {view === 'admin' && token && (
        <AdminDashboard
          token={token}
          onLogout={handleLogout}
          onBackHome={() => setView('home')}
        />
      )}
    </div>
  )
}
