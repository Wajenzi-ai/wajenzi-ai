import DashboardLayout from "@/components/DashboardLayout";
import { BadgeCheck, DatabaseZap, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { usePersona } from "./DashboardLayout";

export function StatusPill({ value }: { value?: string | null }) {
  const normalized = (value || "unknown").replaceAll("_", " ");
  const tone = normalized.includes("verified") || normalized.includes("active") || normalized.includes("completed") || normalized.includes("matched")
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : normalized.includes("review") || normalized.includes("pending") || normalized.includes("draft")
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : normalized.includes("rejected") || normalized.includes("suspended") || normalized.includes("expired")
        ? "bg-rose-50 text-rose-800 ring-rose-200"
        : "bg-slate-100 text-slate-700 ring-slate-200";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ring-1 ring-inset ${tone}`}>{normalized}</span>;
}

export function WajenziId({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono-data text-[11px] tracking-tight text-slate-600">{value}</span>;
}

export function WorkspaceFrame({ eyebrow, title, description, children, action, demo = true }: { eyebrow: string; title: string; description: string; children: ReactNode | ((context: ReturnType<typeof usePersona>) => ReactNode); action?: ReactNode; demo?: boolean }) {
  return <DashboardLayout><WorkspaceFrameBody eyebrow={eyebrow} title={title} description={description} action={action} demo={demo}>{children}</WorkspaceFrameBody></DashboardLayout>;
}

function WorkspaceFrameBody({ eyebrow, title, description, children, action, demo = true }: { eyebrow: string; title: string; description: string; children: ReactNode | ((context: ReturnType<typeof usePersona>) => ReactNode); action?: ReactNode; demo?: boolean }) {
  const personaContext = usePersona();
  return (
      <div className="min-h-[calc(100vh-2rem)]">
        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#20323a] px-6 py-7 text-stone-100 shadow-[0_24px_60px_rgba(25,42,48,0.15)] sm:px-8">
          <div className="absolute inset-0 opacity-30 surface-grid" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-teal-200/20" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200"><DatabaseZap className="h-3.5 w-3.5" /> {eyebrow}</p>
              <h1 className="font-display text-3xl leading-tight text-stone-50 sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">{description}</p>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        </section>
        {demo ? <div className="mt-5 flex gap-3 rounded-xl border border-teal-900/10 bg-teal-50/70 px-4 py-3 text-xs leading-5 text-teal-950"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" /><span><strong>Demonstration workspace.</strong> Seeded organizations, supplier offers, locations, prices, stock, and evidence are clearly labelled illustrative records. They are not live market, customer, or supplier claims.</span></div> : null}
        {!personaContext.projects.length ? <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><span><strong>No authorized project context.</strong> You may have workspace access but no project membership or project has been created for this workspace. Project-specific procurement, field, document, and collaboration actions remain unavailable until an authorized project is selected.</span></div> : null}
        <main className="mt-6">{typeof children === "function" ? children(personaContext) : children}</main>
        <footer className="mt-10 flex items-center gap-2 border-t soft-divider py-5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-teal-700" /> Immutable WAJENZI IDs, source provenance, evidence, and audit events remain attached to the governed record.</footer>
      </div>
    
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="data-card rounded-2xl px-6 py-12 text-center"><p className="font-display text-xl text-slate-800">{title}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p></div>;
}
