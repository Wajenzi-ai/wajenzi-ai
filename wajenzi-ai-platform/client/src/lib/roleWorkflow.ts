import type { DashboardKey } from "@/lib/wajenzi";

export type RoleWorkType = "project" | "boq" | "procurement" | "document" | "approval" | "delivery" | "finance" | "registry" | "task";

export function workflowReference(workspace: DashboardKey, title: string) {
  return `${workspace}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

export function requiresWorkflowConfirmation(workspace: DashboardKey, title: string) {
  return workspace === "financier" || /approve|approval|issue|settlement|funding|valuation|risk|publish/i.test(title);
}

export function roleWorkType(workspace: DashboardKey, title: string): RoleWorkType {
  if (/approv/i.test(title)) return "approval";
  if (/delivery|dispatch|handoff/i.test(title)) return "delivery";
  if (/boq|cost plan|valuation|variation/i.test(title)) return "boq";
  if (/procurement|product|availability|supplier/i.test(title)) return workspace === "manufacturer" ? "registry" : "procurement";
  if (/drawing|specification|document|rfi|inspection|test/i.test(title)) return "document";
  if (/funding|settlement|risk/i.test(title)) return "finance";
  if (/canonical|registry/i.test(title)) return "registry";
  if (/milestone|site issue|portfolio|programme|project/i.test(title)) return "project";
  return "task";
}
