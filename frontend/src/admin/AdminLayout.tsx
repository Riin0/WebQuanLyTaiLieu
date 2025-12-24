import React from 'react'
import { LuShield, LuLogOut, LuMenu, LuUserCog } from 'react-icons/lu'
import LayoutShell, { LayoutShellProps } from '../layouts/LayoutShell'

export type AdminLayoutProps = Omit<LayoutShellProps, 'logoIcon' | 'userAvatar' | 'logoutIcon' | 'toggleIcon'> & {
  logoText?: string
  logoSubtitle?: string
}

export default function AdminLayout({ logoText = 'AdminCenter', logoSubtitle = 'Bảng điều khiển', ...rest }: AdminLayoutProps) {
  return (
    <LayoutShell
      logoIcon={<LuShield className="logo-icon" />}
      userAvatar={<LuUserCog />}
      logoutIcon={<LuLogOut />}
      toggleIcon={<LuMenu />}
      logoText={logoText}
      logoSubtitle={logoSubtitle}
      {...rest}
    />
  )
}
