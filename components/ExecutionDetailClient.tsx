"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { TriggerBadge } from "@/components/TriggerBadge";
import { JsonBlock } from "@/components/JsonBlock";
import { EmptyState } from "@/components/EmptyState";

// ── types ────────────────────────────────────────────────────────────────────

export interface StepRow {
  id: string;
  actionType: string;
  status: string;
  input: unknown;
  output: unknown;
  errorMessage: string | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
}

export interface ExecutionDetailProps {
  id: string;
  status: string;
  triggerType: string;
  triggerPayload: unknown;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  errorMessage: string | null;
  workflowId: string;
  workflowName: string;
  steps: StepRow[];
  artifacts: {
    selectedSlot?: unknown;
    createdEvent?: unknown;
    replyDraft?: string;
    attendeeResearch?: string;
    companyResearch?: string;
    preMeetingNotes?: string;
    fallbackSlots?: unknown;
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  summarize_email: "Summarize Email",
  extract_availability: "Extract Availability",
  find_open_slot: "Find Open Slot",
  research_attendees: "Research Attendees",
  research_company: "Research Company",
  generate_pre_meeting_notes: "Generate Pre-Meeting Notes",
  create_calendar_event: "Create Calendar Event",
  generate_confirmation_email: "Generate Confirmation Email",
  load_cancelled_event: "Load Cancelled Event",
  find_fallback_slots: "Find Fallback Slots",
  generate_reschedule_email: "Generate Reschedule Email",
};

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(d));
}

function duration(start: Date | string | null, end: Date | string | null): string {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── chevron icon ─────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 200ms ease",
        flexShrink: 0,
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── collapsible section wrapper ──────────────────────────────────────────────

function Section({
  title,
  subtitle,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        marginBottom: "12px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "14px 20px",
          background: "none",
          border: "none",
          borderBottom: open ? "1px solid var(--border-subtle)" : "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 150ms ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--border-subtle)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)", flex: 1 }}>
          {title}
          {subtitle && (
            <span style={{ fontWeight: 400, fontSize: "12px", color: "var(--muted)", marginLeft: "8px" }}>
              {subtitle}
            </span>
          )}
        </span>
        {badge}
        <span style={{ color: "var(--muted)" }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && <div style={{ padding: "16px 20px" }}>{children}</div>}
    </div>
  );
}

// ── step status dot ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  success: "#22c55e",
  failed: "#ef4444",
  running: "#3b82f6",
  pending: "#9ca3af",
};

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#9ca3af";
  return (
    <span
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        boxShadow: status === "running" ? `0 0 6px ${color}` : undefined,
      }}
    />
  );
}

// ── step card with dropdown ──────────────────────────────────────────────────

function StepCard({ step, index }: { step: StepRow; index: number }) {
  const [open, setOpen] = useState(false);
  const label = ACTION_LABELS[step.actionType] ?? step.actionType;
  const dur = duration(step.startedAt, step.completedAt);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "10px",
        overflow: "hidden",
        transition: "border-color 150ms ease",
      }}
    >
      {/* header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "11px 14px",
          background: open ? "var(--border-subtle)" : "var(--surface)",
          border: "none",
          borderBottom: open ? "1px solid var(--border-subtle)" : "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 150ms ease",
        }}
        onMouseEnter={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.background = "var(--border-subtle)";
        }}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
        }}
      >
        {/* step number */}
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--muted)",
            width: "18px",
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>

        <StatusDot status={step.status} />

        <StatusBadge status={step.status} />

        <span style={{ fontWeight: 500, fontSize: "13px", color: "var(--foreground)", flex: 1 }}>
          {label}
        </span>

        <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--muted)" }}>
          {step.actionType}
        </span>

        {dur && (
          <span
            style={{
              fontSize: "10px",
              padding: "2px 7px",
              borderRadius: "999px",
              background: "var(--border-subtle)",
              color: "var(--muted)",
              flexShrink: 0,
            }}
          >
            {dur}
          </span>
        )}

        <span style={{ color: "var(--muted)", marginLeft: "4px" }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* expanded body */}
      {open && (
        <div style={{ background: "var(--surface)", padding: "14px" }}>
          {/* timestamps */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              fontSize: "11px",
              color: "var(--muted)",
              marginBottom: "12px",
            }}
          >
            <span>Started: {formatDate(step.startedAt)}</span>
            <span>Completed: {formatDate(step.completedAt)}</span>
          </div>

          {/* input / output */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                }}
              >
                Input
              </p>
              <JsonBlock value={step.input} />
            </div>
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                }}
              >
                Output
              </p>
              <JsonBlock value={step.output} />
            </div>
          </div>

          {/* error */}
          {step.errorMessage && (
            <div style={{ marginTop: "10px" }}>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--error)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                }}
              >
                Error
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--error)",
                  background: "var(--error-subtle)",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "10px 12px",
                }}
              >
                {step.errorMessage}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── artifact block ────────────────────────────────────────────────────────────

function ArtifactRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "9px 12px",
          background: "none",
          border: "none",
          borderBottom: open ? "1px solid var(--border-subtle)" : "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 150ms ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--border-subtle)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            flex: 1,
          }}
        >
          {label}
        </span>
        <span style={{ color: "var(--muted)" }}>
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && <div style={{ padding: "10px 12px" }}>{children}</div>}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const artifactBlockStyle: React.CSSProperties = {
  background: "#f9f9f7",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "12px",
  color: "#374151",
};

export function ExecutionDetailClient({ execution }: { execution: ExecutionDetailProps }) {
  const { artifacts } = execution;
  const hasArtifacts = Boolean(
    artifacts.selectedSlot ||
      artifacts.createdEvent ||
      artifacts.replyDraft ||
      artifacts.attendeeResearch ||
      artifacts.companyResearch ||
      artifacts.preMeetingNotes ||
      artifacts.fallbackSlots
  );

  const successCount = execution.steps.filter((s) => s.status === "success").length;
  const failedCount = execution.steps.filter((s) => s.status === "failed").length;

  return (
    <div>
      {/* ── Summary ── */}
      <Section title="Summary" defaultOpen>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <StatusBadge status={execution.status} />
          <TriggerBadge triggerType={execution.triggerType} />
        </div>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 24px",
            fontSize: "13px",
          }}
        >
          <div>
            <dt style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)", marginBottom: "3px" }}>
              Workflow
            </dt>
            <dd style={{ fontWeight: 500 }}>
              <Link
                href={`/workflows/${execution.workflowId}`}
                className="hover-link"
                style={{ color: "var(--foreground)" }}
              >
                {execution.workflowName}
              </Link>
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)", marginBottom: "3px" }}>
              Execution ID
            </dt>
            <dd style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--foreground)" }}>
              {execution.id}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)", marginBottom: "3px" }}>
              Started
            </dt>
            <dd style={{ color: "var(--foreground)" }}>{formatDate(execution.startedAt)}</dd>
          </div>
          <div>
            <dt style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)", marginBottom: "3px" }}>
              Completed
            </dt>
            <dd style={{ color: "var(--foreground)" }}>{formatDate(execution.completedAt)}</dd>
          </div>
          <div>
            <dt style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)", marginBottom: "3px" }}>
              Duration
            </dt>
            <dd style={{ color: "var(--foreground)" }}>
              {duration(execution.startedAt, execution.completedAt) || "—"}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)", marginBottom: "3px" }}>
              Steps
            </dt>
            <dd style={{ color: "var(--foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
              {execution.steps.length} total
              {successCount > 0 && (
                <span style={{ fontSize: "11px", color: "#22c55e" }}>{successCount} ok</span>
              )}
              {failedCount > 0 && (
                <span style={{ fontSize: "11px", color: "#ef4444" }}>{failedCount} failed</span>
              )}
            </dd>
          </div>
          {execution.errorMessage && (
            <div style={{ gridColumn: "1 / -1" }}>
              <dt
                style={{ fontSize: "11px", fontWeight: 500, color: "var(--error)", marginBottom: "3px" }}
              >
                Error
              </dt>
              <dd
                style={{
                  fontSize: "12px",
                  color: "var(--error)",
                  background: "var(--error-subtle)",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "8px 10px",
                }}
              >
                {execution.errorMessage}
              </dd>
            </div>
          )}
        </dl>
      </Section>

      {/* ── Trigger Payload ── */}
      <Section title="Trigger Payload" defaultOpen={false}>
        <JsonBlock value={execution.triggerPayload} />
      </Section>

      {/* ── Artifacts ── */}
      {hasArtifacts && (
        <Section
          title="Artifacts"
          subtitle="Key outputs produced by this run"
          defaultOpen
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Boolean(artifacts.selectedSlot) && (
              <ArtifactRow label="Selected Slot">
                <JsonBlock value={artifacts.selectedSlot} />
              </ArtifactRow>
            )}
            {Boolean(artifacts.createdEvent) && (
              <ArtifactRow label="Created Event">
                <JsonBlock value={artifacts.createdEvent} />
              </ArtifactRow>
            )}
            {artifacts.replyDraft && (
              <ArtifactRow label="Reply Draft">
                <pre className="whitespace-pre-wrap font-mono leading-relaxed" style={artifactBlockStyle}>
                  {artifacts.replyDraft}
                </pre>
              </ArtifactRow>
            )}
            {artifacts.attendeeResearch && (
              <ArtifactRow label="Attendee Research">
                <p className="leading-relaxed" style={{ ...artifactBlockStyle, fontSize: "13px" }}>
                  {artifacts.attendeeResearch}
                </p>
              </ArtifactRow>
            )}
            {artifacts.companyResearch && (
              <ArtifactRow label="Company Research">
                <p className="leading-relaxed" style={{ ...artifactBlockStyle, fontSize: "13px" }}>
                  {artifacts.companyResearch}
                </p>
              </ArtifactRow>
            )}
            {artifacts.preMeetingNotes && (
              <ArtifactRow label="Pre-Meeting Notes">
                <pre className="whitespace-pre-wrap font-mono leading-relaxed" style={artifactBlockStyle}>
                  {artifacts.preMeetingNotes}
                </pre>
              </ArtifactRow>
            )}
            {Boolean(artifacts.fallbackSlots) && (
              <ArtifactRow label="Fallback Slots">
                <JsonBlock value={artifacts.fallbackSlots} />
              </ArtifactRow>
            )}
          </div>
        </Section>
      )}

      {/* ── Step Timeline ── */}
      <Section
        title="Step Timeline"
        subtitle={`${execution.steps.length} steps`}
        defaultOpen
      >
        {execution.steps.length === 0 ? (
          <EmptyState message="No steps recorded for this execution." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {execution.steps.map((step, i) => (
              <StepCard key={step.id} step={step} index={i} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
