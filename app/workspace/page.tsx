"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { Bot, Boxes, ChevronRight, ClipboardCheck, FileText, MapPin, Plus, Search, ShieldCheck, ShoppingCart, Truck } from "lucide-react";

const tabs = ["Overview", "Projects", "BOQ & costs", "Procurement", "Documents"];
const offers = [
  ["Bamburi PowerPlus Cement", "50 kg bag", "KSh 790", "BuildMart Nairobi"],
  ["Duma 8mm Reinforcement Bar", "12 m length", "KSh 1,150", "Steelworks Ltd"],
  ["Crown Vinyl Matt Emulsion", "20 L", "KSh 8,920", "Crown Paints"]
];

function Workspace({ role }: { role: string }) {
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const supply = ["supplier", "manufacturer", "distributor", "logistics"].includes(role);
  const toggle = (product: string) => setShortlist((items) => items.includes(product) ? items.filter((item) => item !== product) : [...items, product]);
  const metrics = supply ? [["KSh 1.28M", "monthly GMV"], ["14", "new RFQs"], ["98%", "catalogue matched"], ["2", "stock signals"]] : [["KSh 12.4M", "project budget"], ["KSh 4.8M", "committed cost"], ["84%", "procurement ready"], ["3", "active risks"]];
  return <div className="console-layout">
    <aside className="console-sidebar"><span className="console-label">WORKSPACE</span>{tabs.map((item) => <button className={tab === item ? "console-nav active" : "console-nav"} key={item} onClick={() => setTab(item)}>{item}</button>)}<div className="console-side-card"><span className="console-label">AI PROJECT AGENT</span><Bot size={20}/><p>Ask about your project, costs or next procurement action.</p><button onClick={() => setMessage("The Project Agent has prepared today’s action brief.")}>Open agent <ChevronRight size={14}/></button></div></aside>
    <section className="console-main"><div className="console-topline"><span>{supply ? "SUPPLY OPERATIONS" : "PROJECT / WAJ-PRJ-KE-04281"}</span><span><MapPin size={13}/> {supply ? "Nairobi commercial zone" : "Kileleshwa, Nairobi"}</span></div><div className="console-title"><div><p className="kicker">{tab.toUpperCase()}</p><h1>{supply ? "Commerce, connected." : "Kileleshwa Residences"}</h1><p>{supply ? "Turn live demand into trusted, fulfilled commercial offers." : "A connected record of scope, cost, procurement and progress."}</p></div><button className="button button-bright" onClick={() => setMessage(supply ? "New product workflow started." : "Project creation workflow started.")}><Plus size={16}/>{supply ? "Add product" : "New project"}</button></div>{message && <div className="console-message"><ShieldCheck size={16}/>{message}<button onClick={() => setMessage("")}>Dismiss</button></div>}
      <div className="console-metrics">{metrics.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className="console-content-grid"><section className="console-panel procurement-panel"><div className="panel-heading"><div><span className="console-label">{supply ? "LIVE DEMAND" : "PROCUREMENT COMMAND"}</span><h2>{supply ? "Requests that fit your catalogue" : "Source materials with context"}</h2></div><ShoppingCart size={20}/></div><div className="console-search"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={supply ? "Find demand, products or projects" : "Find products, suppliers or specifications"}/></div><div className="offer-stack">{offers.filter(([name]) => name.toLowerCase().includes(query.toLowerCase())).map(([name, detail, price, vendor]) => <div className="offer" key={name}><div><strong>{name}</strong><span>{detail} · <em>{vendor}</em></span></div><b>{price}</b><button onClick={() => toggle(name)}>{shortlist.includes(name) ? "Added" : supply ? "Respond" : "Shortlist"}</button></div>)}</div><button className="panel-link" onClick={() => setMessage("Marketplace opened with your project context applied.")}>Open marketplace <ChevronRight size={15}/></button></section>
      <section className="console-panel activity-panel"><div className="panel-heading"><div><span className="console-label">TRACEABLE ACTIVITY</span><h2>Today&apos;s signal</h2></div><ClipboardCheck size={20}/></div><div className="timeline"><div><i className="green"/><p><b>Quotation received</b><span>Steelworks Ltd replied to RFQ-042</span></p><time>09:42</time></div><div><i/><p><b>BOQ cost updated</b><span>Concrete work package recalculated</span></p><time>08:16</time></div><div><i/><p><b>Delivery confirmed</b><span>120 cement bags scheduled for 14:00</span></p><time>Yesterday</time></div></div><button className="panel-link" onClick={() => setMessage("Your immutable activity ledger is up to date.")}>View activity ledger <ChevronRight size={15}/></button></section></div>
      <div className="console-bottom-grid"><section className="console-panel mini-panel"><Truck size={19}/><span>Next delivery</span><strong>Today, 14:00</strong><p>BuildMart Nairobi → Kileleshwa Site</p></section><section className="console-panel mini-panel"><FileText size={19}/><span>Document review</span><strong>2 drawings</strong><p>Structural revision awaiting approval</p></section><section className="console-panel mini-panel"><Boxes size={19}/><span>Data quality</span><strong>Verified</strong><p>All active product records are traceable</p></section></div></section>
  </div>;
}

export default function WorkspacePage() { return <AuthGuard>{(profile) => <DashboardShell profile={profile} title="Construction operating system" subtitle="Your connected workspace turns projects, procurement, documents and activity into decisions."><Workspace role={profile.role ?? "owner"}/></DashboardShell>}</AuthGuard>; }
