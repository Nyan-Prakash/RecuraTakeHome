import type { ActionHandler } from "../types";
import { findOpenSlot } from "../../calendar/service";

export const findOpenSlotHandler: ActionHandler = async ({ context }) => {
  if (!context.availabilityWindows || context.availabilityWindows.length === 0) {
    throw new Error(
      "findOpenSlotHandler: availabilityWindows is required and must not be empty"
    );
  }

  const { selectedSlot, candidateSlots } = await findOpenSlot({
    availabilityWindows: context.availabilityWindows,
  });

  return {
    output: { selectedSlot, candidateSlots },
    updatedContext: { selectedSlot },
  };
};
