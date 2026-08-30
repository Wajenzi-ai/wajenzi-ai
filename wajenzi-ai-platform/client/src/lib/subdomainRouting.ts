import type { DashboardKey } from "@/lib/wajenzi";

export type WajenziEnvironment = "public" | "universal" | "role" | "admin" | "control" | "unknown";

type HostnameDefinition = {
  subdomain: string;
  dashboard: DashboardKey;
  label: string;
};

export const WAJENZI_ROOT_DOMAIN = "wajenzi.ai";

export const hostnameDefinitions: Record<string, HostnameDefinition> = {
  client: { subdomain: "client", dashboard: "homeowner", label: "Client workspace" },
  contractor: { subdomain: "contractor", dashboard: "contractor", label: "Contractor workspace" },
  architect: { subdomain: "architect", dashboard: "architect", label: "Architect workspace" },
  engineer: { subdomain: "engineer", dashboard: "engineer", label: "Engineer workspace" },
  qs: { subdomain: "qs", dashboard: "quantity-surveyor", label: "Quantity surveyor workspace" },
  supplier: { subdomain: "supplier", dashboard: "supplier", label: "Supplier workspace" },
  manufacturer: { subdomain: "manufacturer", dashboard: "manufacturer", label: "Manufacturer workspace" },
  logistics: { subdomain: "logistics", dashboard: "logistics", label: "Logistics workspace" },
  finance: { subdomain: "finance", dashboard: "financier", label: "Financier workspace" },
  pm: { subdomain: "pm", dashboard: "project-manager", label: "Project manager workspace" },
  site: { subdomain: "site", dashboard: "contractor", label: "Site manager workspace" },
  developer: { subdomain: "developer", dashboard: "developer", label: "Developer workspace" },
  consultant: { subdomain: "consultant", dashboard: "custom-role", label: "Consultant workspace" },
  admin: { subdomain: "admin", dashboard: "admin", label: "Administrator workspace" },
  control: { subdomain: "control", dashboard: "operations", label: "Control centre" },
};

export const workspaceDefinitions = Object.values(hostnameDefinitions);

export function normalizeHostname(hostname: string): string {
  const value = hostname.trim().toLowerCase();
  const withoutProtocol = value.replace(/^[a-z][a-z\d+.-]*:\/\//, "");
  return withoutProtocol.split(/[/?#]/, 1)[0].split(":", 1)[0].replace(/^www\./, "");
}

export function getEnvironmentForHostname(hostname: string): WajenziEnvironment {
  const normalized = normalizeHostname(hostname);
  if (normalized === WAJENZI_ROOT_DOMAIN || normalized === "localhost" || normalized.startsWith("127.")) return "public";
  if (normalized === `app.${WAJENZI_ROOT_DOMAIN}`) return "universal";
  if (normalized === `admin.${WAJENZI_ROOT_DOMAIN}`) return "admin";
  if (normalized === `control.${WAJENZI_ROOT_DOMAIN}`) return "control";
  if (normalized.endsWith(`.${WAJENZI_ROOT_DOMAIN}`) && normalized.split(".").length === 3) return "role";
  return "unknown";
}

export function getDashboardKeyForHostname(hostname: string): DashboardKey | null {
  const normalized = normalizeHostname(hostname);
  const subdomain = normalized.endsWith(`.${WAJENZI_ROOT_DOMAIN}`) ? normalized.slice(0, -(`.${WAJENZI_ROOT_DOMAIN}`).length) : "";
  return hostnameDefinitions[subdomain]?.dashboard ?? null;
}

export function getSubdomainForDashboard(dashboard: DashboardKey): string | null {
  return Object.values(hostnameDefinitions).find((definition) => definition.dashboard === dashboard)?.subdomain ?? null;
}

export function getDashboardPath(dashboard: DashboardKey): string {
  return `/app/${dashboard}`;
}

export function getWorkspaceUrl(dashboard: DashboardKey, currentHostname = typeof window === "undefined" ? "" : window.location.hostname): string {
  const subdomain = getSubdomainForDashboard(dashboard);
  const normalized = normalizeHostname(currentHostname);
  if (!subdomain || !normalized.endsWith(`.${WAJENZI_ROOT_DOMAIN}`)) return getDashboardPath(dashboard);
  const protocol = typeof window === "undefined" ? "https:" : window.location.protocol;
  return `${protocol}//${subdomain}.${WAJENZI_ROOT_DOMAIN}${getDashboardPath(dashboard)}`;
}
