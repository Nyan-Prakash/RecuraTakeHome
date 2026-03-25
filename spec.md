# AI Meeting Scheduler Workflow Automation Tool

## Overview

This project is a focused fullstack take-home implementation of a workflow automation product with AI-powered action steps. The product is intentionally scoped to a narrow scheduling domain so the implementation can be polished, locally runnable, and clearly explainable within the assignment timebox.

The application allows a user to define and inspect workflows composed of:
- a **trigger** that starts execution
- an ordered list of **actions** that run sequentially
- a persistent **execution history** showing step-by-step outputs

The scheduling domain is centered on two workflow triggers:
1. `meeting_request_received`
2. `event_cancelled`

The primary workflow processes an incoming meeting-request email, extracts scheduling information, finds an available calendar slot, optionally enriches the event with AI-generated research/context, creates a calendar event, and drafts a reply email.

The secondary workflow handles a cancelled event and generates a rescheduling path using overlapping reusable action types.

This design is intentionally **linear**, **locally runnable**, and **integration-light**. The product simulates incoming email and calendar actions through the app UI instead of relying on Gmail or Google Calendar integrations. This keeps the take-home focused on workflow execution, architecture, validation, persistence, and AI as a first-class step.

---

## Product Goals

### Primary goals
- Demonstrate a real workflow automation system with explicit triggers and ordered actions
- Include AI-powered steps as first-class workflow actions
- Execute workflows end-to-end and persist status/history
- Show clean architecture and separation of concerns
- Keep the app fast to run locally and easy for reviewers to evaluate

### Non-goals
- Real Gmail integration
- Real Google Calendar OAuth integration
- Background job queues or distributed execution
- DAG-based or branching workflows
- Node-graph or drag-and-drop builder
- Real outbound email sending
- Multi-user auth and permissions
- Full timezone support
- Recurring calendar events
- Verified web research against live external sources

---

## Product Scope

The product is a small internal-tool style workflow application for scheduling-related automations.

### Supported trigger types
- `meeting_request_received`
- `event_cancelled`

### Supported workflow style
- Linear ordered workflows only
- Top-to-bottom synchronous execution
- Stop-on-failure semantics
- Optional enrichment actions that can be enabled/disabled

### Supported calendar model
- One local app calendar
- Fixed working hours
- Fixed timezone assumption
- Fixed default meeting duration unless overridden by an action
- Local persistence only

---

## Core Product Concepts

### Trigger
A trigger is the event that starts a workflow execution.

A workflow is always bound to exactly one trigger type.

### Action
An action is a reusable workflow step that reads from the current execution context and writes outputs back into that context.

Actions are modeled as named step types with their own handlers.

### Workflow
A workflow is a persisted definition containing:
- metadata
- one trigger type
- an ordered list of actions

### Workflow Execution
A workflow execution is a single run of a workflow, created when its trigger is fired.

### Step Execution
A step execution is a persisted record for one action during one workflow execution.

### Execution Context
The execution context is a shared object passed between actions during a single workflow run. Each action can read existing context and append new fields.

This is the core mechanism that enables optional enrichment actions to be omitted while the workflow still runs successfully.

---

## High-Level User Flows

## 1. Meeting request workflow
1. User opens the app
2. User selects the `Meeting Request Processor` workflow
3. User pastes a scheduling email into the run form
4. User triggers execution
5. The system creates a workflow execution record
6. Actions run sequentially:
   - summarize email
   - extract availability
   - find open slot
   - optionally research attendees
   - optionally research company
   - optionally generate prep notes
   - create calendar event
   - generate reply email
7. The system stores all step outputs
8. The UI shows the final status, event details, reply draft, and execution history

## 2. Event cancelled workflow
1. User opens the calendar page
2. User selects an existing event and cancels it
3. The app fires the `event_cancelled` trigger
4. The system creates a workflow execution record for the cancellation workflow
5. Actions run sequentially:
   - load cancelled event
   - find fallback slots
   - optionally research attendees
   - optionally research company
   - generate reschedule email
6. The UI shows the reschedule result and execution history

---

## Workflow Definitions

## Workflow A: Meeting Request Processor

### Trigger
`meeting_request_received`

### Trigger input
A user manually submits an incoming meeting-request email in the UI.

### Example input
> Hi Dave, I’d love to talk about a design partner opportunity. I’m free Tuesday afternoon or Thursday morning. Let me know what works best.

### Recommended ordered action chain
1. `summarize_email`
2. `extract_availability`
3. `find_open_slot`
4. `research_attendees` (optional)
5. `research_company` (optional)
6. `generate_pre_meeting_notes` (optional)
7. `create_calendar_event`
8. `generate_confirmation_email`

### Primary output
- selected meeting slot
- created calendar event
- generated reply email draft
- optional attendee/company research and prep notes

---

## Workflow B: Event Cancellation Handler

### Trigger
`event_cancelled`

### Trigger input
A user cancels an existing calendar event in the UI.

### Recommended ordered action chain
1. `load_cancelled_event`
2. `find_fallback_slots`
3. `research_attendees` (optional)
4. `research_company` (optional)
5. `generate_reschedule_email`

### Primary output
- cancelled event details
- proposed fallback slots
- generated reschedule email draft

---

## Trigger Design

## Trigger: `meeting_request_received`

### Purpose
Represents an incoming scheduling email.

### Implementation approach
This trigger is simulated via manual submission in the UI. The user pastes email text into a form and clicks Run.

### Why this design was chosen
This preserves the product concept of incoming email automation while avoiding Gmail setup, webhook complexity, and reviewer friction.

### Trigger payload shape
```json
{
  "emailText": "Hi Dave, I’d love to talk next week. I’m free Tuesday after 2 or Thursday morning.",
  "source": "manual_ui"
}
```

---

## Trigger: `event_cancelled`

### Purpose
Represents an event cancellation that should start a rescheduling workflow.

### Implementation approach
This trigger is simulated through the calendar UI. The user clicks Cancel Event on an existing event.

### Trigger payload shape
```json
{
  "eventId": "evt_123",
  "reason": "manual_cancel",
  "source": "calendar_ui"
}
```

---

## Action Library

The system supports reusable action types. A workflow selects a subset of these actions in an ordered sequence.

## 1. `summarize_email`

### Purpose
Creates a concise summary of what the sender wants to discuss.

### Inputs
- `originalEmail`

### Outputs
- `summary`
- optionally `meetingTopic`

### Notes
This is an AI-powered action.

---

## 2. `extract_availability`

### Purpose
Extracts and normalizes availability windows from natural-language email text.

### Inputs
- `originalEmail`

### Outputs
- `availabilityWindows`

### Example output
```json
[
  {
    "date": "2026-03-26",
    "start": "14:00",
    "end": "17:00",
    "label": "Thursday afternoon"
  },
  {
    "date": "2026-03-27",
    "start": "09:00",
    "end": "12:00",
    "label": "Friday morning"
  }
]
```

### Notes
This is an AI-powered action. The response should be validated and normalized before downstream use.

---

## 3. `find_open_slot`

### Purpose
Compares extracted availability windows against the local calendar and selects a valid slot.

### Inputs
- `availabilityWindows`
- `meetingDurationMinutes` (default if absent)

### Outputs
- `selectedSlot`
- optionally `candidateSlots`

### Notes
This is a deterministic calendar action, not an AI action.

---

## 4. `research_attendees`

### Purpose
Generates attendee context and talking points from available workflow data.

### Inputs
- `originalEmail`
- `summary`
- any parsed names/emails if present

### Outputs
- `attendeeResearch`

### Notes
This action uses the ChatGPT API for enrichment. It should be framed as attendee context generation or meeting prep enrichment, not guaranteed live web research.

---

## 5. `research_company`

### Purpose
Generates likely company context from the sender domain, meeting topic, and email content.

### Inputs
- `originalEmail`
- `summary`
- sender domain if available

### Outputs
- `companyResearch`

### Notes
This is also an enrichment action using the ChatGPT API.

---

## 6. `generate_pre_meeting_notes`

### Purpose
Combines available meeting context into a concise prep brief.

### Inputs
- `summary`
- `attendeeResearch` (optional)
- `companyResearch` (optional)

### Outputs
- `preMeetingNotes`

### Example output
- likely meeting purpose
- suggested talking points
- suggested questions to ask

### Notes
This action should gracefully degrade if attendee or company research is missing.

---

## 7. `create_calendar_event`

### Purpose
Creates the final local calendar event from the selected slot and available enrichment data.

### Inputs
- `selectedSlot`
- `summary` (optional but preferred)
- `attendeeResearch` (optional)
- `companyResearch` (optional)
- `preMeetingNotes` (optional)

### Outputs
- `createdEvent`
- `createdEventId`

### Notes
This action must not fail simply because optional enrichment fields are absent.

It should produce a basic event when only the required scheduling fields are present and a richer event when optional research actions were included.

---

## 8. `generate_confirmation_email`

### Purpose
Generates a confirmation email once a slot has been selected and an event has been created.

### Inputs
- `summary`
- `selectedSlot`
- `createdEvent`
- optionally research/prep context

### Outputs
- `replyDraft`

### Notes
AI-powered action.

---

## 9. `load_cancelled_event`

### Purpose
Loads the data for a cancelled event into the workflow execution context.

### Inputs
- `eventId`

### Outputs
- `cancelledEvent`
- `attendees` if available
- `priorMeetingContext` if available

### Notes
Non-AI action.

---

## 10. `find_fallback_slots`

### Purpose
Finds alternative available times after a cancellation.

### Inputs
- `cancelledEvent`
- calendar availability rules

### Outputs
- `fallbackSlots`

### Notes
Non-AI action.

---

## 11. `generate_reschedule_email`

### Purpose
Generates a rescheduling email after a cancellation.

### Inputs
- `cancelledEvent`
- `fallbackSlots`
- optional attendee/company context

### Outputs
- `replyDraft`

### Notes
AI-powered action.

---

## Required vs Optional Actions

### Required for `meeting_request_received`
- `extract_availability`
- `find_open_slot`
- `create_calendar_event`

### Strongly recommended but not strictly required
- `summarize_email`
- `generate_confirmation_email`

### Optional enrichment actions
- `research_attendees`
- `research_company`
- `generate_pre_meeting_notes`

### Required for `event_cancelled`
- `load_cancelled_event`
- `find_fallback_slots`
- `generate_reschedule_email`

### Optional enrichment for `event_cancelled`
- `research_attendees`
- `research_company`

---

## Shared Action Design

A key architectural decision is that triggers and actions are separate concepts.

This means:
- multiple workflows can use the same action library
- the same action can appear in different workflows
- actions are reusable, while workflows are compositions of actions

For example:
- `research_attendees` can be used in both `meeting_request_received` and `event_cancelled`
- `research_company` can also be reused across both workflows

This makes the system feel like a true workflow engine instead of two hardcoded scripts.

---

## Optional Action Semantics

The system is designed so optional enrichment actions can be omitted without breaking workflow execution.

### Example
If `research_attendees` and `research_company` are not included:
- the workflow still runs
- the calendar event is still created
- the reply email is still generated
- the event just contains less context

### Design rule
Downstream actions must gracefully handle missing optional fields.

This is particularly important for:
- `create_calendar_event`
- `generate_pre_meeting_notes`
- `generate_confirmation_email`
- `generate_reschedule_email`

This makes workflows composable and robust.

---

## Execution Engine Design

The execution engine is the central domain service of the application.

### Responsibilities
- load workflow definition
- validate action sequence
- create workflow execution record
- initialize execution context
- run action handlers sequentially
- persist step execution records
- stop on failure
- persist final execution result

### Execution semantics
- actions execute sequentially
- each action receives the current execution context
- each action returns outputs that are merged into the context
- if any action fails, the workflow is marked failed and no further actions run

---

## Execution Context Design

The execution context is the shared mutable state for one workflow run.

### Example context shape
```ts
export type ExecutionContext = {
  triggerType: 'meeting_request_received' | 'event_cancelled';

  originalEmail?: string;
  summary?: string;
  meetingTopic?: string;

  availabilityWindows?: Array<{
    date: string;
    start: string;
    end: string;
    label?: string;
  }>;

  selectedSlot?: {
    startTime: string;
    endTime: string;
    durationMinutes: number;
  };

  attendeeResearch?: string;
  companyResearch?: string;
  preMeetingNotes?: string;

  createdEventId?: string;
  createdEvent?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    description: string;
  };

  cancelledEvent?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    description?: string;
  };

  fallbackSlots?: Array<{
    startTime: string;
    endTime: string;
  }>;

  replyDraft?: string;
};
```

### Design principle
Only some fields are required for a given trigger. Most context fields are optional because not all actions are guaranteed to run.

---

## Action Handler Interface

Each action is implemented as an isolated handler.

### Conceptual interface
```ts
export type ActionHandler = (args: {
  context: ExecutionContext;
  config?: Record<string, unknown>;
}) => Promise<{
  output: unknown;
  updatedContext: Partial<ExecutionContext>;
}>;
```

### Why this design
- keeps actions modular
- makes the engine generic
- makes actions individually testable
- supports shared action reuse across workflows

---

## Action Registry

The engine uses an action registry to dispatch actions by type.

### Conceptual example
```ts
const actionRegistry = {
  summarize_email: summarizeEmailHandler,
  extract_availability: extractAvailabilityHandler,
  find_open_slot: findOpenSlotHandler,
  research_attendees: researchAttendeesHandler,
  research_company: researchCompanyHandler,
  generate_pre_meeting_notes: generatePreMeetingNotesHandler,
  create_calendar_event: createCalendarEventHandler,
  generate_confirmation_email: generateConfirmationEmailHandler,
  load_cancelled_event: loadCancelledEventHandler,
  find_fallback_slots: findFallbackSlotsHandler,
  generate_reschedule_email: generateRescheduleEmailHandler,
};
```

This is an important part of making the system appear intentionally designed rather than hardcoded.

---

## Validation Rules

### Workflow-level validation
- a workflow must have exactly one trigger type
- a workflow must have at least one action
- actions must be stored in a valid execution order

### Action dependency validation
Examples:
- `find_open_slot` requires `extract_availability` earlier in the chain for `meeting_request_received`
- `create_calendar_event` requires `find_open_slot` earlier in the chain
- `generate_confirmation_email` should occur after `create_calendar_event`
- `find_fallback_slots` requires `load_cancelled_event` earlier in the chain

### Runtime validation
- empty email input is rejected
- invalid event cancellation target is rejected
- malformed AI output is validated and normalized
- no-slot-available should produce a controlled failure/result state

---

## Persistence Model

SQLite with Prisma is the recommended persistence layer.

### Why
- easy local setup
- real relational persistence
- simple reviewer experience
- enough structure for clean data modeling

---

## Data Model

## `Workflow`
Represents a saved workflow definition.

### Fields
- `id`
- `name`
- `description`
- `triggerType`
- `isActive`
- `createdAt`
- `updatedAt`

---

## `WorkflowAction`
Represents one ordered action within a workflow.

### Fields
- `id`
- `workflowId`
- `type`
- `order`
- `isOptional`
- `isEnabled`
- `configJson`

---

## `WorkflowExecution`
Represents a single execution of a workflow.

### Fields
- `id`
- `workflowId`
- `triggerType`
- `triggerPayloadJson`
- `status`
- `startedAt`
- `completedAt`
- `errorMessage`

### Status values
- `pending`
- `running`
- `success`
- `failed`

---

## `StepExecution`
Represents a single action execution.

### Fields
- `id`
- `workflowExecutionId`
- `workflowActionId`
- `actionType`
- `status`
- `inputJson`
- `outputJson`
- `errorMessage`
- `startedAt`
- `completedAt`

### Status values
- `pending`
- `running`
- `success`
- `failed`
- `skipped`

---

## `CalendarEvent`
Represents a local calendar event created or managed by workflows.

### Fields
- `id`
- `title`
- `description`
- `startTime`
- `endTime`
- `status`
- `meetingSummary`
- `attendeeResearch`
- `companyResearch`
- `preMeetingNotes`
- `sourceWorkflowExecutionId`
- `createdAt`
- `updatedAt`

### Status values
- `scheduled`
- `cancelled`

### Design note
The event should remain useful even when enrichment fields are absent.

---

## API Surface

The API should be minimal and directly aligned to the product.

## Workflows

### `GET /api/workflows`
Returns all workflows.

### `GET /api/workflows/:id`
Returns one workflow with its ordered actions.

### `POST /api/workflows`
Creates a workflow definition.

### `PATCH /api/workflows/:id`
Updates workflow metadata and enabled/disabled optional actions.

---

## Executions

### `POST /api/workflows/:id/execute`
Runs a workflow.

### Example request for meeting request trigger
```json
{
  "emailText": "Hi Dave, I’d love to chat next week. I’m free Tuesday after 2 or Thursday morning."
}
```

### `GET /api/executions`
Returns execution history.

### `GET /api/executions/:id`
Returns execution detail with step executions.

---

## Calendar

### `GET /api/calendar/events`
Returns all local calendar events.

### `POST /api/calendar/events/:id/cancel`
Cancels an event and fires the `event_cancelled` workflow.

---

## AI Service Layer

All LLM logic should be isolated behind a dedicated AI service.

### Responsibilities
- call ChatGPT API
- standardize prompts
- return parsed structured outputs when needed
- centralize error handling and fallback behavior

### Example service methods
- `summarizeMeetingEmail(emailText)`
- `extractAvailability(emailText)`
- `researchAttendees(input)`
- `researchCompany(input)`
- `generatePrepNotes(input)`
- `generateConfirmationEmail(input)`
- `generateRescheduleEmail(input)`

### Design note
This prevents action handlers from being cluttered with prompt construction and API details.

---

## Calendar Service Layer

Calendar logic should be deterministic and isolated from AI.

### Responsibilities
- enforce business hours
- find open slots
- check for conflicts
- create events
- cancel events
- find fallback slots

### Key assumptions
- fixed timezone
- default working hours: 9:00 AM to 5:00 PM
- default meeting duration: 30 minutes
- first valid slot wins
- no recurring events

---

## UI / Frontend Design

The UI should resemble a clean internal tool rather than a consumer product.

### Navigation
A simple sidebar is sufficient:
- Workflows
- Executions
- Calendar

---

## Screen 1: Workflows List

### Purpose
Shows available workflows and their triggers.

### Contents
- workflow name
- trigger type
- action count
- active/inactive status

### Example workflows
- Meeting Request Processor
- Event Cancellation Handler

---

## Screen 2: Workflow Detail

### Purpose
Shows one workflow’s trigger and ordered actions.

### Contents
- workflow name
- description
- trigger badge
- ordered vertical action list
- optional actions clearly labeled
- run/test entry point

### Important note
Even without drag-and-drop, this page should make the app feel like a workflow product by making triggers and actions explicit.

---

## Screen 3: Run Workflow

### Purpose
Allows a user to manually fire the `meeting_request_received` trigger.

### Contents
- workflow selector or linked workflow
- trigger label
- large email textarea
- sample email loader
- Run Workflow button

---

## Screen 4: Execution History

### Purpose
Shows all workflow runs.

### Contents
- workflow name
- trigger type
- status
- started time
- result summary

---

## Screen 5: Execution Detail

### Purpose
Shows exactly how a workflow ran.

### This is the most important screen.

### Contents
- execution summary card
- original trigger input
- step-by-step result timeline
- each step’s status
- each step’s output
- final artifact summary

### Example final artifacts for meeting request workflow
- selected slot
- created event
- reply draft
- attendee/company research
- prep notes

---

## Screen 6: Calendar

### Purpose
Shows local scheduled and cancelled events.

### Contents
- list or simple calendar view of events
- event title
- date/time
- source execution
- cancel button

### On cancel
Cancelling an event should trigger the `event_cancelled` workflow.

---

## Event Enrichment Design

A major differentiator of the product is that the created calendar event can store workflow-generated meeting context.

### Event may include
- meeting summary
- attendee research
- company research
- pre-meeting notes

### Important behavior
If enrichment actions are omitted, the event is still created with basic fields only.

This is a key robustness feature.

---

## Failure Handling

### Execution behavior
- if an action throws, the workflow stops
- the failed step is recorded
- the workflow execution is marked failed
- the UI shows the failure clearly

### Common failure cases
- email text missing or invalid
- no availability extracted
- no matching open slot found
- AI output malformed
- event target not found for cancellation

### Product decision
This take-home uses stop-on-failure semantics instead of retries or compensation logic.

---

## Observability

The system should expose enough execution detail that a reviewer can understand exactly what happened.

### Observability features
- workflow execution history
- step-level status records
- persisted step outputs
- persisted errors
- link from calendar events back to the source workflow execution

This is one of the strongest ways to make the project feel production-aware.

---

## Technical Stack Recommendation

### Recommended stack
- Next.js
- TypeScript
- Prisma
- SQLite
- OpenAI / ChatGPT API

### Why this stack
- fullstack in one repo
- good local developer experience
- easy reviewer setup
- real persistence
- strong TypeScript ergonomics
- clean route/service/domain separation

---

## Suggested Folder Structure

```txt
/app
  /workflows
  /executions
  /calendar
  /api

/components
  WorkflowCard.tsx
  ActionList.tsx
  ExecutionTimeline.tsx
  CalendarEventList.tsx

/lib
  /db
  /ai
  /calendar
  /workflow-engine
  /validation

/lib/workflow-engine
  engine.ts
  actionRegistry.ts
  types.ts
  actions/
    summarizeEmail.ts
    extractAvailability.ts
    findOpenSlot.ts
    researchAttendees.ts
    researchCompany.ts
    generatePreMeetingNotes.ts
    createCalendarEvent.ts
    generateConfirmationEmail.ts
    loadCancelledEvent.ts
    findFallbackSlots.ts
    generateRescheduleEmail.ts

/prisma
  schema.prisma
```

This does not need to appear in the README, but it is a good internal implementation structure.

---

## Architectural Principles

### 1. Explicit trigger + action modeling
Workflows are not hidden scripts. They are stored definitions composed of a trigger and ordered action list.

### 2. Shared execution context
Actions communicate through a structured context object rather than direct coupling.

### 3. Reusable action handlers
Action types are implemented once and reused across workflows.

### 4. Optional enrichment actions
Optional actions enrich the final output but do not block execution when omitted.

### 5. Deterministic scheduling logic separated from AI logic
AI handles fuzzy language and enrichment. Deterministic logic handles slot finding and event persistence.

### 6. Persistence and observability first
Execution records and step outputs are first-class, not debug afterthoughts.

---

## Reviewer Demo Flow

A good demo flow should show the system clearly.

### Demo 1: Meeting request received
1. Open workflows page
2. Show Meeting Request Processor workflow
3. Open its action chain
4. Run it with a sample email
5. Open execution detail
6. Show created event in calendar
7. Show reply draft and prep notes

### Demo 2: Event cancelled
1. Open calendar page
2. Cancel an event
3. Show `event_cancelled` execution created
4. Open execution detail
5. Show fallback slots and reschedule email

---

## Production-Oriented Improvements (Out of Scope)

These are not required for the take-home but are good future-looking improvements.

- background job queue for execution
- retries and idempotency
- provider abstraction for Gmail/Google Calendar
- auth and per-user calendars
- Postgres instead of SQLite
- stronger structured output schemas and parsing
- timezones and locale-aware date parsing
- recurring events and more advanced calendar rules
- multi-branch or conditional workflow execution

---

## Final Product Summary

This project is a focused workflow automation app for scheduling-related tasks. It models workflows explicitly as triggers plus ordered actions, runs them through a reusable execution engine, persists history and step outputs, and uses AI meaningfully for summarization, extraction, enrichment, and drafting. The product is intentionally scoped to be locally runnable, technically coherent, and strong in execution transparency.

The central strength of the implementation is that it is small but real: workflows actually execute, actions are modular and reusable, AI is a first-class step, optional enrichment composes cleanly, and the resulting event artifacts and execution history are easy to inspect.

