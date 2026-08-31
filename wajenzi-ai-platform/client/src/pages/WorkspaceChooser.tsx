import { ArrowUpRight, Building2, CheckCircle2, Globe2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardNavigation } from "@/lib/wajenzi";
import { getWorkspaceUrl, workspaceDefinitions } from "@/lib/subdomainRouting";

export default function WorkspaceChooser() {
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: false });
  const chooseWorkspace = (dashboard: (typeof workspaceDefinitions)[number]["dashboard"]) => {
    window.location.assign(getWorkspaceUrl(dashboard));
  };

  if (loading) return <DashboardLayout><div className="surface-soft mx-auto max-w-xl p-8 text-center"><p className="eyebrow">Secure workspace</p><h1 className="mt-3 font-display text-2xl font-semibold">Checking your Wajenzi identity…</h1></div></DashboardLayout>;
  if (!isAuthenticated) return <DashboardLayout><div className="surface-soft mx-auto max-w-xl p-8 text-center"><p className="eyebrow">Universal application</p><h1 className="mt-3 font-display text-2xl font-semibold">Sign in to choose a workspace</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Your organizations, memberships, permissions, and project data determine which role workspaces you can open.</p><Button onClick={() => startLogin()} className="btn-press mt-6 bg-foreground text-background hover:bg-foreground/90">Sign in to continue</Button></div></DashboardLayout>;

  return <DashboardLayout><div className="mx-auto max-w-6xl space-y-8 py-4"><div className="max-w-2xl"><p className="eyebrow">Universal application</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Choose your Wajenzi workspace</h1><p className="mt-4 text-base leading-7 text-muted-foreground">Your identity, organizations, permissions, ontology, and project data stay shared. Choose an operating environment for the work you are doing now.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{workspaceDefinitions.map((definition) => { const nav = dashboardNavigation.find((item) => item.key === definition.dashboard); const Icon = nav?.icon ?? Building2; return <Card key={definition.subdomain} className="surface group border-border/70 transition-transform duration-200 hover:-translate-y-0.5"><CardHeader><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary"><Icon className="size-5" /></span><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{definition.subdomain}.wajenzi.ai</span></div><CardTitle className="pt-2 text-xl">{definition.label}</CardTitle><CardDescription>Shared Wajenzi operating environment with role-aware access.</CardDescription></CardHeader><CardContent><Button onClick={() => chooseWorkspace(definition.dashboard)} className="btn-press w-full justify-between bg-foreground text-background hover:bg-foreground/90">Open workspace <ArrowUpRight className="size-4" /></Button></CardContent></Card>; })}</div><div className="surface-soft flex flex-col gap-3 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center"><CheckCircle2 className="size-5 shrink-0 text-emerald-600" /><p>Access is still authorized by the backend. A subdomain is an entry point, not a permission.</p><Globe2 className="hidden size-5 shrink-0 text-primary sm:ml-auto sm:block" /></div></div></DashboardLayout>;
}
