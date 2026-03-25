// ---------------------------------------------------------------------------
// Domain string literal unions
// These mirror the SQLite string columns in the database schema.
// ---------------------------------------------------------------------------

export type WorkflowTriggerType =
  | "meeting_request_received"
  | "event_cancelled";

export type WorkflowExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "failed";

export type StepExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "skipped";

export type WorkflowActionType =
  | "summarize_email"
  | "extract_availability"
  | "find_open_slot"
  | "research_attendees"
  | "research_company"
  | "generate_pre_meeting_notes"
  | "create_calendar_event"
  | "generate_confirmation_email"
  | "load_cancelled_event"
  | "find_fallback_slots"
  | "generate_reschedule_email";

export type CalendarEventStatus = "scheduled" | "cancelled";

// ---------------------------------------------------------------------------
// Execution context — shared mutable state passed between action handlers
// ---------------------------------------------------------------------------

export type AvailabilityWindow = {
  date: string;
  start: string;
  end: string;
  label?: string;
};

export type SelectedSlot = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export type CreatedEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description: string;
};

export type CancelledEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
};

export type FallbackSlot = {
  startTime: string;
  endTime: string;
};

export type ExecutionContext = {
  triggerType: WorkflowTriggerType;

  originalEmail?: string;
  senderEmail?: string;
  senderName?: string;
  senderCompany?: string;
  summary?: string;
  meetingTopic?: string;

  availabilityWindows?: AvailabilityWindow[];
  selectedSlot?: SelectedSlot;

  attendeeResearch?: string;
  companyResearch?: string;
  preMeetingNotes?: string;

  createdEventId?: string;
  createdEvent?: CreatedEvent;

  cancelledEvent?: CancelledEvent;
  fallbackSlots?: FallbackSlot[];

  replyDraft?: string;

  attendees?: string[];
  priorMeetingContext?: string;
  triggerEventId?: string;  // set from event_cancelled payload, used by load_cancelled_event
};

// ---------------------------------------------------------------------------
// Workflow definition types — app-level typed wrappers over DB rows
// ---------------------------------------------------------------------------

export type WorkflowActionDefinition = {
  id: string;
  workflowId: string;
  type: WorkflowActionType;
  order: number;
  isOptional: boolean;
  isEnabled: boolean;
  configJson: string | null;
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  description: string;
  triggerType: WorkflowTriggerType;
  isActive: boolean;
  actions: WorkflowActionDefinition[];
};

// ---------------------------------------------------------------------------
// Action handler contracts
// ---------------------------------------------------------------------------

export type ActionHandlerArgs = {
  context: ExecutionContext;
  config?: Record<string, unknown>;
  workflowExecutionId?: string;
};

export type ActionHandlerResult = {
  output: unknown;
  updatedContext: Partial<ExecutionContext>;
};

export type ActionHandler = (
  args: ActionHandlerArgs
) => Promise<ActionHandlerResult>;

export type ActionRegistry = Record<WorkflowActionType, ActionHandler>;

// ---------------------------------------------------------------------------
// Execution engine result types
// ---------------------------------------------------------------------------

export type StepRunResult = {
  stepExecutionId: string;
  actionType: WorkflowActionType;
  status: StepExecutionStatus;
  output: unknown;
  errorMessage: string | null;
};

export type WorkflowRunResult = {
  workflowExecutionId: string;
  workflowId: string;
  triggerType: WorkflowTriggerType;
  status: WorkflowExecutionStatus;
  context: ExecutionContext;
  steps: StepRunResult[];
  errorMessage: string | null;
};
