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
        className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Cancelling…" : "Cancel event"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

