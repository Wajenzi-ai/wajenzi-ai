"use client";

import { Activity, BadgeCheck, Boxes, CircleAlert, DatabaseZap, GitPullRequest } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";

const cards = [
  { icon: Boxes, label: "Canonical catalogue", value: "2,418 products", text: "Master product identities published to the marketplace." },
  { icon: GitPullRequest, label: "Match review queue", value: "18 pending", text: "Supplier submissions that require a governed decision." },
  { icon: BadgeCheck, label: "Verified suppliers", value: "86 active", text: "Suppliers with a current organization and facility record." },
  { icon: CircleAlert, label: "Data quality", value: "4 exceptions", text: "Records blocked from publication until their evidence is complete." },
  { icon: DatabaseZap, label: "Price observations", value: "12,680", text: "Latest commercial observations across all supplier facilities." },
  { icon: Activity, label: "Marketplace activity", value: "142 RFQs", text: "Requests issued in the last seven days." }
];

export default function AdminDashboard() {
  return <AuthGuard allowedRole="admin">{(profile) => <DashboardShell profile={profile} title="Master POS" subtitle="The governed operational view of Wajenzi. Resolve product identity, protect data quality and see marketplace activity at a glance."><section className="dashboard-grid">{cards.map((card) => <article className="dashboard-card" key={card.label}><card.icon size={22} /><span>{card.label}</span><strong>{card.value}</strong><p>{card.text}</p></article>)}</section></DashboardShell>}</AuthGuard>;
}
