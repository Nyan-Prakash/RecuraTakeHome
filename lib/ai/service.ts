/**
 * AI service layer — all OpenAI calls go through here.
 *
 * If OPENAI_API_KEY is not set, every method falls back to deterministic
 * local implementations so the app remains fully runnable without credentials.
 */

import type {
  AvailabilityWindow,
  CancelledEvent,
  CreatedEvent,
  FallbackSlot,
  SelectedSlot,
} from "../workflow-engine/types";

// ---------------------------------------------------------------------------
// OpenAI client — lazy singleton, only created if API key present
// ---------------------------------------------------------------------------

type OpenAIClient = {
  chat: {
    completions: {
      create: (args: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
      }) => Promise<{
        choices: Array<{ message: { content: string | null } }>;
      }>;
    };
  };
};

let _openai: OpenAIClient | null = null;

function getOpenAIClient(): OpenAIClient | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (_openai) return _openai;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { OpenAI } = require("openai") as { OpenAI: new (args: { apiKey: string }) => OpenAIClient };
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

async function askAI(systemPrompt: string, userContent: string): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("NO_API_KEY"); // caller handles fallback
  }
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.3,
  });
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("OpenAI returned empty response");
  return content.trim();
}

// ---------------------------------------------------------------------------
// Fallback date utilities
// ---------------------------------------------------------------------------

/** Get the date of the next occurrence of a weekday from today (0=Sun, 1=Mon, ...) */
function nextWeekday(dayOfWeek: number): Date {
  const today = new Date();
  const todayDay = today.getDay();
  let daysAhead = dayOfWeek - todayDay;
  if (daysAhead <= 0) daysAhead += 7;
  const result = new Date(today);
  result.setDate(today.getDate() + daysAhead);
  return result;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Availability normalization (shared with fallback + AI path)
// ---------------------------------------------------------------------------

export function normalizeAvailabilityWindows(
  windows: unknown[]
): AvailabilityWindow[] {
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{2}:\d{2}$/;

  const normalized: AvailabilityWindow[] = [];
  const seen = new Set<string>();

  for (const w of windows) {
    if (typeof w !== "object" || w === null) continue;
    const obj = w as Record<string, unknown>;
    const date = typeof obj["date"] === "string" ? obj["date"] : null;
    const start = typeof obj["start"] === "string" ? obj["start"] : null;
    const end = typeof obj["end"] === "string" ? obj["end"] : null;

    if (!date || !start || !end) continue;
    if (!DATE_RE.test(date) || !TIME_RE.test(start) || !TIME_RE.test(end)) continue;
    if (start >= end) continue;

    const key = `${date}|${start}|${end}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const label = typeof obj["label"] === "string" ? obj["label"] : undefined;
    normalized.push({ date, start, end, label });
  }

  return normalized.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    return dateCmp !== 0 ? dateCmp : a.start.localeCompare(b.start);
  });
}

// ---------------------------------------------------------------------------
// Fallback implementations — used when OPENAI_API_KEY is absent
// ---------------------------------------------------------------------------

function fallbackSummarizeEmail(emailText: string): { summary: string; meetingTopic?: string } {
  const first = emailText.split(/[.!?\n]/)[0]?.trim() ?? emailText.slice(0, 80);
  const topicMatch = emailText.match(/(?:design partner|partnership|collaboration|call|meet|discuss|catch up)/i);
  const meetingTopic = topicMatch
    ? `${topicMatch[0].charAt(0).toUpperCase()}${topicMatch[0].slice(1)} discussion`
    : "Scheduling discussion";
  return {
    summary: `Meeting request: ${first}.`,
    meetingTopic,
  };
}

function fallbackExtractAvailability(emailText: string): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];
  const lower = emailText.toLowerCase();

  const WEEKDAY_MAP: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  const MORNING_WINDOW = { start: "09:00", end: "12:00", label: "Morning" };
  const AFTERNOON_WINDOW = { start: "13:00", end: "17:00", label: "Afternoon" };

  const dayMatches = Object.entries(WEEKDAY_MAP).filter(([day]) =>
    lower.includes(day)
  );

  for (const [day, dayNum] of dayMatches) {
    const date = toDateString(nextWeekday(dayNum));
    const isMorning = lower.includes(`${day} morning`) || (lower.includes(day) && lower.includes("morning"));
    const isAfternoon = lower.includes(`${day} afternoon`) || (lower.includes(day) && lower.includes("afternoon"));

    if (isMorning) {
      windows.push({ date, ...MORNING_WINDOW });
    } else if (isAfternoon) {
      windows.push({ date, ...AFTERNOON_WINDOW });
    } else {
      // Day mentioned without time of day — add both
      windows.push({ date, ...MORNING_WINDOW });
      windows.push({ date, ...AFTERNOON_WINDOW });
    }
  }

  // "next week" with no specific day
  if (windows.length === 0 && lower.includes("next week")) {
    const monday = nextWeekday(1);
    const wednesday = nextWeekday(3);
    windows.push({ date: toDateString(monday), ...MORNING_WINDOW });
    windows.push({ date: toDateString(wednesday), ...AFTERNOON_WINDOW });
  }

  return normalizeAvailabilityWindows(windows);
}

function fallbackResearchAttendees(input: {
  originalEmail?: string;
  summary?: string;
}): string {
  const context = input.summary ?? input.originalEmail ?? "No context available";
  return [
    "[Fallback attendee research — no API key]",
    "",
    `Based on the scheduling request, the following prep notes were generated:`,
    `- Review context: "${context.slice(0, 120)}"`,
    "- Suggest reviewing the sender's LinkedIn profile before the meeting",
    "- Prepare a brief overview of your team's work and goals",
    "- Note any recent shared communications or prior interactions",
  ].join("\n");
}

function fallbackResearchCompany(input: {
  originalEmail?: string;
  summary?: string;
}): string {
  const context = input.summary ?? input.originalEmail ?? "";
  const companyHint = context.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?\b/)?.[0];
  return [
    "[Fallback company research — no API key]",
    "",
    companyHint
      ? `Possible company reference: "${companyHint}"`
      : "No specific company identified from email content.",
    "",
    "General prep:",
    "- Review the company's public website and recent news",
    "- Note their product focus and target market",
    "- Identify any relevant shared connections",
  ].join("\n");
}

function fallbackGeneratePrepNotes(input: {
  summary?: string;
  attendeeResearch?: string;
  companyResearch?: string;
}): string {
  const lines = ["[Fallback pre-meeting notes — no API key]", ""];
  if (input.summary) lines.push(`Meeting context: ${input.summary}`);
  if (input.attendeeResearch) lines.push(`\nAttendee notes:\n${input.attendeeResearch.slice(0, 200)}`);
  if (input.companyResearch) lines.push(`\nCompany notes:\n${input.companyResearch.slice(0, 200)}`);
  if (lines.length === 2) lines.push("No enrichment data available. Review the email before the meeting.");
  return lines.join("\n");
}

function fallbackConfirmationEmail(input: {
  summary?: string;
  selectedSlot: SelectedSlot;
  createdEvent?: CreatedEvent;
}): string {
  const { selectedSlot } = input;
  const startDate = new Date(selectedSlot.startTime);
  const dateStr = startDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const timeStr = startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return [
    "Hi,",
    "",
    `Thank you for reaching out! I'm happy to confirm our meeting on ${dateStr} at ${timeStr}.`,
    "",
    input.summary ? `Looking forward to discussing: ${input.summary}` : "Looking forward to our conversation.",
    "",
    "If anything comes up, feel free to reach out.",
    "",
    "Best,",
    "[Your Name]",
  ].join("\n");
}

function fallbackRescheduleEmail(input: {
  cancelledEvent: CancelledEvent;
  fallbackSlots: FallbackSlot[];
}): string {
  const { cancelledEvent, fallbackSlots } = input;
  const slotLines = fallbackSlots.map((s, i) => {
    const d = new Date(s.startTime);
    const dateStr = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return `  Option ${i + 1}: ${dateStr} at ${timeStr}`;
  }).join("\n");

  return [
    "Hi,",
    "",
    `I wanted to reach out regarding our meeting "${cancelledEvent.title}" that was recently cancelled.`,
    "",
    "I'd love to find a new time to connect. Here are a few options that work for me:",
    slotLines,
    "",
    "Please let me know which time works best for you, or suggest an alternative.",
    "",
    "Best,",
    "[Your Name]",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Public AI service methods
// ---------------------------------------------------------------------------

export async function summarizeMeetingEmail(
  emailText: string
): Promise<{ summary: string; meetingTopic?: string }> {
  try {
    const raw = await askAI(
      "You are an assistant that summarizes scheduling emails concisely. Return a JSON object with fields: summary (string, 1-2 sentences) and meetingTopic (string, short phrase).",
      `Email:\n${emailText}`
    );
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as { summary?: string; meetingTopic?: string };
    return {
      summary: parsed.summary ?? fallbackSummarizeEmail(emailText).summary,
      meetingTopic: parsed.meetingTopic,
    };
  } catch (err) {
    if (err instanceof Error && err.message === "NO_API_KEY") {
      return fallbackSummarizeEmail(emailText);
    }
    // AI returned bad JSON or failed — use fallback
    return fallbackSummarizeEmail(emailText);
  }
}

export async function extractAvailability(
  emailText: string
): Promise<AvailabilityWindow[]> {
  try {
    const raw = await askAI(
      `You are an assistant that extracts availability windows from scheduling emails.
Return ONLY a JSON array of objects with these exact fields:
- date: string in YYYY-MM-DD format (use the next occurrence of the mentioned day from today's date: ${toDateString(new Date())})
- start: string in HH:MM format (24-hour)
- end: string in HH:MM format (24-hour)
- label: string (optional, e.g. "Tuesday afternoon")

If morning is mentioned, use 09:00-12:00. If afternoon, use 13:00-17:00.
Return only the JSON array, no other text.`,
      `Email:\n${emailText}`
    );
    const arr = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as unknown[];
    if (!Array.isArray(arr)) throw new Error("Expected array");
    return normalizeAvailabilityWindows(arr);
  } catch (err) {
    if (err instanceof Error && err.message === "NO_API_KEY") {
      return fallbackExtractAvailability(emailText);
    }
    return fallbackExtractAvailability(emailText);
  }
}

export async function researchAttendees(input: {
  originalEmail?: string;
  summary?: string;
  attendees?: string[];
}): Promise<string> {
  const context = `Email: ${input.originalEmail ?? ""}\nSummary: ${input.summary ?? ""}\nAttendees: ${(input.attendees ?? []).join(", ")}`;
  try {
    return await askAI(
      "You are a meeting prep assistant. Given a scheduling email, produce concise attendee research notes (2-4 bullet points). Be practical and professional. Note that you do not have live internet access so base your notes on what can be inferred from the email.",
      context
    );
  } catch {
    return fallbackResearchAttendees(input);
  }
}

export async function researchCompany(input: {
  originalEmail?: string;
  summary?: string;
}): Promise<string> {
  const context = `Email: ${input.originalEmail ?? ""}\nSummary: ${input.summary ?? ""}`;
  try {
    return await askAI(
      "You are a meeting prep assistant. Given a scheduling email, produce concise company context notes (2-4 bullet points) based on what can be inferred from the email. Be practical and professional.",
      context
    );
  } catch {
    return fallbackResearchCompany(input);
  }
}

export async function generatePrepNotes(input: {
  summary?: string;
  attendeeResearch?: string;
  companyResearch?: string;
}): Promise<string> {
  const context = [
    input.summary ? `Meeting summary: ${input.summary}` : "",
    input.attendeeResearch ? `Attendee research: ${input.attendeeResearch}` : "",
    input.companyResearch ? `Company research: ${input.companyResearch}` : "",
  ].filter(Boolean).join("\n\n");

  try {
    return await askAI(
      "You are a meeting prep assistant. Generate concise pre-meeting notes (3-6 bullet points) covering: what to discuss, key background context, and any relevant talking points.",
      context || "No context available"
    );
  } catch {
    return fallbackGeneratePrepNotes(input);
  }
}

export async function generateConfirmationEmail(input: {
  summary?: string;
  selectedSlot: SelectedSlot;
  createdEvent?: CreatedEvent;
}): Promise<string> {
  const context = [
    `Selected time: ${input.selectedSlot.startTime} to ${input.selectedSlot.endTime}`,
    input.summary ? `Meeting topic: ${input.summary}` : "",
  ].filter(Boolean).join("\n");

  try {
    return await askAI(
      "You are an assistant that drafts professional meeting confirmation emails. Write a brief, friendly confirmation email (3-5 sentences). Do not include subject line.",
      context
    );
  } catch {
    return fallbackConfirmationEmail(input);
  }
}

export async function generateRescheduleEmail(input: {
  cancelledEvent: CancelledEvent;
  fallbackSlots: FallbackSlot[];
  attendeeResearch?: string;
  companyResearch?: string;
}): Promise<string> {
  const slotsText = input.fallbackSlots
    .map((s, i) => `Option ${i + 1}: ${s.startTime} to ${s.endTime}`)
    .join("\n");

  const context = [
    `Cancelled meeting: "${input.cancelledEvent.title}"`,
    `Original time: ${input.cancelledEvent.startTime} to ${input.cancelledEvent.endTime}`,
    `Available fallback slots:\n${slotsText}`,
  ].join("\n");

  try {
    return await askAI(
      "You are an assistant that drafts professional meeting reschedule emails. Write a brief, friendly reschedule request (4-6 sentences) presenting the fallback options. Do not include subject line.",
      context
    );
  } catch {
    return fallbackRescheduleEmail(input);
  }
}
