/**
 * Smoke test for real service implementations.
 *
 * Run with: npx tsx scripts/real-services-smoke.ts
 *
 * Tests end-to-end: meeting workflow → calendar event created → cancel → reschedule workflow
 */

import "dotenv/config";
import { getAllWorkflows } from "../lib/db/workflows";
import { getCalendarEvents, getCalendarEventById } from "../lib/db/calendarEvents";
import { getExecutionById } from "../lib/db/executions";
import { executeWorkflow } from "../lib/workflow-engine/engine";
import { prisma } from "../lib/db/client";

const AI_MODE = process.env.OPENAI_API_KEY
  ? "real OpenAI (" + (process.env.OPENAI_MODEL ?? "gpt-4o-mini") + ")"
  : "fallback (no API key)";

function pass(label: string) {
  console.log(`  ✓ ${label}`);
}

async function main() {
  console.log("=== Real Services Smoke Test ===");
  console.log(`AI mode: ${AI_MODE}\n`);

  const workflows = await getAllWorkflows();
  const meetingWf = workflows.find((w) => w.triggerType === "meeting_request_received");
  const cancelWf = workflows.find((w) => w.triggerType === "meeting_reschedule_requested");
  if (!meetingWf) throw new Error("Meeting workflow not found");
  if (!cancelWf) throw new Error("Cancellation workflow not found");

  // ------------------------------------------------------------------
  // 1. Run meeting workflow with sample email
  // ------------------------------------------------------------------
  console.log("1. Running Meeting Request Processor...");
  const meetingResult = await executeWorkflow({
    workflowId: meetingWf.id,
    triggerPayload: {
      emailText:
        "Hi Mark, I'd love to talk about a design partner opportunity. I'm free Tuesday afternoon or Thursday morning. Let me know what works best.",
    },
  });

  if (meetingResult.status !== "success") {
    console.error("Meeting workflow FAILED:", meetingResult.errorMessage);
    for (const s of meetingResult.steps) {
      console.error(`  [${s.status}] ${s.actionType}: ${s.errorMessage ?? ""}`);
    }
    throw new Error("Meeting workflow failed");
  }

  pass(`workflow succeeded — ${meetingResult.steps.length} steps`);
  pass(`execution ID: ${meetingResult.workflowExecutionId}`);

  // Verify a calendar event was created
  const createdEvent = meetingResult.context.createdEvent;
  if (!createdEvent) throw new Error("No createdEvent in context after meeting workflow");
  pass(`created event: "${createdEvent.title}" (${createdEvent.startTime})`);

  // Confirm the event is in the DB
  const dbEvent = await getCalendarEventById(createdEvent.id);
  if (!dbEvent) throw new Error("Created event not found in DB");
  if (dbEvent.status !== "scheduled") throw new Error(`Expected status=scheduled, got ${dbEvent.status}`);
  pass(`event in DB: id=${dbEvent.id}, status=${dbEvent.status}`);
  pass(`event has meetingSummary: ${Boolean(dbEvent.meetingSummary)}`);
  pass(`event linked to execution: ${dbEvent.sourceWorkflowExecutionId === meetingResult.workflowExecutionId}`);

  // Log context artifacts
  const ctx = meetingResult.context;
  if (ctx.summary) pass(`summary: "${ctx.summary.slice(0, 80)}"`);
  if (ctx.selectedSlot) pass(`selected slot: ${ctx.selectedSlot.startTime}`);
  if (ctx.replyDraft) pass(`reply draft generated (${ctx.replyDraft.length} chars)`);

  // ------------------------------------------------------------------
  // 2. Verify calendar events API shape
  // ------------------------------------------------------------------
  console.log("\n2. Checking calendar events...");
  const events = await getCalendarEvents();
  const found = events.find((e) => e.id === createdEvent.id);
  if (!found) throw new Error("Created event not visible in getCalendarEvents()");
  pass(`event appears in calendar list (${events.length} total events)`);

  // ------------------------------------------------------------------
  // 3. Cancel the event and trigger cancellation workflow
  // ------------------------------------------------------------------
  console.log("\n3. Running Event Cancellation Handler...");

  // We need to update the event to cancelled first (mimicking the API route)
  await prisma.calendarEvent.update({
    where: { id: createdEvent.id },
    data: { status: "cancelled" },
  });
  pass(`event marked cancelled in DB`);

  const cancelResult = await executeWorkflow({
    workflowId: cancelWf.id,
    triggerPayload: {
      eventId: createdEvent.id,
      reason: "smoke_test",
      source: "script",
    },
  });

  if (cancelResult.status !== "success") {
    console.error("Cancellation workflow FAILED:", cancelResult.errorMessage);
    for (const s of cancelResult.steps) {
      console.error(`  [${s.status}] ${s.actionType}: ${s.errorMessage ?? ""}`);
    }
    throw new Error("Cancellation workflow failed");
  }

  pass(`cancellation workflow succeeded — ${cancelResult.steps.length} steps`);
  pass(`execution ID: ${cancelResult.workflowExecutionId}`);

  const cancelCtx = cancelResult.context;
  if (cancelCtx.cancelledEvent) {
    pass(`loaded cancelled event: "${cancelCtx.cancelledEvent.title}"`);
  }
  if (cancelCtx.fallbackSlots && cancelCtx.fallbackSlots.length > 0) {
    pass(`fallback slots: ${cancelCtx.fallbackSlots.length} slots found`);
    for (const slot of cancelCtx.fallbackSlots) {
      console.log(`    - ${slot.startTime} → ${slot.endTime}`);
    }
  }
  if (cancelCtx.replyDraft) {
    pass(`reschedule draft generated (${cancelCtx.replyDraft.length} chars)`);
  }

  // ------------------------------------------------------------------
  // 4. Verify step execution records in DB
  // ------------------------------------------------------------------
  console.log("\n4. Verifying DB persistence...");
  const meetingExec = await getExecutionById(meetingResult.workflowExecutionId);
  if (!meetingExec) throw new Error("Meeting execution not in DB");
  pass(`meeting execution persisted: ${meetingExec.steps.length} step records`);

  const cancelExec = await getExecutionById(cancelResult.workflowExecutionId);
  if (!cancelExec) throw new Error("Cancellation execution not in DB");
  pass(`cancellation execution persisted: ${cancelExec.steps.length} step records`);

  console.log("\n=== All checks passed ===");
  console.log(`AI mode used: ${AI_MODE}`);
}

main()
  .catch((err) => {
    console.error("\nSmoke test FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
