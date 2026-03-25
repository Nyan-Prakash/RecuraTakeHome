import type { ActionHandler, ActionRegistry, WorkflowActionType } from "./types";

import { summarizeEmailHandler } from "./actions/summarizeEmail";
import { extractAvailabilityHandler } from "./actions/extractAvailability";
import { findOpenSlotHandler } from "./actions/findOpenSlot";
import { researchAttendeesHandler } from "./actions/researchAttendees";
import { researchCompanyHandler } from "./actions/researchCompany";
import { generatePreMeetingNotesHandler } from "./actions/generatePreMeetingNotes";
import { createCalendarEventHandler } from "./actions/createCalendarEvent";
import { generateConfirmationEmailHandler } from "./actions/generateConfirmationEmail";
import { resolveCancelledEventHandler } from "./actions/resolveCancelledEvent";
import { findFallbackSlotsHandler } from "./actions/findFallbackSlots";
import { generateRescheduleEmailHandler } from "./actions/generateRescheduleEmail";

export const actionRegistry: ActionRegistry = {
  summarize_email: summarizeEmailHandler,
  extract_availability: extractAvailabilityHandler,
  find_open_slot: findOpenSlotHandler,
  research_attendees: researchAttendeesHandler,
  research_company: researchCompanyHandler,
  generate_pre_meeting_notes: generatePreMeetingNotesHandler,
  create_calendar_event: createCalendarEventHandler,
  generate_confirmation_email: generateConfirmationEmailHandler,
  resolve_cancelled_event: resolveCancelledEventHandler,
  find_fallback_slots: findFallbackSlotsHandler,
  generate_reschedule_email: generateRescheduleEmailHandler,
};

export function getActionHandler(actionType: WorkflowActionType): ActionHandler {
  return actionRegistry[actionType];
}
