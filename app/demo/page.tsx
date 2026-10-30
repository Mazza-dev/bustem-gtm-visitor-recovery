"use client";
import { useEffect, useState } from "react";
import { demoEvent, demoSource, demoVisitorId } from "../../lib/demo-client";
import "./demo.css";

type Lead = {id:number;visitorId:string;company:string;reportSummary:string;reportUrl:string;reportSentAt:string|null;status:string};
type Contact = {leadId:number;name:string;role:string};
type Queue = {kind:string;leadId:number|null;reason:string;nextStep:string;draft:string|null};
type Data = {leads:Lead[];contacts:Contact[];queue:Queue[]};
const empty:Data={leads:[],contacts:[],queue:[]};

export default function Demo() {
  const [visitor,setVisitor]=useState("");
  const [form,setForm]=useState({brandUrl:"",name:"",email:"",phone:""});
  const [data,setData]=useState<Data>(empty);
  const [started,setStarted]=useState(false);
  const [reportOpen,setReportOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const lead=data.leads.find(x=>x.visitorId===visitor);
  const queued=lead&&data.queue.find(x=>x.leadId===lead.id&&x.kind==="report_quiet");
  const people=lead?data.contacts.filter(x=>x.leadId===lead.id):[];
  const hasReturned=reportOpen||lead?.status==="returned";
  const reportSent=Boolean(lead?.reportSentAt);

  async function refresh(){
    const r=await fetch("/api/gtm",{cache:"no-store"});
    const j=await r.json() as Data&{error?:string};
    if(!r.ok)throw Error(j.error||"Could not load the workflow");
    setData(j);
  }
  useEffect(()=>{
    setVisitor(demoVisitorId());
    void demoEvent("page_view","/demo");
    void demoEvent("form_view","/demo");
    refresh().catch(e=>setError(String(e)));
  },[]);
  function formStarted(){
    if(!started){setStarted(true);void demoEvent("form_start","/demo");}
  }
  async function action(payload:Record<string,unknown>){
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/gtm",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const j=await r.json() as {error?:string};
      if(!r.ok)throw Error(j.error||"Could not run this step");
      await refresh();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function openReport(){
    if (!reportSent) return;
    setBusy(true);setError("");
    try{await demoEvent("report_viewed","/demo");setReportOpen(true);await refresh();}
    catch(e){setError(String(e));}finally{setBusy(false);}
  }
  return <main className="demo">
    <header className="demo-header"><div className="demo-brand"><b>Bustem</b><span>GTM 1 demo</span></div><div className="demo-header-actions"><button type="button" onClick={()=>{localStorage.removeItem("bustem-gtm-visitor");location.reload();}}>New visitor</button><a href="/">Operator view ↗</a></div></header>
    <div className="demo-content">
      <div className="demo-heading"><div><small>WORKING DEMO</small><h1>Visitor to follow-up</h1><p>Use a fictional brand to see the request, report, and follow-up flow. No scan or email is sent.</p></div><span>Sample data only</span></div>
      <div className="demo-grid">
        <section className="demo-panel"><div className="demo-panel-head"><span>01</span><h2>Report request</h2></div>
          {!lead?<form onSubmit={e=>{e.preventDefault();void action({action:"submit",demo:true,visitorId:visitor,source:demoSource(),...form});}} onChange={formStarted}>
            <button className="demo-text-button" type="button" onClick={()=>{setForm({brandUrl:"northstar-demo.example",name:"Avery Morgan",email:"avery@example.com",phone:"+1 555 0100"});formStarted();}}>Fill fictional example</button>
            <label>Brand website<input required value={form.brandUrl} placeholder="northstar-demo.example" onChange={e=>setForm({...form,brandUrl:e.target.value})}/></label>
            <label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
            <label>Work email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
            <label>Phone<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
            <button className="demo-primary" disabled={busy||!visitor}>Submit sample request</button>
          </form>:<div className="demo-state"><strong>Request captured</strong><p>{lead.company} is linked to this visitor. The report is still pending until an operator records that it was sent.</p><button type="button" onClick={()=>void action({action:"lead",id:lead.id,status:"report_sent",reportSummary:lead.reportSummary,reportUrl:lead.reportUrl})} disabled={busy||reportSent}>{reportSent?"Sample report marked sent":"Mark sample report sent"}</button>{reportSent&&<button type="button" onClick={()=>void action({action:"advance_demo",visitorId:visitor})} disabled={busy||!!queued||hasReturned}>{queued?"Two-minute rule triggered":hasReturned?"Recipient returned":"Advance two minutes"}</button>}<small>Mark the report sent, then fast-forward before opening it to see the quiet-recipient queue.</small></div>}
          {error&&<p className="demo-error" role="alert">{error}</p>}
        </section>
        <section className="demo-panel"><div className="demo-panel-head"><span>02</span><h2>Report and return</h2></div>{lead?<><p className="demo-muted">{reportSent?"Sample report marked as delivered to "+lead.company+".":"Report is being prepared for "+lead.company+"."}</p>{reportSent&&<button type="button" onClick={()=>void openReport()} disabled={busy||hasReturned}>{hasReturned?"Report opened":"Open sample report"}</button>}{hasReturned&&<div className="demo-finding"><small>FICTIONAL FINDING</small><p>{lead.reportSummary}</p><span>Opening the report records a return visit.</span></div>}</>:<p className="demo-muted">Submit the request to record a sample report.</p>}</section>
        <section className="demo-panel demo-wide"><div className="demo-panel-head"><span>03</span><h2>Follow-up</h2><button className="demo-refresh" type="button" onClick={()=>refresh().catch(e=>setError(String(e)))}>Refresh</button></div>{queued?<div className="demo-queue"><strong>Ready for operator review</strong><p>{queued.reason}</p><p>{queued.nextStep}</p>{queued.draft&&<pre>{queued.draft}</pre>}{people.length>0&&<p>Contact found: {people.map(x=>x.name+" ("+x.role+")").join(", ")}</p>}<a href="/">Open operator queue ↗</a></div>:<p className="demo-muted">{lead?hasReturned?"The recipient returned. No quiet-report follow-up is needed.":"Advance the report timer to see the follow-up draft here.":"The follow-up appears here after a sent report gets no return."}</p>}</section>
      </div>
    </div>
    <footer>Independent workflow demo. No real report, infringement finding, or message delivery.</footer>
  </main>;
}
