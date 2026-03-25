# Project Explainer — AI Meeting Scheduler Workflow Automation Tool

A plain-language walkthrough of what this project is, how every piece works, and why each decision was made.

---

## What is this project, in one sentence?

It's a workflow automation tool focused on scheduling: you define a sequence of steps (a "workflow"), fire a trigger, and the system runs every step automatically — including AI-powered steps — and saves a complete record of what happened.

---

## The core concept: what is a workflow automation tool?

Think of it like IFTTT or Zapier, but built from scratch. A workflow automation tool lets you say:

> "When *this* happens (the trigger), do *these things* in order (the actions)."

This project makes that concrete with a scheduling use case:

- **Trigger:** Someone emails you asking for a meeting
- **Actions:** Summarize the email → Extract their availability → Find a free slot on your calendar → Research who they are → Create the event → Draft a confirmation reply

Every one of those steps is a discrete, named action. The system runs them one after another, passes data between them, and saves a record of every step.

---

## The two workflows that exist

The app ships with two seeded (pre-built) workflows:

### Workflow 1: Meeting Request Processor
**Trigger:** `meeting_request_received` — fires when you paste in a scheduling email

| Step | Action | AI? |
|------|--------|-----|
| 1 | Summarize Email | Yes |
| 2 | Extract Availability | Yes |
| 3 | Find Open Slot | No (calendar logic) |
| 4 | Research Attendees | Yes (optional) |
| 5 | Research Company | Yes (optional) |
| 6 | Generate Pre-Meeting Notes | Yes (optional) |
| 7 | Create Calendar Event | No (database write) |
| 8 | Generate Confirmation Email | Yes |

### Workflow 2: Event Cancellation Handler
**Trigger:** `meeting_reschedule_requested` — fires when you cancel an event in the calendar UI

| Step | Action | AI? |
|------|--------|-----|
| 1 | Resolve Cancelled Event | No (DB lookup) |
| 2 | Find Fallback Slots | No (calendar logic) |
| 3 | Research Attendees | Yes (optional) |
| 4 | Research Company | Yes (optional) |
| 5 | Generate Reschedule Email | Yes |

---

## How the folder structure maps to the product

```
lib/workflow-engine/    ← The brain. The engine that runs workflows.
  engine.ts             ← The main execution loop
  types.ts              ← All the shared TypeScript types
  triggers.ts           ← Validates trigger payloads, initializes context
  validate.ts           ← Checks workflow is valid before running it
  actionRegistry.ts     ← Maps action names → handler functions
  normalize.ts          ← Converts raw DB rows → typed domain objects
  actions/              ← One file per action type (11 total)

lib/ai/
  service.ts            ← All OpenAI calls live here. Nothing else calls OpenAI.

lib/calendar/
  service.ts            ← Slot finding, conflict checking, event creation

lib/db/
  client.ts             ← Prisma singleton
  workflows.ts          ← DB reads/writes for workflow definitions
  executions.ts         ← DB reads/writes for execution records
  calendarEvents.ts     ← DB reads/writes for calendar events

app/api/                ← Next.js API routes (HTTP interface)
app/workflows/          ← Workflow list + detail pages
app/executions/         ← Execution history + detail pages
app/calendar/           ← Calendar event list

components/             ← React UI components
prisma/                 ← Database schema + seed script
```

---

## The data model — what lives in the database

Five tables. Here's what each one represents:

### `Workflow`
The definition of a workflow. Think of this like a saved recipe. It doesn't change when you run it.

Fields that matter:
- `name`, `description` — display info
- `triggerType` — what fires this workflow (`meeting_request_received` or `meeting_reschedule_requested`)
- `isActive` — only active workflows can run

### `WorkflowAction`
One step within a workflow. A workflow has many actions, ordered by `order` number.

Fields that matter:
- `type` — which action this is (`summarize_email`, `find_open_slot`, etc.)
- `order` — execution sequence (1, 2, 3...)
- `isEnabled` — disabled actions are silently skipped
- `isOptional` — informational flag for the UI; doesn't change engine behavior

### `WorkflowExecution`
One actual run of a workflow. Created fresh every time you hit "Run Workflow".

Fields that matter:
- `workflowId` — which workflow was run
- `triggerPayloadJson` — the raw input (the email text)
- `status` — `pending` → `running` → `success` or `failed`
- `startedAt`, `completedAt`

### `StepExecution`
One action's execution within one workflow run. If a workflow has 8 actions, a run creates 8 step records.

Fields that matter:
- `actionType` — which action ran
- `inputJson` — a snapshot of the execution context *before* this step ran
- `outputJson` — what this step produced
- `status`, `errorMessage` — success or failure detail

### `CalendarEvent`
A meeting on the local calendar. Created by the `create_calendar_event` action.

Fields that matter:
- `title`, `startTime`, `endTime`
- `status` — `scheduled` or `cancelled`
- `meetingSummary`, `attendeeResearch`, `companyResearch`, `preMeetingNotes` — enrichment data stored on the event
- `sourceWorkflowExecutionId` — link back to the run that created it

**Why five tables?** Because the data has a real hierarchy. A workflow is a template. An execution is a run of that template. A step is one action within that run. Collapsing any of these would lose important information — you'd lose the ability to see *which run* created *which event*, or to inspect *what each step received as input*.

---

## The execution engine — the most important file

`lib/workflow-engine/engine.ts` is the central piece of the whole system. When you run a workflow, this is what happens in order:

**Step 1 — Load the workflow from the database.**
Fetch the `WorkflowDefinition` (the template) by ID.

**Step 2 — Validate it.**
Call `validateWorkflowForExecution()`. This checks:
- Is the workflow active?
- Does it have at least one enabled action?
- Are the action orders strictly ascending with no duplicates?
- Do the dependency rules pass? (e.g., `extract_availability` must come before `find_open_slot`)

If validation fails, it throws immediately — nothing runs.

**Step 3 — Initialize the execution context.**
Call `initializeExecutionContext()`. This validates the trigger payload (e.g., `emailText` must be non-empty) and seeds the initial context object with what the trigger knows: the email text, sender email, sender name (extracted from email local part), sender company (extracted from domain).

**Step 4 — Create a `WorkflowExecution` record.**
Write a row to the database with status `pending`.

**Step 5 — Mark it running.**
Update status to `running`.

**Step 6 — Execute each enabled action, in order.**
For each action:
1. Take a snapshot of the current context → save as `inputJson`
2. Create a `StepExecution` record
3. Mark step as `running`
4. Call `getActionHandler(action.type)` to get the handler function
5. Call the handler with the current context
6. Shallow-merge the handler's `updatedContext` into the running context
7. Save the handler's `output` as `outputJson`
8. Mark step as `success`

If the handler throws at any point:
1. Mark step as `failed` with the error message
2. Mark the whole workflow as `failed`
3. Return immediately — remaining steps do not run

**Step 7 — Mark workflow success.**
All steps passed. Mark the execution `success`.

**Why is this design good?**
- Every failure is recorded. You can always see exactly which step failed and why.
- The context snapshot per step means you can see exactly what data a step received as input and what it produced.
- The engine itself has no knowledge of what individual actions do — it just calls handlers and merges results. This is clean separation of concerns.

---

## The execution context — how actions share data

The execution context is a shared JavaScript object that every action can read from and write to. It starts small (seeded by the trigger) and grows as actions run.

```
Initial context (from trigger):
  triggerType: "meeting_request_received"
  originalEmail: "Hi Dave, I'm free Tuesday afternoon..."
  senderEmail: "alex@acme.com"
  senderName: "alex"
  senderCompany: "acme"

After summarize_email:
  + summary: "Alex wants to discuss a design partnership."
  + meetingTopic: "Design partnership discussion"

After extract_availability:
  + availabilityWindows: [{ date: "2026-03-31", start: "13:00", end: "17:00" }]

After find_open_slot:
  + selectedSlot: { startTime: "2026-03-31T13:00:00", endTime: "2026-03-31T13:30:00" }

After create_calendar_event:
  + createdEventId: "cm..."
  + createdEvent: { id, title, startTime, endTime, description }

After generate_confirmation_email:
  + replyDraft: "Hi, I'm happy to confirm our meeting on March 31..."
```

**Why not just pass the output of each step directly to the next step?**
Because optional steps would break the chain. If `research_attendees` is disabled, the next step (`generate_pre_meeting_notes`) still needs to work — it just won't have `attendeeResearch` available. The shared context handles this gracefully: you only write what you have, and downstream steps check if fields are present before using them.

**Why shallow merge?**
Simple and predictable. Each step adds new keys or overwrites existing ones. There's no deep merging that could produce surprising results. The tradeoff is that an action can't partially update a nested object — but none of the actions need to do that.

---

## Action handlers — the unit of work

Every action is a function with this contract:

```ts
type ActionHandler = (args: {
  context: ExecutionContext;    // read what prior steps produced
  config?: Record<string, unknown>;  // per-action config (mostly unused)
  workflowExecutionId?: string;      // for actions that write to the DB
}) => Promise<{
  output: unknown;                   // what to save as the step's recorded output
  updatedContext: Partial<ExecutionContext>;  // what to merge into context
}>
```

Every action returns both `output` (what gets saved to `StepExecution.outputJson` for the UI) and `updatedContext` (what gets merged into the live context for the next step). These are usually the same data — the distinction is just that `output` is for persistence/display and `updatedContext` is for in-memory flow.

**Why this separation?**
An action might want to save more detail in the output (for display) than it needs to pass forward in context. For example, `find_open_slot` saves `candidateSlots` (all options) in the output but only puts `selectedSlot` (the winner) in context.

---

## The action registry — how the engine finds handlers

`lib/workflow-engine/actionRegistry.ts` is a simple lookup table:

```ts
const actionRegistry = {
  summarize_email: summarizeEmailHandler,
  extract_availability: extractAvailabilityHandler,
  find_open_slot: findOpenSlotHandler,
  // ...etc
};
```

When the engine needs to run an action, it does `actionRegistry[action.type]` and gets back the handler function. This means:

- The engine has no hardcoded knowledge of any specific action
- Adding a new action type means adding one handler file and one entry in this map
- All 11 action types are registered here

**The alternative** would be a big switch statement inside the engine itself. That would couple the engine to every action, making it harder to add new actions and harder to test the engine independently.

---

## The AI service layer — all OpenAI calls in one place

`lib/ai/service.ts` owns every call to OpenAI. No other file imports or uses the OpenAI SDK.

It exposes these functions:
- `summarizeMeetingEmail(emailText)` → `{ summary, meetingTopic }`
- `extractAvailability(emailText)` → `AvailabilityWindow[]`
- `researchAttendees(input)` → `string`
- `researchCompany(input)` → `string`
- `generatePrepNotes(input)` → `string`
- `generateConfirmationEmail(input)` → `string`
- `generateRescheduleEmail(input)` → `string`

**Every single one of these has a fallback.**
If `OPENAI_API_KEY` is not set, the function uses a local deterministic implementation instead. For example:
- `summarizeMeetingEmail` fallback: takes the first sentence of the email and keyword-matches for the topic
- `extractAvailability` fallback: regex-matches weekday names and "morning"/"afternoon" keywords
- `generateConfirmationEmail` fallback: fills in a template with the date/time

This means the entire application runs and demos correctly with no API key. You only need a key to get real AI quality.

**Why isolate all AI calls here?**
1. Fallback logic lives in one place, not scattered across 6 action files
2. Prompt wording lives in one place — easy to iterate
3. The action handlers stay clean: they call one service function and get back a typed result
4. You could swap OpenAI for a different model by editing one file

---

## The calendar service — deterministic scheduling logic

`lib/calendar/service.ts` handles everything scheduling-related:

**`findOpenSlot(availabilityWindows)`**
For each window the sender proposed, it fetches all `scheduled` events from the DB on that date. Then it walks the window in 30-minute increments from the window start, checking each candidate slot against the blocked list. Returns the first unblocked slot. Working hours are 09:00–17:00 — slots outside those hours are skipped even if proposed.

**`findFallbackSlots(cancelledEvent)`**
Looks at the next 5 business days after the cancelled event's date. For each day, tries three candidate start times: the original time of day, 09:00, and 14:00. Collects up to 3 unblocked slots.

**`loadCancelledEvent(eventId)`**
Fetches an event by ID, marks it cancelled in the DB, extracts enrichment fields into `priorMeetingContext`.

**`findEventBySenderEmail(input)`**
The more complex path: when you don't have a direct event ID (email-driven reschedule), this searches all `scheduled` events in the past 7 days + future, scores each by how well it matches the sender's name, company, and keywords from the email body, and returns the best match.

**Why is this separate from the AI service?**
Slot finding is pure logic — it queries the database and applies arithmetic. It doesn't need a model. Keeping it separate makes both services easier to understand: the AI service is about language, the calendar service is about time.

---

## The trigger system — how execution starts

`lib/workflow-engine/triggers.ts` has two jobs:

1. **Validate the incoming payload.** Before any execution begins, the trigger module checks that the required fields are present and non-empty. For `meeting_request_received`, `emailText` is required. For `meeting_reschedule_requested`, both `emailText` and `senderEmail` are required. If validation fails, it throws a clear error message — the workflow never starts.

2. **Seed the initial context.** Once the payload is valid, it builds the initial `ExecutionContext`. It does light processing: derives `senderName` from the email local part (everything before @), and `senderCompany` from the domain root (everything between @ and the first dot). So `alex@acme.com` → `senderName: "alex"`, `senderCompany: "acme"`.

**Why is trigger validation separate from the engine?**
The engine is generic — it doesn't know what fields different triggers need. Keeping trigger-specific validation in one place (triggers.ts) means adding a new trigger type is isolated to that file.

---

## Validation — what gets checked before a workflow runs

`lib/workflow-engine/validate.ts` runs before execution begins and enforces:

**Structural rules:**
- Workflow must be active
- Must have at least one enabled action
- Action order numbers must be strictly ascending (1, 2, 3... — no duplicates, no gaps required)

**Dependency rules:**
These are the "action A must come before action B" rules. They only apply when *both* actions are enabled. The logic is: if `find_open_slot` is enabled but `extract_availability` is not, there's no dependency violation — the engine just trusts that `availabilityWindows` will be in context somehow. But if both are enabled, `extract_availability` must have a lower order number.

Current rules enforced:
- `meeting_request_received`: `extract_availability` → `find_open_slot` → `create_calendar_event` → `generate_confirmation_email`
- `meeting_reschedule_requested`: `resolve_cancelled_event` → `find_fallback_slots` → `generate_reschedule_email`

**Why validate before running rather than letting it fail at runtime?**
Better error messages. If you misconfigure the order, you get a clear message like `"action extract_availability (order 3) must come before find_open_slot (order 2)"` before any DB records are created. Runtime failures are harder to diagnose and leave partial execution records.

---

## The streaming API — how the UI gets live updates

`app/api/workflows/[id]/stream/route.ts` implements the live execution panel.

Instead of the client waiting for the whole workflow to finish and getting one big JSON response, it uses **Server-Sent Events (SSE)**: the server streams a series of events over a persistent HTTP connection as things happen.

Events streamed:
- `workflow_start` — execution has begun, includes total step count
- `step_start` — a specific step just started running
- `step_complete` — a step finished, includes its output
- `step_failed` — a step threw an error
- `workflow_complete` — everything done, success or failed

The `executeWorkflow` function in `engine.ts` accepts an optional `onEvent` callback. The stream route wires this up to write SSE-encoded JSON to the response stream in real time.

**Why SSE instead of WebSockets?**
SSE is simpler for this use case: the server only pushes, the client only reads. WebSockets are bidirectional and require more infrastructure. For one-way streaming of execution events, SSE is the right tool.

**Why not just poll?**
Polling works, but you'd either poll slowly (poor UX — you see steps complete in batches) or rapidly (wasteful). SSE gives you instant updates with no wasted requests.

---

## The database layer — thin wrappers, nothing clever

`lib/db/` contains three files: `workflows.ts`, `executions.ts`, `calendarEvents.ts`. Each is a collection of small async functions that do one Prisma query each.

`lib/workflow-engine/normalize.ts` converts raw Prisma rows (which have strings for everything) into typed domain objects (`WorkflowDefinition`, etc.) with proper TypeScript types.

**Why a separate normalize layer?**
Prisma returns plain JS objects with whatever types the DB schema allows (often `string | null` for everything). The domain types are more specific. The normalize step is the boundary where you go from "whatever the DB returned" to "a thing the rest of the application can trust." This means the rest of the code never has to deal with `string | null` on fields that should always be a string.

---

## The WorkflowBuilder — creating custom workflows

`components/WorkflowBuilder.tsx` is the UI for building new workflows. You can:
- Name the workflow
- Choose a trigger type from a dropdown
- Add actions from a dropdown
- Reorder actions via drag-and-drop
- Save the workflow (calls `POST /api/workflows`)
- Run the workflow immediately after saving

After saving, a `RunWorkflowCard` appears inline so you can test the workflow you just built without navigating away.

**The drag-and-drop implementation** uses native HTML5 drag events (`draggable`, `onDragStart`, `onDragOver`, `onDrop`). The dragged item's UID is stored in a ref, and on drop, the action array is spliced to move the item to the new position.

**Tradeoff:** The builder doesn't validate dependency ordering as you add steps. If you build an invalid workflow (e.g., `find_open_slot` before `extract_availability`), the save succeeds but the execution will fail with a clear error from `validate.ts`. Adding real-time validation UI would be a natural next improvement.

---

## Why SQLite?

SQLite is a file-based database — the entire database is one file (`dev.db`) in the project root. No database server to install, configure, or connect to. For a take-home that reviewers need to run locally, this is the right call.

**Tradeoffs:**
- No concurrent writes (one writer at a time). Fine here since it's a single-user local tool.
- Not suitable for production at scale. Postgres would be the next step.
- Prisma's SQLite support is excellent, and the schema and queries translate cleanly to Postgres if needed.

---

## Why Next.js App Router?

Next.js gives you a full-stack TypeScript application in one repo: API routes and React pages live side by side, with shared types. The App Router (introduced in Next.js 13) provides:
- `async` server components that can directly `await` database queries without a separate API call
- Route handlers (`route.ts`) that handle API requests with typed `Request`/`Response`
- Client components (marked `"use client"`) for interactive UI like the streaming panel and workflow builder

**The `export const dynamic = "force-dynamic"` lines** at the top of some page files tell Next.js not to statically render those pages at build time — they must be rendered fresh on each request, because they read from the database.

---

## Why TypeScript strict mode?

`tsconfig.json` has `"strict": true`. This enables:
- No implicit `any` types
- Null/undefined checks everywhere
- No unsafe property access

The tradeoff is more code (explicit null checks, type assertions where needed), but it catches entire classes of bugs at compile time. The action handler contract (`ActionHandler` type), the execution context (`ExecutionContext` type), and the trigger exhaustiveness check (`never` type) are all only possible with strict TypeScript.

---

## The "no API key needed" design decision

Every AI action has two code paths: one that calls OpenAI, one that runs locally.

This was a deliberate product decision for the take-home context: a reviewer should be able to clone the repo, run `npm install && npx prisma migrate dev && npm run db:seed && npm run dev`, and have a fully functional demo without needing to provide any credentials.

The fallback implementations aren't stubs that return empty strings — they do real work:
- The availability extractor actually parses weekday names and morning/afternoon keywords
- The email summarizer extracts the first sentence and keyword-matches for meeting topics
- The confirmation email generator fills in a friendly template with real date formatting

**The tradeoff:** fallback output quality is obviously lower than GPT output. But for demonstration purposes, it's always coherent and produces valid data that downstream steps can use.

---

## What the app does NOT do (and why)

**No real email integration.** You paste email text into a form. Real Gmail integration would require OAuth, a webhook endpoint, parsing raw MIME messages — all of which adds reviewer friction and authentication complexity that's off-topic for a workflow engine take-home.

**No background jobs.** Workflows run synchronously inside the API request. This means the HTTP connection stays open for the duration of execution. For a local demo this is fine; in production you'd use a job queue (BullMQ, Inngest, etc.) so the API can return immediately and the work happens asynchronously.

**No branching or conditionals.** Workflows are purely linear. No "if step 3 fails, run step 3b instead." This keeps the engine simple and the data model straightforward. Supporting conditionals would require a DAG (directed acyclic graph) instead of a flat ordered list, which is a significant increase in complexity.

**No auth.** Single-user local tool. Multi-user would require session management, per-user calendars, workflow ownership — all out of scope.

**No timezone handling.** All times are local server time. The slot finder and fallback slot finder use `new Date()` which picks up the server's timezone. In production, you'd store all times in UTC and convert for display.

---

## The full request lifecycle for running a workflow

Here's what happens when you click "Run Workflow" in the browser:

1. The `RunWorkflowCard` component collects the form input (email text, sender email)
2. It opens an SSE connection: `fetch('/api/workflows/{id}/stream', { method: 'POST', body: JSON.stringify(payload) })`
3. The stream route handler (`app/api/workflows/[id]/stream/route.ts`) receives the request
4. It calls `executeWorkflow({ workflowId, triggerPayload, onEvent: emit })`
5. The engine loads the workflow from the DB
6. The engine validates it
7. The engine calls `initializeExecutionContext()` to validate the payload and build the initial context
8. The engine creates a `WorkflowExecution` row in SQLite
9. The engine marks it `running`
10. For each action (in order):
    a. The engine creates a `StepExecution` row
    b. The engine marks it `running` and emits a `step_start` SSE event
    c. The engine calls the action handler (which may call OpenAI or do DB work)
    d. The engine merges the result into context
    e. The engine marks the step `success` and emits a `step_complete` SSE event
11. The engine marks the workflow `success` and emits a `workflow_complete` SSE event
12. The server closes the stream
13. Back in the browser, the `StreamingExecutionPanel` component has been receiving and rendering these events live as they arrive
14. On `workflow_complete`, it shows a link to the full execution detail page

---

## Summary: the key architectural decisions and their tradeoffs

| Decision | Why | Tradeoff |
|---|---|---|
| Shared execution context passed between actions | Optional actions can be skipped without breaking the chain | Context grows large; shallow merge can mask bugs if two actions write the same key |
| Action registry (map of name → function) | Engine is decoupled from action implementations; easy to add new actions | All action types must be registered; a typo in the registry silently breaks things |
| AI service isolated in one file | Fallback logic and prompt wording in one place; easy to swap models | If you need very different AI behavior per action, one file can get long |
| Synchronous execution in-request | Simple to implement; easy to follow in a debugger | HTTP connection stays open; long workflows could time out |
| Validate before executing | Clear upfront errors; no partial execution records from misconfiguration | A slight delay before execution begins; validation can't catch all runtime errors |
| SQLite | Zero setup for reviewers | No concurrent writes; not production-scale |
| SSE for live streaming | Real-time step-by-step updates without polling | More complex client code than a simple fetch; server must keep connection alive |
| Fallback AI implementations | App works fully without an API key | Fallback quality is lower; two code paths to maintain |
| Next.js App Router | Full-stack in one repo; server components can query DB directly | App Router has breaking changes from Pages Router; steeper learning curve |
