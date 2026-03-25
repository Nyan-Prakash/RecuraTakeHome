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
    // Update the event in local state immediately
    setEvents((prev) =>
      prev.map((e) => (e.id === result.event.id ? { ...e, status: "cancelled" } : e))
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Events created by workflow runs. Cancelling an event triggers the Event Cancellation workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadEvents()}
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-3 py-1.5"
        >
          Refresh
        </button>
      </div>

      {/* Last cancel result banner */}
      {lastCancelResult && (
        <div className="mb-5 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-orange-800">
              Event cancelled — Event Cancellation Handler triggered
            </p>
            <button
              type="button"
              onClick={() => setLastCancelResult(null)}
              className="text-xs text-orange-400 hover:text-orange-600"
            >
              Dismiss
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <StatusBadge status={lastCancelResult.execution.status} />
            <span className="text-orange-700 text-xs">
              {lastCancelResult.execution.steps.length} steps run
            </span>
            <Link
              href={`/executions/${lastCancelResult.execution.workflowExecutionId}`}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View execution →
            </Link>
          </div>
          {lastCancelResult.execution.errorMessage && (
            <p className="mt-1 text-xs text-red-600">{lastCancelResult.execution.errorMessage}</p>
          )}
        </div>
      )}

      {loading && (
        <p className="text-sm text-gray-400">Loading events…</p>
      )}

      {!loading && error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <EmptyState
          message="No calendar events yet. Run the Meeting Request Processor to create one."
        />
      )}

      {!loading && !error && events.length > 0 && (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white border border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-gray-900">{event.title}</h2>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    {formatDateTime(event.startTime)} → {formatDateTime(event.endTime)}
                  </div>
                  {event.description && (
                    <p className="text-sm text-gray-500 mb-2">{event.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    {event.meetingSummary && (
                      <span>Summary available</span>
                    )}
                    {event.attendeeResearch && (
                      <span>Attendee research available</span>
                    )}
                    {event.preMeetingNotes && (
                      <span>Pre-meeting notes available</span>
                    )}
                    {event.sourceWorkflowExecutionId && (
                      <Link
                        href={`/executions/${event.sourceWorkflowExecutionId}`}
                        className="text-indigo-500 hover:text-indigo-700"
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
