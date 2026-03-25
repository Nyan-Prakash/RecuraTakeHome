export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TriggerBadge } from "@/components/TriggerBadge";
import { getAllWorkflows } from "@/lib/db/workflows";

export default async function WorkflowsPage() {
  const workflows = await getAllWorkflows();

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <PageHeader
          title="Saved Workflows"
          description="Browse and run your existing workflows."
        />
        <Link
          href="/workflows/build"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 mt-1"
          style={{ background: "var(--foreground)", color: "#ffffff", textDecoration: "none" }}
          onMouseEnter={undefined}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Build a Workflow
        </Link>
      </div>

      {workflows.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-12 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
            No saved workflows yet.
          </p>
          <Link
            href="/workflows/build"
            className="text-sm font-medium"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Build your first workflow →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((wf) => (
            <Link
              key={wf.id}
              href={`/workflows/${wf.id}`}
              className="hover-card flex items-center gap-3 rounded-xl px-4 py-3.5 border transition-all duration-150"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                textDecoration: "none",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--border-subtle)", color: "var(--muted)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                    {wf.name}
                  </span>
                  <TriggerBadge triggerType={wf.triggerType} />
                  <StatusBadge status={wf.isActive ? "active" : "inactive"} />
                </div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {wf.actions.length} action{wf.actions.length !== 1 ? "s" : ""}
                </p>
              </div>

              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: "var(--border)", flexShrink: 0 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
