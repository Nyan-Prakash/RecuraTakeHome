import type { ActionHandler } from "../types";
import { researchAttendees } from "../../ai/service";

export const researchAttendeesHandler: ActionHandler = async ({ context }) => {
  const attendeeResearch = await researchAttendees({
    originalEmail: context.originalEmail,
    summary: context.summary,
    attendees: context.attendees,
    senderName: context.senderName,
    senderCompany: context.senderCompany,
  });

  return {
    output: { attendeeResearch },
    updatedContext: { attendeeResearch },
  };
};
