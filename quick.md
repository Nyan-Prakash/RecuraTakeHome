# Quick Reference

## Triggers

| Trigger | What it does | Required fields |
|---|---|---|
| `meeting_request_received` | Someone emails asking to schedule a meeting | `emailText`, `senderEmail` (optional) |
| `meeting_reschedule_requested` | Someone emails to cancel/reschedule a meeting | `emailText`, `senderEmail` (required) |

## Actions

| Action | What it does | Needs | Produces |
|---|---|---|---|
| `summarize_email` | AI summary + meeting topic from the email | `originalEmail` | `summary`, `meetingTopic` |
| `extract_availability` | Pulls time windows the sender offered | `originalEmail` | `availabilityWindows` |
| `find_open_slot` | Finds a free calendar slot in those windows | `availabilityWindows` | `selectedSlot` |
| `create_calendar_event` | Books the event on the calendar | `selectedSlot` | `createdEvent` |
| `generate_confirmation_email` | Drafts a reply confirming the meeting time | `selectedSlot` | `replyDraft` |
| `research_attendees` | AI background notes on who's attending | — | `attendeeResearch` |
| `research_company` | AI background notes on the sender's company | — | `companyResearch` |
| `generate_pre_meeting_notes` | Prep notes combining all research | — | `preMeetingNotes` |
| `resolve_cancelled_event` | Finds & cancels the existing event by sender | `senderEmail` | `cancelledEvent`, `attendees` |
| `find_fallback_slots` | Finds open slots to propose as alternatives | `cancelledEvent` | `fallbackSlots` |
| `generate_reschedule_email` | Drafts a reply proposing new times | `fallbackSlots` | `replyDraft` |
