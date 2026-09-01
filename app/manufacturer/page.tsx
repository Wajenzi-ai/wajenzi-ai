"use client";

import { Boxes, Factory, PackageCheck, TrendingUp } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";

export default function ManufacturerDashboard() {
  return (
    <AuthGuard allowedRole="manufacturer">
      {(profile) => (
        <DashboardShell
          profile={profile}
          title="Manufacturer hub"
          subtitle="Keep product availability trusted across the marketplace and monitor the demand flowing to your distribution network."
        >
          <section className="dashboard-grid two">
            <article className="dashboard-card">
              <Boxes size={22} />
              <span>Products</span>
              <strong>248 live SKUs</strong>
              <p>Product identity, pack sizes and technical specifications are current.</p>
            </article>
            <article className="dashboard-card">
              <PackageCheck size={22} />
              <span>Orders</span>
              <strong>6 pending</strong>
              <p>Purchase orders awaiting allocation to your distribution network.</p>
            </article>
            <article className="dashboard-card"><Factory size={22} /><span>Availability signal</span><strong>96% healthy</strong><p>Two products are approaching stock thresholds at Nairobi facilities.</p></article>
            <article className="dashboard-card"><TrendingUp size={22} /><span>Demand trend</span><strong>+24%</strong><p>Demand for cement and coatings versus last month.</p></article>
          </section>
        </DashboardShell>
      )}
    </AuthGuard>
  );
}
