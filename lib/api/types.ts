// API response types — mirror what the route handlers return

export type WorkflowActionItem = {
  id: string;
  workflowId: string;
  type: string;
  order: number;
  isOptional: boolean;
  isEnabled: boolean;
  configJson: string | null;
};

export type WorkflowItem = {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  isActive: boolean;
  actions: WorkflowActionItem[];
};

export type StepRunResult = {
  stepExecutionId: string;
  actionType: string;
  status: string;
  output: unknown;
  errorMessage: string | null;
};

export type ExecutionContext = {
  triggerType: string;
  originalEmail?: string;
  summary?: string;
  meetingTopic?: string;
  availabilityWindows?: Array<{ date: string; start: string; end: string; label?: string }>;
  selectedSlot?: { startTime: string; endTime: string; durationMinutes: number };
  attendeeResearch?: string;
  companyResearch?: string;
  preMeetingNotes?: string;
  createdEventId?: string;
  createdEvent?: { id: string; title: string; startTime: string; endTime: string; description: string };
  cancelledEvent?: { id: string; title: string; startTime: string; endTime: string; description?: string };
  fallbackSlots?: Array<{ startTime: string; endTime: string }>;
  replyDraft?: string;
  attendees?: string[];
  priorMeetingContext?: string;
};

export type WorkflowRunResult = {
  workflowExecutionId: string;
  workflowId: string;
  triggerType: string;
  status: string;
  context: ExecutionContext;
  steps: StepRunResult[];
  errorMessage: string | null;
};

export type ExecutionListItem = {
  id: string;
  workflowId: string;
  workflowName: string;
  triggerType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

export type StepDetail = {
  id: string;
  actionType: string;
  status: string;
  input: unknown;
  output: unknown;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type ExecutionDetail = {
  id: string;
  workflowId: string;
  workflow: { id: string; name: string; triggerType: string };
  triggerType: string;
  triggerPayload: unknown;
  status: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  steps: StepDetail[];
};

export type CalendarEventItem = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: string;
  meetingSummary: string | null;
  attendeeResearch: string | null;
  companyResearch: string | null;
  preMeetingNotes: string | null;
  sourceWorkflowExecutionId: string | null;
};
