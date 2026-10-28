"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Boxes, BriefcaseBusiness,
  CalendarDays, Check, ChevronDown, CircleHelp, ClipboardCheck, FileText, LayoutDashboard,
  LogOut, MapPin, Package, Search, Settings2, ShieldCheck, Truck, Wallet, WandSparkles,
  AlertTriangle, Clock3, Users, X
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { Brand } from "@/components/Brand";
import { signOut } from "@/lib/auth";
import "./contractor-dashboard.css";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My projects", icon: BriefcaseBusiness },
  { label: "BOQ & estimates", icon: ClipboardCheck },
  { label: "Procurement", icon: Boxes },
  { label: "Tasks & site", icon: Check },
  { label: "AI copilot", icon: WandSparkles },
  { label: "Documents", icon: FileText },
  { label: "Finance", icon: Wallet },
  { label: "Logistics", icon: Truck },
];
const projects = [
  { id: "WJ-PROJ-000078", name: "Kilimani Residence", location: "Nairobi", type: "Residential", progress: 68, budget: "KSh 12.8M", state: "On track", color: "green" },
  { id: "WJ-PROJ-000091", name: "Ridgeways Duplex", location: "Kiambu", type: "Residential", progress: 42, budget: "KSh 8.4M", state: "Needs review", color: "amber" },
  { id: "WJ-PROJ-000104", name: "Nakuru Retail Block", location: "Nakuru", type: "Commercial", progress: 24, budget: "KSh 16.2M", state: "On track", color: "green" },
];
const tasks = [
  { title: "Approve revised foundation BOQ", id: "WJ-TASK-001245", project: "Kilimani Residence", due: "Today", status: "Approval", tone: "amber" },
  { title: "Confirm D12 steel delivery", id: "WJ-TASK-001267", project: "Ridgeways Duplex", due: "Today", status: "Procurement", tone: "teal" },
  { title: "Upload daily site progress report", id: "WJ-TASK-001301", project: "Nakuru Retail Block", due: "Tomorrow", status: "Site report", tone: "neutral" },
];
const orders = [
  { name: "D12 reinforcement bars", id: "WJ-PROD-000218", supplier: "Nairobi Steel Centre", qty: "240 pcs", status: "In transit", tone: "teal" },
  { name: "Cement · 32.5N", id: "WJ-PROD-000046", supplier: "Eastlands Building Mart", qty: "180 bags", status: "Ready", tone: "neutral" },
  { name: "PVC drainage pipes", id: "WJ-PROD-000517", supplier: "AquaFlow Kenya", qty: "64 lengths", status: "Awaiting", tone: "amber" },
];

function ContractorWorkspace({ profile }: { profile: { full_name: string; company_name?: string | null } }) {
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All projects");
  const [showAlerts, setShowAlerts] = useState(false);
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || "there";
  const filteredProjects = useMemo(() => projects.filter((project) => {
    const matchesSearch = `${project.name} ${project.id} ${project.location}`.toLowerCase().includes(search.toLowerCase());
    const matchesProject = projectFilter === "All projects" || project.name === projectFilter;
    return matchesSearch && matchesProject;
  }), [search, projectFilter]);
  const filteredTasks = tasks.filter((task) => `${task.title} ${task.id} ${task.project}`.toLowerCase().includes(search.toLowerCase()));
  const filteredOrders = orders.filter((order) => `${order.name} ${order.id} ${order.supplier}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="cw-shell">
      <aside className="cw-sidebar">
        <div className="cw-brand"><Brand /><span className="cw-brand-caption">CONTRACTOR WORKSPACE</span></div>
        <label className="cw-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workspace" aria-label="Search projects, tasks and procurement" /><kbd>⌘ K</kbd>{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={13}/></button>}</label>
        <div className="cw-nav-caption">NAVIGATION</div>
        <nav className="cw-nav" aria-label="Contractor workspace">
          {navigation.map(({ label, icon: Icon }) => <button key={label} className={active === label ? "cw-nav-item active" : "cw-nav-item"} onClick={() => setActive(label)}><Icon size={17} strokeWidth={1.8}/><span>{label}</span>{label === "Tasks & site" && <i className="cw-nav-count">7</i>}</button>)}
        </nav>
        <div className="cw-sidebar-bottom">
          <div className="cw-nav-caption">WAJENZI DATA</div>
          <button className="cw-plain-nav" onClick={() => setActive("Master registry")}><ShieldCheck size={16}/>Master registry</button>
          <button className="cw-plain-nav" onClick={() => setActive("Integrations")}><Settings2 size={16}/>Integrations</button>
          <div className="cw-account"><div className="cw-avatar">{firstName.slice(0,1).toUpperCase()}</div><div className="cw-account-text"><strong>{profile.full_name}</strong><span>{profile.company_name || "Contractor account"}</span></div><button onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={16}/></button></div>
        </div>
      </aside>

      <section className="cw-main">
        <header className="cw-topbar">
          <div className="cw-breadcrumb"><LayoutDashboard size={17}/><span>{active}</span></div>
          <div className="cw-top-actions">
            <span className="cw-date">THURSDAY, 29 OCTOBER 2026</span>
            <button className="cw-icon-btn" aria-label="Notifications" onClick={() => setShowAlerts(!showAlerts)}><Bell size={17}/><i/></button>
            <button className="cw-profile-chip" onClick={() => setShowAlerts(!showAlerts)}><span className="cw-avatar small">{firstName.slice(0,1).toUpperCase()}</span><span>{firstName}</span><ChevronDown size={14}/></button>
          </div>
        </header>
        {showAlerts && <div className="cw-alert-popover"><strong>Priority notifications</strong><p><AlertTriangle size={14}/> Steel prices changed — review 4 BOQ lines.</p><p><Clock3 size={14}/> 2 supplier confirmations are pending.</p><button onClick={() => setShowAlerts(false)}>Close</button></div>}
        <div className="cw-page-heading">
          <div><p className="cw-eyebrow">CONTRACTOR WORKSPACE / {active.toUpperCase()}</p><h1>{active === "Overview" ? `Good morning, ${firstName}.` : active}</h1><p className="cw-subtitle">Your projects, cash flow and site operations at a glance.</p></div>
          <label className="cw-project-select"><span>PROJECT SCOPE</span><select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Filter by project"><option>All projects</option>{projects.map(p => <option key={p.id}>{p.name}</option>)}</select><ChevronDown size={14}/></label>
        </div>

        <section className="cw-kpis" aria-label="Portfolio summary">
          <article className="cw-kpi"><span>ACTIVE PROJECTS</span><strong>08</strong><small className="positive"><ArrowUpRight size={14}/> +2 this month</small></article>
          <article className="cw-kpi"><span>PORTFOLIO VALUE</span><strong>KSh 48.6M</strong><small className="positive"><ArrowDownRight size={14}/> 6.8% under budget</small></article>
          <article className="cw-kpi"><span>OPEN PROCUREMENT</span><strong>KSh 3.24M</strong><small>12 orders in progress</small></article>
          <article className="cw-kpi"><span>TASKS OVERDUE</span><strong>07</strong><small className="positive"><ArrowDownRight size={14}/> 3 fewer than last week</small></article>
        </section>

        <div className="cw-content-grid">
          <section className="cw-panel cw-project-panel">
            <div className="cw-panel-head"><div><h2>{active === "Overview" ? "Project overview" : active}</h2><p>Project records · canonical Wajenzi IDs</p></div><button className="cw-text-action" onClick={() => setActive("My projects")}>View all <ArrowRight size={14}/></button></div>
            <div className="cw-project-list">
              {filteredProjects.map(p => <article className="cw-project-row" key={p.id}><div className="cw-project-mark"><BriefcaseBusiness size={17}/></div><div className="cw-project-name"><strong>{p.name}</strong><span>{p.location} · {p.type}</span><code>{p.id}</code></div><div className="cw-project-progress"><div><span>{p.progress}% complete</span><strong>{p.budget}</strong></div><div className="cw-progress-track"><i style={{ width: `${p.progress}%` }}/></div></div><span className={`cw-status ${p.color}`}>{p.state}</span></article>)}
              {filteredProjects.length === 0 && <div className="cw-empty">No matching projects. Try a different search or project scope.</div>}
            </div>
          </section>

          <section className="cw-panel cw-copilot">
            <div className="cw-panel-head"><div><p className="cw-eyebrow">WAJENZI AI</p><h2>Priority actions</h2></div><span className="cw-count">03</span></div>
            <div className="cw-insight"><span className="cw-insight-dot amber"/><div><small>COST VARIANCE</small><strong>Steel prices changed</strong><p>4 BOQ lines need a cost review.</p></div><ArrowRight size={15}/></div>
            <div className="cw-insight"><span className="cw-insight-dot teal"/><div><small>SUPPLIER APPROVAL</small><strong>Substitution awaiting review</strong><p>Ridgeways Duplex · 2 products.</p></div><ArrowRight size={15}/></div>
            <div className="cw-insight"><span className="cw-insight-dot neutral"/><div><small>SITE SCHEDULE</small><strong>Masonry milestone is near</strong><p>Nakuru Retail Block · In 2 days.</p></div><ArrowRight size={15}/></div>
            <button className="cw-ai-button" onClick={() => setActive("AI copilot")}><WandSparkles size={15}/> Open project copilot <ArrowRight size={14}/></button>
          </section>

          <section className="cw-panel cw-tasks-panel">
            <div className="cw-panel-head"><div><h2>Upcoming tasks</h2><p>Actions linked to project work packages</p></div><button className="cw-text-action" onClick={() => setActive("Tasks & site")}>Task board <ArrowRight size={14}/></button></div>
            <div className="cw-table">
              {filteredTasks.map(t => <div className="cw-table-row" key={t.id}><span className="cw-check-box"><Check size={12}/></span><div className="cw-table-main"><strong>{t.title}</strong><code>{t.id} · {t.project}</code></div><span className="cw-due">{t.due}</span><span className={`cw-status-pill ${t.tone}`}>{t.status}</span></div>)}
              {filteredTasks.length === 0 && <div className="cw-empty">No matching tasks.</div>}
            </div>
          </section>

          <section className="cw-panel cw-procurement-panel">
            <div className="cw-panel-head"><div><h2>Procurement activity</h2><p>Demand derived from approved project BOQs</p></div><button className="cw-text-action" onClick={() => setActive("Procurement")}>View all <ArrowRight size={14}/></button></div>
            <div className="cw-table">
              {filteredOrders.map(o => <div className="cw-order-row" key={o.id}><div className="cw-order-icon"><Package size={16}/></div><div className="cw-table-main"><strong>{o.name}</strong><code>{o.id} · {o.supplier}</code><span className="cw-order-qty">{o.qty}</span></div><span className={`cw-status-pill ${o.tone}`}>{o.status}</span></div>)}
              {filteredOrders.length === 0 && <div className="cw-empty">No matching procurement records.</div>}
            </div>
          </section>
        </div>
        <footer className="cw-footer"><span>WAJENZI MASTER REGISTRY · PROJECT-LINKED DATA</span><span><Activity size={13}/> DEMO DATA · LIVE INTEGRATIONS PENDING</span></footer>
      </section>
    </main>
  );
}

export default function ContractorDashboard() {
  return <AuthGuard allowedRole="contractor">{(profile) => <ContractorWorkspace profile={profile}/>}</AuthGuard>;
}
