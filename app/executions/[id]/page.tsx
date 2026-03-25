export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TriggerBadge } from "@/components/TriggerBadge";
import { JsonBlock } from "@/components/JsonBlock";
import { EmptyState } from "@/components/EmptyState";
import { getExecutionById } from "@/lib/db/executions";

type ExecutionRow = NonNullable<Awaited<ReturnType<typeof getExecutionById>>>;
type StepRow = ExecutionRow["steps"][number];

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(d));
}

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

function StepCard({ step }: { step: StepRow }) {
  const label = ACTION_LABELS[step.actionType] ?? step.actionType;
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "var(--border-subtle)", borderColor: "var(--border-subtle)" }}
      >
        <StatusBadge status={step.status} />
        <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
          {label}
        </span>
        <span className="text-xs font-mono ml-auto" style={{ color: "var(--muted)" }}>
          {step.actionType}
        </span>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-4" style={{ background: "var(--surface)" }}>
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Input</p>
          <JsonBlock value={step.input} />
        </div>
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Output</p>
          <JsonBlock value={step.output} />
        </div>
      </div>
      {step.errorMessage && (
        <div className="px-4 pb-3" style={{ background: "var(--surface)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--error)" }}>Error</p>
          <p
            className="text-xs rounded-lg p-2.5"
            style={{ color: "var(--error)", background: "var(--error-subtle)", border: "1px solid #fecaca" }}
          >
            {step.errorMessage}
          </p>
        </div>
      )}
      <div
        className="px-4 py-2.5 flex gap-4 text-xs border-t"
        style={{ color: "var(--muted)", borderColor: "var(--border-subtle)", background: "var(--surface)" }}
      >
        <span>Started: {formatDate(step.startedAt)}</span>
        <span>Completed: {formatDate(step.completedAt)}</span>
      </div>
    </div>
  );
}

type Props = { params: Promise<{ id: string }> };

export default async function ExecutionDetailPage({ params }: Props) {
  const { id } = await params;
  const execution = await getExecutionById(id);

  if (!execution) {
    notFound();
  }

  const context = (() => {
    const ctx: Record<string, unknown> = {};
    for (const step of execution.steps) {
      if (step.output && typeof step.output === "object") {
        Object.assign(ctx, step.output);
      }
    }
    return ctx;
  })();

  const selectedSlot = context["selectedSlot"];
  const createdEvent = context["createdEvent"];
  const replyDraft = context["replyDraft"];
  const attendeeResearch = context["attendeeResearch"];
  const companyResearch = context["companyResearch"];
  const preMeetingNotes = context["preMeetingNotes"];
  const fallbackSlots = context["fallbackSlots"];

  const hasArtifacts = Boolean(
    selectedSlot || createdEvent || replyDraft ||
    attendeeResearch || companyResearch || preMeetingNotes || fallbackSlots
  );

  const sectionStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
  } as React.CSSProperties;

  const artifactLabelStyle = {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--muted)",
    marginBottom: "6px",
  } as React.CSSProperties;

  const artifactBlockStyle = {
    background: "#f9f9f7",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "12px",
    color: "#374151",
  } as React.CSSProperties;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/executions" className="hover-link text-xs font-medium inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Executions
        </Link>
      </div>

      <PageHeader title="Execution Detail" description="Step-by-step record of a single workflow run." />

      {/* Summary */}
      <div style={sectionStyle}>
        <div className="flex items-center gap-2 mb-4">
          <StatusBadge status={execution.status} />
          <TriggerBadge triggerType={execution.triggerType} />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>Workflow</dt>
            <dd className="font-medium">
              <Link href={`/workflows/${execution.workflowId}`} className="hover-link" style={{ color: "var(--foreground)" }}>
                {execution.workflow.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>Execution ID</dt>
            <dd className="font-mono text-xs" style={{ color: "var(--foreground)" }}>{execution.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>Started</dt>
            <dd style={{ color: "var(--foreground)" }}>{formatDate(execution.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>Completed</dt>
            <dd style={{ color: "var(--foreground)" }}>{formatDate(execution.completedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>Steps</dt>
            <dd style={{ color: "var(--foreground)" }}>{execution.steps.length} steps</dd>
          </div>
          {execution.errorMessage && (
            <div className="col-span-2">
              <dt className="text-xs font-medium mb-0.5" style={{ color: "var(--error)" }}>Error</dt>
              <dd className="text-sm" style={{ color: "var(--error)" }}>{execution.errorMessage}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Trigger payload */}
      <div style={sectionStyle}>
        <h2 className="font-medium text-sm mb-3" style={{ color: "var(--foreground)" }}>
          Trigger Payload
        </h2>
        <JsonBlock value={execution.triggerPayload} />
      </div>

      {/* Artifacts */}
      {hasArtifacts && (
        <div style={sectionStyle}>
          <h2 className="font-medium text-sm mb-0.5" style={{ color: "var(--foreground)" }}>Artifacts</h2>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>Key outputs produced by this run.</p>
          <div className="space-y-4">
            {Boolean(selectedSlot) && (
              <div>
                <p style={artifactLabelStyle}>Selected Slot</p>
                <JsonBlock value={selectedSlot} />
              </div>
            )}
            {Boolean(createdEvent) && (
              <div>
                <p style={artifactLabelStyle}>Created Event</p>
                <JsonBlock value={createdEvent} />
              </div>
            )}
            {Boolean(replyDraft) && (
              <div>
                <p style={artifactLabelStyle}>Reply Draft</p>
                <pre className="whitespace-pre-wrap font-mono leading-relaxed" style={artifactBlockStyle}>
                  {String(replyDraft)}
                </pre>
              </div>
            )}
            {Boolean(attendeeResearch) && (
              <div>
                <p style={artifactLabelStyle}>Attendee Research</p>
                <p className="leading-relaxed" style={{ ...artifactBlockStyle, fontSize: "13px" }}>
                  {String(attendeeResearch)}
                </p>
              </div>
            )}
            {Boolean(companyResearch) && (
              <div>
                <p style={artifactLabelStyle}>Company Research</p>
                <p className="leading-relaxed" style={{ ...artifactBlockStyle, fontSize: "13px" }}>
                  {String(companyResearch)}
                </p>
              </div>
            )}
            {Boolean(preMeetingNotes) && (
              <div>
                <p style={artifactLabelStyle}>Pre-Meeting Notes</p>
                <pre className="whitespace-pre-wrap font-mono leading-relaxed" style={artifactBlockStyle}>
                  {String(preMeetingNotes)}
                </pre>
              </div>
            )}
            {Boolean(fallbackSlots) && (
              <div>
                <p style={artifactLabelStyle}>Fallback Slots</p>
                <JsonBlock value={fallbackSlots} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step timeline */}
      <div className="mb-2">
        <h2 className="font-medium mb-4" style={{ color: "var(--foreground)" }}>
          Step Timeline
          <span className="ml-2 text-sm font-normal" style={{ color: "var(--muted)" }}>
            ({execution.steps.length} steps)
          </span>
        </h2>
        {execution.steps.length === 0 ? (
          <EmptyState message="No steps recorded for this execution." />
        ) : (
          <div className="space-y-2.5">
            {execution.steps.map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
