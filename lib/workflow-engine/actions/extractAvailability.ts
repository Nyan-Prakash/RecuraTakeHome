import type { ActionHandler } from "../types";
import { extractAvailability } from "../../ai/service";

export const extractAvailabilityHandler: ActionHandler = async ({ context }) => {
  if (!context.originalEmail) {
    throw new Error("extractAvailabilityHandler: originalEmail is required in context");
  }

  const availabilityWindows = await extractAvailability(context.originalEmail);

  if (availabilityWindows.length === 0) {
    throw new Error(
      "extractAvailabilityHandler: no valid availability windows found in the email. Please include specific days and times."
    );
  }

  return {
    output: { availabilityWindows },
    updatedContext: { availabilityWindows },
  };
};
