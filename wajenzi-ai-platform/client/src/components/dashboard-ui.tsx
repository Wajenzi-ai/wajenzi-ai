import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="eyebrow mb-2">{eyebrow ?? "Wajenzi.AI workspace"}</p><h1 className="display-title text-3xl font-semibold text-foreground sm:text-[2.15rem]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action ? <div className="shrink-0">{action}</div> : null}</div>;
}

export function MetricCard({ label, value, delta, tone = "amber", detail }: { label: string; value: string; delta?: string; tone?: "amber" | "blue" | "green" | "red"; detail?: string }) {
  const tones = { amber: "bg-amber-300/12 text-amber-200", blue: "bg-sky-300/12 text-sky-200", green: "bg-emerald-300/12 text-emerald-200", red: "bg-rose-300/12 text-rose-200" };
  const positive = !delta?.startsWith("-");
  return <div className="surface-soft p-4 sm:p-5"><p className="metric-label">{label}</p><div className="mt-3 flex items-end justify-between gap-3"><p className="font-display text-2xl font-semibold tracking-[-0.06em] sm:text-[1.7rem]">{value}</p>{delta ? <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold", tones[tone])}>{positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{delta}</span> : null}</div>{detail ? <p className="mt-3 text-xs text-muted-foreground">{detail}</p> : null}</div>;
}

export function StatePill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const tones = { neutral: "bg-muted text-muted-foreground", success: "bg-emerald-300/12 text-emerald-200", warning: "bg-amber-300/12 text-amber-200", danger: "bg-rose-300/12 text-rose-200", info: "bg-sky-300/12 text-sky-200" };
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold", tones[tone])}><span className="status-dot bg-current opacity-80" />{label}</span>;
}

export function SectionCard({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={cn("surface overflow-hidden", className)}><div className="flex flex-col justify-between gap-2 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center"><div><h2 className="font-display text-base font-semibold tracking-[-0.035em]">{title}</h2>{description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}</div>{action}</div>{children}</section>;
}

export function EmptyDashboard({ title, description, hint }: { title: string; description: string; hint: string }) {
  return <div className="grid-fine relative overflow-hidden rounded-3xl border border-border bg-card p-7 sm:p-10"><div className="amber-glow absolute inset-0" /><div className="relative max-w-xl"><p className="eyebrow">Workspace ready</p><h2 className="display-title mt-3 text-2xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background"><span className="size-1.5 rounded-full bg-primary" />{hint}</div></div></div>;
}
