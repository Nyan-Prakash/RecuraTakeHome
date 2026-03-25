/**
 * API layer smoke test — tests DB helpers and engine directly
 * (no HTTP server needed).
 *
 * Run with: npx tsx scripts/api-smoke.ts
 */

import { getAllWorkflows, getWorkflowById, getActiveWorkflowByTriggerType } from "../lib/db/workflows";
import { getExecutions, getExecutionById } from "../lib/db/executions";
import { getCalendarEvents, createCalendarEvent, cancelCalendarEvent, getCalendarEventById } from "../lib/db/calendarEvents";
import { executeWorkflow } from "../lib/workflow-engine/engine";
import { prisma } from "../lib/db/client";

function pass(label: string) {
  console.log(`  ✓ ${label}`);
}

function fail(label: string, err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`  ✗ ${label}: ${msg}`);
  throw err;
}

async function main() {
  console.log("=== API Layer Smoke Test ===\n");

  // ------------------------------------------------------------------
  // 1. GET workflows
  // ------------------------------------------------------------------
  console.log("1. GET /api/workflows");
  const workflows = await getAllWorkflows().catch((e) => fail("getAllWorkflows", e));
  if (workflows.length !== 2) throw new Error(`Expected 2 workflows, got ${workflows.length}`);
  pass(`returned ${workflows.length} workflows`);
  for (const wf of workflows) {
    pass(`  [${wf.triggerType}] "${wf.name}" — ${wf.actions.length} actions`);
  }

  // ------------------------------------------------------------------
  // 2. GET workflow by ID
  // ------------------------------------------------------------------
  console.log("\n2. GET /api/workflows/:id");
  const meetingWorkflow = workflows.find((w) => w.triggerType === "meeting_request_received");
  if (!meetingWorkflow) throw new Error("Meeting workflow not found");
  const wfById = await getWorkflowById(meetingWorkflow.id).catch((e) => fail("getWorkflowById", e));
  if (!wfById) throw new Error("Expected workflow, got null");
  pass(`fetched "${wfById.name}" with ${wfById.actions.length} ordered actions`);

  // ------------------------------------------------------------------
  // 3. POST /api/workflows/:id/execute — meeting workflow
  // ------------------------------------------------------------------
  console.log("\n3. POST /api/workflows/:id/execute — meeting request");
  const meetingResult = await executeWorkflow({
    workflowId: meetingWorkflow.id,
    triggerPayload: {
      emailText: "Hi, I'd love to connect next week. I'm free Tuesday afternoon or Thursday morning.",
    },
  }).catch((e) => fail("executeWorkflow (meeting)", e));
  if (meetingResult.status !== "success") throw new Error(`Expected success, got ${meetingResult.status}`);
  pass(`execution succeeded — ID: ${meetingResult.workflowExecutionId}`);
  pass(`${meetingResult.steps.length} steps all succeeded`);

  // ------------------------------------------------------------------
  // 4. GET /api/executions
  // ------------------------------------------------------------------
  console.log("\n4. GET /api/executions");
  const executions = await getExecutions().catch((e) => fail("getExecutions", e));
  if (executions.length === 0) throw new Error("Expected at least one execution");
  pass(`returned ${executions.length} execution(s)`);
  pass(`most recent: [${executions[0]!.status}] ${executions[0]!.workflowName}`);

  // ------------------------------------------------------------------
  // 5. GET /api/executions/:id — detail with steps
  // ------------------------------------------------------------------
  console.log("\n5. GET /api/executions/:id");
  const latestExecution = executions[0]!;
  const executionDetail = await getExecutionById(latestExecution.id).catch((e) => fail("getExecutionById", e));
  if (!executionDetail) throw new Error("Expected execution detail, got null");
  pass(`fetched execution detail — ${executionDetail.steps.length} step(s)`);
  for (const step of executionDetail.steps.slice(0, 3)) {
    pass(`  [${step.status}] ${step.actionType} — input parsed: ${step.input !== null}, output parsed: ${step.output !== null}`);
  }

  // ------------------------------------------------------------------
  // 6. GET /api/calendar/events
  // ------------------------------------------------------------------
  console.log("\n6. GET /api/calendar/events");
  const events = await getCalendarEvents().catch((e) => fail("getCalendarEvents", e));
  pass(`returned ${events.length} calendar event(s)`);

  // ------------------------------------------------------------------
  // 7. POST /api/calendar/events/:id/cancel
  // ------------------------------------------------------------------
  console.log("\n7. POST /api/calendar/events/:id/cancel");

  // Create a test event
  const testEvent = await createCalendarEvent({
    title: "Test Meeting for Cancellation",
    description: "Smoke test event",
    startTime: new Date("2025-03-01T10:00:00Z"),
    endTime: new Date("2025-03-01T10:30:00Z"),
  });
  pass(`created test event: ${testEvent.id}`);

  // Find cancellation workflow
  const cancellationWorkflow = await getActiveWorkflowByTriggerType("meeting_reschedule_requested").catch((e) => fail("getActiveWorkflowByTriggerType", e));
  if (!cancellationWorkflow) throw new Error("No active meeting_reschedule_requested workflow found");
  pass(`found cancellation workflow: "${cancellationWorkflow.name}"`);

  // Cancel event + execute workflow
  const cancelledEvent = await cancelCalendarEvent(testEvent.id).catch((e) => fail("cancelCalendarEvent", e));
  if (cancelledEvent.status !== "cancelled") throw new Error("Event not cancelled");
  pass(`event status updated to "cancelled"`);

  const cancellationResult = await executeWorkflow({
    workflowId: cancellationWorkflow.id,
    triggerPayload: {
      eventId: testEvent.id,
      reason: "manual_cancel",
      source: "calendar_ui",
    },
  }).catch((e) => fail("executeWorkflow (cancellation)", e));

  if (cancellationResult.status !== "success") throw new Error(`Expected success, got ${cancellationResult.status}`);
  pass(`cancellation workflow executed — ${cancellationResult.steps.length} steps succeeded`);

  // Confirm event is cancelled in DB
  const confirmedEvent = await getCalendarEventById(testEvent.id);
  if (!confirmedEvent || confirmedEvent.status !== "cancelled") throw new Error("Event not confirmed cancelled in DB");
  pass(`confirmed event "cancelled" in DB`);

  // Confirm execution was persisted
  const confirmedExecution = await getExecutionById(cancellationResult.workflowExecutionId);
  if (!confirmedExecution) throw new Error("Execution not found in DB");
  pass(`confirmed cancellation execution persisted — ${confirmedExecution.steps.length} step(s) in DB`);

  // ------------------------------------------------------------------
  // 8. Double-cancel check (409 behavior)
  // ------------------------------------------------------------------
  console.log("\n8. Cancel already-cancelled event (expects error)");
  try {
    await cancelCalendarEvent(testEvent.id);
    throw new Error("Expected error for double-cancel, but none was thrown");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already cancelled")) {
      pass(`correctly rejected double-cancel: "${msg}"`);
    } else {
      throw err;
    }
  }

  console.log("\n=== API smoke test complete ===");
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
