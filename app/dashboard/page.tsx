'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    lessonsCompleted: 0,
    avgLevel: 0,
  })
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [topUsers, setTopUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const supabase = createClient()

      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Avg level
      const { data: levelData } = await supabase
        .from('profiles')
        .select('level')

      const avgLevel = levelData && levelData.length > 0
        ? Math.round(levelData.reduce((a, b) => a + (b.level || 0), 0) / levelData.length)
        : 0

      // Lessons completed
      const { count: lessonsCompleted } = await supabase
        .from('lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      // Recent activity logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      // Top users by XP
      const { data: top } = await supabase
        .from('profiles')
        .select('display_name, email, xp, level, role, region')
        .order('xp', { ascending: false })
        .limit(5)

      setStats({
        totalUsers: totalUsers || 0,
        activeToday: logs?.length || 0,
        lessonsCompleted: lessonsCompleted || 0,
        avgLevel,
      })
      setRecentLogs(logs || [])
      setTopUsers(top || [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  const actionColor: Record<string, string> = {
    lesson_complete: '#10B981',
    quiz_submit:     '#4F46E5',
    login:           '#0EA5E9',
    register:        '#F59E0B',
    review:          '#8B5CF6',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>Loading from Supabase…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      {/* Metrics */}
      <div className="metrics-grid">
        {[
          { icon: '', bg: '#EEF2FF', cl: '#4F46E5', label: 'Total Learners',      value: stats.totalUsers.toLocaleString() },
          { icon: '', bg: '#D1FAE5', cl: '#10B981', label: 'Activity Logs Today', value: stats.activeToday.toLocaleString() },
          { icon: '', bg: '#FEF3C7', cl: '#F59E0B', label: 'Lessons Completed',   value: stats.lessonsCompleted.toLocaleString() },
          { icon: '', bg: '#DBEAFE', cl: '#3B82F6', label: 'Avg. User Level',     value: `Lvl ${stats.avgLevel}` },
        ].map((m, i) => (
          <div key={i} className="metric-card">
            <div className="metric-icon" style={{ background: m.bg, color: m.cl }}>{m.icon}</div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Recent Activity from activity_logs */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚡ Recent Activity</div>
            <a href="/dashboard/activity" className="btn sm">View all</a>
          </div>
          {recentLogs.length === 0 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, padding: '8px 0' }}>No activity logs yet.</div>
          )}
          {recentLogs.map((log, i) => (
            <div key={i} className="activity-item">
              <div className="activity-dot" style={{ background: actionColor[log.action] || '#9CA3AF' }} />
              <div>
                <div className="activity-text">
                  <strong>{log.user_name || log.user_email || 'Unknown'}</strong> — {log.description || log.action}
                </div>
                <div className="activity-time">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Users by XP from profiles */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"> Top Learners by XP</div>
            <a href="/dashboard/users" className="btn sm">View all</a>
          </div>
          {topUsers.length === 0 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, padding: '8px 0' }}>No users yet.</div>
          )}
          {topUsers.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: ['#EEF2FF','#D1FAE5','#FEF3C7','#DBEAFE','#FEE2E2'][i],
                color: ['#4F46E5','#10B981','#F59E0B','#3B82F6','#EF4444'][i],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                  {u.display_name || u.email || 'Unknown'}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                  Level {u.level || 0} · {u.region || 'No region'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>{(u.xp || 0).toLocaleString()} XP</div>
                <span className={`pill ${u.role === 'admin' ? 'pill-red' : 'pill-gray'}`} style={{ fontSize: 10 }}>{u.role || 'learner'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supabase tables overview */}
      <div className="grid-3">
        <div className="card">
          <div className="card-header"><div className="card-title"> Profiles Table</div></div>
          {[
            ['id', 'uuid', true],
            ['display_name', 'text', false],
            ['email', 'text', false],
            ['role', 'text', false],
            ['xp', 'int4', false],
            ['level', 'int4', false],
            ['region', 'text', false],
          ].map(([col, type, pk], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 12, fontFamily: 'monospace', flex: 1, color: pk ? '#4F46E5' : '#374151', fontWeight: pk ? 700 : 400 }}>
                {pk ? '🔑 ' : '◇ '}{col}
              </div>
              <span style={{ fontSize: 10, background: '#F3F4F6', color: '#6B7280', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{type}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title"> Activity Logs Table</div></div>
          {[
            ['id', 'uuid', true],
            ['user_id', 'uuid', false],
            ['user_email', 'text', false],
            ['user_name', 'text', false],
            ['action', 'text', false],
            ['description', 'text', false],
            ['created_at', 'timestamp', false],
          ].map(([col, type, pk], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 12, fontFamily: 'monospace', flex: 1, color: pk ? '#4F46E5' : '#374151', fontWeight: pk ? 700 : 400 }}>
                {pk ? '🔑 ' : '◇ '}{col}
              </div>
              <span style={{ fontSize: 10, background: '#F3F4F6', color: '#6B7280', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{type}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title"> Lesson Progress Table</div></div>
          {[
            ['id', 'uuid', true],
            ['user_id', 'uuid', false],
            ['lesson_id', 'text', false],
            ['word_id', 'text', false],
            ['ease_factor', 'float8', false],
            ['interval_days', 'int4', false],
            ['repetitions', 'int4', false],
            ['status', 'text', false],
          ].map(([col, type, pk], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 12, fontFamily: 'monospace', flex: 1, color: pk ? '#4F46E5' : '#374151', fontWeight: pk ? 700 : 400 }}>
                {pk ? '🔑 ' : '◇ '}{col}
              </div>
              <span style={{ fontSize: 10, background: '#F3F4F6', color: '#6B7280', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{type}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}