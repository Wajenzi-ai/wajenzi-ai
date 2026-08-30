export const WAJENZI_PERMISSIONS = {
  organizationRead: "organization.read",
  organizationManage: "organization.manage",
  memberManage: "member.manage",
  projectRead: "project.read",
  projectManage: "project.manage",
  supplierRead: "supplier.read",
  supplierVerify: "supplier.verify",
  supplierCatalogManage: "supplier.catalog.manage",
  supplierPosManage: "supplier.pos.manage",
  documentsReview: "documents.review",
  procurementCreate: "procurement.create",
  procurementApprove: "procurement.approve",
  erpManage: "erp.manage",
  financeRead: "finance.read",
  financeApprove: "finance.approve",
  platformAdmin: "platform.admin",
  platformSuperAdmin: "platform.super_admin",
} as const;

export type WajenziPermission = (typeof WAJENZI_PERMISSIONS)[keyof typeof WAJENZI_PERMISSIONS];

export const ROLE_PERMISSION_PRESETS: Record<string, readonly WajenziPermission[]> = {
  homeowner: [WAJENZI_PERMISSIONS.organizationRead, WAJENZI_PERMISSIONS.projectRead, WAJENZI_PERMISSIONS.procurementCreate],
  contractor: [WAJENZI_PERMISSIONS.organizationRead, WAJENZI_PERMISSIONS.projectManage, WAJENZI_PERMISSIONS.procurementCreate, WAJENZI_PERMISSIONS.procurementApprove],
  supplier: [WAJENZI_PERMISSIONS.organizationRead, WAJENZI_PERMISSIONS.supplierRead, WAJENZI_PERMISSIONS.supplierCatalogManage, WAJENZI_PERMISSIONS.supplierPosManage, WAJENZI_PERMISSIONS.supplierVerify, WAJENZI_PERMISSIONS.erpManage],
  manufacturer: [WAJENZI_PERMISSIONS.organizationRead, WAJENZI_PERMISSIONS.supplierRead, WAJENZI_PERMISSIONS.supplierCatalogManage, WAJENZI_PERMISSIONS.supplierPosManage],
  financier: [WAJENZI_PERMISSIONS.organizationRead, WAJENZI_PERMISSIONS.financeRead, WAJENZI_PERMISSIONS.financeApprove],
  admin: [WAJENZI_PERMISSIONS.platformAdmin],
  super_admin: [WAJENZI_PERMISSIONS.platformAdmin, WAJENZI_PERMISSIONS.platformSuperAdmin],
};

export function roleHasPermission(role: string, permission: WajenziPermission): boolean {
  return ROLE_PERMISSION_PRESETS[role]?.includes(permission) ?? false;
}
