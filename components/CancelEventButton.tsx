"use client";

import { useState } from "react";
import type { CalendarEventItem, WorkflowRunResult } from "@/lib/api/types";

type CancelResult = {
  event: CalendarEventItem;
  execution: WorkflowRunResult;
};

export function CancelEventButton({
  eventId,
  onCancelled,
}: {
  eventId: string;
  onCancelled: (result: CancelResult) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm("Cancel this event? This will trigger the Event Cancellation Handler workflow.")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/events/${eventId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as CancelResult;
      onCancelled(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleCancel()}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "#fef2f2",
          color: "#dc2626",
          borderColor: "#fecaca",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            (e.currentTarget as HTMLElement).style.background = "#fee2e2";
            (e.currentTarget as HTMLElement).style.borderColor = "#fca5a5";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "#fef2f2";
          (e.currentTarget as HTMLElement).style.borderColor = "#fecaca";
        }}
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Cancelling…
          </>
        ) : (
          "Cancel event"
        )}
      </button>
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
