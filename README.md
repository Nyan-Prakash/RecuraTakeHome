# AI Meeting Scheduler — Workflow Automation Tool

## Overview

This is a workflow automation tool focused on scheduling intelligence. It processes incoming meeting request emails and handles event cancellations using a configurable pipeline of AI-powered and deterministic actions.

Each workflow is defined as an ordered list of typed actions attached to a trigger. When a trigger fires, the engine runs each enabled action sequentially, persists execution state at every step, and produces structured artifacts — an email summary, a selected calendar slot, a drafted reply, and a persisted calendar event.

The app is scoped to run entirely locally with no external dependencies required. AI actions use OpenAI when a key is present and fall back to deterministic local implementations when one is not.

---

## What it supports

- `meeting_request_received` trigger — processes a scheduling email end-to-end
- `event_cancelled` trigger — handles a cancelled event, finds fallback slots, drafts a reschedule email
- Linear ordered workflows with per-action enable/disable and optional flags
- Real execution persistence — every run and every step is saved to SQLite
- Step-by-step execution detail with input/output snapshots per step
- Local calendar event creation with enrichment fields (summary, attendee research, pre-meeting notes)
- AI actions that fall back gracefully when `OPENAI_API_KEY` is not set
- Full execution history browsable in the UI

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React, Tailwind CSS |
| Language | TypeScript (strict mode) |
| API | Next.js Route Handlers |
| Database | SQLite via Prisma 7 |
| AI | OpenAI SDK (optional — fallback mode available) |

---

## Architecture

```
Browser
  └── Next.js Pages (App Router, server + client components)
        └── API Routes (/api/workflows, /api/executions, /api/calendar/events)
              └── Execution Engine (lib/workflow-engine/engine.ts)
                    ├── Action Registry  (maps action type → handler)
                    ├── Action Handlers  (lib/workflow-engine/actions/)
                    │     ├── AI actions      → lib/ai/service.ts → OpenAI / fallback
                    │     └── Calendar actions → lib/calendar/service.ts → Prisma
                    └── Persistence (lib/db/) → SQLite via Prisma
```

**Key files:**

| File | Purpose |
|------|---------|
| `lib/workflow-engine/engine.ts` | Core execution loop — load, validate, run, persist |
| `lib/workflow-engine/actionRegistry.ts` | Maps every `WorkflowActionType` to its handler |
| `lib/workflow-engine/types.ts` | All domain types — context, handlers, results |
| `lib/ai/service.ts` | All OpenAI calls, prompt construction, fallback implementations |
| `lib/calendar/service.ts` | Slot finding, event creation, fallback slot generation |
| `lib/db/` | Prisma helpers for workflows, executions, steps, calendar events |
| `prisma/schema.prisma` | SQLite schema — Workflow, WorkflowAction, WorkflowExecution, StepExecution, CalendarEvent |
| `prisma/seed.ts` | Seeds the two workflow definitions |

---

## Seeded workflows

Two workflows are created by the seed script:

### 1. Meeting Request Processor
**Trigger:** `meeting_request_received`

| # | Action | Notes |
|---|--------|-------|
| 1 | Summarize Email | AI — extracts summary and meeting topic |
| 2 | Extract Availability | AI — parses availability windows from email |
| 3 | Find Open Slot | Calendar — finds first free 30-min slot |
| 4 | Research Attendees | AI — prep notes on attendees *(optional)* |
| 5 | Research Company | AI — company context *(optional)* |
| 6 | Generate Pre-Meeting Notes | AI — combined prep brief *(optional)* |
| 7 | Create Calendar Event | Calendar — persists event to SQLite |
| 8 | Generate Confirmation Email | AI — drafts reply email |

### 2. Event Cancellation Handler
**Trigger:** `event_cancelled`

| # | Action | Notes |
|---|--------|-------|
| 1 | Load Cancelled Event | Calendar — fetches event from DB |
| 2 | Find Fallback Slots | Calendar — next available 30-min slots |
| 3 | Research Attendees | AI — prep notes *(optional)* |
| 4 | Research Company | AI — company context *(optional)* |
| 5 | Generate Reschedule Email | AI — drafts reschedule request |

---

## Local setup

### Prerequisites
- Node.js 18+
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
# Required
DATABASE_URL="file:./dev.db"

# Optional — AI actions use deterministic fallback if not set
OPENAI_API_KEY="sk-..."

# Optional — defaults to gpt-4o-mini if API key is set
OPENAI_MODEL="gpt-4o-mini"
```

**The app works fully without `OPENAI_API_KEY`.** AI-powered steps use a rules-based fallback that produces sensible output from the demo email.

### 3. Run database migration

```bash
npx prisma migrate dev
```

### 4. Seed workflows

```bash
npm run db:seed
```

Seeds the two workflow definitions. Idempotent — safe to run multiple times.

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## What to expect after startup

- `/workflows` shows both seeded workflows immediately
- Running the Meeting Request Processor creates a real `CalendarEvent` row in SQLite
- The created event appears on `/calendar` with enrichment fields populated (summary, attendee research, pre-meeting notes)
- Cancelling an event from `/calendar` fires the Event Cancellation Handler automatically and shows an inline execution result
- All runs appear on `/executions` with full step-level input/output detail

No manual data entry is needed beyond pasting an email into the run form.

---

## Demo walkthrough

### Demo 1 — Meeting request workflow

1. Open [http://localhost:3000/workflows](http://localhost:3000/workflows)
2. Click **Meeting Request Processor**
3. Click **Load sample email** to fill in the demo email
4. Click **Run workflow**
5. After completion, click **View execution** to see the full step timeline
6. Each step shows its input context snapshot and output payload
7. The **Artifacts** section shows: selected slot, created event, reply draft, and pre-meeting notes
8. Open [http://localhost:3000/calendar](http://localhost:3000/calendar) — the new event is listed

### Demo 2 — Event cancellation workflow

1. On `/calendar`, find a scheduled event and click **Cancel event**
2. Confirm — this marks the event cancelled and fires the Event Cancellation Handler
3. An inline result banner shows the execution status
4. Click **View execution →** to inspect the cancellation workflow's steps
5. Artifacts include: the loaded event data, fallback time slots, and a reschedule email draft

---

## Sample email

```
Hi Dave, I'd love to talk about a design partner opportunity. I'm free Tuesday afternoon or Thursday morning. Let me know what works best.
```

The **Load sample email** button fills this in automatically. It produces two availability windows (Tuesday afternoon, Thursday morning) which the slot finder resolves against existing calendar events.

---

## Resetting demo state

To wipe all executions and calendar events and return to a clean baseline:

```bash
npm run demo:reset
```

This removes all execution records, step records, and calendar events, then re-seeds the workflow definitions. Useful for re-running the demo from scratch.

---

## Available scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type check |
| `npm run db:seed` | Seed workflow definitions |
| `npm run db:reset` | Wipe DB and re-run migrations |
| `npm run demo:reset` | Reset to clean demo state (keeps schema) |

---

## Assumptions and scope

Intentional constraints for this take-home:

- **Local calendar only** — no Google Calendar or iCal integration
- **No email integration** — email text is entered manually via the UI
- **Synchronous execution** — workflows run inline with the API request
- **Linear workflows only** — no branching, conditionals, or parallel steps
- **No auth** — single-user local tool
- **Business hours 09:00–17:00** — slot finding operates within this window
- **No timezone handling** — all times use local server time
- **Fallback AI mode** — fully demoable without an OpenAI API key

---

## Potential improvements

- Background job execution decoupled from the HTTP request lifecycle
- Webhook/email inbound integration for real trigger ingestion
- Stronger structured output parsing and validation for AI responses (e.g., Zod)
- Branching, conditional, and parallel workflow steps
- Retry and idempotency for failed steps
- External calendar sync (Google Calendar, Outlook)
- Multi-user support with authentication
