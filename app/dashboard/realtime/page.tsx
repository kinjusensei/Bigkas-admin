'use client'
import { useEffect, useState } from 'react'

const eventPool = [
  {text:'Ana Reyes started Laravel Lesson 4',color:'#10B981'},
  {text:'New enrollment: Python Basics',color:'#4F46E5'},
  {text:'Ben Cruz published a new quiz',color:'#F59E0B'},
  {text:'Supabase DB INSERT → lesson_progress',color:'#0EA5E9'},
  {text:'David Lim scored 88% on quiz',color:'#10B981'},
  {text:'3 sessions expired (idle)',color:'#9CA3AF'},
  {text:'Report generation job completed',color:'#4F46E5'},
  {text:'Felix Go resumed React Fundamentals',color:'#10B981'},
]

export default function RealtimePage() {
  const [events, setEvents] = useState<{text:string,color:string,id:number}[]>([])
  const [online, setOnline] = useState(47)
  const [sessions, setSessions] = useState(52)
  const [queries, setQueries] = useState(124)
  const [latency, setLatency] = useState(38)
  let idx = 0

  useEffect(()=>{
    const t = setInterval(()=>{
      const ev = eventPool[idx % eventPool.length]; idx++
      setEvents(prev => [{...ev, id:Date.now()}, ...prev].slice(0,15))
      setOnline(Math.floor(Math.random()*20+38))
      setSessions(Math.floor(Math.random()*25+40))
      setQueries(Math.floor(Math.random()*80+90))
      setLatency(Math.floor(Math.random()*30+22))
    }, 2200)
    return () => clearInterval(t)
  },[])

  return (
    <>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label" style={{display:'flex',alignItems:'center',gap:6}}><span className="live-dot"/>Online Now</div>
          <div className="metric-value">{online}</div>
          <div className="metric-delta up">Supabase Realtime</div>
        </div>
        {[{l:'Active Sessions',v:sessions},{l:'DB Queries/s',v:queries},{l:'API Latency',v:`${latency}ms`}].map((m,i)=>(
          <div key={i} className="metric-card"><div className="metric-label">{m.l}</div><div className="metric-value">{m.v}</div></div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{display:'flex',alignItems:'center',gap:8}}><span className="live-dot"/> Live Event Stream</div>
          </div>
          <div className="rt-feed">
            {events.length===0 && <div style={{color:'#9CA3AF',fontSize:13,padding:'8px 0'}}>Waiting for events…</div>}
            {events.map(e=>(
              <div key={e.id} className="activity-item rt-event">
                <div className="activity-dot" style={{background:e.color}}/>
                <div><div className="activity-text">{e.text}</div><div className="activity-time">just now</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">🖥 System Health</div></div>
          {[['API Server',98,'#10B981'],['Supabase DB',99,'#10B981'],['Queue Worker',87,'#F59E0B'],['Storage CDN',100,'#10B981'],['Realtime WS',95,'#10B981'],['Mail Service',0,'#9CA3AF']].map(([n,v,c],i)=>(
            <div key={i} className="health-item">
              <div className="health-dot" style={{background:String(c)}}/>
              <div style={{fontSize:13,flex:1}}>{n}</div>
              {Number(v)>0 ? <>
                <div className="prog-bar" style={{width:80}}><div className="prog-fill" style={{width:`${v}%`,background:String(c)}}/></div>
                <span style={{fontSize:12,color:String(c),minWidth:36,textAlign:'right'}}>{v}%</span>
              </> : <span style={{fontSize:12,color:'#9CA3AF'}}>Unconfigured</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}