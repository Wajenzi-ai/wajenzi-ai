import type { PersonaKey } from "@/lib/personas";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function PersonaLanding({ persona }: { persona: PersonaKey }) {
  const [, setLocation] = useLocation();
  const contexts = trpc.registry.workspaceContexts.useQuery(undefined, { retry: false });
  const select = trpc.registry.selectWorkspaceContext.useMutation({ onSuccess: () => setLocation("/") });
  useEffect(() => {
    const active = contexts.data?.contexts.find(context => context.workspaceId === contexts.data?.activeWorkspaceId);
    if (!active || select.isPending || select.isSuccess) return;
    if (!active.allowedPersonas.includes(persona)) { setLocation("/"); return; }
    select.mutate({ workspaceId: active.workspaceId, projectEntityId: contexts.data?.activeProjectEntityId ?? null, persona });
  }, [contexts.data, persona, select, setLocation]);
  if (contexts.isError || (contexts.data && !contexts.data.contexts.length)) return <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] p-6 text-center"><div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6"><p className="font-display text-xl text-amber-950">No authorized workspace context</p><p className="mt-2 text-sm leading-6 text-amber-900">This role view cannot load until an active organization/workspace membership is assigned.</p></div></div>;
  return <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] text-sm text-slate-600" aria-busy="true">Checking authorized role context…</div>;
}
