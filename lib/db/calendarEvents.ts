import { prisma } from "./client";

export async function getCalendarEvents() {
  return prisma.calendarEvent.findMany({
    orderBy: { startTime: "asc" },
  });
}

export async function getCalendarEventById(id: string) {
  return prisma.calendarEvent.findUnique({
    where: { id },
  });
}

export async function cancelCalendarEvent(id: string) {
  const event = await prisma.calendarEvent.findUnique({ where: { id } });

  if (!event) {
    throw new Error(`Calendar event not found: ${id}`);
  }

  if (event.status === "cancelled") {
    return event;
  }

  return prisma.calendarEvent.update({
    where: { id },
    data: { status: "cancelled" },
  });
}

export async function createCalendarEvent(args: {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  meetingSummary?: string;
  attendeeEmail?: string;
  attendeeResearch?: string;
  companyResearch?: string;
  preMeetingNotes?: string;
  sourceWorkflowExecutionId?: string;
}) {
  return prisma.calendarEvent.create({
    data: {
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "scheduled",
      meetingSummary: args.meetingSummary,
      attendeeEmail: args.attendeeEmail,
      attendeeResearch: args.attendeeResearch,
      companyResearch: args.companyResearch,
      preMeetingNotes: args.preMeetingNotes,
      sourceWorkflowExecutionId: args.sourceWorkflowExecutionId,
    },
  });
}
