export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getExecutionById } from "@/lib/db/executions";
import { ExecutionDetailClient } from "@/components/ExecutionDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function ExecutionDetailPage({ params }: Props) {
  const { id } = await params;
  const execution = await getExecutionById(id);

  if (!execution) {
    notFound();
  }

  // Build artifacts from merged step outputs
  const context: Record<string, unknown> = {};
  for (const step of execution.steps) {
    if (step.output && typeof step.output === "object") {
      Object.assign(context, step.output);
    }
  }

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

      <ExecutionDetailClient
        execution={{
          id: execution.id,
          status: execution.status,
          triggerType: execution.triggerType,
          triggerPayload: execution.triggerPayload,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          errorMessage: execution.errorMessage,
          workflowId: execution.workflowId,
          workflowName: execution.workflow.name,
          steps: execution.steps.map((s) => ({
            id: s.id,
            actionType: s.actionType,
            status: s.status,
            input: s.input,
            output: s.output,
            errorMessage: s.errorMessage,
            startedAt: s.startedAt,
            completedAt: s.completedAt,
          })),
          artifacts: {
            selectedSlot: context["selectedSlot"],
            createdEvent: context["createdEvent"],
            replyDraft: context["replyDraft"] as string | undefined,
            attendeeResearch: context["attendeeResearch"] as string | undefined,
            companyResearch: context["companyResearch"] as string | undefined,
            preMeetingNotes: context["preMeetingNotes"] as string | undefined,
            fallbackSlots: context["fallbackSlots"],
          },
        }}
      />
    </div>
  );
}
