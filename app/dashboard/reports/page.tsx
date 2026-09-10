'use client'
export default function ReportsPage() {
  return (
    <>
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">📄 Generate Report</div></div>
          <div className="field"><label>Report Type</label>
            <select style={{width:'100%',border:'1px solid #E5E7EB',borderRadius:6,padding:'8px 10px',fontSize:13,fontFamily:'inherit'}}>
              <option>Learner Progress Summary</option><option>Course Completion Report</option>
              <option>Quiz Performance Report</option><option>Engagement Analytics</option>
            </select>
          </div>
          <div className="field"><label>Date Range</label>
            <select style={{width:'100%',border:'1px solid #E5E7EB',borderRadius:6,padding:'8px 10px',fontSize:13,fontFamily:'inherit'}}>
              <option>Last 7 days</option><option>Last 30 days</option><option>Last Quarter</option><option>Year to date</option>
            </select>
          </div>
          <div className="field"><label>Format</label>
            <select style={{width:'100%',border:'1px solid #E5E7EB',borderRadius:6,padding:'8px 10px',fontSize:13,fontFamily:'inherit'}}>
              <option>PDF</option><option>CSV</option><option>Excel (XLSX)</option><option>JSON</option>
            </select>
          </div>
          <div className="field"><label>Email to</label>
            <input type="email" defaultValue="admin@learnadmin.com" style={{width:'100%',border:'1px solid #E5E7EB',borderRadius:6,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
          </div>
          <button className="btn primary" style={{width:'100%',justifyContent:'center',marginTop:6}} onClick={()=>alert('Report queued! Email will be sent when ready.')}>
            → Generate Report
          </button>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">🕐 Recent Reports</div></div>
          {[
            {name:'Learner Progress — April 2025',fmt:'PDF',date:'2d ago',color:'#4F46E5'},
            {name:'Course Completion Q1 2025',fmt:'XLSX',date:'1w ago',color:'#10B981'},
            {name:'Quiz Performance — March',fmt:'CSV',date:'2w ago',color:'#F59E0B'},
            {name:'Engagement Analytics Feb',fmt:'PDF',date:'1mo ago',color:'#0EA5E9'},
          ].map((r,i)=>(
            <div key={i} className="activity-item">
              <div className="activity-dot" style={{background:r.color}}/>
              <div style={{flex:1}}>
                <div className="activity-text" style={{fontWeight:500}}>{r.name}</div>
                <div className="activity-time">{r.fmt} · Generated {r.date}</div>
              </div>
              <button className="btn sm">↓</button>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">📊 Data Summary — Current Period</div></div>
        <div className="metrics-grid">
          {[{l:'Total Enrollments',v:'4,821'},{l:'Completions',v:'3,760'},{l:'Certificates Issued',v:'1,842'},{l:'Est. Revenue',v:'₱284K'}].map((m,i)=>(
            <div key={i} className="metric-card"><div className="metric-label">{m.l}</div><div className="metric-value">{m.v}</div></div>
          ))}
        </div>
      </div>
    </>
  )
}