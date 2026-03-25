"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { CancelEventButton } from "@/components/CancelEventButton";
import type { CalendarEventItem, WorkflowRunResult } from "@/lib/api/types";

type CancelResult = {
  event: CalendarEventItem;
  execution: WorkflowRunResult;
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const dateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(s);
  const startTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(s);
  const endTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(e);
  return `${dateStr}, ${startTime} – ${endTime}`;
}

function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));

  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ---- Event chip ----
function EventChip({
  event,
  onClick,
}: {
  event: CalendarEventItem;
  onClick: () => void;
}) {
  const isCancelled = event.status === "cancelled";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        width: "100%",
        padding: "2px 5px",
        borderRadius: "4px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        cursor: "pointer",
        textAlign: "left",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
        (e.currentTarget as HTMLElement).style.borderColor = "#c7d2fe";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--surface)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
      }}
    >
      {/* Color dot */}
      <span
        style={{
          flexShrink: 0,
          width: "3px",
          height: "22px",
          borderRadius: "2px",
          background: isCancelled ? "var(--muted)" : "#6366f1",
        }}
      />
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <span
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 500,
            color: isCancelled ? "var(--muted)" : "var(--foreground)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textDecoration: isCancelled ? "line-through" : "none",
          }}
        >
          {event.title}
        </span>
        <span
          style={{
            display: "block",
            fontSize: "10px",
            color: "var(--muted)",
          }}
        >
          {formatTime(event.startTime)}
        </span>
      </span>
    </button>
  );
}

// ---- Event detail modal ----
function EventDetailModal({
  event,
  onClose,
  onCancelled,
}: {
  event: CalendarEventItem;
  onClose: () => void;
  onCancelled: (result: CancelResult) => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 40,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 50,
          width: "min(480px, 90vw)",
          maxHeight: "80vh",
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted)",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
            (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLElement).style.background = "none";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Title + status */}
        <div style={{ paddingRight: "28px", marginBottom: "4px" }}>
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--foreground)",
              letterSpacing: "-0.01em",
              marginBottom: "6px",
            }}
          >
            {event.title}
          </h2>
          <StatusBadge status={event.status} />
        </div>

        {/* Date/time range */}
        <p
          style={{
            fontSize: "12px",
            color: "var(--muted)",
            marginTop: "10px",
            marginBottom: "12px",
          }}
        >
          {formatDateTimeRange(event.startTime, event.endTime)}
        </p>

        {/* Description */}
        {event.description && (
          <p
            style={{
              fontSize: "13px",
              color: "var(--foreground)",
              lineHeight: "1.55",
              marginBottom: "14px",
              padding: "10px 12px",
              background: "var(--accent-subtle)",
              borderRadius: "8px",
            }}
          >
            {event.description}
          </p>
        )}

        {/* Metadata tags */}
        {(event.meetingSummary || event.attendeeResearch || event.preMeetingNotes) && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginBottom: "14px",
            }}
          >
            {event.meetingSummary && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "99px",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  background: "var(--border-subtle)",
                }}
              >
                Summary available
              </span>
            )}
            {event.attendeeResearch && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "99px",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  background: "var(--border-subtle)",
                }}
              >
                Attendee research
              </span>
            )}
            {event.preMeetingNotes && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "99px",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  background: "var(--border-subtle)",
                }}
              >
                Pre-meeting notes
              </span>
            )}
          </div>
        )}

        {/* Source execution link */}
        {event.sourceWorkflowExecutionId && (
          <div style={{ marginBottom: "16px" }}>
            <Link
              href={`/executions/${event.sourceWorkflowExecutionId}`}
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--accent)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
            >
              View source execution →
            </Link>
          </div>
        )}

        {/* Cancel button */}
        {event.status === "scheduled" && (
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "14px",
            }}
          >
            <CancelEventButton
              eventId={event.id}
              onCancelled={(result) => {
                onCancelled(result);
                onClose();
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default function CalendarPage() {
  const today = new Date();
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCancelResult, setLastCancelResult] = useState<CancelResult | null>(null);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);

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

  // Build O(1) lookup map: "YYYY-MM-DD" -> events[]
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const event of events) {
      const key = toDateKey(new Date(event.startTime));
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }
    return map;
  }, [events]);

  const calendarCells = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const todayKey = toDateKey(today);

  function goToPrevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function goToNextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
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
            <p className="text-sm font-medium" style={{ color: "#92400e" }}>
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

      {/* Loading */}
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

      {/* Error */}
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

      {/* Calendar */}
      {!loading && !error && (
        <>
          {/* Month navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <button
              type="button"
              onClick={goToPrevMonth}
              className="inline-flex items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer"
              style={{
                width: "28px",
                height: "28px",
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
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={goToNextMonth}
              className="inline-flex items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer"
              style={{
                width: "28px",
                height: "28px",
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
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <h2
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "-0.01em",
                margin: "0 4px",
              }}
            >
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>

            {(viewYear !== today.getFullYear() || viewMonth !== today.getMonth()) && (
              <button
                type="button"
                onClick={goToToday}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer"
                style={{
                  color: "var(--accent)",
                  borderColor: "#c7d2fe",
                  background: "var(--accent-subtle)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#e0e7ff";
                  (e.currentTarget as HTMLElement).style.borderColor = "#a5b4fc";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
                  (e.currentTarget as HTMLElement).style.borderColor = "#c7d2fe";
                }}
              >
                Today
              </button>
            )}
          </div>

          {/* Calendar grid */}
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "12px",
              overflow: "hidden",
              background: "var(--surface)",
            }}
          >
            {/* Day-of-week headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  style={{
                    padding: "8px 4px",
                    textAlign: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--muted)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    borderRight: "1px solid var(--border)",
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              }}
            >
              {calendarCells.map((cellDate, idx) => {
                const isOutside = cellDate === null;
                const cellKey = cellDate ? toDateKey(cellDate) : `empty-${idx}`;
                const isToday = cellDate ? toDateKey(cellDate) === todayKey : false;
                const cellEvents = cellDate ? (eventsByDate.get(cellKey) ?? []) : [];
                const visibleEvents = cellEvents.slice(0, 2);
                const overflowCount = cellEvents.length - 2;
                const col = idx % 7;
                const isLastCol = col === 6;
                const totalRows = calendarCells.length / 7;
                const row = Math.floor(idx / 7);
                const isLastRow = row === totalRows - 1;

                return (
                  <div
                    key={cellKey}
                    style={{
                      minHeight: "120px",
                      padding: "6px",
                      background: isToday ? "var(--accent-subtle)" : "transparent",
                      opacity: isOutside ? 0.35 : 1,
                      borderRight: isLastCol ? "none" : "1px solid var(--border)",
                      borderBottom: isLastRow ? "none" : "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    {/* Date number */}
                    {cellDate && (
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: isToday ? 700 : 400,
                          color: isToday ? "var(--accent)" : "var(--muted)",
                          alignSelf: "flex-start",
                          lineHeight: 1,
                          marginBottom: "2px",
                        }}
                      >
                        {cellDate.getDate()}
                      </span>
                    )}

                    {/* Event chips */}
                    {visibleEvents.map((event) => (
                      <EventChip
                        key={event.id}
                        event={event}
                        onClick={() => setSelectedEvent(event)}
                      />
                    ))}

                    {/* Overflow indicator */}
                    {overflowCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          // Show the first overflow event as a representative
                          setSelectedEvent(cellEvents[2]);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "1px 4px",
                          fontSize: "10px",
                          fontWeight: 500,
                          color: "var(--accent)",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.color = "var(--accent-hover)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.color = "var(--accent)")
                        }
                      >
                        +{overflowCount} more
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empty state (no events at all) */}
          {events.length === 0 && (
            <div style={{ marginTop: "24px" }}>
              <EmptyState message="No calendar events yet. Run the Meeting Request Processor to create one." />
            </div>
          )}
        </>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onCancelled={(result) => {
            handleCancelled(result);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}
