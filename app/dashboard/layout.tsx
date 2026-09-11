'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const nav = [
  { section: 'Overview' },
  {
    href: '/dashboard',
    icon: '/dashboard.png',
    label: 'Dashboard',
  },

  { section: 'Users' },
  {
    href: '/dashboard/users',
    icon: '/user.png',
    label: 'User Accounts',
  },
  {
    href: '/dashboard/activity',
    icon: '/user-activity.png',
    label: 'User Activity',
    badge: '5',
  },

  { section: 'Analytics' },
  {
    href: '/dashboard/analytics',
    icon: '/analytics.png',
    label: 'Learning Analytics',
  },

  { section: 'System' },
  {
    href: '/dashboard/settings',
    icon: '/settings.png',
    label: 'Settings',
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [userName, setUserName] = useState('Admin')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    async function getUserProfile() {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error('Error getting user:', userError)
        return
      }

      if (!user) {
        console.error('No logged-in user found')
        return
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

      if (profileError) {
        console.error(
          'Error getting profile:',
          profileError.message,
          profileError.details,
          profileError.hint
        )
        return
      }

      if (profile?.display_name) {
        setUserName(profile.display_name)
      }

      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url)
      }
    }

    getUserProfile()
  }, [])

  async function logout() {
    const supabase = createClient()

    await supabase.auth.signOut()

    router.push('/login')
  }

  const title =
    nav.find(
      (i) => 'href' in i && i.href === pathname
    )?.label ?? 'Dashboard'

  const initials = userName
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="shell">

      {/* SIDEBAR */}
      <nav className="sidebar">

        {/* BRAND */}
        <div className="sb-brand">
          <div className="logo">

            {/* USER PROFILE PHOTO */}
            <div
              className="logo-icon"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div>
              <div className="logo-text">
                {userName}
              </div>
            </div>

          </div>
        </div>

        {/* NAVIGATION */}
        <div className="sb-scroll">

          {nav.map((item, i) => {

            if ('section' in item) {
              return (
                <div
                  key={i}
                  className="sb-section"
                >
                  {item.section}
                </div>
              )
            }

            const active =
              pathname === item.href ||
              (
                item.href !== '/dashboard' &&
                pathname.startsWith(item.href)
              )

            return (
              <Link
                key={i}
                href={item.href}
                className={`sb-item${active ? ' active' : ''}`}
              >

                <img
                  src={item.icon}
                  alt=""
                  style={{
                    width: 20,
                    height: 20,
                    objectFit: 'contain',
                    flexShrink: 0,
                  }}
                />

                <span style={{ flex: 1 }}>
                  {item.label}
                </span>

                {item.badge && (
                  <span className="sb-badge">
                    {item.badge}
                  </span>
                )}

              </Link>
            )
          })}

        </div>

        {/* USER CARD */}
        <div className="sb-footer">

          <div className="user-card">

            {/* USER PROFILE PHOTO */}
            <div
              className="avatar"
              style={{
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                initials
              )}
            </div>

            <div style={{ flex: 1 }}>

              <div className="user-name">
                {userName}
              </div>

              <div className="user-role">
                Super Admin
              </div>

            </div>

            <button
              onClick={logout}
              className="btn sm"
            >
              Sign out
            </button>

          </div>

        </div>

      </nav>

      {/* MAIN */}
      <div className="main">

        {/* TOPBAR */}
        <header className="topbar">

          <h1 className="tb-title">
            {title}
          </h1>

          <div className="tb-actions">

            <button className="btn primary sm">
              Export
            </button>

          </div>

        </header>

        {/* PAGE CONTENT */}
        <main className="content">
          {children}
        </main>

      </div>

    </div>
  )
}