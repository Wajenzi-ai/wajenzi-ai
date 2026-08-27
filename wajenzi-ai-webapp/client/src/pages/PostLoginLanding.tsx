import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";

const destinationByPersona: Record<string, string> = {
  client: "/projects",
  contractor: "/projects",
  developer: "/projects",
  architect: "/projects",
  engineer: "/projects",
  quantity_surveyor: "/boq",
  project_manager: "/projects",
  supplier: "/offers",
  manufacturer: "/catalogue",
  logistics: "/deliveries",
  financier: "/projects",
  institution: "/projects",
  administrator: "/",
  operations: "/operations",
  custom: "/",
};

export default function PostLoginLanding() {
  const [, setLocation] = useLocation();
  const contexts = trpc.registry.workspaceContexts.useQuery(undefined, { retry: false });
  useEffect(() => {
    if (!contexts.data?.activePersona) return;
    setLocation(destinationByPersona[contexts.data.activePersona] || "/");
  }, [contexts.data?.activePersona, setLocation]);
  if (contexts.isError || (contexts.data && !contexts.data.contexts.length)) return <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] p-6 text-center"><div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6"><p className="font-display text-2xl text-amber-950">Workspace access required</p><p className="mt-2 text-sm leading-6 text-amber-900">You are signed in but no authorized organization/workspace context is available. Ask an administrator to assign your membership, role, and permitted project scope.</p></div></div>;
  return <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] text-sm text-slate-600">Loading your authorized wajenzi.ai workspace…</div>;
}
