/**
 * Calendar service — deterministic scheduling logic.
 *
 * Assumptions:
 * - Working hours: 09:00–17:00
 * - Default meeting duration: 30 minutes
 * - Cancelled events do not block time
 * - No timezone conversion (local time only)
 */

import { prisma } from "../db/client";
import { createCalendarEvent as dbCreateCalendarEvent } from "../db/calendarEvents";
import type {
  AvailabilityWindow,
  CancelledEvent,
  CreatedEvent,
  FallbackSlot,
  SelectedSlot,
} from "../workflow-engine/types";

// ---------------------------------------------------------------------------
// Time utilities
// ---------------------------------------------------------------------------

function parseTime(hhMm: string): number {
  const parts = hhMm.split(":");
  const h = Number(parts[0] ?? "0");
  const m = Number(parts[1] ?? "0");
  return h * 60 + m;
}

function toIsoDateTime(date: string, hhMm: string): string {
  return `${date}T${hhMm}:00`;
}

function addMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mon}-${day}`;
}

function toHhMm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Get next N business days (Mon–Fri) after the given date
function nextBusinessDays(afterDate: Date, count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date(afterDate);
  cursor.setDate(cursor.getDate() + 1);
  while (days.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// ---------------------------------------------------------------------------
// Scheduled event blocking — fetch occupied slots for a given date
// ---------------------------------------------------------------------------

async function getBlockedSlots(
  date: string
): Promise<Array<{ start: number; end: number }>> {
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const events = await prisma.calendarEvent.findMany({
    where: {
      status: "scheduled",
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  return events.map((e) => ({
    start: parseTime(toHhMm(e.startTime)),
    end: parseTime(toHhMm(e.endTime)),
  }));
}

function isBlocked(
  slotStartMin: number,
  slotEndMin: number,
  blocked: Array<{ start: number; end: number }>
): boolean {
  for (const b of blocked) {
    if (slotStartMin < b.end && slotEndMin > b.start) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// findOpenSlot
// ---------------------------------------------------------------------------

export async function findOpenSlot(args: {
  availabilityWindows: AvailabilityWindow[];
  meetingDurationMinutes?: number;
}): Promise<{ selectedSlot: SelectedSlot; candidateSlots: SelectedSlot[] }> {
  const duration = args.meetingDurationMinutes ?? 30;
  const candidates: SelectedSlot[] = [];

  for (const window of args.availabilityWindows) {
    const blocked = await getBlockedSlots(window.date);
    const windowStart = parseTime(window.start);
    const windowEnd = parseTime(window.end);

    let cursor = windowStart;
    while (cursor + duration <= windowEnd) {
      const slotEnd = cursor + duration;
      if (!isBlocked(cursor, slotEnd, blocked)) {
        const startHhMm = addMinutes(cursor);
        const endHhMm = addMinutes(slotEnd);
        candidates.push({
          startTime: toIsoDateTime(window.date, startHhMm),
          endTime: toIsoDateTime(window.date, endHhMm),
          durationMinutes: duration,
        });
      }
      cursor += 30; // advance in 30-minute increments
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      "No open slot found for the provided availability windows. All times are either outside working hours or blocked by existing events."
    );
  }

  return { selectedSlot: candidates[0]!, candidateSlots: candidates };
}

// ---------------------------------------------------------------------------
// createCalendarEvent
// ---------------------------------------------------------------------------

export async function createCalendarEvent(args: {
  selectedSlot: SelectedSlot;
  summary?: string;
  attendeeResearch?: string;
  companyResearch?: string;
  preMeetingNotes?: string;
  sourceWorkflowExecutionId?: string | null;
}): Promise<CreatedEvent> {
  const title = args.summary
    ? args.summary.slice(0, 100)
    : "Meeting";

  const descriptionParts: string[] = [];
  if (args.preMeetingNotes) descriptionParts.push(args.preMeetingNotes);

  const event = await dbCreateCalendarEvent({
    title,
    description: descriptionParts.join("\n") || undefined,
    startTime: new Date(args.selectedSlot.startTime),
    endTime: new Date(args.selectedSlot.endTime),
    meetingSummary: args.summary,
    attendeeResearch: args.attendeeResearch,
    companyResearch: args.companyResearch,
    preMeetingNotes: args.preMeetingNotes,
    sourceWorkflowExecutionId: args.sourceWorkflowExecutionId ?? undefined,
  });

  return {
    id: event.id,
    title: event.title,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    description: event.description ?? "",
  };
}

// ---------------------------------------------------------------------------
// loadCancelledEvent
// ---------------------------------------------------------------------------

export async function loadCancelledEvent(eventId: string): Promise<{
  cancelledEvent: CancelledEvent;
  attendees?: string[];
  priorMeetingContext?: string;
}> {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error(`loadCancelledEvent: event not found for id "${eventId}"`);
  }

  const cancelledEvent: CancelledEvent = {
    id: event.id,
    title: event.title,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    description: event.description ?? undefined,
  };

  // Build lightweight prior context from stored enrichment fields
  const contextParts: string[] = [];
  if (event.meetingSummary) contextParts.push(`Meeting summary: ${event.meetingSummary}`);
  if (event.preMeetingNotes) contextParts.push(`Pre-meeting notes: ${event.preMeetingNotes}`);

  return {
    cancelledEvent,
    priorMeetingContext: contextParts.length > 0 ? contextParts.join("\n") : undefined,
  };
}

// ---------------------------------------------------------------------------
// findFallbackSlots
// ---------------------------------------------------------------------------

export async function findFallbackSlots(args: {
  cancelledEvent: CancelledEvent;
  count?: number;
}): Promise<FallbackSlot[]> {
  const { cancelledEvent } = args;
  const targetCount = args.count ?? 3;
  const duration = 30;

  const anchorDate = new Date(cancelledEvent.startTime);
  const businessDays = nextBusinessDays(anchorDate, 5); // look at next 5 business days

  // Original event's time of day as anchor
  const originalStartHhMm = toHhMm(anchorDate);
  const originalStartMin = parseTime(originalStartHhMm);

  const slots: FallbackSlot[] = [];

  for (const day of businessDays) {
    if (slots.length >= targetCount) break;
    const dateStr = toDateString(day);
    const blocked = await getBlockedSlots(dateStr);

    // Try the same time first, then working-hours slots (deduplicate by minute value)
    const candidateSet = new Set([originalStartMin, parseTime("09:00"), parseTime("14:00")]);
    const candidates = Array.from(candidateSet);
    for (const startMin of candidates) {
      if (slots.length >= targetCount) break;
      const endMin = startMin + duration;
      // Must be within 09:00–17:00
      if (startMin < parseTime("09:00") || endMin > parseTime("17:00")) continue;
      if (isBlocked(startMin, endMin, blocked)) continue;

      const startHhMm = addMinutes(startMin);
      const endHhMm = addMinutes(endMin);
      slots.push({
        startTime: toIsoDateTime(dateStr, startHhMm),
        endTime: toIsoDateTime(dateStr, endHhMm),
      });
    }
  }

  if (slots.length === 0) {
    throw new Error("findFallbackSlots: no available fallback slots found in the next 5 business days");
  }

  return slots;
}
