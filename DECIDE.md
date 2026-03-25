# DECIDE.md

## Setup

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Optional:** Set `OPENAI_API_KEY` in `.env` for live AI. Without it, all AI steps use deterministic fallbacks — the demo runs fully either way.

**Reset between runs:**
```bash
npm run demo:reset
```

---

## Key Decisions

### 1. Workflow engine as a pure context pipeline

Each action is a handler `(context) → { output, updatedContext }`. The engine threads context through steps with a shallow merge. I chose this over an event bus or message queue because the scope is synchronous, local, and linear — the complexity wouldn't earn anything here.

The tradeoff: parallel steps are impossible with this design. Three AI enrichment calls (attendee research, company research, pre-meeting notes) run sequentially. That's fine for a demo, but would need a DAG scheduler if concurrency mattered.

### 2. Strict dependency validation before execution

Workflows are validated against a hardcoded dependency graph before any step runs. This catches bad workflow topologies at start time rather than mid-run. The tradeoff is that the dependency rules live in code, not in the workflow definition — adding a new action type requires editing `validate.ts`.

### 3. Dual-path AI: live OpenAI or deterministic fallback

Every AI method tries the OpenAI SDK, catches failures, and falls back to rule-based output that preserves the same contract. This means the app is fully demoable without an API key and is resilient to quota errors. The downside is dual maintenance — each AI method has two implementations.

### 4. JSON columns stored as strings in SQLite

Prisma + SQLite doesn't support a native JSON type, so `configJson`, `inputJson`, `outputJson`, etc. are TEXT with a serialization layer. This is fine for local use, but you lose the ability to query into JSON at the database level. A Postgres migration would be the natural next step for production.

### 5. Streaming via SSE, non-streaming via polling

The `/stream` endpoint emits Server-Sent Events per step so the UI can show live progress. The `/execute` endpoint returns the full result at completion for simpler clients. Both write to the same DB. I didn't want to couple the UI exclusively to SSE since SSE has connection limits and isn't always firewalled-friendly.

### 6. Heuristic event matching for cancellations

When a cancellation email arrives, the system has to figure out *which* calendar event is being cancelled. I score candidate events by: company name overlap (3 pts), sender name overlap (2 pts), body text overlap (1 pt). This works for the demo email but is guessing — the real solution is storing a thread ID or message ID on creation and matching by that.

### 7. Nullable foreign key on StepExecution → WorkflowAction

`StepExecution.workflowActionId` is nullable with `onDelete: SetNull`. This lets you modify or delete actions from a workflow definition without orphaning historical execution records. The cost is that you lose the join for older runs.

---

## Tradeoffs

| Decision | Benefit | Cost |
|---|---|---|
| Synchronous execution inline with HTTP request | Simple, no queuing infrastructure | Long workflows block the request; no resumability |
| SQLite | Zero-config local setup | No JSON querying, single writer, not horizontally scalable |
| Shallow context merge between steps | Easy to reason about | Actions can't update nested fields without clobbering siblings |
| Deterministic AI fallback | Fully demoable, API-key-optional | Two implementations per AI method to maintain |
| Hardcoded dependency graph | Prevents invalid topologies | New action types require code changes to validation |
| Heuristic cancellation matching | Works for demo | Fragile in production; wrong match = wrong event cancelled |

---

## Known Incomplete / Stubs

**`configJson` is inert.** The schema and parsing layer for per-action configuration exist, but no action handler reads from it. Infrastructure is there; consumers aren't.

**Event matching searches only 7 days back.** If a user reschedules a meeting more than a week out, `resolveCancelledEvent` won't find it and falls back to the most imminent event — which may be the wrong one.

**Fallback slot search is bounded at 5 business days.** If all slots in the next 5 days are blocked, the action throws rather than extending the search window.

**No timezone handling.** All times are treated as local server time. Cross-timezone emails will be interpreted literally — "3pm" means 3pm in whatever TZ the server runs in.

**Availability extraction misses absolute dates.** The fallback parser handles weekday keywords ("Tuesday", "Thursday morning") but not absolute dates ("March 25") or ranges ("2–4pm"). OpenAI handles these; the fallback doesn't.

**No concurrent execution guard.** Multiple simultaneous workflow runs aren't locked. SQLite's writer lock prevents data corruption, but the execution state machine doesn't account for racing updates.

**Optional steps aren't skippable on error.** A failed "Research Attendees" step (marked optional in the README) still fails the entire workflow. The engine doesn't distinguish optional from required steps.
