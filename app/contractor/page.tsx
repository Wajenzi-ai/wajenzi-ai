"use client";

import { ClipboardList, FileText, Quote } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";

const cards = [
  {
    icon: ClipboardList,
    title: "Projects",
    value: "3 active",
    text: "Placeholder area for project procurement lists and site requirements."
  },
  {
    icon: FileText,
    title: "RFQs",
    value: "8 open",
    text: "Placeholder area for creating and tracking material requests."
  },
  {
    icon: Quote,
    title: "Quotations",
    value: "21 received",
    text: "Placeholder area for comparing supplier responses."
  }
];

export default function ContractorDashboard() {
  return (
    <AuthGuard allowedRole="contractor">
      {(profile) => (
        <DashboardShell
          profile={profile}
          title="Contractor Dashboard"
          subtitle="Manage construction projects, RFQs, and supplier quotations from one place."
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
        </DashboardShell>
      )}
    </AuthGuard>
  );
}
