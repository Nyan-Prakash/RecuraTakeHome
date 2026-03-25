export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TriggerBadge } from "@/components/TriggerBadge";
import { EmptyState } from "@/components/EmptyState";
import { getAllWorkflows } from "@/lib/db/workflows";
import type { WorkflowDefinition } from "@/lib/workflow-engine/types";

export default async function WorkflowsPage() {
  let workflows: WorkflowDefinition[] = [];
  let error: string | null = null;

  try {
    workflows = await getAllWorkflows();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load workflows";
  }

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Automation workflows and their trigger configurations."
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && workflows.length === 0 && (
        <EmptyState message="No workflows found. Run the seed script to initialize workflows." />
      )}

      <div className="space-y-4">
        {workflows.map((wf) => (
          <Link
            key={wf.id}
            href={`/workflows/${wf.id}`}
            className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-400 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-gray-900">{wf.name}</h2>
                  <StatusBadge status={wf.isActive ? "active" : "inactive"} />
                </div>
                <p className="text-sm text-gray-500 mb-3">{wf.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <TriggerBadge triggerType={wf.triggerType} />
                  <span>{wf.actions.length} action{wf.actions.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <span className="text-sm text-gray-400 shrink-0">View →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
