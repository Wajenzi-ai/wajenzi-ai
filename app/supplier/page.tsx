"use client";

import { Inbox, Send } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";

export default function SupplierDashboard() {
  return (
    <AuthGuard allowedRole="supplier">
      {(profile) => (
        <DashboardShell
          profile={profile}
          title="Supplier Dashboard"
          subtitle="Review incoming RFQs and prepare quotations for contractors."
        >
          <section className="dashboard-grid two">
            <article className="dashboard-card">
              <Inbox size={22} />
              <span>Incoming RFQs</span>
              <strong>14 new</strong>
              <p>Placeholder queue for material requests from verified contractor projects.</p>
            </article>
            <article className="dashboard-card">
              <Send size={22} />
              <span>Submit quotation</span>
              <strong>Draft UI</strong>
              <p>Placeholder quotation builder for pricing, stock status, and delivery terms.</p>
            </article>
          </section>
        </DashboardShell>
      )}
    </AuthGuard>
  );
}
