import type { ExecutionContext, WorkflowTriggerType } from "./types";

// ---------------------------------------------------------------------------
// Trigger payload types
// ---------------------------------------------------------------------------

export type MeetingRequestPayload = {
  emailText: string;
  source?: string;
};

export type EventCancelledPayload = {
  eventId: string;
  reason?: string;
  source?: string;
};

export type TriggerPayload = MeetingRequestPayload | EventCancelledPayload;

// ---------------------------------------------------------------------------
// Payload validation
// ---------------------------------------------------------------------------

function validateMeetingRequestPayload(
  payload: unknown
): MeetingRequestPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("meeting_request_received: payload must be an object");
  }

  const p = payload as Record<string, unknown>;

  if (typeof p["emailText"] !== "string" || p["emailText"].trim() === "") {
    throw new Error(
      "meeting_request_received: emailText must be a non-empty string"
    );
  }

  return {
    emailText: p["emailText"].trim(),
    source: typeof p["source"] === "string" ? p["source"] : undefined,
  };
}

function validateEventCancelledPayload(
  payload: unknown
): EventCancelledPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("event_cancelled: payload must be an object");
  }

  const p = payload as Record<string, unknown>;

  if (typeof p["eventId"] !== "string" || p["eventId"].trim() === "") {
    throw new Error("event_cancelled: eventId must be a non-empty string");
  }

  return {
    eventId: p["eventId"].trim(),
    reason: typeof p["reason"] === "string" ? p["reason"] : undefined,
    source: typeof p["source"] === "string" ? p["source"] : undefined,
  };
}

// ---------------------------------------------------------------------------
// Context initialization
// ---------------------------------------------------------------------------

/**
 * Validates a raw trigger payload and returns an initialized ExecutionContext.
 * Throws clearly on invalid payloads.
 */
export function initializeExecutionContext(
  triggerType: WorkflowTriggerType,
  triggerPayload: unknown
): ExecutionContext {
  switch (triggerType) {
    case "meeting_request_received": {
      const payload = validateMeetingRequestPayload(triggerPayload);
      return {
        triggerType: "meeting_request_received",
        originalEmail: payload.emailText,
      };
    }

    case "event_cancelled": {
      const payload = validateEventCancelledPayload(triggerPayload);
      return {
        triggerType: "event_cancelled",
        triggerEventId: payload.eventId,
      };
    }

    default: {
      const exhaustive: never = triggerType;
      throw new Error(
        `initializeExecutionContext: unsupported trigger type "${String(exhaustive)}"`
      );
    }
  }
}
