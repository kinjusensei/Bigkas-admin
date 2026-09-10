'use client'
import { useState } from 'react'

const allLessons = [
  { title: 'Intro to Laravel — Lesson 1', course: 'Intro to Laravel',   type: 'Video',      dur: '12m', status: 'published', enrolled: 312 },
  { title: 'React Hooks Deep Dive',        course: 'React Fundamentals', type: 'Video',      dur: '18m', status: 'published', enrolled: 278 },
  { title: 'Python Variables & Types',     course: 'Python Basics',      type: 'Reading',    dur: '8m',  status: 'published', enrolled: 251 },
  { title: 'SQL Joins Explained',          course: 'Database Design',    type: 'Quiz',       dur: '15m', status: 'draft',     enrolled: 0   },
  { title: 'Figma Basics',                 course: 'UI/UX Principles',   type: 'Video',      dur: '22m', status: 'published', enrolled: 167 },
  { title: 'Docker Containers',            course: 'DevOps Essentials',  type: 'Assignment', dur: '45m', status: 'draft',     enrolled: 0   },
  { title: 'JS Closures',                  course: 'JavaScript Advanced',type: 'Video',      dur: '20m', status: 'published', enrolled: 198 },
  { title: 'Vue Components',              course: 'Vue.js Mastery',      type: 'Video',      dur: '30m', status: 'archived',  enrolled: 89  },
]

const typeColor: Record<string, string>   = { Video: 'pill-blue', Quiz: 'pill-amber', Reading: 'pill-green', Assignment: 'pill-purple', Live: 'pill-red' }
const statusColor: Record<string, string> = { published: 'pill-green', draft: 'pill-amber', archived: 'pill-gray' }

const tabs = ['All', 'Published', 'Drafts', 'Archived']

const emptyForm = { title: '', course: '', type: 'Video', duration: '', status: 'draft', content: '' }

export default function LessonsPage() {
  const [activeTab, setActiveTab]   = useState('All')
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [lessons, setLessons]       = useState(allLessons)
  const [showModal, setShowModal]   = useState(false)
  const [editIndex, setEditIndex]   = useState<number | null>(null)
  const [form, setForm]             = useState({ ...emptyForm })
  const [showDelete, setShowDelete] = useState<number | null>(null)
  const [toast, setToast]           = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Filter lessons
  const filtered = lessons.filter(l => {
    const matchTab    = activeTab === 'All' || l.status === activeTab.toLowerCase().replace('drafts','draft').replace('archived','archived')
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) || l.course.toLowerCase().includes(search.toLowerCase())
    const matchType   = typeFilter === 'All types' || l.type === typeFilter
    return matchTab && matchSearch && matchType
  })

  // Open modal for new lesson
  function openNew() {
    setForm({ ...emptyForm })
    setEditIndex(null)
    setShowModal(true)
  }

  // Open modal for editing
  function openEdit(i: number) {
    const l = filtered[i]
    const realIndex = lessons.indexOf(l)
    setForm({ title: l.title, course: l.course, type: l.type, duration: l.dur, status: l.status, content: '' })
    setEditIndex(realIndex)
    setShowModal(true)
  }

  // Save (new or edit)
  function handleSave() {
    if (!form.title || !form.course || !form.duration) {
      alert('Please fill in Title, Course, and Duration.')
      return
    }
    const entry = { title: form.title, course: form.course, type: form.type, dur: form.duration, status: form.status, enrolled: 0 }
    if (editIndex !== null) {
      const updated = [...lessons]
      updated[editIndex] = { ...updated[editIndex], ...entry }
      setLessons(updated)
      showToast('✅ Lesson updated successfully!')
    } else {
      setLessons([entry, ...lessons])
      showToast('✅ Lesson created successfully!')
    }
    setShowModal(false)
  }

  // Delete
  function handleDelete(i: number) {
    const l = filtered[i]
    const realIndex = lessons.indexOf(l)
    const updated = lessons.filter((_, idx) => idx !== realIndex)
    setLessons(updated)
    setShowDelete(null)
    showToast('🗑 Lesson deleted.')
  }

  // Toggle publish/draft
  function toggleStatus(i: number) {
    const l = filtered[i]
    const realIndex = lessons.indexOf(l)
    const updated = [...lessons]
    updated[realIndex] = { ...l, status: l.status === 'published' ? 'draft' : 'published' }
    setLessons(updated)
    showToast(updated[realIndex].status === 'published' ? '✅ Lesson published!' : '📝 Moved to draft.')
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: '#111827', color: '#fff', padding: '10px 18px',
          borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          animation: 'slideIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: '#6B7280' }}>{lessons.length} lessons total · {lessons.filter(l => l.status === 'published').length} published</p>
        <button className="btn primary" onClick={openNew}>＋ New Lesson</button>
      </div>

      {/* Main card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📚 Lessons</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Search lessons…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 10px', fontSize: 13, outline: 'none', width: 180 }}
            />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
            >
              <option>All types</option>
              <option>Video</option>
              <option>Quiz</option>
              <option>Reading</option>
              <option>Assignment</option>
              <option>Live</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', marginBottom: 16 }}>
          {tabs.map(tab => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #4F46E5' : '2px solid transparent',
              color: activeTab === tab ? '#4F46E5' : '#6B7280',
              marginBottom: -1, transition: 'all .12s',
            }}>
              {tab}
              <span style={{ marginLeft: 6, fontSize: 11, background: '#F3F4F6', color: '#6B7280', padding: '1px 6px', borderRadius: 99 }}>
                {tab === 'All' ? lessons.length : lessons.filter(l => l.status === tab.toLowerCase().replace('drafts','draft')).length}
              </span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Title</th>
                <th>Course</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Enrolled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 32 }}>
                    No lessons found.
                  </td>
                </tr>
              )}
              {filtered.map((l, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{l.title}</div>
                  </td>
                  <td style={{ color: '#6B7280' }}>{l.course}</td>
                  <td><span className={`pill ${typeColor[l.type] ?? 'pill-gray'}`}>{l.type}</span></td>
                  <td style={{ color: '#6B7280' }}>{l.dur}</td>
                  <td>
                    <span
                      className={`pill ${statusColor[l.status]}`}
                      onClick={() => toggleStatus(i)}
                      style={{ cursor: 'pointer' }}
                      title="Click to toggle published/draft"
                    >
                      {l.status}
                    </span>
                  </td>
                  <td style={{ color: '#6B7280' }}>{l.enrolled}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* Edit */}
                      <button
                        className="btn sm"
                        onClick={() => openEdit(i)}
                        title="Edit lesson"
                      >
                        ✏️
                      </button>
                      {/* Toggle publish */}
                      <button
                        className="btn sm"
                        onClick={() => toggleStatus(i)}
                        title={l.status === 'published' ? 'Unpublish' : 'Publish'}
                        style={{ background: l.status === 'published' ? '#FEF3C7' : '#D1FAE5' }}
                      >
                        {l.status === 'published' ? '👁' : '🚀'}
                      </button>
                      {/* Delete */}
                      <button
                        className="btn sm danger"
                        onClick={() => setShowDelete(i)}
                        title="Delete lesson"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New / Edit Modal ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28,
            width: '100%', maxWidth: 520,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
                {editIndex !== null ? '✏️ Edit Lesson' : '＋ New Lesson'}
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>×</button>
            </div>

            <div className="field">
              <label>Lesson Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Introduction to Variables"
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

            <div className="field">
              <label>Course *</label>
              <input
                type="text"
                value={form.course}
                onChange={e => setForm({ ...form, course: e.target.value })}
                placeholder="e.g. Python Basics"
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }}
                >
                  <option>Video</option>
                  <option>Quiz</option>
                  <option>Reading</option>
                  <option>Assignment</option>
                  <option>Live</option>
                </select>
              </div>
              <div className="field">
                <label>Duration *</label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: e.target.value })}
                  placeholder="e.g. 15m"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
            </div>

            <div className="field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="field">
              <label>Content / Notes</label>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Optional notes or description…"
                rows={3}
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn primary" onClick={handleSave}>
                {editIndex !== null ? '💾 Save Changes' : '＋ Create Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {showDelete !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28,
            width: '100%', maxWidth: 380,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Delete Lesson?</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
              "<strong>{filtered[showDelete]?.title}</strong>" will be permanently removed.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn" onClick={() => setShowDelete(null)}>Cancel</button>
              <button className="btn danger" onClick={() => handleDelete(showDelete)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </>
  )
}