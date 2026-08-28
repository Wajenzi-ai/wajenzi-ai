import type { LucideIcon } from "lucide-react";
import {
  Banknote, Bot, Building2, ChartNoAxesCombined, ClipboardCheck,
  Factory, Handshake, House, Landmark, LayoutDashboard, MapPinned,
  PencilRuler, ShieldCheck, Store, Truck, UserCog, UsersRound,
} from "lucide-react";

export type DashboardKey =
  | "homeowner" | "contractor" | "developer" | "architect" | "engineer" | "quantity-surveyor" | "project-manager"
  | "supplier" | "manufacturer" | "logistics" | "financier" | "institutional" | "custom-role" | "agent" | "projects" | "escrow"
  | "finance" | "insights" | "admin" | "operations" | "onboarding";

export type NavigationGroup = "Role workspaces" | "Coordination" | "Platform";

export type NavigationItem = {
  key: DashboardKey;
  label: string;
  role: string;
  icon: LucideIcon;
  path: string;
  group: NavigationGroup;
};

export const dashboardNavigation: NavigationItem[] = [
  { key: "homeowner", label: "Client / homeowner", role: "Project owner", icon: House, path: "/app/homeowner", group: "Role workspaces" },
  { key: "contractor", label: "Contractor", role: "Site & procurement", icon: Building2, path: "/app/contractor", group: "Role workspaces" },
  { key: "developer", label: "Developer", role: "Portfolio owner", icon: Landmark, path: "/app/developer", group: "Role workspaces" },
  { key: "architect", label: "Architect", role: "Design & drawings", icon: PencilRuler, path: "/app/architect", group: "Role workspaces" },
  { key: "engineer", label: "Engineer", role: "Engineering assurance", icon: ClipboardCheck, path: "/app/engineer", group: "Role workspaces" },
  { key: "quantity-surveyor", label: "Quantity surveyor", role: "BOQ & cost plan", icon: Banknote, path: "/app/quantity-surveyor", group: "Role workspaces" },
  { key: "project-manager", label: "Project manager", role: "Delivery controls", icon: UsersRound, path: "/app/project-manager", group: "Role workspaces" },
  { key: "supplier", label: "Supplier", role: "Catalog & orders", icon: Store, path: "/app/supplier", group: "Role workspaces" },
  { key: "manufacturer", label: "Manufacturer", role: "Product & channel", icon: Factory, path: "/app/manufacturer", group: "Role workspaces" },
  { key: "logistics", label: "Logistics provider", role: "Dispatch & delivery", icon: Truck, path: "/app/logistics", group: "Role workspaces" },
  { key: "financier", label: "Financier", role: "Funding & settlement", icon: Handshake, path: "/app/financier", group: "Role workspaces" },
  { key: "institutional", label: "Institutional client", role: "Governance & approvals", icon: ShieldCheck, path: "/app/institutional", group: "Role workspaces" },
  { key: "custom-role", label: "Custom organization role", role: "Configured permissions", icon: UsersRound, path: "/app/custom-role", group: "Role workspaces" },
  { key: "agent", label: "AI procurement", role: "Construction intelligence", icon: Bot, path: "/app/agent", group: "Coordination" },
  { key: "projects", label: "Project intelligence", role: "Cost & milestones", icon: ClipboardCheck, path: "/app/projects", group: "Coordination" },
  { key: "escrow", label: "Escrow & payments", role: "Trust & settlement", icon: Banknote, path: "/app/escrow", group: "Coordination" },
  { key: "finance", label: "Finance & risk", role: "Controls & exposure", icon: ShieldCheck, path: "/app/finance", group: "Coordination" },
  { key: "insights", label: "Marketplace intelligence", role: "Demand & supply", icon: ChartNoAxesCombined, path: "/app/insights", group: "Platform" },
  { key: "admin", label: "Wajenzi administrator", role: "Governance", icon: UserCog, path: "/app/admin", group: "Platform" },
  { key: "operations", label: "Wajenzi operations", role: "Platform operations", icon: LayoutDashboard, path: "/app/operations", group: "Platform" },
  { key: "onboarding", label: "Supplier onboarding", role: "Verification", icon: MapPinned, path: "/app/onboarding", group: "Platform" },
];

export const dashboardByKey = Object.fromEntries(dashboardNavigation.map((item) => [item.key, item])) as Record<DashboardKey, NavigationItem>;

export const formatKES = (value: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
export const formatNumber = (value: number) => new Intl.NumberFormat("en-KE").format(value);
