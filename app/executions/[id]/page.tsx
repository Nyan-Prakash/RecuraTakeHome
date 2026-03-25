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

function StepRow({ step }: { step: StepRow }) {
  const label = ACTION_LABELS[step.actionType] ?? step.actionType;
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <StatusBadge status={step.status} />
        <span className="font-medium text-sm text-gray-900">{label}</span>
        <span className="text-xs text-gray-400 font-mono ml-auto">{step.actionType}</span>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Input</p>
          <JsonBlock value={step.input} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Output</p>
          <JsonBlock value={step.output} />
        </div>
      </div>
      {step.errorMessage && (
        <div className="px-4 pb-3">
          <p className="text-xs font-medium text-red-500 mb-1">Error</p>
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
            {step.errorMessage}
          </p>
        </div>
      )}
      <div className="px-4 pb-3 flex gap-4 text-xs text-gray-400">
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

  // Extract artifacts from step outputs for display
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
    selectedSlot ||
    createdEvent ||
    replyDraft ||
    attendeeResearch ||
    companyResearch ||
    preMeetingNotes ||
    fallbackSlots
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/executions" className="text-sm text-gray-400 hover:text-gray-600">
          ← Executions
        </Link>
      </div>

      <PageHeader
        title="Execution Detail"
        description="Step-by-step record of a single workflow run."
      />

      {/* Summary card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <StatusBadge status={execution.status} />
          <TriggerBadge triggerType={execution.triggerType} />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs font-medium text-gray-400">Workflow</dt>
            <dd className="text-gray-900 font-medium">
              <Link href={`/workflows/${execution.workflowId}`} className="hover:text-indigo-600">
                {execution.workflow.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">Execution ID</dt>
            <dd className="text-gray-700 font-mono text-xs">{execution.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">Started</dt>
            <dd className="text-gray-700">{formatDate(execution.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">Completed</dt>
            <dd className="text-gray-700">{formatDate(execution.completedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">Steps</dt>
            <dd className="text-gray-700">{execution.steps.length} steps</dd>
          </div>
          {execution.errorMessage && (
            <div className="col-span-2">
              <dt className="text-xs font-medium text-red-500">Error</dt>
              <dd className="text-red-600 text-sm">{execution.errorMessage}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Trigger payload */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Trigger Payload</h2>
        <JsonBlock value={execution.triggerPayload} />
      </div>

      {/* Artifacts */}
      {hasArtifacts && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-1">Artifacts</h2>
          <p className="text-xs text-gray-400 mb-4">Key outputs produced by this run.</p>
          <div className="space-y-4">
            {Boolean(selectedSlot) && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Selected Slot</p>
                <JsonBlock value={selectedSlot} />
              </div>
            )}
            {Boolean(createdEvent) && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Created Event</p>
                <JsonBlock value={createdEvent} />
              </div>
            )}
            {Boolean(replyDraft) && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Reply Draft</p>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap font-mono text-gray-700">
                  {String(replyDraft)}
                </pre>
              </div>
            )}
            {Boolean(attendeeResearch) && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Attendee Research</p>
                <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-3">
                  {String(attendeeResearch)}
                </p>
              </div>
            )}
            {Boolean(companyResearch) && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Company Research</p>
                <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-3">
                  {String(companyResearch)}
                </p>
              </div>
            )}
            {Boolean(preMeetingNotes) && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Pre-Meeting Notes</p>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap font-mono text-gray-700">
                  {String(preMeetingNotes)}
                </pre>
              </div>
            )}
            {Boolean(fallbackSlots) && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Fallback Slots</p>
                <JsonBlock value={fallbackSlots} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step timeline */}
      <div className="mb-2">
        <h2 className="font-semibold text-gray-900 mb-4">
          Step Timeline
          <span className="ml-2 text-sm font-normal text-gray-400">({execution.steps.length} steps)</span>
        </h2>
        {execution.steps.length === 0 ? (
          <EmptyState message="No steps recorded for this execution." />
        ) : (
          <div className="space-y-3">
            {execution.steps.map((step) => (
              <StepRow key={step.id} step={step} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
