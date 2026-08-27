export const PERSONA_KEYS = ["client", "contractor", "developer", "architect", "engineer", "quantity_surveyor", "project_manager", "supplier", "manufacturer", "logistics", "financier", "institution", "administrator", "operations", "custom"] as const;
export type PersonaKey = typeof PERSONA_KEYS[number];

export function defaultPersonaForMembershipRole(workspaceRole: string): PersonaKey {
  if (workspaceRole === "supplier") return "supplier";
  if (workspaceRole === "contractor") return "contractor";
  if (workspaceRole === "project_user") return "project_manager";
  if (workspaceRole === "registry_steward") return "administrator";
  return "custom";
}

export function permittedPersonasForMembership(workspaceRole: string, scope: unknown): PersonaKey[] {
  const candidates = scope && typeof scope === "object" && Array.isArray((scope as { allowedPersonas?: unknown }).allowedPersonas)
    ? (scope as { allowedPersonas: unknown[] }).allowedPersonas
    : [];
  const permitted = candidates.filter((value): value is PersonaKey => typeof value === "string" && (PERSONA_KEYS as readonly string[]).includes(value));
  return permitted.length ? Array.from(new Set(permitted)) : [defaultPersonaForMembershipRole(workspaceRole)];
}

export function selectAuthorizedMembership<T extends { workspaceId: number }>(memberships: T[], selectedWorkspaceId?: number | null): T | undefined {
  return memberships.find(membership => membership.workspaceId === selectedWorkspaceId) ?? memberships[0];
}
