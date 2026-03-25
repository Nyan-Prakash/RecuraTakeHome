import { getCalendarEvents } from "@/lib/db/calendarEvents";
import { ok, serverError } from "@/lib/http/responses";

export async function GET() {
  try {
    const events = await getCalendarEvents();
    return ok({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return serverError(message);
  }
}
