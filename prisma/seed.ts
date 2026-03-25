import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";

const dbUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Enum value constants — mirroring the domain vocabulary
// ---------------------------------------------------------------------------

const TriggerType = {
  meetingRequestReceived: "meeting_request_received",
  eventCancelled: "event_cancelled",
} as const;

const ActionType = {
  summarizeEmail: "summarize_email",
  extractAvailability: "extract_availability",
  findOpenSlot: "find_open_slot",
  researchAttendees: "research_attendees",
  researchCompany: "research_company",
  generatePreMeetingNotes: "generate_pre_meeting_notes",
  createCalendarEvent: "create_calendar_event",
  generateConfirmationEmail: "generate_confirmation_email",
  loadCancelledEvent: "load_cancelled_event",
  findFallbackSlots: "find_fallback_slots",
  generateRescheduleEmail: "generate_reschedule_email",
} as const;

// ---------------------------------------------------------------------------
// Seed definitions
// ---------------------------------------------------------------------------

const workflows = [
  {
    name: "Meeting Request Processor",
    description:
      "Processes an incoming scheduling email, finds a matching slot, creates a calendar event, and drafts a confirmation email.",
    triggerType: TriggerType.meetingRequestReceived,
    actions: [
      { type: ActionType.summarizeEmail, order: 1, isOptional: false },
      { type: ActionType.extractAvailability, order: 2, isOptional: false },
      { type: ActionType.findOpenSlot, order: 3, isOptional: false },
      { type: ActionType.researchAttendees, order: 4, isOptional: true },
      { type: ActionType.researchCompany, order: 5, isOptional: true },
      { type: ActionType.generatePreMeetingNotes, order: 6, isOptional: true },
      { type: ActionType.createCalendarEvent, order: 7, isOptional: false },
      { type: ActionType.generateConfirmationEmail, order: 8, isOptional: false },
    ],
  },
  {
    name: "Event Cancellation Handler",
    description:
      "Handles a cancelled event by loading the event, finding fallback slots, and drafting a reschedule email.",
    triggerType: TriggerType.eventCancelled,
    actions: [
      { type: ActionType.loadCancelledEvent, order: 1, isOptional: false },
      { type: ActionType.findFallbackSlots, order: 2, isOptional: false },
      { type: ActionType.researchAttendees, order: 3, isOptional: true },
      { type: ActionType.researchCompany, order: 4, isOptional: true },
      { type: ActionType.generateRescheduleEmail, order: 5, isOptional: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main seed function — idempotent: clears workflow data before re-seeding
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding database...");

  // Clear in dependency order to avoid FK violations
  await prisma.stepExecution.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.workflowExecution.deleteMany();
  await prisma.workflowAction.deleteMany();
  await prisma.workflow.deleteMany();

  for (const wf of workflows) {
    const created = await prisma.workflow.create({
      data: {
        name: wf.name,
        description: wf.description,
        triggerType: wf.triggerType,
        isActive: true,
        actions: {
          create: wf.actions.map((action) => ({
            type: action.type,
            order: action.order,
            isOptional: action.isOptional,
            isEnabled: true,
          })),
        },
      },
      include: { actions: true },
    });

    console.log(
      `  Created workflow: "${created.name}" with ${created.actions.length} actions`
    );
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
