'use client'
export default function SettingsPage() {
  return (
    <>
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">🗄 Supabase Connection</div></div>
          {[['Project URL','https://xxxx.supabase.co','url'],['Anon Key','eyJhbGci...','password'],['Service Role Key','eyJhbGci...','password']].map(([l,p,t],i)=>(
            <div key={i} className="field">
              <label>{String(l)}</label>
              <input type={String(t)} defaultValue={String(p)} style={{width:'100%',border:'1px solid #E5E7EB',borderRadius:6,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
            </div>
          ))}
          <div style={{display:'flex',gap:8,marginTop:6}}>
            <button className="btn primary">💾 Save</button>
            <button className="btn" onClick={()=>alert('Supabase connected in 42ms ✓')}>🔌 Test Connection</button>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">⚙️ Module Settings</div></div>
          {[['Enable real-time monitoring',true],['Email digest reports',true],['Require lesson order',false],['Allow quiz retakes',true],['Track video progress',true],['Maintenance mode',false]].map(([l,d],i)=>(
            <label key={i} className="toggle">
              <input type="checkbox" defaultChecked={Boolean(d)} style={{appearance:'none',width:36,height:20,background:d?'#4F46E5':'#D1D5DB',borderRadius:10,cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0}}/>
              {String(l)}
            </label>
          ))}
          <button className="btn primary" style={{marginTop:8}}>💾 Save Settings</button>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">🔧 Environment Status</div></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Key</th><th>Value</th><th>Status</th></tr></thead>
            <tbody>
              {[
                ['NEXT_PUBLIC_SUPABASE_URL','https://xxxx.supabase.co',true],
                ['NEXT_PUBLIC_SUPABASE_ANON_KEY','eyJhbGci...',true],
                ['SUPABASE_SERVICE_ROLE_KEY','eyJhbGci...',true],
                ['NEXT_PUBLIC_APP_ENV','development',true],
                ['SMTP_HOST','Not configured',null],
              ].map(([k,v,s],i)=>(
                <tr key={i}>
                  <td><code style={{background:'#F3F4F6',padding:'2px 6px',borderRadius:4,fontSize:12}}>{String(k)}</code></td>
                  <td style={{color:'#6B7280'}}>{String(v)}</td>
                  <td><span className={`pill ${s===true?'pill-green':s===false?'pill-red':'pill-amber'}`}>{s===true?'Connected':s===false?'Error':'Unconfigured'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}