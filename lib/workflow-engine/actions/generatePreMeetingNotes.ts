import type { ActionHandler } from "../types";
import { generatePrepNotes } from "../../ai/service";

export const generatePreMeetingNotesHandler: ActionHandler = async ({ context }) => {
  const preMeetingNotes = await generatePrepNotes({
    summary: context.summary,
    attendeeResearch: context.attendeeResearch,
    companyResearch: context.companyResearch,
  });

  return {
    output: { preMeetingNotes },
    updatedContext: { preMeetingNotes },
  };
};
