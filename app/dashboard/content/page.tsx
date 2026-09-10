'use client'
const files = [
  {name:'intro_to_laravel_intro.mp4',type:'Video',size:'342 MB',course:'Intro to Laravel',date:'Today'},
  {name:'react_fundamentals_guide.pdf',type:'Document',size:'2.3 MB',course:'React Fundamentals',date:'Yesterday'},
  {name:'python_lesson_2.mp4',type:'Video',size:'218 MB',course:'Python Basics',date:'2d ago'},
  {name:'quiz_db_design_ch3.json',type:'Quiz',size:'14 KB',course:'Database Design',date:'3d ago'},
  {name:'uiux_wireframes.pdf',type:'Document',size:'8.7 MB',course:'UI/UX Principles',date:'1w ago'},
  {name:'devops_docker_lab.mp4',type:'Video',size:'512 MB',course:'DevOps Essentials',date:'1w ago'},
]
const typeColor:Record<string,string> = {Video:'pill-blue',Document:'pill-purple',Quiz:'pill-amber'}

export default function ContentPage() {
  return (
    <>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <p style={{fontSize:13,color:'#6B7280'}}>All files stored in Supabase Storage</p>
        <div style={{display:'flex',gap:8}}>
          <button className="btn">📁 New Folder</button>
          <button className="btn primary">↑ Upload Files</button>
        </div>
      </div>
      <div className="metrics-grid">
        {[{icon:'🎬',bg:'#DBEAFE',cl:'#1D4ED8',label:'Videos',value:'142',sub:'38.2 GB'},
          {icon:'📄',bg:'#EDE9FE',cl:'#6D28D9',label:'Documents',value:'391',sub:'2.1 GB'},
          {icon:'❓',bg:'#FEF3C7',cl:'#D97706',label:'Quizzes',value:'87',sub:'Supabase DB'},
          {icon:'💾',bg:'#D1FAE5',cl:'#059669',label:'Total Storage',value:'40.3 GB',sub:'62% used'},
        ].map((m,i)=>(
          <div key={i} className="metric-card">
            <div className="metric-icon" style={{background:m.bg,color:m.cl}}>{m.icon}</div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            <div style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">📁 Files</div>
          <div style={{display:'flex',gap:8}}>
            <input placeholder="Search files…" style={{border:'1px solid #E5E7EB',borderRadius:6,padding:'6px 10px',fontSize:13,outline:'none'}}/>
            <select style={{border:'1px solid #E5E7EB',borderRadius:6,padding:'6px 10px',fontSize:13}}>
              <option>All types</option><option>Video</option><option>Document</option><option>Quiz</option>
            </select>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>File Name</th><th>Type</th><th>Size</th><th>Course</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {files.map((f,i)=>(
                <tr key={i}>
                  <td style={{fontWeight:500}}>{f.name}</td>
                  <td><span className={`pill ${typeColor[f.type]??'pill-gray'}`}>{f.type}</span></td>
                  <td style={{color:'#6B7280'}}>{f.size}</td>
                  <td style={{color:'#6B7280'}}>{f.course}</td>
                  <td style={{fontSize:12,color:'#9CA3AF'}}>{f.date}</td>
                  <td><div style={{display:'flex',gap:5}}>
                    <button className="btn sm">↓</button>
                    <button className="btn sm">✏️</button>
                    <button className="btn sm danger">🗑</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}