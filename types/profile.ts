export type UserRole =
  | "owner" | "developer" | "contractor" | "architect" | "engineer" | "quantity_surveyor"
  | "project_manager" | "site_manager" | "subcontractor" | "supplier" | "manufacturer"
  | "distributor" | "logistics" | "finance" | "admin";

export type Profile = { id: string; full_name: string; email: string; company_name: string; role: UserRole | null };

export const roleRoutes: Record<UserRole, string> = {
  owner: "/workspace", developer: "/workspace", contractor: "/contractor", architect: "/workspace",
  engineer: "/workspace", quantity_surveyor: "/workspace", project_manager: "/workspace", site_manager: "/workspace",
  subcontractor: "/workspace", supplier: "/supplier", manufacturer: "/manufacturer", distributor: "/workspace",
  logistics: "/workspace", finance: "/workspace", admin: "/admin"
};

export const roles: Array<{ value: UserRole; label: string; description: string }> = [
  { value: "owner", label: "Property owner", description: "Start and oversee a construction project." },
  { value: "developer", label: "Developer", description: "Manage multiple projects, teams and capital." },
  { value: "contractor", label: "Contractor", description: "Manage projects, RFQs, procurement and deliveries." },
  { value: "architect", label: "Architect", description: "Coordinate drawings, specifications and design decisions." },
  { value: "engineer", label: "Engineer", description: "Manage technical documentation, reviews and inspections." },
  { value: "quantity_surveyor", label: "Quantity surveyor", description: "Control BOQs, costs, rates and valuations." },
  { value: "project_manager", label: "Project manager", description: "Manage schedules, risks, teams and delivery." },
  { value: "site_manager", label: "Site manager", description: "Run daily site activities, materials and inspections." },
  { value: "subcontractor", label: "Subcontractor", description: "Manage work packages and assigned procurement." },
  { value: "supplier", label: "Supplier / merchant", description: "Publish offers, manage inventory and respond to demand." },
  { value: "manufacturer", label: "Manufacturer", description: "Manage product availability, distribution and orders." },
  { value: "distributor", label: "Distributor", description: "Coordinate availability across your distribution network." },
  { value: "logistics", label: "Logistics provider", description: "Manage transport, deliveries and proof of delivery." },
  { value: "finance", label: "Finance partner", description: "Review project financing and transaction opportunities." },
  { value: "admin", label: "Wajenzi Super Admin", description: "Govern data, operations and the marketplace network." }
];
