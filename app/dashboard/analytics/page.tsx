'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const dialects = ['Kapampangan', 'Tagalog', 'Waray']

export default function AnalyticsPage() {
  const [dialectStats, setDialectStats] = useState<Record<string, number>>({})
  const [progressStats, setProgressStats] = useState({
    completed: 0, learning: 0, due: 0, total: 0,
  })
  const [topUsers, setTopUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Get profiles to count learners per dialect
      const { data: profiles } = await supabase
        .from('profiles')
        .select('studying_dialects, active_dialect, xp, level, display_name, email, region')

      // Count learners per dialect
      const counts: Record<string, number> = {}
      dialects.forEach(d => { counts[d] = 0 })
      profiles?.forEach(p => {
        const dialect = p.active_dialect || ''
        dialects.forEach(d => {
          if (dialect.toLowerCase().includes(d.toLowerCase())) {
            counts[d] = (counts[d] || 0) + 1
          }
        })
      })
      setDialectStats(counts)

      // Top users by XP
      const sorted = [...(profiles || [])].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5)
      setTopUsers(sorted)

      // Lesson progress stats
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('status')

      const completed = progress?.filter(p => p.status === 'completed').length || 0
      const learning  = progress?.filter(p => p.status === 'learning').length  || 0
      const due       = progress?.filter(p => p.status === 'due').length       || 0
      const total     = progress?.length || 0

      setProgressStats({ completed, learning, due, total })
      setLoading(false)
    }
    fetchData()
  }, [])

  const dialectColors = ['#4F46E5', '#10B981', '#F59E0B']
  const dialectBg     = ['#EEF2FF', '#D1FAE5', '#FEF3C7']
  const maxDialect    = Math.max(...Object.values(dialectStats), 1)

  const scoreData   = [12, 18, 34, 28, 8]
  const scoreLabels = ['<60', '60-70', '70-80', '80-90', '90+']
  const scoreColors = ['#EF4444', '#F59E0B', '#4F46E5', '#10B981', '#0EA5E9']
  const maxScore    = Math.max(...scoreData)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, flexDirection:'column', gap:12 }}>
      <div style={{ width:32, height:32, border:'3px solid #E5E7EB', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13, color:'#9CA3AF' }}>Loading analytics from Supabase…</div>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      {/* Metric cards — from lesson_progress */}
      <div className="metrics-grid">
        {[
          { label:'Total Progress Records', value: progressStats.total,     icon:'📋', bg:'#EEF2FF', cl:'#4F46E5' },
          { label:'Completed',              value: progressStats.completed,  icon:'✅', bg:'#D1FAE5', cl:'#10B981' },
          { label:'Still Learning',         value: progressStats.learning,   icon:'📖', bg:'#FEF3C7', cl:'#F59E0B' },
          { label:'Due for Review',         value: progressStats.due,        icon:'⏰', bg:'#FEE2E2', cl:'#EF4444' },
        ].map((m, i) => (
          <div key={i} className="metric-card">
            <div className="metric-icon" style={{ background:m.bg, color:m.cl }}>{m.icon}</div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Learners by Dialect — from profiles.active_dialect */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🗣 Learners by Dialect</div>
            <span style={{ fontSize:11, color:'#9CA3AF' }}>from profiles table</span>
          </div>

          {dialects.map((d, i) => {
            const count = dialectStats[d] || 0
            const pct   = maxDialect > 0 ? Math.round((count / maxDialect) * 100) : 0
            return (
              <div key={d} style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:dialectColors[i] }} />
                    <span style={{ fontSize:14, fontWeight:600, color:'#111827' }}>{d}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:dialectColors[i] }}>{count}</span>
                    <span style={{ fontSize:11, color:'#9CA3AF' }}>learners</span>
                  </div>
                </div>
                <div style={{ height:10, background:'#F3F4F6', borderRadius:5, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:5,
                    background:dialectColors[i],
                    width:`${pct}%`,
                    transition:'width 0.6s ease',
                  }} />
                </div>
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:3 }}>
                  {pct}% of top dialect
                </div>
              </div>
            )
          })}

          {/* Dialect breakdown pills */}
          <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
            {dialects.map((d, i) => (
              <div key={d} style={{ background:dialectBg[i], color:dialectColors[i], padding:'4px 12px', borderRadius:99, fontSize:12, fontWeight:600 }}>
                {d}: {dialectStats[d] || 0}
              </div>
            ))}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📉 Score Distribution</div>
          </div>
          <div className="bar-chart">
            {scoreData.map((v, i) => (
              <div key={i} className="bc-bar"
                style={{ height:`${Math.round(v / maxScore * 100)}%`, background:scoreColors[i] }}
                title={`${scoreLabels[i]}: ${v}%`}
              />
            ))}
          </div>
          <div className="bc-labels">
            {scoreLabels.map(l => <div key={l} className="bc-label">{l}</div>)}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:12 }}>
            {scoreLabels.map((l, i) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#6B7280' }}>
                <div style={{ width:8, height:8, borderRadius:2, background:scoreColors[i] }} />
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lesson Progress Breakdown */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📖 Lesson Progress Breakdown</div>
          <span style={{ fontSize:11, color:'#9CA3AF' }}>from lesson_progress table</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {[
            { label:'Completed',     value:progressStats.completed, color:'#10B981', bg:'#D1FAE5', icon:'✅' },
            { label:'Still Learning',value:progressStats.learning,  color:'#F59E0B', bg:'#FEF3C7', icon:'📖' },
            { label:'Due for Review',value:progressStats.due,       color:'#EF4444', bg:'#FEE2E2', icon:'⏰' },
          ].map((s, i) => {
            const pct = progressStats.total > 0
              ? Math.round((s.value / progressStats.total) * 100)
              : 0
            return (
              <div key={i} style={{ background:s.bg, borderRadius:10, padding:'16px 18px' }}>
                <div style={{ fontSize:24, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize:13, color:s.color, fontWeight:500 }}>{s.label}</div>
                <div style={{ marginTop:8, height:6, background:'rgba(255,255,255,0.5)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:s.color, borderRadius:3, transition:'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize:11, color:s.color, marginTop:3 }}>{pct}% of total</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Heatmap */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔲 Learner Activity Heatmap</div>
          <span style={{ fontSize:12, color:'#9CA3AF' }}>Simulated activity grid</span>
        </div>
        <div className="heatmap">
          {Array.from({ length: 91 }, (_, i) => {
            const v = Math.random()
            return (
              <div key={i} className="hm-cell"
                style={{ background:`rgba(79,70,229,${v.toFixed(2)})` }}
                title={`${Math.round(v * 30)} days active`}
              />
            )
          })}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, fontSize:11, color:'#9CA3AF' }}>
          <div style={{ width:10, height:10, borderRadius:2, background:'rgba(79,70,229,0.1)' }} /> Less
          <div style={{ width:10, height:10, borderRadius:2, background:'rgba(79,70,229,0.9)', marginLeft:4 }} /> More
        </div>
      </div>

      {/* Top Performers — from profiles ordered by XP */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🏆 Top Learners by XP</div>
          <span style={{ fontSize:11, color:'#9CA3AF' }}>from profiles table</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Learner</th>
                <th>Region</th>
                <th>Active Dialect</th>
                <th>Level</th>
                <th>XP</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign:'center', color:'#9CA3AF', padding:24 }}>
                    No users found in Supabase.
                  </td>
                </tr>
              )}
              {topUsers.map((u, i) => (
                <tr key={i}>
                  <td>
                    <div style={{
                      width:24, height:24, borderRadius:'50%',
                      background:['#EEF2FF','#D1FAE5','#FEF3C7','#DBEAFE','#FEE2E2'][i],
                      color:['#4F46E5','#10B981','#F59E0B','#3B82F6','#EF4444'][i],
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:700,
                    }}>
                      {i + 1}
                    </div>
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div className="avatar" style={{ width:28, height:28, fontSize:11 }}>
                        {(u.display_name || u.email || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <strong>{u.display_name || u.email || '—'}</strong>
                    </div>
                  </td>
                  <td style={{ color:'#6B7280' }}>{u.region || '—'}</td>
                  <td>
                    {u.active_dialect ? (
                      <span className={`pill ${
                        u.active_dialect.toLowerCase().includes('kapampangan') ? 'pill-blue'  :
                        u.active_dialect.toLowerCase().includes('tagalog')     ? 'pill-green' :
                        u.active_dialect.toLowerCase().includes('waray')       ? 'pill-amber' :
                        'pill-gray'
                      }`}>
                        {u.active_dialect}
                      </span>
                    ) : '—'}
                  </td>
                  <td><span className="pill pill-blue">Lvl {u.level || 0}</span></td>
                  <td><strong style={{ color:'#4F46E5' }}>{(u.xp || 0).toLocaleString()} XP</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}