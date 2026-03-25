import type {
  WorkflowActionDefinition,
  WorkflowActionType,
  WorkflowDefinition,
  WorkflowTriggerType,
} from "./types";

// ---------------------------------------------------------------------------
// Valid value sets — single source of truth for allowed string values
// ---------------------------------------------------------------------------

const WORKFLOW_TRIGGER_TYPES: WorkflowTriggerType[] = [
  "meeting_request_received",
  "event_cancelled",
];

const WORKFLOW_ACTION_TYPES: WorkflowActionType[] = [
  "summarize_email",
  "extract_availability",
  "find_open_slot",
  "research_attendees",
  "research_company",
  "generate_pre_meeting_notes",
  "create_calendar_event",
  "generate_confirmation_email",
  "load_cancelled_event",
  "find_fallback_slots",
  "generate_reschedule_email",
];

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function toWorkflowTriggerType(value: string): WorkflowTriggerType {
  if ((WORKFLOW_TRIGGER_TYPES as string[]).includes(value)) {
    return value as WorkflowTriggerType;
  }
  throw new Error(
    `toWorkflowTriggerType: unsupported trigger type "${value}". ` +
      `Valid values: ${WORKFLOW_TRIGGER_TYPES.join(", ")}`
  );
}

export function toWorkflowActionType(value: string): WorkflowActionType {
  if ((WORKFLOW_ACTION_TYPES as string[]).includes(value)) {
    return value as WorkflowActionType;
  }
  throw new Error(
    `toWorkflowActionType: unsupported action type "${value}". ` +
      `Valid values: ${WORKFLOW_ACTION_TYPES.join(", ")}`
  );
}

// ---------------------------------------------------------------------------
// Raw DB row shape — matches what Prisma returns from the current schema
// ---------------------------------------------------------------------------

type RawWorkflowAction = {
  id: string;
  workflowId: string;
  type: string;
  order: number;
  isOptional: boolean;
  isEnabled: boolean;
  configJson: string | null;
};

type RawWorkflow = {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  isActive: boolean;
  actions: RawWorkflowAction[];
};

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function toWorkflowActionDefinition(
  raw: RawWorkflowAction
): WorkflowActionDefinition {
  return {
    id: raw.id,
    workflowId: raw.workflowId,
    type: toWorkflowActionType(raw.type),
    order: raw.order,
    isOptional: raw.isOptional,
    isEnabled: raw.isEnabled,
    configJson: raw.configJson,
  };
}

export function toWorkflowDefinition(raw: RawWorkflow): WorkflowDefinition {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    triggerType: toWorkflowTriggerType(raw.triggerType),
    isActive: raw.isActive,
    actions: raw.actions.map(toWorkflowActionDefinition),
  };
}
