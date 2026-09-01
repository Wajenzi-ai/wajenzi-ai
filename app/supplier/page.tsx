"use client";

import { BarChart3, Inbox, PackagePlus, Send } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";

export default function SupplierDashboard() {
  return (
    <AuthGuard allowedRole="supplier">
      {(profile) => (
        <DashboardShell
          profile={profile}
          title="Supplier POS"
          subtitle="Run your commercial catalogue, respond to verified project demand and fulfil orders from one place."
        >
          <section className="dashboard-grid two">
            <article className="dashboard-card">
              <Inbox size={22} />
              <span>Incoming RFQs</span>
              <strong>14 new</strong>
              <p>Verified project requests are waiting for your pricing and delivery terms.</p>
            </article>
            <article className="dashboard-card">
              <Send size={22} />
              <span>Submit quotation</span>
              <strong>3 drafts</strong>
              <p>Quote with live stock, delivery windows and commercial terms.</p>
            </article>
            <article className="dashboard-card"><PackagePlus size={22} /><span>Catalogue health</span><strong>98% matched</strong><p>Four supplier SKUs need a canonical-product review before publishing.</p></article>
            <article className="dashboard-card"><BarChart3 size={22} /><span>This month</span><strong>KSh 1.28M</strong><p>Marketplace order value, up 18% on the prior 30 days.</p></article>
          </section>
        </DashboardShell>
      )}
    </AuthGuard>
  );
}
