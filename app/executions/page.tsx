export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TriggerBadge } from "@/components/TriggerBadge";
import { EmptyState } from "@/components/EmptyState";
import { getExecutions } from "@/lib/db/executions";

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export default async function ExecutionsPage() {
  let executions: Awaited<ReturnType<typeof getExecutions>> = [];
  let error: string | null = null;

  try {
    executions = await getExecutions();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load executions";
  }

  return (
    <div>
      <PageHeader
        title="Executions"
        description="Every workflow run is recorded here. Click any row to inspect its step-by-step detail."
      />

      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            background: "var(--error-subtle)",
            border: "1px solid #fecaca",
            color: "var(--error)",
          }}
        >
          {error}
        </div>
      )}

      {!error && executions.length === 0 && (
        <EmptyState message="No executions yet. Run the Meeting Request Processor from the Workflows page to see results here." />
      )}

      <div className="space-y-1.5">
        {executions.map((ex) => (
          <Link
            key={ex.id}
            href={`/executions/${ex.id}`}
            className="hover-card flex items-center gap-4 rounded-xl px-4 py-3 border transition-all duration-150"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              textDecoration: "none",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="font-medium text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  {ex.workflowName}
                </span>
                <StatusBadge status={ex.status} />
                <TriggerBadge triggerType={ex.triggerType} />
              </div>
              <div
                className="flex items-center gap-3 text-xs"
                style={{ color: "var(--muted)" }}
              >
                <span>Started: {formatDate(ex.startedAt)}</span>
                {ex.completedAt && (
                  <span>Completed: {formatDate(ex.completedAt)}</span>
                )}
                {ex.errorMessage && (
                  <span
                    className="truncate max-w-xs"
                    style={{ color: "var(--error)" }}
                  >
                    {ex.errorMessage}
                  </span>
                )}
              </div>
            </div>
            <span
              className="text-xs font-mono shrink-0 truncate max-w-32"
              style={{ color: "var(--border)" }}
            >
              {ex.id.slice(0, 12)}…
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
