import type { ActionHandler } from "../types";
import { generateConfirmationEmail } from "../../ai/service";

export const generateConfirmationEmailHandler: ActionHandler = async ({ context }) => {
  if (!context.selectedSlot) {
    throw new Error(
      "generateConfirmationEmailHandler: selectedSlot is required in context"
    );
  }

  const replyDraft = await generateConfirmationEmail({
    summary: context.summary,
    selectedSlot: context.selectedSlot,
    createdEvent: context.createdEvent,
  });

  return {
    output: { replyDraft },
    updatedContext: { replyDraft },
  };
};
