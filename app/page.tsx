import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-xl">
      <div className="mb-10">
        <h1
          className="font-semibold mb-2"
          style={{
            fontSize: "22px",
            color: "var(--foreground)",
            letterSpacing: "-0.02em",
          }}
        >
          Workflow Automation
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          AI-powered scheduling workflows
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* View Saved Workflows */}
        <Link href="/workflows" style={{ textDecoration: "none" }}>
          <div
            className="hover-card flex items-center justify-between rounded-xl px-5 py-4 border transition-all duration-150 cursor-pointer"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--border-subtle)", color: "var(--muted)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  View Saved Workflows
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  Browse and run your existing workflows
                </div>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--border)", flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        {/* Build a Workflow */}
        <Link href="/workflows/build" style={{ textDecoration: "none" }}>
          <div
            className="hover-card flex items-center justify-between rounded-xl px-5 py-4 border transition-all duration-150 cursor-pointer"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--border-subtle)", color: "var(--muted)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Build a Workflow
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  Create a new automation from scratch
                </div>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--border)", flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        {/* Divider */}
        <div className="my-1" style={{ borderTop: "1px solid var(--border)" }} />

        {/* Executions */}
        <Link href="/executions" style={{ textDecoration: "none" }}>
          <div
            className="hover-card flex items-center justify-between rounded-xl px-5 py-4 border transition-all duration-150 cursor-pointer"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--border-subtle)", color: "var(--muted)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Executions
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  View the history and status of workflow runs
                </div>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--border)", flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        {/* Calendar */}
        <Link href="/calendar" style={{ textDecoration: "none" }}>
          <div
            className="hover-card flex items-center justify-between rounded-xl px-5 py-4 border transition-all duration-150 cursor-pointer"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--border-subtle)", color: "var(--muted)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Calendar
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  Browse events and trigger cancellation workflows
                </div>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--border)", flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
