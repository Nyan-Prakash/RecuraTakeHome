import { getCalendarEventById, cancelCalendarEvent } from "@/lib/db/calendarEvents";
import { getActiveWorkflowByTriggerType } from "@/lib/db/workflows";
import { executeWorkflow } from "@/lib/workflow-engine/engine";
import { conflict, notFound, ok, serverError } from "@/lib/http/responses";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { id } = await params;

    // 1. Load the calendar event
    const event = await getCalendarEventById(id);
    if (!event) {
      return notFound("Calendar event not found");
    }

    // 2. Check if already cancelled
    if (event.status === "cancelled") {
      return conflict("Calendar event is already cancelled");
    }

    // 3. Find active cancellation workflow
    const cancellationWorkflow = await getActiveWorkflowByTriggerType("event_cancelled");
    if (!cancellationWorkflow) {
      return notFound("No active workflow found for trigger type event_cancelled");
    }

    // 4. Mark event cancelled
    const cancelledEvent = await cancelCalendarEvent(id);

    // 5. Execute cancellation workflow
    // If execution fails (step-level), we still return 200 with the structured result
    let executionResult;
    try {
      executionResult = await executeWorkflow({
        workflowId: cancellationWorkflow.id,
        triggerPayload: {
          eventId: id,
          reason: "manual_cancel",
          source: "calendar_ui",
        },
      });
    } catch (err) {
      // Pre-execution error (e.g., workflow inactive, invalid payload)
      const message = err instanceof Error ? err.message : "Workflow execution error";
      return serverError(`Event cancelled but workflow execution failed: ${message}`);
    }

    return ok({
      event: cancelledEvent,
      execution: executionResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return serverError(message);
  }
}
