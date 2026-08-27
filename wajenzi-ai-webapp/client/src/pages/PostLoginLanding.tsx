import { trpc } from "@/lib/trpc";
import { dashboardPathForPersona, personaRequestedByHost } from "@/lib/subdomainRouting";
import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";

export default function PostLoginLanding() {
  const [, setLocation] = useLocation();
  const contexts = trpc.registry.workspaceContexts.useQuery(undefined, { retry: false });
  const requestedPersona = useMemo(() => personaRequestedByHost(window.location.hostname), []);
  const activeContext = contexts.data?.contexts.find(context => context.workspaceId === contexts.data?.activeWorkspaceId);
  const selectContext = trpc.registry.selectWorkspaceContext.useMutation({
    onSuccess: () => setLocation("/"),
    onError: () => setLocation("/"),
  });
  useEffect(() => {
    if (!contexts.data?.activePersona) return;
    const canRequestHostPersona = requestedPersona && activeContext?.allowedPersonas.includes(requestedPersona);
    if (canRequestHostPersona && requestedPersona !== contexts.data.activePersona && activeContext) {
      selectContext.mutate({ workspaceId: activeContext.workspaceId, projectEntityId: contexts.data.activeProjectEntityId ?? null, persona: requestedPersona });
      return;
    }
    setLocation(dashboardPathForPersona(contexts.data.activePersona as Parameters<typeof dashboardPathForPersona>[0]));
  }, [activeContext, contexts.data?.activePersona, contexts.data?.activeProjectEntityId, requestedPersona, selectContext, setLocation]);
  if (contexts.isError || (contexts.data && !contexts.data.contexts.length)) return <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] p-6 text-center"><div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6"><p className="font-display text-2xl text-amber-950">Workspace access required</p><p className="mt-2 text-sm leading-6 text-amber-900">You are signed in but no authorized organization/workspace context is available. Ask an administrator to assign your membership, role, and permitted project scope.</p></div></div>;
  return <div className="grid min-h-screen place-items-center bg-[#0d2024] px-6 text-center text-sm text-teal-100">Loading your authorized wajenzi.ai workspace…</div>;
}
