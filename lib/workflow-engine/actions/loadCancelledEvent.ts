import type { ActionHandler } from "../types";
import { loadCancelledEvent } from "../../calendar/service";

export const loadCancelledEventHandler: ActionHandler = async ({ context }) => {
  const eventId = context.triggerEventId;

  if (!eventId) {
    throw new Error(
      "loadCancelledEventHandler: triggerEventId is required in context. " +
        "Ensure the event_cancelled trigger payload includes an eventId."
    );
  }

  const result = await loadCancelledEvent(eventId);

  return {
    output: result,
    updatedContext: {
      cancelledEvent: result.cancelledEvent,
      attendees: result.attendees,
      priorMeetingContext: result.priorMeetingContext,
    },
  };
};
