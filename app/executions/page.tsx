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
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && executions.length === 0 && (
        <EmptyState message="No executions yet. Run the Meeting Request Processor from the Workflows page to see results here." />
      )}

      <div className="space-y-2">
        {executions.map((ex) => (
          <Link
            key={ex.id}
            href={`/executions/${ex.id}`}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg px-5 py-3.5 hover:border-gray-400 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-sm text-gray-900">{ex.workflowName}</span>
                <StatusBadge status={ex.status} />
                <TriggerBadge triggerType={ex.triggerType} />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>Started: {formatDate(ex.startedAt)}</span>
                {ex.completedAt && <span>Completed: {formatDate(ex.completedAt)}</span>}
                {ex.errorMessage && (
                  <span className="text-red-500 truncate max-w-xs">{ex.errorMessage}</span>
                )}
              </div>
            </div>
            <span className="text-xs font-mono text-gray-300 shrink-0 truncate max-w-32">{ex.id.slice(0, 12)}…</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
