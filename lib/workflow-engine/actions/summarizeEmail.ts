import type { ActionHandler } from "../types";
import { summarizeMeetingEmail } from "../../ai/service";

export const summarizeEmailHandler: ActionHandler = async ({ context }) => {
  if (!context.originalEmail) {
    throw new Error("summarizeEmailHandler: originalEmail is required in context");
  }

  const result = await summarizeMeetingEmail(context.originalEmail);

  return {
    output: result,
    updatedContext: {
      summary: result.summary,
      meetingTopic: result.meetingTopic,
    },
  };
};
