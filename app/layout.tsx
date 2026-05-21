import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wajenzi.ai | Construction Procurement",
  description: "Role-based procurement workspaces for contractors, suppliers, and manufacturers."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
