import type { ActionHandler } from "../types";
import { generateRescheduleEmail } from "../../ai/service";

export const generateRescheduleEmailHandler: ActionHandler = async ({ context }) => {
  if (!context.cancelledEvent) {
    throw new Error(
      "generateRescheduleEmailHandler: cancelledEvent is required in context"
    );
  }

  if (!context.fallbackSlots || context.fallbackSlots.length === 0) {
    throw new Error(
      "generateRescheduleEmailHandler: fallbackSlots is required in context"
    );
  }

  const replyDraft = await generateRescheduleEmail({
    cancelledEvent: context.cancelledEvent,
    fallbackSlots: context.fallbackSlots,
    attendeeResearch: context.attendeeResearch,
    companyResearch: context.companyResearch,
  });

  return {
    output: { replyDraft },
    updatedContext: { replyDraft },
  };
};
