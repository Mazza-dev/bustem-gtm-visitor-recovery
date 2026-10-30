"use client";
import { useEffect, useState } from "react";

type Lead = { id:number; visitorId:string; name:string; email:string; phone:string; company:string; brandUrl:string; reportSummary:string; reportUrl:string; reportSentAt:string|null; status:string; submittedAt:string; lastActivityAt:string };
type Contact = { id:number; leadId:number; name:string; role:string; email:string; linkedin:string; source:string };
type Event = { id:number; visitorId:string; kind:string; source:string; page:string; createdAt:string };
type Follow = { id:number; leadId:number; contactId:number|null; channel:string; message:string; state:string; createdAt:string };
type QueueItem = { kind:string; visitorId:string; leadId:number|null; account:string; reason:string; nextStep:string; draft:string|null };
type Data = { leads:Lead[]; contacts:Contact[]; events:Event[]; followups:Follow[]; queue:QueueItem[] };
const blank:Data = { leads:[], contacts:[], events:[], followups:[], queue:[] };
const date = (v:string|null) => v ? new Date(v).toLocaleDateString() : "—";

export default function Home() {
  const [data,setData] = useState<Data>(blank);
  const [tab,setTab] = useState("overview");
  const [selected,setSelected] = useState<number|null>(null);
  const [busy,setBusy] = useState(false);
  const [note,setNote] = useState("");
  const [report,setReport] = useState({summary:"",url:""});
  const [contact,setContact] = useState({name:"",role:"",email:"",linkedin:""});
  const [follow,setFollow] = useState({contactId:"",channel:"email",message:"",state:"draft"});
  const lead = data.leads.find(x => x.id === selected);
  const people = data.contacts.filter(x => x.leadId === selected);
  const history = data.followups.filter(x => x.leadId === selected);
  async function refresh() {
    const r = await fetch("/api/gtm",{cache:"no-store"});
    const j = await r.json() as Data & {error?:string};
    if (!r.ok) throw Error(j.error || "Could not load");
    setData(j);
    return j as Data;
  }
  async function save(payload:Record<string,unknown>) {
    setBusy(true); setNote("");
    try {
      const r = await fetch("/api/gtm",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const j = await r.json() as {error?:string;added?:number};
      if (!r.ok) throw Error(j.error || "Could not save");
      await refresh();
      return j;
    } catch(e) { setNote(String(e)); return null; }
    finally { setBusy(false); }
  }
  useEffect(() => {
    refresh().catch(e => setNote(String(e)));
  },[]);
  const count = (kind:string) => new Set(data.events.filter(x => x.kind === kind).map(x => x.visitorId)).size;
  const visits=count("page_view"), submissions=data.leads.length, reports=data.leads.filter(x=>x.reportSentAt).length;
  const quiet=data.queue.filter(x=>x.kind==="report_quiet").length;
  const conversations=data.leads.filter(x=>["conversation","customer"].includes(x.status)).length;
  const customers=data.leads.filter(x=>x.status==="customer").length;
  const funnel=[["Visited",visits],["Saw form",count("form_view")],["Started form",count("form_start")],["Submitted",submissions],["Report sent",reports],["Conversation",conversations],["Customer",customers]] as const;
  async function status(value:string) {
    if (!lead) return;
    const result=await save({action:"lead",id:lead.id,status:value,reportSummary:report.summary || lead.reportSummary,reportUrl:report.url || lead.reportUrl});
    if (result) setNote("Account updated.");
  }
  function draft(person?:Contact) {
    if(!lead) return;
    const first=(person?.name || lead.name).split(" ")[0];
    const finding=lead.reportSummary || "the findings in the scan report";
    setFollow({contactId:person ? String(person.id) : "",channel:person?.linkedin ? "linkedin" : "email",state:"draft",message:"Hi "+first+",\n\nI wanted to follow up on the scan for "+lead.company+". "+finding+"\n\nWould it be useful to discuss what this means for your team?"});
  }
  return <main className="shell">
    <header><div className="brand"><span className="logo">B</span><div><b>Bustem</b><small>GTM 1 · working demo</small></div></div><nav><button className={tab==="overview"?"on":""} onClick={()=>setTab("overview")}>Overview</button><button className={tab==="accounts"?"on":""} onClick={()=>setTab("accounts")}>Accounts</button><a className="navlink" href="/demo">Try as visitor ↗</a></nav></header>
    {note && <div className="notice">{note}<button onClick={()=>setNote("")}>×</button></div>}
    {tab==="overview" && <section><div className="intro"><div><small>VISITOR TO CUSTOMER</small><h1>Where does the journey stop?</h1><p>First party visits, scan submissions, reports, and conversations.</p></div><a className="primary buttonlink" href="/demo">Run the visitor demo ↗</a></div>
      <div className="stats"><article><span>Visitors</span><strong>{visits}</strong><small>Unique browser IDs</small></article><article><span>Submissions</span><strong>{submissions}</strong><small>{visits?Math.round(submissions/visits*100):0}% of visitors</small></article><article><span>Quiet after report</span><strong>{quiet}</strong><small>Demo rule: 2 minutes</small></article><article><span>Customers</span><strong>{customers}</strong><small>Marked by operator</small></article></div>
      <div className="columns"><article className="card"><h2>Journey</h2><p>Unique visitors at each step</p>{funnel.map(([label,n],i)=><div className="step" key={label}><span>{String(i+1).padStart(2,"0")}</span><b>{label}</b><i><em style={{width:(visits?Math.max(n/visits*100,2):0)+"%"}}/></i><strong>{n}</strong></div>)}</article><article className="card"><h2>Traffic sources</h2><p>Recorded at the first visit</p>{[...new Set(data.events.filter(x=>x.kind==="page_view").map(x=>x.source))].map(s=><div className="source" key={s}><span>{s}</span><b>{new Set(data.events.filter(x=>x.kind==="page_view"&&x.source===s).map(x=>x.visitorId)).size}</b></div>)}{!visits&&<p>No visits recorded yet.</p>}<hr/><h2>Identification</h2><p>A visitor stays a browser ID until they submit the form. The system then links their name, email, phone, and company to earlier events.</p></article></div>
      <div className="columns"><article className="card"><div className="cardhead"><div><h2>Action queue</h2><p>Rules run on captured events, without a manual status check.</p></div><button onClick={()=>refresh().catch(e=>setNote(String(e)))}>Refresh</button></div>{data.queue.map(item=><div className="queueitem" key={item.kind+item.visitorId}><div><b>{item.account}</b><small>{item.reason}</small><span>{item.nextStep}</span>{item.draft&&<p className="queuedraft">{item.draft}</p>}</div>{item.leadId&&<button onClick={()=>{const x=data.leads.find(l=>l.id===item.leadId);setSelected(item.leadId);if(x)setReport({summary:x.reportSummary,url:x.reportUrl});if(item.draft)setFollow({contactId:"",channel:"email",state:"draft",message:item.draft});setTab("accounts");}}>Review draft ↗</button>}</div>)}{!data.queue.length&&<p>No accounts need attention right now. Complete the visitor demo, then fast-forward its report.</p>}</article><article className="card"><h2>Reusable workflow</h2><p>The event contract and timing rules powering this demo are available as a template. The report can be marked sent by an operator or by a spreadsheet-triggered workflow.</p><div className="actions"><a className="buttonlink" href="/workflow-template.json" download>Workflow JSON ↓</a><a className="buttonlink" href="/manual-report-log-template.csv" download>Manual report log ↓</a><a className="buttonlink" href="/sample-account-table.csv" download>Sample table ↓</a><a className="buttonlink" href="https://github.com/Mazza-dev/bustem-gtm-visitor-recovery" target="_blank" rel="noreferrer">GitHub source ↗</a></div><hr/><h2>Demo path</h2><p>Open the visitor demo, submit the fictional brand, mark its report sent, then fast-forward two minutes. The queue appears here. Opening the sample report removes it from the queue.</p><a href="/demo">Open visitor demo ↗</a></article></div>
    </section>}
    {tab==="accounts" && <section><div className="intro"><div><small>SCAN REQUESTS</small><h1>Accounts and follow-up</h1><p>Every next step stays linked to the requester and company.</p></div></div><div className="accounts"><aside className="card"><h2>Accounts <span>{data.leads.length}</span></h2>{data.leads.map(x=><button className={"lead "+(selected===x.id?"selected":"")} key={x.id} onClick={()=>{setSelected(x.id);setReport({summary:x.reportSummary,url:x.reportUrl});}}><b>{x.company}</b><small>{x.name} · {date(x.submittedAt)}</small><em>{x.status.replace("_"," ")}</em></button>)}{!data.leads.length&&<p>No requests yet. Run the visitor demo first.</p>}</aside><div className="details">{lead ? <>
      <article className="card"><div className="cardhead"><div><h2>{lead.company}</h2><p>{lead.name} · {lead.email} · {lead.phone}</p></div><em>{lead.status.replace("_"," ")}</em></div><div className="dates"><span>Requested <b>{date(lead.submittedAt)}</b></span><span>Report sent <b>{date(lead.reportSentAt)}</b></span><span>Last activity <b>{date(lead.lastActivityAt)}</b></span></div><label>Report finding<textarea rows={3} placeholder="A concrete finding from the report" value={report.summary} onChange={e=>setReport({...report,summary:e.target.value})}/></label><label>Report link<input placeholder="https://..." value={report.url} onChange={e=>setReport({...report,url:e.target.value})}/></label><div className="actions"><button className="primary" disabled={busy||!report.summary.trim()} onClick={()=>status("report_sent")}>Record report sent</button><button onClick={()=>status("conversation")}>Mark conversation</button><button onClick={()=>status("customer")}>Mark customer</button></div>{data.queue.some(x=>x.leadId===lead.id&&x.kind==="report_quiet")&&<p className="alert">No return or conversation recorded after the report.</p>}</article>
      <article className="card"><div className="cardhead"><div><h2>Decision makers</h2><p>Public profiles need review before outreach.</p></div><button disabled={busy} onClick={async()=>{const r=await save({action:"discover",leadId:lead.id});if(r)setNote(r.added+" public profiles added for review.");}}>Check company site</button></div>{people.map(x=><div className="person" key={x.id}><div><b>{x.name}</b><small>{x.role} · {x.source}</small><span>{x.email||"No email found"} {x.linkedin&&<a href={x.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>}</span></div><button onClick={()=>draft(x)}>Draft note</button></div>)}{!people.length&&<p>No contacts found yet.</p>}<form className="contactform" onSubmit={async e=>{e.preventDefault();const r=await save({action:"contact",leadId:lead.id,...contact});if(r)setContact({name:"",role:"",email:"",linkedin:""});}}><input required placeholder="Name" value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})}/><input placeholder="Role" value={contact.role} onChange={e=>setContact({...contact,role:e.target.value})}/><input placeholder="Email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})}/><input placeholder="LinkedIn URL" value={contact.linkedin} onChange={e=>setContact({...contact,linkedin:e.target.value})}/><button disabled={busy}>Add contact</button></form></article>
      <article className="card"><div className="cardhead"><div><h2>Follow-up</h2><p>Draft and log. This app does not send messages.</p></div><button onClick={()=>draft()}>Draft to requester</button></div><div className="twocol"><label>Person<select value={follow.contactId} onChange={e=>setFollow({...follow,contactId:e.target.value})}><option value="">{lead.name} · requester</option>{people.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Channel<select value={follow.channel} onChange={e=>setFollow({...follow,channel:e.target.value})}><option>email</option><option>linkedin</option><option>phone</option></select></label></div><label>Message<textarea rows={5} value={follow.message} onChange={e=>setFollow({...follow,message:e.target.value})}/></label><div className="actions"><button className="primary" disabled={busy||!follow.message.trim()} onClick={async()=>{const r=await save({action:"followup",leadId:lead.id,...follow});if(r)setNote("Follow-up recorded.");}}>Save follow-up</button><select value={follow.state} onChange={e=>setFollow({...follow,state:e.target.value})}><option>draft</option><option>sent</option><option>replied</option></select></div>{history.map(x=><div className="history" key={x.id}><small>{x.channel} · {x.state} · {date(x.createdAt)}</small><p>{x.message}</p></div>)}</article>
      </> : <article className="card"><p>Select an account to open its report and follow-up.</p></article>}</div></div></section>}
    <footer>Working demo. Live capture requires access to Bustem’s site, form, and report delivery.</footer>
  </main>;
}
