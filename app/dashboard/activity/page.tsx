'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ActivityEvent, errorMessage, getActivityFeed } from '@/lib/admin/adminService'

type Log = ActivityEvent

const PAGE_SIZE = 200

const actionPill: Record<string, string> = {
  lesson_complete : 'pill-green',
  pretest         : 'pill-amber',
  quiz_submit     : 'pill-amber',
  login           : 'pill-blue',
  register        : 'pill-purple',
  bug_report      : 'pill-red',
  report_reply    : 'pill-red',
  review          : 'pill-gray',
  logout          : 'pill-gray',
}

const actionDot: Record<string, string> = {
  lesson_complete : '#10B981',
  pretest         : '#F59E0B',
  quiz_submit     : '#F59E0B',
  login           : '#4F46E5',
  register        : '#8B5CF6',
  bug_report      : '#EF4444',
  report_reply    : '#EF4444',
  review          : '#0EA5E9',
  logout          : '#9CA3AF',
}

const actionLabel: Record<string, string> = {
  lesson_complete : 'Practice',
  pretest         : 'Pretest',
  login           : 'Sign in',
  register        : 'Sign up',
  bug_report      : 'Bug report',
  report_reply    : 'Report reply',
}

// The app writes to these tables, so a new row means there's new activity to show.
const LIVE_TABLES = ['practice_history', 'pretest_progress', 'bug_reports', 'bug_report_messages', 'profiles', 'activity_logs']

export default function ActivityPage() {
  const [logs, setLogs]             = useState<Log[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [actionFilter, setAction]   = useState('All actions')
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getActivityFeed(PAGE_SIZE)
      setLogs(data)
      setHasMore(data.length === PAGE_SIZE)
      setError(null)
    } catch (e) {
      setError(errorMessage(e, "Couldn't load activity."))
    } finally {
      setLoading(false)
    }
  }, [])

  async function loadMore() {
    const oldest = logs[logs.length - 1]
    if (!oldest) return
    setLoadingMore(true)
    try {
      const data = await getActivityFeed(PAGE_SIZE, oldest.created_at)
      setLogs(prev => {
        const seen = new Set(prev.map(l => l.id))
        return [...prev, ...data.filter(l => !seen.has(l.id))]
      })
      setHasMore(data.length === PAGE_SIZE)
    } catch (e) {
      setError(errorMessage(e, "Couldn't load older activity."))
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchLogs()

    // Refetch shortly after any of the app's tables change, so bursts of
    // activity cause one reload rather than one per row.
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(fetchLogs, 1500)
    }
    let channel = supabase.channel('admin_activity_feed')
    for (const table of LIVE_TABLES) {
      channel = channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table }, scheduleRefresh)
    }
    channel.subscribe()

    // Realtime only delivers rows the admin's RLS allows, and sign-ins don't
    // insert anything, so also poll as a fallback.
    const poll = setInterval(fetchLogs, 60_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [fetchLogs])

  const actions = [...new Set(logs.map(l => l.action).filter(Boolean))]

  const filtered = logs.filter(l => {
    const matchSearch = (
      (l.user_name  || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.description|| '').toLowerCase().includes(search.toLowerCase())
    )
    const matchAction = actionFilter === 'All actions' || l.action === actionFilter
    return matchSearch && matchAction
  })

  const stats = {
    total       : logs.length,
    uniqueUsers : new Set(logs.map(l => l.user_id).filter(Boolean)).size,
    uniqueActions: new Set(logs.map(l => l.action).filter(Boolean)).size,
    today       : logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
  }

  function formatTime(ts: string) {
    const d = new Date(ts)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60)   return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <>
      {/* Metrics */}
<div className="metrics-grid">
  {[
    { label: 'Total Logs', value: stats.total },
    { label: 'Today', value: stats.today },
    { label: 'Unique Users', value: stats.uniqueUsers },
    { label: 'Action Types', value: stats.uniqueActions },
  ].map((m, i) => (
    <div key={i} className="metric-card">
      <div className="metric-label">{m.label}</div>
      <div className="metric-value">{m.value}</div>
    </div>
  ))}
</div>

      {/* Table card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            ⚡ Activity Logs
            <span style={{ marginLeft:8, fontSize:11, background:'#F3F4F6', color:'#6B7280', padding:'2px 8px', borderRadius:99, fontWeight:400 }}>
              {loading ? '…' : `${filtered.length} records`}
            </span>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {/* Search */}
            <input
              placeholder="Search user or description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border:'1px solid #E5E7EB', borderRadius:6, padding:'6px 10px', fontSize:13, outline:'none', width:220 }}
            />
            {/* Action filter */}
            <select
              value={actionFilter}
              onChange={e => setAction(e.target.value)}
              style={{ border:'1px solid #E5E7EB', borderRadius:6, padding:'6px 10px', fontSize:13 }}
            >
              <option>All actions</option>
              {actions.map(a => <option key={a} value={a}>{actionLabel[a] || a}</option>)}
            </select>
            {/* Refresh */}
            <button
              className="btn sm"
              onClick={() => { setLoading(true); fetchLogs() }}
              title="Refresh"
            >
              Refresh
            </button>
            {/* Export CSV */}
            <button
              className="btn sm"
              onClick={() => {
                const csv = [
                  ['User Name','Email','Action','Description','Date'].join(','),
                  ...filtered.map(l => [
                    l.user_name   || '',
                    l.user_email  || '',
                    actionLabel[l.action] || l.action || '',
                    (l.description|| '').replace(/,/g,' '),
                    new Date(l.created_at).toLocaleString(),
                  ].join(','))
                ].join('\n')
                const blob = new Blob([csv], { type:'text/csv' })
                const url  = URL.createObjectURL(blob)
                const a    = document.createElement('a')
                a.href = url; a.download = 'activity_logs.csv'; a.click()
              }}
            >
              CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="flash flash-error">
            {error}
            {/function .*admin_activity_feed|does not exist/i.test(error) &&
              ' Run sql/admin_activity_feed.sql (in this admin repo) in the Supabase SQL editor.'}
          </div>
        )}

        {/* Loading spinner */}
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, flexDirection:'column', gap:12 }}>
            <div style={{ width:32, height:32, border:'3px solid #E5E7EB', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <div style={{ fontSize:13, color:'#9CA3AF' }}>Loading from Supabase…</div>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign:'center', color:'#9CA3AF', padding:40 }}>
                      {logs.length === 0 ? 'No activity yet.' : 'No results match your search.'}
                    </td>
                  </tr>
                )}
                {filtered.map((log, i) => (
                  <tr key={log.id}>
                    <td style={{ color:'#9CA3AF', fontSize:12 }}>{i + 1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:'#EEF2FF', color:'#4F46E5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                          {(log.user_name || log.user_email || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <strong style={{ fontSize:13 }}>{log.user_name || '—'}</strong>
                      </div>
                    </td>
                    <td style={{ fontSize:12, color:'#6B7280' }}>{log.user_email || '—'}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:7, height:7, borderRadius:'50%', background: actionDot[log.action] || '#9CA3AF', flexShrink:0 }} />
                        <span className={`pill ${actionPill[log.action] || 'pill-gray'}`} style={{ fontSize:11 }}>
                          {actionLabel[log.action] || log.action || '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ color:'#374151', maxWidth:280 }}>
                      <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13 }}>
                        {log.description || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize:12, color:'#9CA3AF', whiteSpace:'nowrap' }}>
                      {formatTime(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && !search && actionFilter === 'All actions' && (
              <div style={{ display:'flex', justifyContent:'center', padding:16 }}>
                <button className="btn sm" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load older activity'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </> 
  )
}