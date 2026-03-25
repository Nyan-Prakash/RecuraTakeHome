export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TriggerBadge } from "@/components/TriggerBadge";
import { RunWorkflowCard } from "@/components/RunWorkflowCard";
import { getWorkflowById } from "@/lib/db/workflows";
import type { WorkflowDefinition } from "@/lib/workflow-engine/types";

// Human-readable action type labels
const ACTION_LABELS: Record<string, string> = {
  summarize_email: "Summarize Email",
  extract_availability: "Extract Availability",
  find_open_slot: "Find Open Slot",
  research_attendees: "Research Attendees",
  research_company: "Research Company",
  generate_pre_meeting_notes: "Generate Pre-Meeting Notes",
  create_calendar_event: "Create Calendar Event",
  generate_confirmation_email: "Generate Confirmation Email",
  load_cancelled_event: "Load Cancelled Event",
  find_fallback_slots: "Find Fallback Slots",
  generate_reschedule_email: "Generate Reschedule Email",
};

type Props = { params: Promise<{ id: string }> };

export default async function WorkflowDetailPage({ params }: Props) {
  const { id } = await params;
  const workflow: WorkflowDefinition | null = await getWorkflowById(id);

  if (!workflow) {
    notFound();
  }

  const enabledActions = workflow.actions.filter((a) => a.isEnabled);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/workflows" className="text-sm text-gray-400 hover:text-gray-600">
          ← Workflows
        </Link>
      </div>

      <PageHeader title={workflow.name} description={workflow.description} />

      <div className="flex items-center gap-2 mb-8">
        <TriggerBadge triggerType={workflow.triggerType} />
        <StatusBadge status={workflow.isActive ? "active" : "inactive"} />
        <span className="text-sm text-gray-400">{workflow.actions.length} total actions</span>
      </div>

      {/* Actions */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Execution Steps</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Steps run sequentially. Disabled steps are skipped.
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {workflow.actions.map((action) => {
            const label = ACTION_LABELS[action.type] ?? action.type;
            return (
              <div
                key={action.id}
                className={`flex items-start gap-4 px-5 py-3.5 ${!action.isEnabled ? "opacity-40" : ""}`}
              >
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-mono text-gray-500">{action.order}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${action.isEnabled ? "text-gray-900" : "text-gray-400"}`}>
                      {label}
                    </span>
                    {action.isOptional && (
                      <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                        optional
                      </span>
                    )}
                    {!action.isEnabled && (
                      <span className="text-xs text-gray-400">disabled</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{action.type}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-400">
            {enabledActions.length} of {workflow.actions.length} steps enabled
          </p>
        </div>
      </div>

      {/* Run section */}
      {workflow.triggerType === "meeting_request_received" ? (
        <RunWorkflowCard workflowId={workflow.id} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Manual Execution</h3>
          <p className="text-sm text-gray-500">
            This workflow is triggered from the{" "}
            <Link href="/calendar" className="text-indigo-600 hover:text-indigo-800">
              Calendar page
            </Link>{" "}
            when an event is cancelled.
          </p>
        </div>
      )}
    </div>
  );
}
