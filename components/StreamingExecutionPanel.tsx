"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { WorkflowStreamEvent } from "@/lib/workflow-engine/engine";
import type { ExecutionContext } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  summarize_email: "Summarize Email",
  extract_availability: "Extract Availability",
  find_open_slot: "Find Open Slot",
  research_attendees: "Research Attendees",
  research_company: "Research Company",
  generate_pre_meeting_notes: "Generate Pre-Meeting Notes",
  create_calendar_event: "Create Calendar Event",
  generate_confirmation_email: "Generate Confirmation Email",
  resolve_cancelled_event: "Resolve Cancelled Event",
  find_fallback_slots: "Find Fallback Slots",
  generate_reschedule_email: "Generate Reschedule Email",
};

// Step icons — SVGs for each action type
const ACTION_ICONS: Record<string, React.ReactNode> = {
  summarize_email: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  extract_availability: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  find_open_slot: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  research_attendees: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  research_company: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  generate_pre_meeting_notes: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  create_calendar_event: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="12" y1="14" x2="12" y2="18" />
      <line x1="10" y1="16" x2="14" y2="16" />
    </svg>
  ),
  generate_confirmation_email: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  resolve_cancelled_event: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
  find_fallback_slots: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
    </svg>
  ),
  generate_reschedule_email: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22 6 12 13 2 6" />
    </svg>
  ),
};

function defaultIcon(actionType: string): React.ReactNode {
  return ACTION_ICONS[actionType] ?? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Step status dot
// ---------------------------------------------------------------------------

function StepStatusDot({ status }: { status: "pending" | "running" | "success" | "failed" }) {
  if (status === "running") {
    return (
      <span
        className="exec-step-running-dot"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "rgba(99, 102, 241, 0.12)",
          border: "1.5px solid var(--accent)",
          color: "var(--accent)",
          flexShrink: 0,
        }}
      >
        <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </span>
    );
  }

  if (status === "success") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "rgba(22, 163, 74, 0.1)",
          border: "1.5px solid #16a34a",
          color: "#16a34a",
          flexShrink: 0,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline
            points="20 6 9 17 4 12"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 0,
              animation: "exec-check-draw 300ms ease forwards",
            }}
          />
        </svg>
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "rgba(220, 38, 38, 0.1)",
          border: "1.5px solid #dc2626",
          color: "#dc2626",
          flexShrink: 0,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>
    );
  }

  // pending
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "var(--border-subtle)",
        border: "1.5px solid var(--border)",
        color: "var(--muted)",
        flexShrink: 0,
      }}
    >
      <svg width="6" height="6" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Step card
// ---------------------------------------------------------------------------

type StepState = {
  actionType: string;
  stepExecutionId: string;
  status: "pending" | "running" | "success" | "failed";
  output: unknown;
  errorMessage: string | null;
};

function StepCard({ step, index, delay }: { step: StepState; index: number; delay: number }) {
  const [expanded, setExpanded] = useState(false);
  const label = ACTION_LABELS[step.actionType] ?? step.actionType;
  const icon = defaultIcon(step.actionType);
  const isInteractive = step.status === "success" || step.status === "failed";

  return (
    <div
      className="exec-fade-in"
      style={{
        animationDelay: `${delay}ms`,
        borderRadius: 10,
        border: "1px solid",
        borderColor:
          step.status === "running"
            ? "rgba(99,102,241,0.3)"
            : step.status === "success"
            ? "rgba(22,163,74,0.2)"
            : step.status === "failed"
            ? "rgba(220,38,38,0.2)"
            : "var(--border)",
        background:
          step.status === "running"
            ? "rgba(99,102,241,0.04)"
            : step.status === "success"
            ? "rgba(22,163,74,0.03)"
            : step.status === "failed"
            ? "rgba(220,38,38,0.03)"
            : "var(--border-subtle)",
        transition: "border-color 300ms, background 300ms",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => isInteractive && setExpanded((v) => !v)}
        disabled={!isInteractive}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 12px",
          background: "none",
          border: "none",
          cursor: isInteractive ? "pointer" : "default",
          textAlign: "left",
        }}
      >
        <StepStatusDot status={step.status} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className={step.status === "running" ? "exec-shimmer-text" : ""}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: step.status === "running" ? undefined : "var(--foreground)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: step.status === "running" ? "inherit" : "var(--muted)", display: "flex" }}>
              {icon}
            </span>
            {label}
          </div>
          {step.status === "running" && (
            <div
              style={{
                fontSize: 11,
                color: "var(--accent)",
                marginTop: 1,
                letterSpacing: "0.01em",
              }}
            >
              Running…
            </div>
          )}
          {step.errorMessage && (
            <div style={{ fontSize: 11, color: "#dc2626", marginTop: 1 }}>
              {step.errorMessage}
            </div>
          )}
        </div>

        {isInteractive && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{
              color: "var(--muted)",
              transition: "transform 200ms",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {/* Expanded output */}
      {expanded && step.output !== null && step.output !== undefined && (
        <div
          className="exec-expand"
          style={{
            padding: "0 12px 12px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 6,
            }}
          >
            Output
          </div>
          <pre
            style={{
              fontSize: 11,
              fontFamily: "ui-monospace, monospace",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "8px 10px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "var(--foreground)",
              maxHeight: 280,
              overflowY: "auto",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {typeof step.output === "string"
              ? step.output
              : JSON.stringify(step.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div
      style={{
        height: 3,
        borderRadius: 2,
        background: "var(--border)",
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "var(--accent)",
          borderRadius: 2,
          transition: "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Artifacts section
// ---------------------------------------------------------------------------

function ArtifactCard({
  title,
  children,
  delay,
  accentColor,
  bgColor,
  borderColor,
}: {
  title: string;
  children: React.ReactNode;
  delay: number;
  accentColor?: string;
  bgColor?: string;
  borderColor?: string;
}) {
  return (
    <div
      className="exec-artifact"
      style={{
        animationDelay: `${delay}ms`,
        borderRadius: 10,
        border: `1px solid ${borderColor ?? "var(--border)"}`,
        background: bgColor ?? "var(--surface)",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: accentColor ?? "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ArtifactsSection({
  context,
  executionId,
}: {
  context: ExecutionContext;
  executionId: string;
}) {
  const hasArtifacts =
    context.replyDraft ||
    context.createdEvent ||
    context.selectedSlot ||
    context.attendeeResearch ||
    context.companyResearch ||
    context.preMeetingNotes ||
    (context.fallbackSlots && context.fallbackSlots.length > 0);

  if (!hasArtifacts) return null;

  let delay = 0;

  return (
    <div
      className="exec-fade-in"
      style={{ animationDelay: "100ms", marginTop: 20 }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 10,
        }}
      >
        Artifacts
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {context.createdEvent && (
          <ArtifactCard
            title="Calendar Event Created"
            delay={(delay += 50)}
            accentColor="#15803d"
            bgColor="rgba(22,163,74,0.04)"
            borderColor="rgba(22,163,74,0.25)"
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#15803d", marginBottom: 4 }}>
              {context.createdEvent.title}
            </div>
            <div style={{ fontSize: 12, color: "#166534" }}>
              {context.createdEvent.startTime} — {context.createdEvent.endTime}
            </div>
            {context.createdEvent.description && (
              <div style={{ fontSize: 12, color: "#166534", marginTop: 4, opacity: 0.8 }}>
                {context.createdEvent.description}
              </div>
            )}
          </ArtifactCard>
        )}

        {context.selectedSlot && !context.createdEvent && (
          <ArtifactCard
            title="Selected Time Slot"
            delay={(delay += 50)}
            accentColor="var(--accent)"
            bgColor="var(--accent-subtle)"
            borderColor="rgba(99,102,241,0.2)"
          >
            <div
              style={{
                fontSize: 12,
                fontFamily: "ui-monospace, monospace",
                color: "var(--accent)",
              }}
            >
              {context.selectedSlot.startTime} → {context.selectedSlot.endTime}
            </div>
          </ArtifactCard>
        )}

        {context.replyDraft && (
          <ArtifactCard
            title="Reply Draft"
            delay={(delay += 50)}
            bgColor="var(--border-subtle)"
            borderColor="var(--border)"
          >
            <pre
              style={{
                fontSize: 12,
                fontFamily: "ui-monospace, monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "var(--foreground)",
                margin: 0,
                lineHeight: 1.65,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {context.replyDraft}
            </pre>
          </ArtifactCard>
        )}

        {context.attendeeResearch && (
          <ArtifactCard
            title="Attendee Research"
            delay={(delay += 50)}
            bgColor="var(--border-subtle)"
            borderColor="var(--border)"
          >
            <p style={{ fontSize: 12, color: "var(--foreground)", margin: 0, lineHeight: 1.6 }}>
              {context.attendeeResearch}
            </p>
          </ArtifactCard>
        )}

        {context.companyResearch && (
          <ArtifactCard
            title="Company Research"
            delay={(delay += 50)}
            bgColor="var(--border-subtle)"
            borderColor="var(--border)"
          >
            <p style={{ fontSize: 12, color: "var(--foreground)", margin: 0, lineHeight: 1.6 }}>
              {context.companyResearch}
            </p>
          </ArtifactCard>
        )}

        {context.preMeetingNotes && (
          <ArtifactCard
            title="Pre-Meeting Notes"
            delay={(delay += 50)}
            bgColor="var(--border-subtle)"
            borderColor="var(--border)"
          >
            <p style={{ fontSize: 12, color: "var(--foreground)", margin: 0, lineHeight: 1.6 }}>
              {context.preMeetingNotes}
            </p>
          </ArtifactCard>
        )}

        {context.fallbackSlots && context.fallbackSlots.length > 0 && (
          <ArtifactCard
            title="Fallback Slots"
            delay={(delay += 50)}
            bgColor="var(--border-subtle)"
            borderColor="var(--border)"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {context.fallbackSlots.map((slot, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    fontFamily: "ui-monospace, monospace",
                    color: "var(--foreground)",
                  }}
                >
                  {slot.startTime} → {slot.endTime}
                </div>
              ))}
            </div>
          </ArtifactCard>
        )}
      </div>

      <div
        className="exec-fade-in"
        style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16, animationDelay: `${delay + 80}ms` }}
      >
        <Link
          href={`/executions/${executionId}`}
          className="hover-link-accent"
          style={{ fontSize: 12, fontWeight: 500 }}
        >
          View full execution →
        </Link>
        <Link
          href="/executions"
          className="hover-link"
          style={{ fontSize: 12 }}
        >
          All executions
        </Link>
        {context.createdEvent && (
          <Link
            href="/calendar"
            className="hover-link"
            style={{ fontSize: 12 }}
          >
            Go to calendar
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type WorkflowStatus = "idle" | "streaming" | "success" | "failed";

export function StreamingExecutionPanel({
  workflowId,
  triggerPayload,
  onReset,
}: {
  workflowId: string;
  triggerPayload: Record<string, unknown>;
  onReset: () => void;
}) {
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [totalSteps, setTotalSteps] = useState(0);
  const [doneSteps, setDoneSteps] = useState(0);
  const [context, setContext] = useState<ExecutionContext | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    abortRef.current = abort;
    setStatus("streaming");
    setSteps([]);
    setTotalSteps(0);
    setDoneSteps(0);
    setContext(null);
    setExecutionId(null);
    setErrorMessage(null);

    (async () => {

      let res: Response;
      try {
        res = await fetch(`/api/workflows/${workflowId}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(triggerPayload),
          signal: abort.signal,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("failed");
        setErrorMessage((err as Error).message);
        return;
      }

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setStatus("failed");
        setErrorMessage((data as { error?: string }).error ?? `HTTP ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        let done: boolean;
        let value: Uint8Array | undefined;
        try {
          ({ done, value } = await reader.read());
        } catch {
          break;
        }
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          let event: WorkflowStreamEvent;
          try {
            event = JSON.parse(line.slice(6)) as WorkflowStreamEvent;
          } catch {
            continue;
          }

          if (event.type === "workflow_start") {
            setExecutionId(event.workflowExecutionId);
            setTotalSteps(event.totalSteps);
          } else if (event.type === "step_start") {
            setSteps((prev) => [
              ...prev,
              {
                actionType: event.actionType,
                stepExecutionId: event.stepExecutionId,
                status: "running",
                output: null,
                errorMessage: null,
              },
            ]);
          } else if (event.type === "step_complete") {
            setSteps((prev) =>
              prev.map((s) =>
                s.stepExecutionId === event.stepExecutionId
                  ? { ...s, status: "success", output: event.output }
                  : s
              )
            );
            setDoneSteps((n) => n + 1);
          } else if (event.type === "step_failed") {
            setSteps((prev) =>
              prev.map((s) =>
                s.stepExecutionId === event.stepExecutionId
                  ? { ...s, status: "failed", errorMessage: event.errorMessage }
                  : s
              )
            );
            setDoneSteps((n) => n + 1);
          } else if (event.type === "workflow_complete") {
            setContext(event.context as ExecutionContext);
            setErrorMessage(event.errorMessage);
            setStatus(event.status === "success" ? "success" : "failed");
          }
        }
      }
    })();

    return () => {
      abort.abort();
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCount = steps.filter((s) => s.status === "success" || s.status === "failed").length;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            {status === "streaming"
              ? "Running workflow"
              : status === "success"
              ? "Workflow complete"
              : "Workflow failed"}
          </span>
          {status === "streaming" && (
            <span
              style={{
                fontSize: 11,
                color: "var(--accent)",
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 4,
                padding: "1px 6px",
                fontWeight: 500,
              }}
            >
              Live
            </span>
          )}
          {status === "success" && (
            <span
              style={{
                fontSize: 11,
                color: "#15803d",
                background: "rgba(22,163,74,0.1)",
                border: "1px solid rgba(22,163,74,0.2)",
                borderRadius: 4,
                padding: "1px 6px",
                fontWeight: 500,
              }}
            >
              Success
            </span>
          )}
          {status === "failed" && (
            <span
              style={{
                fontSize: 11,
                color: "#dc2626",
                background: "rgba(220,38,38,0.1)",
                border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: 4,
                padding: "1px 6px",
                fontWeight: 500,
              }}
            >
              Failed
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onReset}
          className="hover-btn-secondary"
          style={{
            fontSize: 12,
            padding: "3px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            cursor: "pointer",
          }}
        >
          Run again
        </button>
      </div>

      {/* Progress bar */}
      {totalSteps > 0 && (
        <ProgressBar done={doneSteps} total={totalSteps} />
      )}

      {/* Step counter */}
      {totalSteps > 0 && (
        <div
          style={{
            fontSize: 11,
            color: "var(--muted)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          {completedCount} / {totalSteps} steps completed
        </div>
      )}

      {/* Workflow-level error (pre-execution) */}
      {errorMessage && status === "failed" && steps.length === 0 && (
        <div
          className="exec-fade-in"
          style={{
            fontSize: 12,
            color: "var(--error)",
            background: "var(--error-subtle)",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((step, i) => (
          <StepCard key={step.stepExecutionId} step={step} index={i} delay={0} />
        ))}
      </div>

      {/* Artifacts */}
      {context && executionId && (status === "success" || status === "failed") && (
        <ArtifactsSection context={context} executionId={executionId} />
      )}

      {/* Failed with execution ID */}
      {status === "failed" && executionId && steps.length > 0 && (
        <div
          className="exec-fade-in"
          style={{ marginTop: 16, display: "flex", gap: 12, animationDelay: "150ms" }}
        >
          <Link
            href={`/executions/${executionId}`}
            className="hover-link-accent"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            View execution →
          </Link>
          <Link href="/executions" className="hover-link" style={{ fontSize: 12 }}>
            All executions
          </Link>
        </div>
      )}
    </div>
  );
}
