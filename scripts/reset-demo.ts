/**
 * Resets the app to a clean demo baseline.
 *
 * Removes all executions, step records, and calendar events,
 * then re-seeds the workflow definitions.
 *
 * Run with: npm run demo:reset
 */

import { prisma } from "../lib/db/client";

async function main() {
  console.log("Resetting demo state...");

  // Delete in dependency order to avoid FK violations
  await prisma.stepExecution.deleteMany();
  console.log("  Cleared step executions");

  await prisma.calendarEvent.deleteMany();
  console.log("  Cleared calendar events");

  await prisma.workflowExecution.deleteMany();
  console.log("  Cleared workflow executions");

  console.log("\nRunning seed...");
  const { execSync } = await import("child_process");
  execSync("npx prisma db seed", { stdio: "inherit" });

  console.log("\nDemo reset complete. Ready for a fresh run.");
}

main()
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
