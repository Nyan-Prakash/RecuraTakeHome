export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TriggerBadge } from "@/components/TriggerBadge";
import { RunWorkflowCard } from "@/components/RunWorkflowCard";
import { getWorkflowById } from "@/lib/db/workflows";
import type { WorkflowDefinition } from "@/lib/workflow-engine/types";

const ACTION_LABELS: Record<string, string> = {
  summarize_email: "Summarize Email",
  extract_availability: "Extract Availability",
  find_open_slot: "Find Open Slot",
  research_attendees: "Research Attendees",
  research_company: "Research Company",
  generate_pre_meeting_notes: "Generate Pre-Meeting Notes",
  create_calendar_event: "Create Calendar Event",
  generate_confirmation_email: "Generate Confirmation Email",
  resolve_cancelled_event: "Resolve Cancelled Event",
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
        <Link
          href="/workflows"
          className="hover-link text-xs font-medium inline-flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Workflows
        </Link>
      </div>

      <PageHeader title={workflow.name} description={workflow.description} />

      <div className="flex items-center gap-2 mb-7">
        <TriggerBadge triggerType={workflow.triggerType} />
        <StatusBadge status={workflow.isActive ? "active" : "inactive"} />
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {workflow.actions.length} total actions
        </span>
      </div>

      {/* Actions */}
      <div
        className="rounded-xl mb-6 overflow-hidden border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="px-5 py-3.5 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <h2 className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
            Execution Steps
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Steps run sequentially. Disabled steps are skipped.
          </p>
        </div>
        <div>
          {workflow.actions.map((action, idx) => {
            const label = ACTION_LABELS[action.type] ?? action.type;
            return (
              <div
                key={action.id}
                className="flex items-start gap-4 px-5 py-3.5"
                style={{
                  opacity: action.isEnabled ? 1 : 0.4,
                  borderBottom:
                    idx < workflow.actions.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--border-subtle)" }}
                >
                  <span className="text-xs font-mono font-medium" style={{ color: "var(--muted)" }}>
                    {action.order}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: action.isEnabled ? "var(--foreground)" : "var(--muted)" }}
                    >
                      {label}
                    </span>
                    {action.isOptional && (
                      <span
                        className="text-xs rounded-full px-2 py-0.5 border"
                        style={{
                          color: "var(--muted)",
                          borderColor: "var(--border)",
                          background: "var(--border-subtle)",
                        }}
                      >
                        optional
                      </span>
                    )}
                    {!action.isEnabled && (
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono mt-0.5" style={{ color: "var(--muted)" }}>
                    {action.type}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div
          className="px-5 py-2.5 rounded-b-xl"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--border-subtle)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {enabledActions.length} of {workflow.actions.length} steps enabled
          </p>
        </div>
      </div>

      {/* Run section */}
      {(workflow.triggerType === "meeting_request_received" || workflow.triggerType === "meeting_reschedule_requested") && (
        <RunWorkflowCard workflowId={workflow.id} triggerType={workflow.triggerType} />
      )}
    </div>
  );
}
