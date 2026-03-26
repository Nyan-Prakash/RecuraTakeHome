# README.md


## DEMO VIDEO: 
Sorry for it being a bit long
https://www.youtube.com/watch?v=z0mLqrGd9jQ (5:43)


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

### 1. Workflow engine being linearly executed and only using ExecutionContext

Each action is a handler that takes in context and returns the output and the updatedContext. The engine then merges into the main context. This is the best approach because it is important that it runs linearly. Every action needs the output + context from the one before. 

**The tradeoff**: A parallel system would be difficult to implement because of this need for linear execution. However one improvement would be running the isolated actions such as `research_attendee` and `research_company` etc in parallel. This would speed up the execution.

### 2. Dependency validation before execution

Some actions have prerequistes for example `extract_availability` must run before `find_open_slot` because it would be impossible to find an open slot if the availability window was empty. However the wordflow can you have runtime errors which I will explain later.

### 3. Fallback exists if AI fails

I made sure that the program will still run if nonessential fields are not populated. For example if you run the `summarizeMeetingEmail` action and the AI doesn't return anything the program will still work and later a confirmation email can be generate it just won't have the email summary. An essential field that will cause an error is if `extract_availability` doesn't return open slots because then the `find_open_slot` action can't run.

### 4. How failures work

I chose a middle ground between allowing the program to silently fail and always break when there is an error. My first check if the validation of workflow before even running the program. This is mention in #2. These errors will fully stop the whole system. 

However some will not break like in `summarizeMeetingEmail` if the actionhandler receiver an output that is fully empty it will not break. It will just not populate the summary field in the execution context. I made this decision but I believe that is better to get an output that is not as good but still works then fully crashing. The `research_attendee`, `research_company`, and `generatePrepNotes` don't fully crash

The tradeoff I made is I can't guarantee that the emails will be 100% perfect they might be generic if some of the research fail. However you will still get an email that handles the basic scheduling communication.



## Known Incomplete / Stubs

**`configJson` is implemented but not used.** ConfigJson was made to configure the way the action made decisions. For example when using `Find Open Slot` the config would be json with properties preferred times, meeting durations, or minimum time between meetings. However I didn't have time to implement it.

**No timezone handling.** All times are treated as local server time. Cross-timezone emails will be interpreted literally "3pm" means 3pm in whatever timezone the server runs in.

**Picking the correct event for cancellation isn't optimal.** It would be best to have a eventID that the cancellation email connects to however I just created a function to find the most probable one based on the email address match, company match, and body text match.

## Triggers

| Trigger | What it does | Required fields |
|---|---|---|
| `meeting_request_received` | Someone emails asking to schedule a meeting | `emailText`, `senderEmail` |
| `meeting_reschedule_requested` | Someone emails to cancel/reschedule a meeting | `emailText`, `senderEmail`|

## Actions

| Action | What it does | Needs | Produces |
|---|---|---|---|
| `summarize_email` | AI summary| `originalEmail` | `summary`, `meetingTopic` |
| `extract_availability` | Gets time windows for times in email | `originalEmail` | `availabilityWindows` |
| `find_open_slot` | Finds a free calendar slot in those windows | `availabilityWindows` | `selectedSlot` |
| `create_calendar_event` | Books the event on the calendar | `selectedSlot` | `createdEvent` |
| `generate_confirmation_email` | Drafts a reply confirming the meeting time | `selectedSlot` | `replyDraft` |
| `research_attendees` | AI background notes on who's attending | — | `attendeeResearch` |
| `research_company` | AI background notes on the sender's company | — | `companyResearch` |
| `generate_pre_meeting_notes` | Prep notes combining all research | — | `preMeetingNotes` |
| `resolve_cancelled_event` | Finds & cancels the existing event by sender | `senderEmail` | `cancelledEvent`, `attendees` |
| `find_fallback_slots` | Finds open slots to propose as alternatives | `cancelledEvent` | `fallbackSlots` |
| `generate_reschedule_email` | Drafts a reply proposing new times | `fallbackSlots` | `replyDraft` |
