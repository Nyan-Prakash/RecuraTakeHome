import type { ActionHandler } from "../types";
import { createCalendarEvent } from "../../calendar/service";

export const createCalendarEventHandler: ActionHandler = async ({
  context,
  workflowExecutionId,
}) => {
  if (!context.selectedSlot) {
    throw new Error("createCalendarEventHandler: selectedSlot is required in context");
  }

  const createdEvent = await createCalendarEvent({
    selectedSlot: context.selectedSlot,
    summary: context.summary,
    attendeeEmail: context.senderEmail?.toLowerCase(),
    attendeeResearch: context.attendeeResearch,
    companyResearch: context.companyResearch,
    preMeetingNotes: context.preMeetingNotes,
    sourceWorkflowExecutionId: workflowExecutionId ?? null,
  });

  return {
    output: { createdEvent },
    updatedContext: {
      createdEventId: createdEvent.id,
      createdEvent,
    },
  };
};
