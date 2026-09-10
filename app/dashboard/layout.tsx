'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const nav = [
  { section: 'Overview' },
  { href: '/dashboard',           icon: '▦',  label: 'Dashboard' },
  { section: 'Learning' },
  { href: '/dashboard/lessons',   icon: '📚', label: 'Lesson Management' },
  { section: 'Users' },
  { href: '/dashboard/users',     icon: '👥', label: 'User Accounts' },
  { href: '/dashboard/activity',  icon: '⚡', label: 'User Activity', badge: '5' },
  { section: 'Analytics' },
  { href: '/dashboard/analytics', icon: '📈', label: 'Learning Analytics' },
  { section: 'System' },
  { href: '/dashboard/settings',  icon: '⚙️', label: 'Settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const title = nav.find(i => 'href' in i && i.href === pathname)?.label ?? 'Dashboard'

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="sb-brand">
          <div className="logo">
            <div className="logo-icon">🎓</div>
            <div>
              <div className="logo-text">LearnAdmin</div>
              <div className="logo-sub">Next.js + Supabase</div>
            </div>
          </div>
        </div>

        <div className="sb-scroll">
          {nav.map((item, i) => {
            if ('section' in item) return <div key={i} className="sb-section">{item.section}</div>
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={i} href={item.href} className={`sb-item${active ? ' active' : ''}`}>
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && <span className="sb-badge">{item.badge}</span>}
              </Link>
            )
          })}
        </div>

        <div className="sb-footer">
          <div className="user-card">
            <div className="avatar">AD</div>
            <div style={{ flex: 1 }}>
              <div className="user-name">Admin</div>
              <div className="user-role">Super Admin</div>
            </div>
            <button onClick={logout} className="btn sm">Sign out</button>
          </div>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <h1 className="tb-title">{title}</h1>
          <div className="tb-actions">
            <div className="search-wrap">
              <input type="text" placeholder="Search…" />
            </div>
            <button className="icon-btn">🔔</button>
            <button className="btn primary sm">↓ Export</button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}