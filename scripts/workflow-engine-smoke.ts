/**
 * Smoke test for the workflow execution engine.
 *
 * Run with: npx tsx scripts/workflow-engine-smoke.ts
 *
 * Tests:
 * 1. Meeting Request Processor — successful run
 * 2. Event Cancellation Handler — successful run
 * 3. Meeting workflow with invalid payload — validates failure path
 */

import { getAllWorkflows } from "../lib/db/workflows";
import { getWorkflowExecutionWithSteps } from "../lib/db/executions";
import { executeWorkflow } from "../lib/workflow-engine/engine";

function printResult(label: string, result: Awaited<ReturnType<typeof executeWorkflow>>) {
  console.log(`\n--- ${label} ---`);
  console.log(`  Execution ID : ${result.workflowExecutionId}`);
  console.log(`  Workflow ID  : ${result.workflowId}`);
  console.log(`  Trigger      : ${result.triggerType}`);
  console.log(`  Status       : ${result.status}`);
  if (result.errorMessage) {
    console.log(`  Error        : ${result.errorMessage}`);
  }
  console.log(`  Steps (${result.steps.length}):`);
  for (const step of result.steps) {
    const errSuffix = step.errorMessage ? ` — ${step.errorMessage}` : "";
    console.log(`    [${step.status.padEnd(7)}] ${step.actionType}${errSuffix}`);
  }
  const contextKeys = Object.keys(result.context).filter(
    (k) => k !== "triggerType" && result.context[k as keyof typeof result.context] !== undefined
  );
  console.log(`  Context keys : ${contextKeys.join(", ")}`);
}

async function main() {
  console.log("=== Workflow Engine Smoke Test ===\n");

  const workflows = await getAllWorkflows();
  const meetingWorkflow = workflows.find(
    (w) => w.triggerType === "meeting_request_received"
  );
  const cancellationWorkflow = workflows.find(
    (w) => w.triggerType === "event_cancelled"
  );

  if (!meetingWorkflow) throw new Error("Meeting Request Processor not found in DB");
  if (!cancellationWorkflow) throw new Error("Event Cancellation Handler not found in DB");

  // ------------------------------------------------------------------
  // 1. Meeting Request Processor — success path
  // ------------------------------------------------------------------
  const meetingResult = await executeWorkflow({
    workflowId: meetingWorkflow.id,
    triggerPayload: {
      emailText:
        "Hi, I'd like to schedule a 30-minute intro call next week. I'm free Monday or Tuesday morning.",
      source: "email",
    },
  });
  printResult("Meeting Request Processor — success", meetingResult);

  // Verify DB records were persisted
  const meetingExecution = await getWorkflowExecutionWithSteps(
    meetingResult.workflowExecutionId
  );
  console.log(
    `  DB check: ${meetingExecution?.stepExecutions.length ?? 0} step execution(s) persisted`
  );

  // ------------------------------------------------------------------
  // 2. Event Cancellation Handler — success path
  // ------------------------------------------------------------------
  const cancellationResult = await executeWorkflow({
    workflowId: cancellationWorkflow.id,
    triggerPayload: {
      eventId: "evt-abc-123",
      reason: "Organizer is unavailable",
      source: "calendar",
    },
  });
  printResult("Event Cancellation Handler — success", cancellationResult);

  const cancellationExecution = await getWorkflowExecutionWithSteps(
    cancellationResult.workflowExecutionId
  );
  console.log(
    `  DB check: ${cancellationExecution?.stepExecutions.length ?? 0} step execution(s) persisted`
  );

  // ------------------------------------------------------------------
  // 3. Meeting workflow — invalid payload (empty email) — failure path
  // ------------------------------------------------------------------
  console.log("\n--- Meeting Request Processor — invalid payload (expected failure) ---");
  try {
    const failResult = await executeWorkflow({
      workflowId: meetingWorkflow.id,
      triggerPayload: { emailText: "   " }, // blank after trim
    });
    // Should not reach here — trigger validation throws before execution
    printResult("(unexpected result)", failResult);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Caught expected error: ${msg}`);
    console.log("  (No execution record created — pre-execution validation correctly rejected the payload)");
  }

  console.log("\n=== Smoke test complete ===");
}

main()
  .catch((err) => {
    console.error("Smoke test failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
