import type { ActionHandler } from "../types";
import { researchAttendees } from "../../ai/service";

export const researchAttendeesHandler: ActionHandler = async ({ context }) => {
  const attendeeResearch = await researchAttendees({
    originalEmail: context.originalEmail,
    summary: context.summary,
    attendees: context.attendees,
  });

  return {
    output: { attendeeResearch },
    updatedContext: { attendeeResearch },
  };
};
