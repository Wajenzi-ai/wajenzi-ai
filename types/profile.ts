export type UserRole = "contractor" | "supplier" | "manufacturer";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  company_name: string;
  role: UserRole | null;
};

export const roleRoutes: Record<UserRole, string> = {
  contractor: "/contractor",
  supplier: "/supplier",
  manufacturer: "/manufacturer"
};

export const roles: Array<{
  value: UserRole;
  label: string;
  description: string;
}> = [
  {
    value: "contractor",
    label: "Contractor",
    description: "Manage projects, RFQs, and supplier quotations."
  },
  {
    value: "supplier",
    label: "Supplier",
    description: "Review RFQs and submit material quotations."
  },
  {
    value: "manufacturer",
    label: "Manufacturer",
    description: "Manage product availability and incoming orders."
  }
];
