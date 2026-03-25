# Workflow Engine Reference

A complete guide to triggers, actions, example workflows, and how everything works under the hood.

---

## Table of Contents

1. [Overview](#overview)
2. [How the Engine Works](#how-the-engine-works)
3. [Execution Context](#execution-context)
4. [Triggers](#triggers)
5. [Actions](#actions)
6. [Dependency Rules](#dependency-rules)
7. [Example Workflows](#example-workflows)
8. [AI vs Fallback Behaviour](#ai-vs-fallback-behaviour)

---

## Overview

The workflow engine runs sequences of **actions** in response to **triggers**. Each action reads from and writes to a shared **execution context** that is passed from step to step. Workflows are stored in the database and executed via a streaming HTTP API.

```
Trigger payload
      │
      ▼
initializeExecutionContext()   ← validates payload, seeds context
      │
      ▼
Action 1  →  updatedContext ─┐
Action 2  →  updatedContext ─┤  merged shallowly after each step
Action 3  →  updatedContext ─┘
      │
      ▼
WorkflowRunResult
```

---

## How the Engine Works

### Execution lifecycle (`lib/workflow-engine/engine.ts`)

1. **Load** the workflow definition from the DB.
2. **Validate** it — must be active, have enabled actions in ascending order, and satisfy dependency rules.
3. **Initialize context** — parse and validate the trigger payload, seed the `ExecutionContext`.
4. **Create a `WorkflowExecution` record** and mark it `running`.
5. **Run each enabled action sequentially**, in `order` ascending:
   - Create a `StepExecution` record, mark it `running`.
   - Call the action handler with the current context.
   - Shallow-merge `updatedContext` into the running context.
   - Mark the step `success` or `failed` and persist its output.
   - On failure: mark the workflow `failed` and stop.
6. **Mark the workflow** `success` when all steps complete.

### Streaming

Every state change emits a server-sent event (SSE):

| Event | When |
|---|---|
| `workflow_start` | Execution begins — includes `totalSteps` |
| `step_start` | A step starts running |
| `step_complete` | A step succeeded — includes `output` |
| `step_failed` | A step failed — includes `errorMessage` |
| `workflow_complete` | Workflow finished — `status` is `"success"` or `"failed"` |

---

## Execution Context

The context is a shared object that all actions read from and write to. It starts with fields seeded by the trigger and grows as actions run.

```ts
type ExecutionContext = {
  triggerType: WorkflowTriggerType;

  // Seeded by trigger
  originalEmail?: string;       // Raw email body
  senderEmail?: string;
  senderName?: string;          // Derived from email local part
  senderCompany?: string;       // Derived from email domain

  // Set by actions
  summary?: string;             // summarize_email
  meetingTopic?: string;        // summarize_email
  availabilityWindows?: AvailabilityWindow[];  // extract_availability
  selectedSlot?: SelectedSlot;  // find_open_slot
  attendeeResearch?: string;    // research_attendees
  companyResearch?: string;     // research_company
  preMeetingNotes?: string;     // generate_pre_meeting_notes
  createdEventId?: string;      // create_calendar_event
  createdEvent?: CreatedEvent;  // create_calendar_event
  cancelledEvent?: CancelledEvent;  // resolve_cancelled_event
  fallbackSlots?: FallbackSlot[];   // find_fallback_slots
  replyDraft?: string;          // generate_confirmation_email / generate_reschedule_email
  attendees?: string[];         // resolve_cancelled_event
  priorMeetingContext?: string; // resolve_cancelled_event
  triggerEventId?: string;      // set from reschedule payload
};
```

---

## Triggers

Triggers are the entry point of a workflow. They validate the incoming payload and seed the initial execution context.

### `meeting_request_received`

Fires when someone sends a meeting request email.

**Required payload fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `emailText` | string | yes | The full body of the incoming email |
| `senderEmail` | string | no | Sender's email address |
| `source` | string | no | Optional label for where the trigger came from |

**Context seeded:**

- `triggerType` = `"meeting_request_received"`
- `originalEmail` ← `emailText`
- `senderEmail`, `senderName` (local part), `senderCompany` (domain root) ← derived from `senderEmail`

**Example payload:**

```json
{
  "emailText": "Hi, I'd love to set up a 30-min call. I'm free Tuesday afternoon or Wednesday morning. Let me know what works!",
  "senderEmail": "alex@acme.com"
}
```

---

### `meeting_reschedule_requested`

Fires when someone cancels a meeting and wants to reschedule.

**Required payload fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `emailText` | string | yes | The cancellation/reschedule email body |
| `senderEmail` | string | yes | Sender's email address (required — used to look up the cancelled event) |
| `source` | string | no | Optional label |

**Context seeded:**

- `triggerType` = `"meeting_reschedule_requested"`
- `originalEmail`, `senderEmail`, `senderName`, `senderCompany` ← same as above

**Example payload:**

```json
{
  "emailText": "Hey, something came up and I need to cancel our meeting tomorrow. Can we find another time?",
  "senderEmail": "alex@acme.com"
}
```

---

## Actions

Actions are the building blocks of a workflow. Each one reads from context, does work, and writes results back to context.

---

### `summarize_email`

**What it does:** Uses AI to produce a 1-2 sentence summary of the email and extract a short meeting topic.

**Reads from context:** `originalEmail`

**Writes to context:** `summary`, `meetingTopic`

**Fails if:** `originalEmail` is missing.

**Under the hood:** Calls `summarizeMeetingEmail()` in the AI service, which sends the email to OpenAI with a structured prompt. Falls back to extracting the first sentence of the email if no API key is set.

**Example output:**
```json
{
  "summary": "Meeting request to discuss a potential design partnership.",
  "meetingTopic": "Design partnership discussion"
}
```

---

### `extract_availability`

**What it does:** Uses AI to parse the email and extract specific date/time availability windows.

**Reads from context:** `originalEmail`

**Writes to context:** `availabilityWindows`

**Fails if:** `originalEmail` is missing, or no valid availability windows are found.

**Under the hood:** Calls `extractAvailability()`, which prompts OpenAI to return a JSON array of `{ date, start, end, label }` objects in `YYYY-MM-DD` / `HH:MM` format. Output is normalized and deduplicated. Falls back to keyword matching (e.g. "Tuesday afternoon" → next Tuesday 13:00–17:00) without an API key.

**Example output:**
```json
{
  "availabilityWindows": [
    { "date": "2026-03-31", "start": "09:00", "end": "12:00", "label": "Tuesday morning" },
    { "date": "2026-04-01", "start": "13:00", "end": "17:00", "label": "Wednesday afternoon" }
  ]
}
```

---

### `find_open_slot`

**What it does:** Scans the availability windows against the calendar database and picks the first open 30-minute slot.

**Reads from context:** `availabilityWindows`

**Writes to context:** `selectedSlot`

**Fails if:** `availabilityWindows` is empty, or all slots within the windows are blocked.

**Under the hood:** For each window, queries the DB for `scheduled` calendar events on that date. Walks the window in 30-minute increments and checks for conflicts. Returns the first unblocked slot as `selectedSlot` and the full list as `candidateSlots`. Working hours are 09:00–17:00.

**Example output:**
```json
{
  "selectedSlot": {
    "startTime": "2026-03-31T09:00:00",
    "endTime": "2026-03-31T09:30:00",
    "durationMinutes": 30
  }
}
```

---

### `research_attendees`

**What it does:** Uses AI to generate prep notes about the attendees based on available context.

**Reads from context:** `originalEmail`, `summary`, `attendees`, `senderName`, `senderCompany`

**Writes to context:** `attendeeResearch`

**Fails if:** Never throws — always returns something (falls back to generic notes without an API key).

**Under the hood:** Sends all available context to OpenAI asking for 2-4 bullet points of practical attendee research. Since the model has no live internet access, notes are inferred from the email content. Falls back to a template response without an API key.

**Example output:**
```json
{
  "attendeeResearch": "- Alex appears to be reaching out about a design partnership opportunity\n- Review their portfolio before the call\n- Prepare a brief overview of your design process"
}
```

---

### `research_company`

**What it does:** Uses AI to generate prep notes about the sender's company.

**Reads from context:** `originalEmail`, `summary`, `senderName`, `senderCompany`

**Writes to context:** `companyResearch`

**Fails if:** Never throws — always returns something.

**Under the hood:** Same pattern as `research_attendees` — prompts OpenAI for 2-4 bullet points about the company inferred from the email. Falls back to a template mentioning the domain name.

---

### `generate_pre_meeting_notes`

**What it does:** Synthesizes attendee and company research into concise pre-meeting talking points.

**Reads from context:** `summary`, `attendeeResearch`, `companyResearch`

**Writes to context:** `preMeetingNotes`

**Fails if:** Never throws.

**Under the hood:** Combines all enrichment context and asks OpenAI for 3-6 bullet points covering what to discuss, background context, and key talking points. Falls back to a formatted template.

---

### `create_calendar_event`

**What it does:** Creates a calendar event in the database at the selected time slot.

**Reads from context:** `selectedSlot` (required), `summary`, `attendeeResearch`, `companyResearch`, `preMeetingNotes`

**Writes to context:** `createdEventId`, `createdEvent`

**Fails if:** `selectedSlot` is missing from context.

**Under the hood:** Calls `createCalendarEvent()` in the calendar service, which writes a row to the `CalendarEvent` table with status `scheduled`. The event title is set from `summary` (truncated to 100 chars) or defaults to `"Meeting"`. Pre-meeting notes are stored in the `description` field.

**Example output:**
```json
{
  "createdEvent": {
    "id": "cma1b2c3d4",
    "title": "Design partnership discussion",
    "startTime": "2026-03-31T09:00:00.000Z",
    "endTime": "2026-03-31T09:30:00.000Z",
    "description": "- Review their portfolio..."
  }
}
```

---

### `generate_confirmation_email`

**What it does:** Drafts a professional reply confirming the meeting time.

**Reads from context:** `selectedSlot` (required), `summary`, `createdEvent`

**Writes to context:** `replyDraft`

**Fails if:** `selectedSlot` is missing from context.

**Under the hood:** Prompts OpenAI to write a brief 3-5 sentence confirmation email including the date/time. Falls back to a friendly template email.

**Example output:**
```
Hi,

Thank you for reaching out! I'm happy to confirm our meeting on Tuesday, March 31 at 9:00 AM.

Looking forward to discussing our potential design partnership.

Best,
[Your Name]
```

---

### `resolve_cancelled_event`

**What it does:** Looks up which calendar event was cancelled and marks it as cancelled in the DB, then populates context with its details.

**Reads from context:** `triggerEventId` (if triggered via calendar button), or `senderEmail` (if email-driven)

**Writes to context:** `cancelledEvent`, `attendees`, `priorMeetingContext`, `triggerEventId`

**Fails if:** No `triggerEventId` and no `senderEmail` is in context; or email-driven lookup finds no matching scheduled event.

**Under the hood — two paths:**

1. **Direct (`triggerEventId` present):** Fetches the event by ID from the DB, builds `cancelledEvent`, and pulls prior enrichment fields (`meetingSummary`, `preMeetingNotes`) into `priorMeetingContext`.

2. **Email-driven (`senderEmail` present):** Queries all `scheduled` events in the last 7 days + future, scores each by how well it matches the sender's name, company, and email body keywords, picks the best match, then marks it `cancelled` in the DB.

---

### `find_fallback_slots`

**What it does:** Finds up to 3 available time slots in the next 5 business days to propose as reschedule options.

**Reads from context:** `cancelledEvent` (required)

**Writes to context:** `fallbackSlots`

**Fails if:** `cancelledEvent` is missing, or no open slots found in the next 5 business days.

**Under the hood:** Uses the cancelled event's original start time as an anchor. For each of the next 5 business days, tries three candidate start times: the original time of day, 09:00, and 14:00. Checks each against the DB for conflicts and collects up to 3 unblocked slots. Working hours are 09:00–17:00, slot duration is 30 minutes.

**Example output:**
```json
{
  "fallbackSlots": [
    { "startTime": "2026-03-26T09:00:00", "endTime": "2026-03-26T09:30:00" },
    { "startTime": "2026-03-26T14:00:00", "endTime": "2026-03-26T14:30:00" },
    { "startTime": "2026-03-27T09:00:00", "endTime": "2026-03-27T09:30:00" }
  ]
}
```

---

### `generate_reschedule_email`

**What it does:** Drafts a warm reschedule email proposing the fallback time slots to the attendee.

**Reads from context:** `fallbackSlots` (required), `cancelledEvent`, `originalEmail`, `senderEmail`, `senderName`, `summary`, `attendeeResearch`, `companyResearch`

**Writes to context:** `replyDraft`

**Fails if:** `fallbackSlots` is empty or missing.

**Under the hood:** Formats the fallback slots as human-readable options and prompts OpenAI to write a 4-6 sentence email that acknowledges the cancellation reason, expresses continued interest, and proposes the options. Falls back to a template that lists the slots directly.

**Example output:**
```
Hi Alex,

Thanks for letting me know — completely understand! I'd still love to find a time to connect.

Here are a few slots that work for me:
  Option 1: Thursday, March 26 at 9:00 AM
  Option 2: Thursday, March 26 at 2:00 PM
  Option 3: Friday, March 27 at 9:00 AM

Please let me know which works best, or feel free to suggest another time.

Best,
[Your Name]
```

---

## Dependency Rules

These are enforced at validation time — the engine will refuse to run a workflow that violates them.

| Trigger | Rule |
|---|---|
| `meeting_request_received` | `extract_availability` → `find_open_slot` → `create_calendar_event` → `generate_confirmation_email` |
| `meeting_reschedule_requested` | `resolve_cancelled_event` → `find_fallback_slots` → `generate_reschedule_email` |

Rules only apply when **both** actions in a pair are enabled. Optional actions (`summarize_email`, `research_attendees`, `research_company`, `generate_pre_meeting_notes`) can appear anywhere — they have no ordering constraints.

> **Note on `summarize_email`:** Although listed as "no" in the example workflow table, `summarize_email` is not enforced by any dependency rule. Skipping it won't break the pipeline, but downstream actions that read `summary` (e.g. `create_calendar_event`, `generate_confirmation_email`, `generate_pre_meeting_notes`) will degrade gracefully — event titles default to `"Meeting"` and emails lose topic context.

---

## Example Workflows

### Standard Meeting Request Processor

Trigger: `meeting_request_received`

| Step | Action | Optional |
|---|---|---|
| 1 | `summarize_email` | yes |
| 2 | `extract_availability` | no |
| 3 | `find_open_slot` | no |
| 4 | `research_attendees` | yes |
| 5 | `research_company` | yes |
| 6 | `generate_pre_meeting_notes` | yes |
| 7 | `create_calendar_event` | no |
| 8 | `generate_confirmation_email` | no |

**Context flow:**
```
emailText → originalEmail
  → summarize_email → summary, meetingTopic
  → extract_availability → availabilityWindows
  → find_open_slot → selectedSlot
  → research_attendees → attendeeResearch
  → research_company → companyResearch
  → generate_pre_meeting_notes → preMeetingNotes
  → create_calendar_event → createdEvent
  → generate_confirmation_email → replyDraft
```

---

### Event Cancellation Handler (propose options)

Trigger: `meeting_reschedule_requested`

| Step | Action | Optional |
|---|---|---|
| 1 | `resolve_cancelled_event` | no |
| 2 | `find_fallback_slots` | no |
| 3 | `research_attendees` | yes |
| 4 | `research_company` | yes |
| 5 | `generate_reschedule_email` | no |

**Context flow:**
```
emailText + senderEmail → originalEmail, senderEmail, senderName, senderCompany
  → resolve_cancelled_event → cancelledEvent, priorMeetingContext
  → find_fallback_slots → fallbackSlots
  → research_attendees → attendeeResearch
  → research_company → companyResearch
  → generate_reschedule_email → replyDraft
```

---

### Minimal Reschedule (no enrichment)

Trigger: `meeting_reschedule_requested`

| Step | Action |
|---|---|
| 1 | `resolve_cancelled_event` |
| 2 | `find_fallback_slots` |
| 3 | `generate_reschedule_email` |

Works perfectly. Research steps are optional — skipping them means `attendeeResearch` and `companyResearch` are absent from context, which `generate_reschedule_email` handles gracefully.

---

### What won't work

| Configuration | Why |
|---|---|
| `find_fallback_slots` before `resolve_cancelled_event` | `cancelledEvent` not in context — will throw at runtime |
| `generate_reschedule_email` without `find_fallback_slots` | `fallbackSlots` not in context — will throw at runtime |
| `find_open_slot` in a reschedule workflow | Requires `availabilityWindows` from `extract_availability`; no email availability to extract in a cancellation |
| `create_calendar_event` in a reschedule workflow | Requires `selectedSlot`; no action currently bridges `fallbackSlots` → `selectedSlot` |

---

## AI vs Fallback Behaviour

All AI-powered actions call OpenAI (`gpt-4o-mini` by default, configurable via `OPENAI_MODEL`). If `OPENAI_API_KEY` is not set, every action falls back to a deterministic local implementation — the app is fully functional without credentials.

| Action | With API key | Without API key |
|---|---|---|
| `summarize_email` | GPT summary + topic extraction | First sentence of email + keyword match |
| `extract_availability` | GPT parses dates/times | Regex weekday + morning/afternoon keyword match |
| `research_attendees` | GPT infers from email context | Template with generic prep advice |
| `research_company` | GPT infers from email context | Template mentioning domain name |
| `generate_pre_meeting_notes` | GPT synthesizes all research | Template combining available fields |
| `generate_confirmation_email` | GPT drafts natural email | Hardcoded friendly template |
| `generate_reschedule_email` | GPT drafts warm reply | Hardcoded template listing slot options |

Calendar actions (`find_open_slot`, `create_calendar_event`, `resolve_cancelled_event`, `find_fallback_slots`) are fully deterministic and do not use AI.
