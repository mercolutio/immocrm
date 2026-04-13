"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const NAV = [
  { href: "/settings/pipeline", label: "Pipeline" },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardLayout>
      <div style={{ padding: "26px 30px" }}>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 400, color: "var(--t1)", margin: 0 }}>
          Einstellungen
        </h1>

        {/* Sub-Navigation */}
        <div style={{ display: "flex", gap: 0, marginTop: 18, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: active ? "var(--accent)" : "var(--t3)",
                  textDecoration: "none",
                  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -1,
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {n.label}
              </Link>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ marginTop: 24 }}>
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
}
