import { ReactNode } from "react";
import { Brand } from "@/components/Brand";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Brand />
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
