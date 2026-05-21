"use client";

import { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Brand } from "@/components/Brand";
import { signOut } from "@/lib/auth";
import { Profile } from "@/types/profile";

type DashboardShellProps = {
  profile: Profile;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function DashboardShell({ profile, title, subtitle, children }: DashboardShellProps) {
  return (
    <main className="dashboard-page">
      <header className="topbar">
        <Brand />
        <div className="account-menu">
          <div>
            <strong>{profile.full_name}</strong>
            <span>{profile.company_name}</span>
          </div>
          <button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="dashboard-hero">
        <p className="eyebrow">{profile.role}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>

      {children}
    </main>
  );
}
