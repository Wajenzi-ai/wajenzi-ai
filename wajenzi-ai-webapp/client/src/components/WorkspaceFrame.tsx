import DashboardLayout, { usePersona } from "@/components/DashboardLayout";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function StatusPill({ value }: { value?: string | null }) {
  const normalized = (value || "unknown").replaceAll("_", " ");
  const tone = normalized.includes("verified") || normalized.includes("active") || normalized.includes("completed") || normalized.includes("matched") || normalized.includes("issued") || normalized.includes("acknowledged")
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : normalized.includes("review") || normalized.includes("pending") || normalized.includes("draft") || normalized.includes("open")
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : normalized.includes("rejected") || normalized.includes("suspended") || normalized.includes("expired") || normalized.includes("failed")
        ? "bg-rose-50 text-rose-800 ring-rose-200"
        : "bg-slate-100 text-slate-700 ring-slate-200";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em] ring-1 ring-inset ${tone}`}>{normalized}</span>;
}

export function WajenziId({ value }: { value?: string | null }) {
  return value ? <span className="font-mono-data text-[10px] tracking-tight text-slate-500">{value}</span> : <span className="text-muted-foreground">—</span>;
}

export function WorkspaceFrame({ eyebrow, title, description, children, action, demo = true }: { eyebrow: string; title: string; description: string; children: ReactNode | ((context: ReturnType<typeof usePersona>) => ReactNode); action?: ReactNode; demo?: boolean }) {
  return <DashboardLayout><WorkspaceFrameBody eyebrow={eyebrow} title={title} description={description} action={action} demo={demo}>{children}</WorkspaceFrameBody></DashboardLayout>;
}

function WorkspaceFrameBody({ eyebrow, title, description, children, action, demo }: { eyebrow: string; title: string; description: string; children: ReactNode | ((context: ReturnType<typeof usePersona>) => ReactNode); action?: ReactNode; demo: boolean }) {
  const personaContext = usePersona();
  return <div className="mx-auto max-w-7xl"><section className="border-b border-stone-200 pb-7"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-3xl"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p><h1 className="mt-2 font-display text-4xl leading-tight text-slate-950 sm:text-5xl">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></div>{action ? <div className="shrink-0">{action}</div> : null}</div></section>{demo ? <div className="mt-5 flex gap-3 rounded-2xl border border-teal-900/10 bg-teal-50 px-4 py-3 text-xs leading-5 text-teal-950"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" /><span><b>Demonstration workspace.</b> Seeded commercial, location, price, stock, and evidence data is illustrative only; it is not a current supplier, customer, or market claim.</span></div> : null}{!personaContext.projects.length ? <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><span><b>No authorized project context.</b> Project-bound procurement and site actions become available only after an authorized project is selected or created.</span></div> : null}<main className="mt-7">{typeof children === "function" ? children(personaContext) : children}</main><footer className="mt-10 border-t border-stone-200 py-5 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-teal-700" />Immutable Wajenzi IDs, source provenance, evidence, and audit events remain attached to governed records.</span></footer></div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center"><p className="font-display text-2xl text-slate-800">{title}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p></div>;
}
