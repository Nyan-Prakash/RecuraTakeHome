import type { ExecutionContext, WorkflowTriggerType } from "./types";

// ---------------------------------------------------------------------------
// Trigger payload types
// ---------------------------------------------------------------------------

export type MeetingRequestPayload = {
  emailText: string;
  senderEmail?: string;
  source?: string;
};

export type EventCancelledPayload = {
  emailText: string;
  senderEmail: string;
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

  const senderEmail =
    typeof p["senderEmail"] === "string" && p["senderEmail"].trim() !== ""
      ? p["senderEmail"].trim()
      : undefined;

  return {
    emailText: p["emailText"].trim(),
    senderEmail,
    source: typeof p["source"] === "string" ? p["source"] : undefined,
  };
}

function validateEventCancelledPayload(
  payload: unknown
): EventCancelledPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("meeting_reschedule_requested: payload must be an object");
  }

  const p = payload as Record<string, unknown>;

  if (typeof p["emailText"] !== "string" || p["emailText"].trim() === "") {
    throw new Error("meeting_reschedule_requested: emailText must be a non-empty string");
  }

  if (typeof p["senderEmail"] !== "string" || p["senderEmail"].trim() === "") {
    throw new Error("meeting_reschedule_requested: senderEmail must be a non-empty string");
  }

  return {
    emailText: p["emailText"].trim(),
    senderEmail: p["senderEmail"].trim(),
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

      let senderName: string | undefined;
      let senderCompany: string | undefined;
      if (payload.senderEmail) {
        const [localPart, domainPart] = payload.senderEmail.split("@");
        if (localPart) senderName = localPart;
        if (domainPart) senderCompany = domainPart.split(".")[0];
      }

      return {
        triggerType: "meeting_request_received",
        originalEmail: payload.emailText,
        senderEmail: payload.senderEmail,
        senderName,
        senderCompany,
      };
    }

    case "meeting_reschedule_requested": {
      const payload = validateEventCancelledPayload(triggerPayload);

      let senderName: string | undefined;
      let senderCompany: string | undefined;
      const [localPart, domainPart] = payload.senderEmail.split("@");
      if (localPart) senderName = localPart;
      if (domainPart) senderCompany = domainPart.split(".")[0];

      return {
        triggerType: "meeting_reschedule_requested",
        originalEmail: payload.emailText,
        senderEmail: payload.senderEmail,
        senderName,
        senderCompany,
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
