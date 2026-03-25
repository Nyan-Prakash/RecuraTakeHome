import type { ActionHandler } from "../types";
import { loadCancelledEvent, findEventBySenderEmail } from "../../calendar/service";
import { cancelCalendarEvent } from "../../db/calendarEvents";

export const resolveCancelledEventHandler: ActionHandler = async ({ context }) => {
  // If we already have an explicit eventId (calendar-button trigger), use it directly
  if (context.triggerEventId) {
    const result = await loadCancelledEvent(context.triggerEventId);
    return {
      output: result,
      updatedContext: {
        cancelledEvent: result.cancelledEvent,
        attendees: result.attendees,
        priorMeetingContext: result.priorMeetingContext,
      },
    };
  }

  // Email-driven trigger — find the scheduled event linked to the sender
  if (!context.senderEmail) {
    throw new Error(
      "resolveCancelledEventHandler: senderEmail is required when no triggerEventId is provided"
    );
  }

  const result = await findEventBySenderEmail({
    senderEmail: context.senderEmail,
    senderCompany: context.senderCompany,
    emailBody: context.originalEmail,
  });

  if (!result) {
    throw new Error(
      `resolveCancelledEventHandler: no scheduled event found matching sender "${context.senderEmail}"`
    );
  }

  // Mark it as cancelled in the DB so it doesn't block fallback slot search
  await cancelCalendarEvent(result.cancelledEvent.id);

  return {
    output: result,
    updatedContext: {
      cancelledEvent: result.cancelledEvent,
      attendees: result.attendees,
      priorMeetingContext: result.priorMeetingContext,
      triggerEventId: result.cancelledEvent.id,
    },
  };
};
