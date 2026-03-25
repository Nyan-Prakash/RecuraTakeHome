import type { ActionHandler } from "../types";
import { findFallbackSlots } from "../../calendar/service";

export const findFallbackSlotsHandler: ActionHandler = async ({ context }) => {
  if (!context.cancelledEvent) {
    throw new Error(
      "findFallbackSlotsHandler: cancelledEvent is required in context"
    );
  }

  const fallbackSlots = await findFallbackSlots({
    cancelledEvent: context.cancelledEvent,
  });

  return {
    output: { fallbackSlots },
    updatedContext: { fallbackSlots },
  };
};
