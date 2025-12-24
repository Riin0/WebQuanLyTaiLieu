import React from 'react'
import { LuFolderOpen, LuLogOut, LuMenu, LuUser } from 'react-icons/lu'
import LayoutShell, { LayoutShellProps } from '../layouts/LayoutShell'

export type UserLayoutProps = Omit<LayoutShellProps, 'logoIcon' | 'toggleIcon'>

export default function UserLayout({ logoutIcon, userAvatar, ...props }: UserLayoutProps) {
  return (
    <LayoutShell
      logoIcon={<LuFolderOpen className="logo-icon" />}
      userAvatar={userAvatar ?? <LuUser />}
      logoutIcon={logoutIcon ?? <LuLogOut />}
      toggleIcon={<LuMenu />}
      {...props}
    />
  )
}
