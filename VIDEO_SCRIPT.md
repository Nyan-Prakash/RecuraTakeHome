# Video Script: Recura Take-Home Walkthrough (~5 minutes)

---

## INTRO (0:00 – 0:20)

> "Hi, I'm going to walk you through my solution for the Recura take-home. I'll cover the architecture, data models, how each part of the codebase works, and — throughout — where I'd make changes before shipping this to a real team."

---

## SECTION 1: Architectural Overview (0:20 – 1:00)

**Open: project root in file tree**

> "At the top level, this is a Next.js App Router project with a SQLite database via Prisma, and an optional OpenAI integration that falls back to deterministic logic when no key is present."

**Diagram (describe while showing folder structure):**

```
Browser
  └── Next.js App Router (React Server + Client Components)
        ├── API Routes (Route Handlers)
        │     └── Workflow Engine (lib/workflow-engine/)
        │           ├── Actions (11 handlers)
        │           ├── AI Service (lib/ai/service.ts)
        │           └── Calendar Service (lib/calendar/service.ts)
        └── Prisma ORM → SQLite (dev.db)
```

> "The key architectural decision is that the workflow engine is a pure library — it knows nothing about HTTP. The API routes are thin adapters that call the engine. This makes the engine independently testable."

> "For the UI, I used Server Components for data fetching pages and Client Components only where interactivity is needed — forms, drag-and-drop, streaming panels."

---

## SECTION 2: Data Models (1:00 – 1:50)

**Open: `prisma/schema.prisma`**

> "There are four core database tables."

### Workflow
> "A Workflow is a named template — it has a trigger type (either `meeting_request_received` or `meeting_reschedule_requested`), a flag for whether it's active, and an ordered list of Actions."

### WorkflowAction
> "Each action has a type string, an order integer, optional/enabled flags, and a configJson column for future parameterization. Right now config is unused, but the column is there."

> **[Production note]:** "In production, I'd use a proper enum at the DB level and add a foreign key index on workflowId. I'd also consider a `version` column on Workflow for safe in-flight rollouts — so running executions aren't affected by a workflow edit."

### WorkflowExecution + StepExecution
> "Every time a workflow runs, we create a WorkflowExecution row. Each step creates a StepExecution with the full ExecutionContext snapshot before and after — stored as JSON. This gives complete audit history."

> **[Production note]:** "Storing full context JSON blobs per step is great for debugging in a prototype, but at scale you'd want to extract key fields into typed columns, add pagination indexes, and possibly archive to object storage after N days."

### CalendarEvent
> "CalendarEvent is our local calendar — it has title, start/end time, a status (scheduled or cancelled), and enrichment fields like attendee research and pre-meeting notes that get populated during workflow execution."

> **[Production note]:** "In production this would sync with Google Calendar or Outlook via OAuth. The status field also needs an index — right now a calendar page load does a full table scan."

**Open: `lib/workflow-engine/types.ts`**

> "On the TypeScript side, ExecutionContext is the mutable state that flows through the entire workflow — it carries the parsed email, extracted availability windows, the chosen time slot, and all the generated artifacts. Each action reads from context and writes back a partial update."

---

## SECTION 3: Codebase Walkthrough (1:50 – 3:40)

### 3a. Workflow Engine — `lib/workflow-engine/engine.ts` (1:50 – 2:15)

> "This is the heart of the app. The `runWorkflow` function loads the workflow, initializes a context from the trigger payload, then loops over enabled actions in order. For each step, it creates a StepExecution row, calls the handler, merges the output back into context, and updates the row."

> "The streaming variant emits Server-Sent Events at each step boundary — `step_start`, `step_complete`, `step_failed` — which the frontend consumes in real time."

> **[Production note]:** "Right now execution is synchronous, inline with the HTTP request. For a real system I'd move this to a background job queue (BullMQ, Inngest, etc.) with a webhook or WebSocket for progress updates. A 30-second HTTP timeout would kill a multi-step AI workflow."

### 3b. Action Registry + Handlers — `lib/workflow-engine/actionRegistry.ts` + `actions/` (2:15 – 2:40)

> "Each action is registered in a map from action type string to handler function. The handler contract is simple: take context and optional config, return output and a partial context update. Adding a new action means writing one file and registering it — nothing else changes."

> "There are 11 actions across the two workflow types: summarize email, extract availability, find open slot, research attendees, research company, generate pre-meeting notes, create calendar event, generate confirmation email, resolve cancelled event, find fallback slots, and generate reschedule email."

> **[Production note]:** "The registry is a plain object import — fine for now. In production I'd want the registry to be dynamically validated at startup against the workflow definitions in the DB so a missing handler fails fast on boot, not at runtime."

### 3c. AI Service — `lib/ai/service.ts` (2:40 – 3:00)

> "Every AI function has a deterministic fallback — regex-based parsing, keyword extraction, template strings. This means the app is fully runnable without an OpenAI key, which made local development and demo much simpler."

> **[Production note]:** "The fallbacks are fine for a demo, but in production you'd want proper prompt versioning, structured output validation (Zod against the JSON response), and retry logic with exponential backoff. Right now a bad JSON response from the model would crash the action handler."

### 3d. Calendar Service — `lib/calendar/service.ts` (3:00 – 3:15)

> "The calendar service handles slot-finding: it looks for 30-minute windows in business hours (9am–5pm) on the requested days, filtering against already-scheduled events. It's entirely in-memory against the SQLite data."

> **[Production note]:** "Slot-finding should handle timezones explicitly — right now it assumes UTC. In production, store all times in UTC and convert at the display layer using the user's locale."

### 3e. API Layer — `app/api/` (3:15 – 3:25)

> "The API routes are deliberately thin — they validate inputs, call into the library layer, and return typed HTTP responses. The response helpers in `lib/http/responses.ts` keep status codes consistent."

> **[Production note]:** "There's no authentication on any route right now. In production, every route handler would go through middleware that validates a session or API key before touching the DB."

### 3f. UI Components — `components/` (3:25 – 3:40)

> "The streaming execution panel is the most interesting UI piece — it opens an EventSource connection to the SSE endpoint and builds the step timeline incrementally as events arrive, with auto-scroll and expandable JSON panels."

> "The WorkflowBuilder uses `@hello-pangea/dnd` for drag-to-reorder actions, with enable/disable toggles and optional action markers."

> **[Production note]:** "The streaming panel has no reconnect logic — if the connection drops mid-execution, the user sees a frozen UI. Production would need reconnection with a `Last-Event-ID` header to resume from the last seen event."

---

## SECTION 4: What I'd Change for Production (3:40 – 4:30)

> "Let me consolidate the production gaps I mentioned:"

1. **Background job queue** — Move workflow execution off the HTTP thread. Use Inngest or BullMQ. SSE/WebSocket for progress.

2. **Authentication & authorization** — Every API route needs auth middleware. Workflows and executions should be scoped to a user or organization.

3. **Real calendar integration** — Replace the local SQLite calendar with Google Calendar / Outlook OAuth sync. Handle timezones explicitly.

4. **AI reliability** — Add Zod validation on all AI JSON outputs, retry with backoff, and prompt versioning so you can A/B test prompts without a deploy.

5. **Workflow versioning** — Add a version field so in-flight executions aren't broken by a workflow edit.

6. **Database indexes + pagination** — Add indexes on foreign keys and status columns. Every list endpoint needs cursor-based pagination.

7. **SSE reconnection** — Implement `Last-Event-ID` resume logic on both server and client for resilient streaming.

8. **Testing** — The engine is structured for testability (pure functions, handler contract), but there are no tests. I'd add unit tests per action handler and integration tests against the execution engine with a seeded DB.

9. **Error observability** — Right now errors are stored in `StepExecution.errorMessage` strings. Production needs structured error codes, a Sentry/Datadog integration, and alerting on workflow failure rates.

10. **Config parameterization** — The `configJson` column on WorkflowAction is stubbed but unused. Wiring this up would let you change meeting duration, business hours, or AI model per-workflow without a code deploy.

---

## OUTRO (4:30 – 5:00)

> "Overall, the architecture is clean and the abstractions hold up — the engine is portable, the actions are composable, and the streaming UI gives a good user experience. The main gaps are the things you'd expect in a prototype: no auth, synchronous execution, no real calendar sync, and no tests. But the bones are solid and extending it to production would be incremental work rather than a rewrite. Thanks for watching."

---

## Quick Reference Card (for on-screen display during recording)

| Layer | Key File | What It Does |
|-------|----------|-------------|
| Engine | `lib/workflow-engine/engine.ts` | Execution loop + SSE streaming |
| Actions | `lib/workflow-engine/actions/*.ts` | 11 handlers (meeting → calendar) |
| AI | `lib/ai/service.ts` | OpenAI + deterministic fallbacks |
| Calendar | `lib/calendar/service.ts` | Slot-finding, event creation |
| DB | `prisma/schema.prisma` | 4 tables: Workflow, Action, Execution, CalendarEvent |
| API | `app/api/**` | Thin HTTP adapters |
| UI | `components/StreamingExecutionPanel.tsx` | Real-time step visualization |
| Builder | `components/WorkflowBuilder.tsx` | Drag-and-drop workflow editor |

---

## Suggested Screen Recording Flow

1. **0:00** — Show repo root / README briefly
2. **0:20** — Open `app/` folder, describe App Router layout, show `app/page.tsx` → `app/layout.tsx`
3. **1:00** — Open `prisma/schema.prisma`, walk all 4 models
4. **1:50** — Open `lib/workflow-engine/engine.ts`, show the main execution loop
5. **2:15** — Open `lib/workflow-engine/actionRegistry.ts`, show one action handler (e.g., `summarizeEmail.ts`)
6. **2:40** — Open `lib/ai/service.ts`, show a function with its fallback
7. **3:00** — Open `lib/calendar/service.ts`, show `findOpenSlot`
8. **3:15** — Open `app/api/workflows/[id]/stream/route.ts`, show SSE route
9. **3:25** — Open `components/StreamingExecutionPanel.tsx`, show EventSource + step rendering
10. **3:40** — Switch to a text slide / README for the production gaps summary
11. **4:30** — End on running app demo (browser showing a workflow execution completing in real time)
