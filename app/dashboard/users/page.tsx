'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type User = {
  id: string
  display_name: string
  email: string
  role: string
  region: string
  active_dialect: string
  xp: number
  level: number
  daily_goal_minutes: number
  avatar_url: string
  studying_dialects: string
  is_deleted?: boolean
  deleted_at?: string
  created_at?: string
}

export default function UsersPage() {
  const [users, setUsers]             = useState<User[]>([])
  const [deleted, setDeleted]         = useState<User[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [roleFilter, setRoleFilter]   = useState('All roles')
  const [activeTab, setActiveTab]     = useState<'active'|'deleted'>('active')
  const [toast, setToast]             = useState('')
  const [toastType, setToastType]     = useState<'success'|'error'|'warning'>('success')

  const [showRoleModal, setShowRoleModal]           = useState(false)
  const [showDeleteModal, setShowDeleteModal]       = useState(false)
  const [showRestoreModal, setShowRestoreModal]     = useState(false)
  const [showPermanentModal, setShowPermanentModal] = useState(false)
  const [showViewModal, setShowViewModal]           = useState(false)
  const [selectedUser, setSelectedUser]             = useState<User | null>(null)
  const [newRole, setNewRole]                       = useState('')
  const [updating, setUpdating]                     = useState(false)
  const [deleteReason, setDeleteReason]             = useState('')

  function showToast(msg: string, type: 'success'|'error'|'warning' = 'success') {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 4000)
  }

  async function fetchUsers() {
    setLoading(true)
    const supabase = createClient()

    const { data: allProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('xp', { ascending: false })

    if (error) {
      console.error('Supabase fetch error:', error)
      showToast('❌ Error loading users: ' + error.message, 'error')
      setLoading(false)
      return
    }

    const all = allProfiles || []
    setUsers(all.filter(u => !u.is_deleted))
    setDeleted(all.filter(u => u.is_deleted === true))
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const filteredActive = users.filter(u => {
    const matchSearch = (
      (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email        || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.region       || '').toLowerCase().includes(search.toLowerCase())
    )
    const matchRole = roleFilter === 'All roles' || (u.role || 'user') === roleFilter
    return matchSearch && matchRole
  })

  const filteredDeleted = deleted.filter(u =>
    (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email        || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total   : users.length,
    admins  : users.filter(u => u.role === 'admin').length,
    regular : users.filter(u => u.role !== 'admin').length,
    deleted : deleted.length,
  }

  // ── Soft Delete ──
  async function handleSoftDelete() {
    if (!selectedUser) return
    setUpdating(true)
    const supabase = createClient()
    const now = new Date().toISOString()

    console.log('Soft deleting user:', selectedUser.id)

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_deleted: true, deleted_at: now })
      .eq('id', selectedUser.id)
      .select()

    console.log('Soft delete result:', { data, error })

    if (error) {
      showToast('❌ Delete failed: ' + error.message, 'error')
    } else if (!data || data.length === 0) {
      showToast('❌ No rows updated. Check RLS policies in Supabase.', 'error')
    } else {
      showToast(`🗑 ${selectedUser.display_name || selectedUser.email} moved to deleted.`, 'warning')
      setShowDeleteModal(false)
      setSelectedUser(null)
      await fetchUsers()
    }
    setUpdating(false)
  }

  // ── Restore ──
  async function handleRestore() {
    if (!selectedUser) return
    setUpdating(true)
    const supabase = createClient()

    console.log('Restoring user:', selectedUser.id)

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', selectedUser.id)
      .select()

    console.log('Restore result:', { data, error })

    if (error) {
      showToast('❌ Restore failed: ' + error.message, 'error')
    } else if (!data || data.length === 0) {
      showToast('❌ No rows updated. Check RLS policies in Supabase.', 'error')
    } else {
      showToast(`✅ ${selectedUser.display_name || selectedUser.email} restored!`)
      setShowRestoreModal(false)
      setSelectedUser(null)
      await fetchUsers()
    }
    setUpdating(false)
  }

  // ── Permanent Delete ──
  async function handlePermanentDelete() {
    if (!selectedUser) return
    setUpdating(true)
    const supabase = createClient()

    console.log('Permanently deleting user:', selectedUser.id)

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', selectedUser.id)

    console.log('Permanent delete error:', error)

    if (error) {
      showToast('❌ Permanent delete failed: ' + error.message, 'error')
    } else {
      showToast('💀 Permanently deleted.', 'error')
      setShowPermanentModal(false)
      setSelectedUser(null)
      await fetchUsers()
    }
    setUpdating(false)
  }

  // ── Update Role ──
  async function handleRoleUpdate() {
    if (!selectedUser) return
    setUpdating(true)
    const supabase = createClient()

    console.log('Updating role for user:', selectedUser.id, 'to:', newRole)

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', selectedUser.id)
      .select()

    console.log('Role update result:', { data, error })

    if (error) {
      showToast('❌ Role update failed: ' + error.message, 'error')
    } else if (!data || data.length === 0) {
      showToast('❌ No rows updated. Check RLS policies in Supabase.', 'error')
    } else {
      showToast(`✅ Role updated to "${newRole}"`)
      setShowRoleModal(false)
      setSelectedUser(null)
      await fetchUsers()
    }
    setUpdating(false)
  }

  function timeSince(ts?: string) {
    if (!ts) return '—'
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
    if (diff < 60)    return `${diff}s ago`
    if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return `${Math.floor(diff/86400)}d ago`
  }

  const toastBg: Record<string,string> = {
    success: '#111827',
    error:   '#EF4444',
    warning: '#F59E0B',
  }

  function initials(u: User) {
    const name = u.display_name || u.email || 'U'
    const parts = name.split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0,2).toUpperCase()
  }

  function dialectPill(d: string) {
    if (!d) return 'pill-gray'
    const l = d.toLowerCase()
    if (l.includes('kapampangan')) return 'pill-blue'
    if (l.includes('tagalog'))     return 'pill-green'
    if (l.includes('waray'))       return 'pill-amber'
    return 'pill-gray'
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:24, zIndex:9999, background:toastBg[toastType], color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:500, boxShadow:'0 4px 20px rgba(0,0,0,0.2)', animation:'slideIn 0.2s ease', maxWidth:360 }}>
          {toast}
        </div>
      )}

      {/* Metrics */}
      <div className="metrics-grid">
        {[
          { label:'Total Active',  value:stats.total,   icon:'👥', bg:'#EEF2FF', cl:'#4F46E5' },
          { label:'Admins',        value:stats.admins,  icon:'🛡️', bg:'#FEE2E2', cl:'#EF4444' },
          { label:'Regular Users', value:stats.regular, icon:'👤', bg:'#D1FAE5', cl:'#10B981' },
          { label:'Deleted',       value:stats.deleted, icon:'🗑',  bg:'#FEF3C7', cl:'#F59E0B' },
        ].map((m, i) => (
          <div key={i} className="metric-card"
            onClick={() => { if(i===3) setActiveTab('deleted') }}
            style={{ cursor: i===3 ? 'pointer' : 'default' }}
          >
            <div className="metric-icon" style={{ background:m.bg, color:m.cl }}>{m.icon}</div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            {i===3 && stats.deleted > 0 && (
              <div style={{ fontSize:11, color:'#F59E0B', marginTop:4 }}>Click to view →</div>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #E5E7EB' }}>
        {[
          { key:'active',  label:'Active Users',        count:stats.total   },
          { key:'deleted', label:'🚨 Deleted Accounts', count:stats.deleted },
        ].map(t => (
          <div key={t.key} onClick={() => setActiveTab(t.key as any)}
            style={{ padding:'10px 20px', fontSize:13, fontWeight:500, cursor:'pointer', borderBottom:activeTab===t.key?'2px solid #4F46E5':'2px solid transparent', color:activeTab===t.key?'#4F46E5':'#6B7280', marginBottom:-1, transition:'all .12s', display:'flex', alignItems:'center', gap:8 }}>
            {t.label}
            <span style={{ background:t.key==='deleted'&&t.count>0?'#FEE2E2':'#F3F4F6', color:t.key==='deleted'&&t.count>0?'#991B1B':'#6B7280', fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:99 }}>
              {t.count}
            </span>
          </div>
        ))}
      </div>

      {/* ══ ACTIVE USERS ══ */}
      {activeTab === 'active' && (
        <div className="card" style={{ marginTop:0, borderTopLeftRadius:0, borderTopRightRadius:0 }}>
          <div className="card-header">
            <div className="card-title">
              👥 Active Users
              <span style={{ marginLeft:8, fontSize:11, background:'#F3F4F6', color:'#6B7280', padding:'2px 8px', borderRadius:99, fontWeight:400 }}>
                {loading ? '…' : `${filteredActive.length} of ${users.length}`}
              </span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input
                placeholder="Search name, email, region…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border:'1px solid #E5E7EB', borderRadius:6, padding:'6px 10px', fontSize:13, outline:'none', width:200 }}
              />
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                style={{ border:'1px solid #E5E7EB', borderRadius:6, padding:'6px 10px', fontSize:13 }}>
                <option>All roles</option>
                <option>admin</option>
                <option>user</option>
              </select>
              <button className="btn sm" onClick={fetchUsers} title="Refresh">🔄</button>
            </div>
          </div>

          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, flexDirection:'column', gap:12 }}>
              <div style={{ width:32, height:32, border:'3px solid #E5E7EB', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              <div style={{ fontSize:13, color:'#9CA3AF' }}>Loading users from Supabase…</div>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 24px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
              <div style={{ fontSize:15, fontWeight:600, color:'#111827' }}>No users found</div>
              <button className="btn sm primary" style={{ marginTop:12 }} onClick={fetchUsers}>🔄 Retry</button>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>User</th><th>Email</th><th>Role</th><th>Dialect</th>
                    <th>Region</th><th>XP</th><th>Level</th><th>Daily Goal</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActive.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign:'center', color:'#9CA3AF', padding:32 }}>No users match your search.</td></tr>
                  ) : filteredActive.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ position:'relative', flexShrink:0 }}>
                            {u.avatar_url ? (
                              <img src={u.avatar_url} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}
                                onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                            ) : (
                              <div style={{ width:36, height:36, borderRadius:'50%', background:'#EEF2FF', color:'#4F46E5', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>
                                {initials(u)}
                              </div>
                            )}
                            <div style={{ position:'absolute', bottom:0, right:0, width:10, height:10, background:'#10B981', borderRadius:'50%', border:'2px solid #fff' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight:600, fontSize:13, color:'#111827' }}>{u.display_name || '—'}</div>
                            <div style={{ fontSize:10, color:'#9CA3AF', fontFamily:'monospace' }}>{u.id.slice(0,12)}…</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:12, color:'#6B7280' }}>{u.email || <span style={{ color:'#D1D5DB' }}>No email</span>}</td>
                      <td><span className={`pill ${u.role==='admin'?'pill-red':'pill-green'}`}>{u.role==='admin'?'🛡 admin':'👤 user'}</span></td>
                      <td>{u.active_dialect ? <span className={`pill ${dialectPill(u.active_dialect)}`} style={{ fontSize:11 }}>{u.active_dialect}</span> : <span style={{ color:'#D1D5DB', fontSize:12 }}>—</span>}</td>
                      <td style={{ fontSize:12, color:'#6B7280' }}>{u.region || <span style={{ color:'#D1D5DB' }}>—</span>}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ fontSize:12 }}>⭐</span>
                          <strong style={{ color:'#4F46E5', fontSize:13 }}>{(u.xp || 0).toLocaleString()}</strong>
                        </div>
                      </td>
                      <td>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:'#EEF2FF', color:'#4F46E5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
                          {u.level || 0}
                        </div>
                      </td>
                      <td style={{ fontSize:12, color:'#6B7280' }}>{u.daily_goal_minutes ? `${u.daily_goal_minutes} min` : <span style={{ color:'#D1D5DB' }}>—</span>}</td>
                      <td>
                        <div style={{ display:'flex', gap:5 }}>
                          <button className="btn sm" title="View profile" onClick={() => { setSelectedUser(u); setShowViewModal(true) }}>👁</button>
                          <button className="btn sm" title="Update role"
                            onClick={() => { setSelectedUser(u); setNewRole(u.role||'user'); setShowRoleModal(true) }}
                            style={{ background:u.role==='admin'?'#FEE2E2':'#EEF2FF', color:u.role==='admin'?'#991B1B':'#3730A3', border:u.role==='admin'?'1px solid #FECACA':'1px solid #C7D2FE', fontWeight:600 }}>
                            {u.role==='admin'?'🛡':'👤'}
                          </button>
                          <button className="btn sm danger" title="Delete user"
                            onClick={() => { setSelectedUser(u); setDeleteReason(''); setShowDeleteModal(true) }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ DELETED ACCOUNTS ══ */}
      {activeTab === 'deleted' && (
        <div className="card" style={{ marginTop:0, borderTopLeftRadius:0, borderTopRightRadius:0 }}>
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>🚨</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#991B1B' }}>Emergency Recovery Zone</div>
              <div style={{ fontSize:12, color:'#B91C1C', marginTop:2 }}>Accidentally deleted an account? Restore it here. All data is preserved until permanently deleted.</div>
            </div>
          </div>
          <div className="card-header">
            <div className="card-title">
              🗑 Deleted Accounts
              <span style={{ marginLeft:8, fontSize:11, background:'#FEE2E2', color:'#991B1B', padding:'2px 8px', borderRadius:99, fontWeight:400 }}>{filteredDeleted.length} accounts</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input placeholder="Search deleted…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{ border:'1px solid #E5E7EB', borderRadius:6, padding:'6px 10px', fontSize:13, outline:'none', width:180 }} />
              <button className="btn sm" onClick={fetchUsers}>🔄</button>
            </div>
          </div>

          {filteredDeleted.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 24px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:15, fontWeight:600, color:'#111827' }}>No deleted accounts</div>
              <div style={{ fontSize:13, color:'#9CA3AF', marginTop:4 }}>All accounts are active.</div>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>User</th><th>Email</th><th>Role</th><th>Dialect</th><th>XP</th><th>Deleted</th><th>Restore</th><th>Delete Forever</th></tr>
                </thead>
                <tbody>
                  {filteredDeleted.map(u => (
                    <tr key={u.id} style={{ background:'#FFF5F5' }}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ position:'relative' }}>
                            <div style={{ width:34, height:34, borderRadius:'50%', background:'#F3F4F6', color:'#9CA3AF', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, opacity:0.7 }}>
                              {initials(u)}
                            </div>
                            <div style={{ position:'absolute', top:-2, right:-2, width:12, height:12, background:'#EF4444', borderRadius:'50%', border:'2px solid #fff' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight:600, fontSize:13, color:'#9CA3AF', textDecoration:'line-through' }}>{u.display_name||'—'}</div>
                            <div style={{ fontSize:10, color:'#D1D5DB', fontFamily:'monospace' }}>{u.id.slice(0,12)}…</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:12, color:'#9CA3AF' }}>{u.email||'—'}</td>
                      <td><span className="pill pill-gray">{u.role||'user'}</span></td>
                      <td style={{ fontSize:12, color:'#9CA3AF' }}>{u.active_dialect||'—'}</td>
                      <td style={{ color:'#9CA3AF', fontSize:13 }}>{(u.xp||0).toLocaleString()}</td>
                      <td>
                        <div style={{ fontSize:12, color:'#EF4444', fontWeight:600 }}>{timeSince(u.deleted_at)}</div>
                        <div style={{ fontSize:10, color:'#9CA3AF' }}>{u.deleted_at ? new Date(u.deleted_at).toLocaleDateString() : '—'}</div>
                      </td>
                      <td>
                        <button className="btn sm" onClick={() => { setSelectedUser(u); setShowRestoreModal(true) }}
                          style={{ background:'#D1FAE5', color:'#065F46', border:'1px solid #6EE7B7', fontWeight:600 }}>
                          ♻️ Restore
                        </button>
                      </td>
                      <td>
                        <button className="btn sm danger" onClick={() => { setSelectedUser(u); setShowPermanentModal(true) }}>
                          💀 Forever
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW PROFILE MODAL ── */}
      {showViewModal && selectedUser && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:700 }}>👤 User Profile</div>
              <button onClick={() => setShowViewModal(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>×</button>
            </div>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', marginBottom:10 }} />
              ) : (
                <div style={{ width:72, height:72, borderRadius:'50%', background:'#EEF2FF', color:'#4F46E5', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:24, margin:'0 auto 10px' }}>
                  {initials(selectedUser)}
                </div>
              )}
              <div style={{ fontSize:18, fontWeight:700, color:'#111827' }}>{selectedUser.display_name || '—'}</div>
              <div style={{ fontSize:13, color:'#9CA3AF' }}>{selectedUser.email}</div>
              <div style={{ marginTop:8, display:'flex', justifyContent:'center', gap:8 }}>
                <span className={`pill ${selectedUser.role==='admin'?'pill-red':'pill-green'}`}>{selectedUser.role==='admin'?'🛡 admin':'👤 user'}</span>
                {selectedUser.active_dialect && <span className={`pill ${dialectPill(selectedUser.active_dialect)}`}>{selectedUser.active_dialect}</span>}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:20 }}>
              {[
                { label:'XP',    value:(selectedUser.xp||0).toLocaleString(), icon:'⭐' },
                { label:'Level', value:`Lvl ${selectedUser.level||0}`,        icon:'🏆' },
                { label:'Goal',  value:`${selectedUser.daily_goal_minutes||0}m`, icon:'🎯' },
              ].map((s,i) => (
                <div key={i} style={{ background:'#F9FAFB', borderRadius:10, padding:'12px', textAlign:'center' }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:'#111827' }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'#9CA3AF' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'#F9FAFB', borderRadius:10, overflow:'hidden' }}>
              {[
                ['User ID',        selectedUser.id],
                ['Region',         selectedUser.region         || '—'],
                ['Active Dialect', selectedUser.active_dialect || '—'],
                ['Studying',       selectedUser.studying_dialects || '—'],
                ['Daily Goal',     selectedUser.daily_goal_minutes ? `${selectedUser.daily_goal_minutes} minutes` : '—'],
              ].map(([k,v], i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', borderBottom:i<4?'1px solid #E5E7EB':'none', fontSize:13 }}>
                  <span style={{ color:'#6B7280', fontWeight:500 }}>{k}</span>
                  <span style={{ color:'#111827', fontWeight:600, fontFamily:k==='User ID'?'monospace':'inherit', fontSize:k==='User ID'?11:13 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button className="btn" onClick={() => setShowViewModal(false)}>Close</button>
              <button className="btn primary" onClick={() => { setShowViewModal(false); setNewRole(selectedUser.role||'user'); setShowRoleModal(true) }}>
                ✏️ Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROLE MODAL ── */}
      {showRoleModal && selectedUser && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <div style={{ fontSize:18, fontWeight:700 }}>Update User Role</div>
              <button onClick={() => setShowRoleModal(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>×</button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#F9FAFB', borderRadius:10, marginBottom:24 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'#EEF2FF', color:'#4F46E5', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16 }}>
                {initials(selectedUser)}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{selectedUser.display_name||'—'}</div>
                <div style={{ fontSize:12, color:'#9CA3AF' }}>{selectedUser.email}</div>
                <span className={`pill ${selectedUser.role==='admin'?'pill-red':'pill-green'}`} style={{ fontSize:11, marginTop:4, display:'inline-flex' }}>
                  Current: {selectedUser.role||'user'}
                </span>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Select New Role</div>
              {[
                { value:'user',  label:'User',  desc:'Regular learner — access lessons and track progress', icon:'👤', bg:'#D1FAE5', cl:'#065F46', border:'#6EE7B7' },
                { value:'admin', label:'Admin', desc:'Full access — manage users, lessons and all data',    icon:'🛡️', bg:'#FEE2E2', cl:'#991B1B', border:'#FECACA' },
              ].map(r => (
                <div key={r.value} onClick={() => setNewRole(r.value)}
                  style={{ border:newRole===r.value?`2px solid ${r.border}`:'2px solid #E5E7EB', borderRadius:10, padding:'14px 16px', cursor:'pointer', background:newRole===r.value?r.bg:'#fff', transition:'all .15s', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:22 }}>{r.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:newRole===r.value?r.cl:'#111827' }}>{r.label}</div>
                      <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{r.desc}</div>
                    </div>
                    <div style={{ width:20, height:20, borderRadius:'50%', border:newRole===r.value?`6px solid ${r.border}`:'2px solid #D1D5DB', background:newRole===r.value?r.cl:'#fff', flexShrink:0, transition:'all .15s' }} />
                  </div>
                </div>
              ))}
            </div>
            {newRole==='admin' && selectedUser.role!=='admin' && (
              <div style={{ background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#92400E', marginBottom:16, display:'flex', gap:8 }}>
                <span>⚠️</span><span>This user will have full admin access to the dashboard.</span>
              </div>
            )}
            {newRole===selectedUser.role && (
              <div style={{ background:'#F3F4F6', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#6B7280', marginBottom:16 }}>
                ℹ️ This is already the user's current role.
              </div>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setShowRoleModal(false)}>Cancel</button>
              <button className="btn primary" onClick={handleRoleUpdate}
                disabled={updating || newRole === selectedUser.role}
                style={{ opacity:(updating||newRole===selectedUser.role)?0.6:1 }}>
                {updating ? '⏳ Updating…' : '💾 Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SOFT DELETE MODAL ── */}
      {showDeleteModal && selectedUser && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:44, marginBottom:8 }}>🗑</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#111827' }}>Delete Account?</div>
              <div style={{ fontSize:13, color:'#6B7280', marginTop:6 }}>
                <strong>{selectedUser.display_name||selectedUser.email}</strong> will be moved to deleted accounts. You can restore it anytime.
              </div>
            </div>
            <div style={{ background:'#D1FAE5', border:'1px solid #6EE7B7', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#065F46', marginBottom:16, display:'flex', gap:8 }}>
              <span>♻️</span><span>This is a <strong>soft delete</strong> — the account can be fully restored from the Deleted Accounts tab.</span>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:6 }}>Reason (optional)</label>
              <textarea value={deleteReason} onChange={e=>setDeleteReason(e.target.value)}
                placeholder="e.g. User requested removal…" rows={2}
                style={{ width:'100%', border:'1px solid #E5E7EB', borderRadius:6, padding:'8px 10px', fontSize:13, fontFamily:'inherit', outline:'none', resize:'none' }} />
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn danger" onClick={handleSoftDelete} disabled={updating} style={{ opacity:updating?0.6:1 }}>
                {updating ? '⏳ Deleting…' : '🗑 Move to Deleted'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESTORE MODAL ── */}
      {showRestoreModal && selectedUser && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:44, marginBottom:8 }}>♻️</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#111827' }}>Restore Account?</div>
              <div style={{ fontSize:13, color:'#6B7280', marginTop:6 }}>
                <strong>{selectedUser.display_name||selectedUser.email}</strong> will be fully restored and can log in again.
              </div>
            </div>
            <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
              {[
                ['Display Name', selectedUser.display_name||'—'],
                ['Email',        selectedUser.email||'—'],
                ['Role',         selectedUser.role||'user'],
                ['XP',           (selectedUser.xp||0).toLocaleString()],
                ['Deleted',      timeSince(selectedUser.deleted_at)],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'5px 0', borderBottom:'1px solid #D1FAE5' }}>
                  <span style={{ color:'#6B7280', fontWeight:500 }}>{k}</span>
                  <span style={{ color:'#111827', fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setShowRestoreModal(false)}>Cancel</button>
              <button onClick={handleRestore} disabled={updating}
                style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:6, border:'none', background:'#10B981', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:updating?0.6:1 }}>
                {updating ? '⏳ Restoring…' : '♻️ Restore Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PERMANENT DELETE MODAL ── */}
      {showPermanentModal && selectedUser && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:44, marginBottom:8 }}>💀</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#991B1B' }}>Permanently Delete?</div>
              <div style={{ fontSize:13, color:'#6B7280', marginTop:6 }}>
                This action <strong>cannot be undone</strong>. <strong>{selectedUser.display_name||selectedUser.email}</strong> will be erased forever.
              </div>
            </div>
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'12px 14px', fontSize:12, color:'#991B1B', marginBottom:20 }}>
              <div style={{ fontWeight:700, marginBottom:4 }}>⚠️ This will permanently erase:</div>
              <ul style={{ paddingLeft:16, lineHeight:2 }}>
                <li>Profile and all account data</li>
                <li>XP, level, and progress records</li>
                <li>All associated activity logs</li>
                <li>This cannot be recovered</li>
              </ul>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setShowPermanentModal(false)}>Cancel — Keep It</button>
              <button className="btn danger" onClick={handlePermanentDelete} disabled={updating} style={{ opacity:updating?0.6:1 }}>
                {updating ? '⏳ Deleting…' : '💀 Yes, Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </>
  )
}