import type { DashboardKey } from "@/lib/wajenzi";

export type WajenziEnvironment = "public" | "universal" | "role" | "admin" | "control" | "unknown";

type HostnameDefinition = {
  subdomain: string;
  dashboard: DashboardKey;
  label: string;
  access: HostnameAccess;
};

export type HostnameAccess = "authenticated" | "admin" | "client" | "contractor" | "supplier" | "manufacturer" | "logistics" | "finance";

export const WAJENZI_ROOT_DOMAIN = "wajenzi.ai";

/** The hostnames that should be added to one shared Vercel project. */
export const requestedSubdomains = ["app", "admin", "client", "contractor", "supplier", "manufacturer", "logistics", "finance"] as const;

export const hostnameDefinitions: Record<string, HostnameDefinition> = {
  client: { subdomain: "client", dashboard: "homeowner", label: "Client workspace", access: "client" },
  contractor: { subdomain: "contractor", dashboard: "contractor", label: "Contractor workspace", access: "contractor" },
  architect: { subdomain: "architect", dashboard: "architect", label: "Architect workspace", access: "authenticated" },
  engineer: { subdomain: "engineer", dashboard: "engineer", label: "Engineer workspace", access: "authenticated" },
  qs: { subdomain: "qs", dashboard: "quantity-surveyor", label: "Quantity surveyor workspace", access: "authenticated" },
  supplier: { subdomain: "supplier", dashboard: "supplier", label: "Supplier workspace", access: "supplier" },
  manufacturer: { subdomain: "manufacturer", dashboard: "manufacturer", label: "Manufacturer workspace", access: "manufacturer" },
  logistics: { subdomain: "logistics", dashboard: "logistics", label: "Logistics workspace", access: "logistics" },
  finance: { subdomain: "finance", dashboard: "financier", label: "Financier workspace", access: "finance" },
  pm: { subdomain: "pm", dashboard: "project-manager", label: "Project manager workspace", access: "authenticated" },
  site: { subdomain: "site", dashboard: "contractor", label: "Site manager workspace", access: "contractor" },
  developer: { subdomain: "developer", dashboard: "developer", label: "Developer workspace", access: "authenticated" },
  consultant: { subdomain: "consultant", dashboard: "custom-role", label: "Consultant workspace", access: "authenticated" },
  admin: { subdomain: "admin", dashboard: "admin", label: "Administrator workspace", access: "admin" },
  control: { subdomain: "control", dashboard: "operations", label: "Control centre", access: "admin" },
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

export function getHostnameDefinition(hostname: string): HostnameDefinition | null {
  const normalized = normalizeHostname(hostname);
  const subdomain = normalized.endsWith(`.${WAJENZI_ROOT_DOMAIN}`) ? normalized.slice(0, -(`.${WAJENZI_ROOT_DOMAIN}`).length) : "";
  return hostnameDefinitions[subdomain] ?? null;
}

export function getDashboardKeyForHostname(hostname: string): DashboardKey | null {
  return getHostnameDefinition(hostname)?.dashboard ?? null;
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

type AccessInput = { userRole: "user" | "admin"; workspaceRoles: string[]; projectRoles: string[] };

const accessRoles: Record<Exclude<HostnameAccess, "authenticated" | "admin">, { workspace: string[]; project: string[] }> = {
  client: { workspace: ["owner", "buyer"], project: ["project_owner", "buyer"] },
  contractor: { workspace: ["owner", "project_manager"], project: ["project_owner", "project_manager", "contractor"] },
  supplier: { workspace: ["owner", "supplier_admin"], project: ["project_owner", "supplier_viewer"] },
  manufacturer: { workspace: ["owner", "supplier_admin"], project: ["project_owner", "supplier_viewer"] },
  logistics: { workspace: ["owner", "dispatcher"], project: ["project_owner", "logistics_coordinator"] },
  finance: { workspace: ["owner", "finance_operator"], project: ["project_owner", "finance_reviewer"] },
};

export function hasHostnameWorkspaceAccess(access: HostnameAccess, input: AccessInput): boolean {
  if (access === "authenticated") return true;
  if (access === "admin") return input.userRole === "admin" || input.workspaceRoles.includes("platform_admin");
  const requirement = accessRoles[access];
  return requirement.workspace.some((role) => input.workspaceRoles.includes(role)) || requirement.project.some((role) => input.projectRoles.includes(role));
}
