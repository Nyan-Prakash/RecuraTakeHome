/**
 * Smoke test for the workflow registry and DB helpers.
 *
 * Run with: npx tsx scripts/workflow-registry-smoke.ts
 */

import { getAllWorkflows } from "../lib/db/workflows";
import { getActionHandler } from "../lib/workflow-engine/actionRegistry";
import { prisma } from "../lib/db/client";
import type { ExecutionContext } from "../lib/workflow-engine/types";

async function main() {
  console.log("=== Workflow Registry Smoke Test ===\n");

  // 1. Load seeded workflows
  const workflows = await getAllWorkflows();
  console.log(`Loaded ${workflows.length} workflow(s) from DB:\n`);

  for (const wf of workflows) {
    console.log(`  [${wf.triggerType}] ${wf.name}`);
    for (const action of wf.actions) {
      const optTag = action.isOptional ? " (optional)" : "";
      console.log(`    ${action.order}. ${action.type}${optTag}`);
    }
    console.log();
  }

  // 2. Verify every action in every workflow resolves to a handler
  console.log("Resolving handlers from registry...");
  for (const wf of workflows) {
    for (const action of wf.actions) {
      const handler = getActionHandler(action.type);
      if (typeof handler !== "function") {
        throw new Error(
          `No handler found for action type: ${action.type} in workflow "${wf.name}"`
        );
      }
    }
  }
  console.log("  All handlers resolved successfully.\n");

  // 3. Invoke a couple of stub handlers with fake context
  console.log("Running stub handler invocations:\n");

  // -- summarizeEmail
  const emailContext: ExecutionContext = {
    triggerType: "meeting_request_received",
    originalEmail:
      "Hi, I'd like to schedule a 30-min call next week. I'm free Mon/Tue morning.",
  };

  const summarizeHandler = getActionHandler("summarize_email");
  const summarizeResult = await summarizeHandler({ context: emailContext });
  console.log("  summarize_email output:", summarizeResult.output);
  console.log("  updatedContext keys:", Object.keys(summarizeResult.updatedContext));
  console.log();

  // -- loadCancelledEvent + findFallbackSlots in sequence
  // Create a temporary event in DB so load_cancelled_event has a real record to fetch
  const tempEvent = await prisma.calendarEvent.create({
    data: {
      title: "Registry Smoke Test Event",
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // +30m
      status: "scheduled",
    },
  });

  const loadHandler = getActionHandler("load_cancelled_event");
  const loadResult = await loadHandler({
    context: { triggerType: "event_cancelled", triggerEventId: tempEvent.id },
  });
  console.log("  load_cancelled_event output:", loadResult.output);
  console.log();

  // Clean up temp event
  await prisma.calendarEvent.delete({ where: { id: tempEvent.id } });

  const fallbackContext: ExecutionContext = {
    triggerType: "event_cancelled",
    ...loadResult.updatedContext,
  };
  const fallbackHandler = getActionHandler("find_fallback_slots");
  const fallbackResult = await fallbackHandler({ context: fallbackContext });
  console.log("  find_fallback_slots output:", fallbackResult.output);
  console.log();

  console.log("=== Smoke test passed ===");
}

main()
  .catch((err) => {
    console.error("Smoke test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
