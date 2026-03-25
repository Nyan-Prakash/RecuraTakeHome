"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/workflows", label: "Workflows" },
  { href: "/executions", label: "Executions" },
  { href: "/calendar", label: "Calendar" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center h-11 gap-6">
          <Link
            href="/"
            className="shrink-0"
            style={{ textDecoration: "none" }}
          >
            <span
              className="font-semibold text-sm"
              style={{ color: "var(--foreground)", letterSpacing: "-0.01em" }}
            >
              Workaholic+
            </span>
          </Link>

          <div className="w-px h-4 shrink-0" style={{ background: "var(--border)" }} />

          <nav className="flex items-center gap-0.5">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 nav-link"
                  style={{
                    color: isActive ? "var(--foreground)" : "var(--muted)",
                    background: isActive ? "var(--border-subtle)" : "transparent",
                    textDecoration: "none",
                  }}
                  data-active={isActive ? "true" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
