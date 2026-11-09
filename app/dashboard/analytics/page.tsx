'use client'
import { useEffect, useState } from 'react'
import {
  DIALECTS,
  LearningStats,
  loadLearningStats,
  REVIEW_AFTER_DAYS,
  SCORE_BANDS,
} from '@/lib/admin/learningStats'

const dialectColors = ['#4F46E5', '#10B981', '#F59E0B']
const dialectBg     = ['#EEF2FF', '#D1FAE5', '#FEF3C7']
const scoreColors   = ['#EF4444', '#F59E0B', '#4F46E5', '#10B981', '#0EA5E9']

export default function AnalyticsPage() {
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLearningStats()
      .then(setStats)
      .catch((e) => setError(String(e?.message ?? e)))
  }, [])

  if (error) return (
    <div className="card" style={{ textAlign:'center', color:'#B91C1C' }}>
      Couldn&apos;t load analytics: {error}
    </div>
  )

  if (!stats) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, flexDirection:'column', gap:12 }}>
      <div style={{ width:32, height:32, border:'3px solid #E5E7EB', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13, color:'#9CA3AF' }}>Loading analytics from Supabase…</div>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  const maxDialect = Math.max(...DIALECTS.map((d) => stats.learnersByDialect[d]), 1)
  const scoredTotal = stats.scoreBands.reduce((a, b) => a + b, 0)
  const maxBand = Math.max(...stats.scoreBands, 1)

  const breakdown = [
    { label:'Completed',      value:stats.completed, color:'#10B981', bg:'#D1FAE5', note:'Passed the lesson or chapter' },
    { label:'Still Learning', value:stats.learning,  color:'#F59E0B', bg:'#FEF3C7', note:'Started, not passed yet' },
    { label:'Due for Review', value:stats.due,       color:'#EF4444', bg:'#FEE2E2', note:`Completed, not practiced in ${REVIEW_AFTER_DAYS}+ days` },
  ]

  return (
    <>
      {/* Metric cards */}
      <div className="metrics-grid">
        {[
          { label:'Total Progress Records', value:stats.total,     hint:'Lessons and story chapters started' },
          { label:'Completed',              value:stats.completed, hint:'Passed' },
          { label:'Still Learning',         value:stats.learning,  hint:'Started, not passed yet' },
          { label:'Due for Review',         value:stats.due,       hint:`Completed, idle ${REVIEW_AFTER_DAYS}+ days` },
        ].map((m) => (
          <div key={m.label} className="metric-card" title={m.hint}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value.toLocaleString()}</div>
            <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>{m.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Learners by Dialect */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Learners by Dialect</div>
            <span style={{ fontSize:11, color:'#9CA3AF' }}>active language · learners only</span>
          </div>

          {DIALECTS.map((d, i) => {
            const count = stats.learnersByDialect[d]
            const pct = Math.round((count / maxDialect) * 100)
            return (
              <div key={d} style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:dialectColors[i] }} />
                    <span style={{ fontSize:14, fontWeight:600, color:'#111827' }}>{d}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:dialectColors[i] }}>{count}</span>
                    <span style={{ fontSize:11, color:'#9CA3AF' }}>{count === 1 ? 'learner' : 'learners'}</span>
                  </div>
                </div>
                <div style={{ height:10, background:'#F3F4F6', borderRadius:5, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:5, background:dialectColors[i], width:`${pct}%`, transition:'width 0.6s ease' }} />
                </div>
              </div>
            )
          })}

          <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
            {DIALECTS.map((d, i) => (
              <div key={d} style={{ background:dialectBg[i], color:dialectColors[i], padding:'4px 12px', borderRadius:99, fontSize:12, fontWeight:600 }}>
                {d}: {stats.learnersByDialect[d]}
              </div>
            ))}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Score Distribution</div>
            <span style={{ fontSize:11, color:'#9CA3AF' }}>best score per lesson or chapter</span>
          </div>
          {scoredTotal === 0 ? (
            <div style={{ fontSize:13, color:'#9CA3AF', padding:'32px 0', textAlign:'center' }}>No scores yet.</div>
          ) : (
            <>
              <div className="bar-chart" style={{ height:120 }}>
                {stats.scoreBands.map((v, i) => (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center', height:'100%' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:scoreColors[i], marginBottom:3 }}>{v}</div>
                    <div className="bc-bar"
                      style={{ width:'100%', height:`${Math.round((v / maxBand) * 100)}%`, background:scoreColors[i] }}
                      title={`${SCORE_BANDS[i]}%: ${v} (${Math.round((v / scoredTotal) * 100)}%)`}
                    />
                  </div>
                ))}
              </div>
              <div className="bc-labels">
                {SCORE_BANDS.map((l) => <div key={l} className="bc-label">{l}%</div>)}
              </div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:12 }}>
                {scoredTotal.toLocaleString()} scored records ·{' '}
                {Math.round(((stats.scoreBands[2] + stats.scoreBands[3] + stats.scoreBands[4]) / scoredTotal) * 100)}% at 70% or higher
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lesson Progress Breakdown */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Lesson Progress Breakdown</div>
          <span style={{ fontSize:11, color:'#9CA3AF' }}>lessons and story chapters</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {breakdown.map((s) => {
            const pct = stats.total > 0 ? Math.round((s.value / stats.total) * 100) : 0
            return (
              <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'16px 18px' }}>
                <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize:13, color:s.color, fontWeight:600 }}>{s.label}</div>
                <div style={{ marginTop:8, height:6, background:'rgba(255,255,255,0.5)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:s.color, borderRadius:3, transition:'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize:11, color:s.color, marginTop:3 }}>{pct}% of all records · {s.note}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Learners by XP */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Top Learners by XP</div>
          <span style={{ fontSize:11, color:'#9CA3AF' }}>from profiles</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Learner</th>
                <th>Active Dialect</th>
                <th>Level</th>
                <th>XP</th>
              </tr>
            </thead>
            <tbody>
              {stats.topLearners.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign:'center', color:'#9CA3AF', padding:24 }}>No learners yet.</td>
                </tr>
              )}
              {stats.topLearners.map((u, i) => {
                const dialect = (u.active_dialect || '').toLowerCase()
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{
                        width:24, height:24, borderRadius:'50%',
                        background:['#EEF2FF','#D1FAE5','#FEF3C7','#DBEAFE','#FEE2E2'][i],
                        color:['#4F46E5','#10B981','#F59E0B','#3B82F6','#EF4444'][i],
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11, fontWeight:700,
                      }}>{i + 1}</div>
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div className="avatar" style={{ width:28, height:28, fontSize:11 }}>
                          {(u.display_name || u.email || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <strong>{u.display_name || u.email || '—'}</strong>
                      </div>
                    </td>
                    <td>
                      {u.active_dialect ? (
                        <span className={`pill ${
                          dialect.includes('kapampangan') ? 'pill-blue' :
                          dialect.includes('tagalog')     ? 'pill-green' :
                          dialect.includes('waray')       ? 'pill-amber' : 'pill-gray'
                        }`}>{u.active_dialect}</span>
                      ) : '—'}
                    </td>
                    <td><span className="pill pill-blue">Lvl {u.level || 1}</span></td>
                    <td><strong style={{ color:'#4F46E5' }}>{(u.xp || 0).toLocaleString()} XP</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
