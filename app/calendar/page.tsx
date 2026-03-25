"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { CancelEventButton } from "@/components/CancelEventButton";
import type { CalendarEventItem, WorkflowRunResult } from "@/lib/api/types";

type CancelResult = {
  event: CalendarEventItem;
  execution: WorkflowRunResult;
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCancelResult, setLastCancelResult] = useState<CancelResult | null>(null);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/events");
      if (!res.ok) throw new Error("Failed to load events");
      const data = (await res.json()) as { events: CalendarEventItem[] };
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  function handleCancelled(result: CancelResult) {
    setLastCancelResult(result);
    setEvents((prev) =>
      prev.map((e) => (e.id === result.event.id ? { ...e, status: "cancelled" } : e))
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1
            className="font-semibold"
            style={{
              fontSize: "20px",
              color: "var(--foreground)",
              letterSpacing: "-0.02em",
            }}
          >
            Calendar
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Events created by workflow runs. Cancelling an event triggers the Event Cancellation workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadEvents()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer"
          style={{
            color: "var(--muted)",
            borderColor: "var(--border)",
            background: "var(--surface)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
            (e.currentTarget as HTMLElement).style.borderColor = "#c7d2fe";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Cancel result banner */}
      {lastCancelResult && (
        <div
          className="mb-5 rounded-xl p-4 border"
          style={{
            background: "var(--warning-subtle)",
            borderColor: "#fde68a",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-sm font-medium"
              style={{ color: "#92400e" }}
            >
              Event cancelled — Event Cancellation Handler triggered
            </p>
            <button
              type="button"
              onClick={() => setLastCancelResult(null)}
              className="text-xs transition-colors cursor-pointer"
              style={{ color: "#d97706" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#92400e")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#d97706")}
            >
              Dismiss
            </button>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={lastCancelResult.execution.status} />
            <span className="text-xs" style={{ color: "#a16207" }}>
              {lastCancelResult.execution.steps.length} steps run
            </span>
            <Link
              href={`/executions/${lastCancelResult.execution.workflowExecutionId}`}
              className="text-xs font-medium transition-colors"
              style={{ color: "var(--accent)", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
            >
              View execution →
            </Link>
          </div>
          {lastCancelResult.execution.errorMessage && (
            <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>
              {lastCancelResult.execution.errorMessage}
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-8">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--muted)" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Loading events…
          </p>
        </div>
      )}

      {!loading && error && (
        <div
          className="p-3.5 rounded-lg text-sm"
          style={{
            background: "var(--error-subtle)",
            border: "1px solid #fecaca",
            color: "var(--error)",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <EmptyState message="No calendar events yet. Run the Meeting Request Processor to create one." />
      )}

      {!loading && !error && events.length > 0 && (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl p-5 border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h2
                      className="font-medium text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {event.title}
                    </h2>
                    <StatusBadge status={event.status} />
                  </div>
                  <div
                    className="text-xs mb-2 font-medium"
                    style={{ color: "var(--muted)" }}
                  >
                    {formatDateTime(event.startTime)} → {formatDateTime(event.endTime)}
                  </div>
                  {event.description && (
                    <p
                      className="text-xs mb-2.5 leading-relaxed"
                      style={{ color: "var(--muted)" }}
                    >
                      {event.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {event.meetingSummary && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border"
                        style={{
                          color: "var(--muted)",
                          borderColor: "var(--border)",
                          background: "var(--border-subtle)",
                        }}
                      >
                        Summary available
                      </span>
                    )}
                    {event.attendeeResearch && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border"
                        style={{
                          color: "var(--muted)",
                          borderColor: "var(--border)",
                          background: "var(--border-subtle)",
                        }}
                      >
                        Attendee research
                      </span>
                    )}
                    {event.preMeetingNotes && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border"
                        style={{
                          color: "var(--muted)",
                          borderColor: "var(--border)",
                          background: "var(--border-subtle)",
                        }}
                      >
                        Pre-meeting notes
                      </span>
                    )}
                    {event.sourceWorkflowExecutionId && (
                      <Link
                        href={`/executions/${event.sourceWorkflowExecutionId}`}
                        className="text-xs font-medium transition-colors"
                        style={{ color: "var(--accent)", textDecoration: "none" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
                      >
                        Source execution →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {event.status === "scheduled" && (
                    <CancelEventButton
                      eventId={event.id}
                      onCancelled={handleCancelled}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
