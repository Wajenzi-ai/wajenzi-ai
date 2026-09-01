"use client";

import { ClipboardList, FileText, PackageCheck, Quote, Truck } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";

const cards = [
  {
    icon: ClipboardList,
    title: "Projects",
    value: "3 active",
    text: "Track site requirements, budgets and procurement readiness by project."
  },
  {
    icon: FileText,
    title: "RFQs",
    value: "8 open",
    text: "Create material requests and send them to qualified suppliers."
  },
  {
    icon: Quote,
    title: "Quotations",
    value: "21 received",
    text: "Compare verified commercial offers before approving purchase orders."
  }
];

export default function ContractorDashboard() {
  return (
    <AuthGuard allowedRole="contractor">
      {(profile) => (
        <DashboardShell
          profile={profile}
          title="Your site, in sync."
          subtitle="Kileleshwa Residences is in procurement. Compare verified offers and keep every delivery moving."
        >
          <section className="dashboard-grid">
            {cards.map((card) => (
              <article className="dashboard-card" key={card.title}>
                <card.icon size={22} />
                <span>{card.title}</span>
                <strong>{card.value}</strong>
                <p>{card.text}</p>
              </article>
            ))}
          </section>
          <section className="dashboard-grid two" style={{ marginTop: "1rem" }}>
            <article className="dashboard-card"><Truck size={22} /><span>Next delivery</span><strong>Today · 14:00</strong><p>120 bags of cement are scheduled for Kileleshwa site. Gate pass ready.</p></article>
            <article className="dashboard-card"><PackageCheck size={22} /><span>Sourcing shortlist</span><strong>12 products</strong><p>Three items have a lower verified offer. Review before sending your next RFQ.</p></article>
          </section>
        </DashboardShell>
      )}
    </AuthGuard>
  );
}
