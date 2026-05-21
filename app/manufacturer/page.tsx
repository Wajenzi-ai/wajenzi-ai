"use client";

import { Boxes, PackageCheck } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";

export default function ManufacturerDashboard() {
  return (
    <AuthGuard allowedRole="manufacturer">
      {(profile) => (
        <DashboardShell
          profile={profile}
          title="Manufacturer Dashboard"
          subtitle="Prepare product availability and monitor procurement orders."
        >
          <section className="dashboard-grid two">
            <article className="dashboard-card">
              <Boxes size={22} />
              <span>Products</span>
              <strong>Catalog draft</strong>
              <p>Placeholder area for SKUs, inventory status, and product specifications.</p>
            </article>
            <article className="dashboard-card">
              <PackageCheck size={22} />
              <span>Orders</span>
              <strong>6 pending</strong>
              <p>Placeholder area for purchase order status and fulfillment notes.</p>
            </article>
          </section>
        </DashboardShell>
      )}
    </AuthGuard>
  );
}
