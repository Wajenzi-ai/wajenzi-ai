export type UserRole = "contractor" | "supplier" | "manufacturer" | "admin";

export type Profile = { id: string; full_name: string; email: string; company_name: string; role: UserRole | null };

export const roleRoutes: Record<UserRole, string> = { contractor: "/contractor", supplier: "/supplier", manufacturer: "/manufacturer", admin: "/admin" };

export const roles: Array<{ value: UserRole; label: string; description: string }> = [
  { value: "contractor", label: "Contractor", description: "Manage projects, RFQs, procurement and deliveries." },
  { value: "supplier", label: "Supplier POS", description: "Publish offers, manage inventory and respond to buyer demand." },
  { value: "manufacturer", label: "Manufacturer", description: "Manage product availability, distribution and orders." },
  { value: "admin", label: "Wajenzi Admin", description: "Govern the canonical catalogue and marketplace operations." }
];
