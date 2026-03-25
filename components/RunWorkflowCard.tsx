"use client";

import { useState } from "react";
import { StreamingExecutionPanel } from "./StreamingExecutionPanel";

const SAMPLE_EMAIL =
  "Hi Dave, I'd love to talk about a design partner opportunity. I'm free Tuesday afternoon or Thursday morning. Let me know what works best.";
const SAMPLE_SENDER = "TimCook@apple.com";

function parseSenderEmail(email: string): { name: string; company: string } | null {
  const atIndex = email.indexOf("@");
  if (atIndex < 1) return null;
  const name = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const company = domain.split(".")[0];
  if (!name || !company) return null;
  return { name, company };
}

type RunState =
  | { phase: "input" }
  | { phase: "streaming"; payload: Record<string, unknown> };

export function RunWorkflowCard({
  workflowId,
  triggerType = "meeting_request_received",
}: {
  workflowId: string;
  triggerType?: string;
}) {
  const [emailText, setEmailText] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [eventId, setEventId] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [runState, setRunState] = useState<RunState>({ phase: "input" });

  const isCancelled = triggerType === "event_cancelled";
  const parsed = parseSenderEmail(senderEmail);

  function handleRun() {
    if (isCancelled) {
      if (!eventId.trim()) {
        setValidationError("Event ID is required.");
        return;
      }
    } else {
      if (!emailText.trim()) {
        setValidationError("Email body is required.");
        return;
      }
    }
    setValidationError(null);

    const payload: Record<string, unknown> = isCancelled
      ? { eventId: eventId.trim() }
      : {
          emailText: emailText.trim(),
          ...(senderEmail.trim() ? { senderEmail: senderEmail.trim() } : {}),
        };

    setRunState({ phase: "streaming", payload });
  }

  function handleReset() {
    setRunState({ phase: "input" });
  }

  const inputStyle = {
    background: "#fafaf9",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "8px 10px",
    fontSize: "13px",
    color: "var(--foreground)",
    fontFamily: "inherit",
    width: "100%",
    outline: "none",
    transition: "border-color 150ms",
  } as React.CSSProperties;

  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {runState.phase === "input" ? (
        <>
          <div className="mb-4">
            <h3
              className="font-medium text-sm mb-0.5"
              style={{ color: "var(--foreground)" }}
            >
              Run Workflow
            </h3>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Paste a scheduling email to process it through this workflow.
            </p>
          </div>

          {isCancelled ? (
            <div className="mb-3">
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--muted)" }}
              >
                Event ID
              </label>
              <input
                type="text"
                style={inputStyle}
                placeholder="e.g. clxyz123..."
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>
          ) : (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "var(--muted)" }}
                  >
                    Sender email address
                  </label>
                  <button
                    type="button"
                    onClick={() => setSenderEmail(SAMPLE_SENDER)}
                    className="text-xs font-medium transition-colors cursor-pointer"
                    style={{ color: "var(--accent)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
                  >
                    Load sample
                  </button>
                </div>
                <input
                  type="text"
                  style={{ ...inputStyle, fontFamily: "ui-monospace, monospace" }}
                  placeholder="e.g. TimCook@apple.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                {senderEmail && (
                  <div
                    className="mt-2 flex gap-4 text-xs rounded-lg px-3 py-2"
                    style={{ background: "var(--border-subtle)", color: "var(--muted)" }}
                  >
                    <span>
                      Person:{" "}
                      <span
                        className="font-medium"
                        style={{ color: parsed ? "var(--foreground)" : "var(--error)" }}
                      >
                        {parsed ? parsed.name : "—"}
                      </span>
                    </span>
                    <span>
                      Company:{" "}
                      <span
                        className="font-medium"
                        style={{ color: parsed ? "var(--foreground)" : "var(--error)" }}
                      >
                        {parsed ? parsed.company : "—"}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "var(--muted)" }}
                  >
                    Email body
                  </label>
                  <button
                    type="button"
                    onClick={() => setEmailText(SAMPLE_EMAIL)}
                    className="text-xs font-medium transition-colors cursor-pointer"
                    style={{ color: "var(--accent)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
                  >
                    Load sample
                  </button>
                </div>
                <textarea
                  style={{
                    ...inputStyle,
                    fontFamily: "ui-monospace, monospace",
                    resize: "vertical",
                    minHeight: "100px",
                  }}
                  rows={5}
                  placeholder="Paste scheduling email body here..."
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
            </>
          )}

          {validationError && (
            <p
              className="mb-3 text-xs rounded-lg px-3 py-2"
              style={{
                color: "var(--error)",
                background: "var(--error-subtle)",
                border: "1px solid #fecaca",
              }}
            >
              {validationError}
            </p>
          )}

          <button
            type="button"
            onClick={handleRun}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer"
            style={{
              background: "var(--foreground)",
              color: "#ffffff",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#2d2d2b";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--foreground)";
            }}
          >
            Run workflow
          </button>
        </>
      ) : (
        <StreamingExecutionPanel
          workflowId={workflowId}
          triggerPayload={runState.payload}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
