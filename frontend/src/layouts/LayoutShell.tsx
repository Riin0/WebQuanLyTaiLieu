import React, { useState } from 'react'
import type { IconType } from 'react-icons'
import '../styles/layout.css'

export interface SidebarItem {
  label: string
  icon: IconType
  active?: boolean
  onClick?: () => void
}

export interface SidebarSection {
  title?: string
  items: SidebarItem[]
}

export interface LayoutShellProps {
  logoIcon?: React.ReactNode
  logoText?: string
  logoSubtitle?: string
  navItems: SidebarItem[]
  sections?: SidebarSection[]
  topTitle: string
  topActions?: React.ReactNode
  userName?: string
  userRole?: string
  userAvatar?: React.ReactNode
  logoutIcon?: React.ReactNode
  toggleIcon?: React.ReactNode
  userActionLabel?: string
  onLogout: () => void
  onProfileClick?: () => void
  children: React.ReactNode
}

export default function LayoutShell({
  logoIcon,
  logoText,
  logoSubtitle,
  navItems,
  sections = [],
  topTitle,
  topActions,
  userName,
  userRole,
  userAvatar,
  logoutIcon,
  toggleIcon,
  userActionLabel,
  onLogout,
  onProfileClick,
  children
}: LayoutShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-body">
          <div className="sidebar-header">
            <div className="logo">
              {logoIcon}
              {!collapsed && logoText && <span className="logo-text">{logoText}</span>}
            </div>
            {!collapsed && logoSubtitle && <p className="logo-subtitle">{logoSubtitle}</p>}
          </div>

          <nav className="sidebar-nav">
            {navItems.map(({ label, icon: Icon, active, onClick }) => (
              <button
                key={label}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={onClick}
              >
                <Icon className="nav-icon" />
                {!collapsed && <span>{label}</span>}
              </button>
            ))}
          </nav>

          {sections.map((section) => (
            <div className="sidebar-section" key={section.title ?? section.items[0]?.label}>
              {!collapsed && section.title && (
                <div className="section-title">{section.title}</div>
              )}
              {section.items.map(({ label, icon: Icon, onClick }) => (
                <button key={label} className="nav-item" onClick={onClick}>
                  <Icon className="nav-icon" />
                  {!collapsed && <span>{label}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              {userAvatar ?? userName?.[0]?.toUpperCase() ?? '👤'}
            </div>
            {!collapsed && (
              <div className="user-details">
                <div className="user-name">{userName}</div>
                {userRole && <div className="user-role">{userRole}</div>}
                {onProfileClick && (
                  <button type="button" className="user-profile-link" onClick={onProfileClick}>
                    Thông tin cá nhân
                  </button>
                )}
              </div>
            )}
            <button
              onClick={onLogout}
              className="btn-logout-icon"
              title={userActionLabel || 'Đăng xuất'}
            >
              {logoutIcon ?? '🚪'}
            </button>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="top-bar">
          <button
            className="btn-toggle-sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            {toggleIcon ?? '☰'}
          </button>
          <h1 className="page-title">{topTitle}</h1>
          <div className="top-bar-actions">{topActions}</div>
        </header>

        <main className="content-area">{children}</main>
      </div>
    </div>
  )
}
