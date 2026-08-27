import type { PersonaKey } from "./personas";

const HOST_PERSONAS: Record<string, PersonaKey> = {
  admin: "administrator",
  operations: "operations",
  supplier: "supplier",
  manufacturer: "manufacturer",
  contractor: "contractor",
  developer: "developer",
  architect: "architect",
  engineer: "engineer",
  qs: "quantity_surveyor",
  "project-manager": "project_manager",
  logistics: "logistics",
  financier: "financier",
  institution: "institution",
  client: "client",
};

export function personaRequestedByHost(hostname: string): PersonaKey | undefined {
  const host = hostname.toLowerCase().split(":")[0] || "";
  if (!host.endsWith(".wajenzi.ai")) return undefined;
  const subdomain = host.slice(0, -".wajenzi.ai".length);
  return HOST_PERSONAS[subdomain];
}

export function dashboardPathForPersona(_persona: PersonaKey) {
  return "/";
}
