import type { WorkflowActionType, WorkflowDefinition } from "./types";

/**
 * Validates a workflow definition is safe to execute.
 * Throws a clear error on any violation.
 * Only checks enabled actions (disabled actions are invisible to the engine).
 */
export function validateWorkflowForExecution(
  workflow: WorkflowDefinition
): void {
  if (!workflow.isActive) {
    throw new Error(
      `Workflow "${workflow.name}" is not active and cannot be executed.`
    );
  }

  const enabledActions = workflow.actions.filter((a) => a.isEnabled);

  if (enabledActions.length === 0) {
    throw new Error(
      `Workflow "${workflow.name}" has no enabled actions and cannot be executed.`
    );
  }

  // Check strictly ascending order with no duplicates
  const orders = enabledActions.map((a) => a.order);
  const orderSet = new Set(orders);
  if (orderSet.size !== orders.length) {
    throw new Error(
      `Workflow "${workflow.name}" has duplicate enabled action orders: [${orders.join(", ")}]`
    );
  }

  for (let i = 1; i < orders.length; i++) {
    if (orders[i]! <= orders[i - 1]!) {
      throw new Error(
        `Workflow "${workflow.name}" enabled actions are not in strictly ascending order.`
      );
    }
  }

  // Helper: get the order of an action type among enabled actions (-1 if absent)
  function getOrder(type: WorkflowActionType): number {
    const action = enabledActions.find((a) => a.type === type);
    return action ? action.order : -1;
  }

  function assertBefore(
    earlier: WorkflowActionType,
    later: WorkflowActionType
  ): void {
    const earlierOrder = getOrder(earlier);
    const laterOrder = getOrder(later);
    // Only validate if BOTH actions are enabled
    if (earlierOrder === -1 || laterOrder === -1) return;
    if (earlierOrder >= laterOrder) {
      throw new Error(
        `Workflow "${workflow.name}": action "${earlier}" (order ${earlierOrder}) must come before "${later}" (order ${laterOrder}).`
      );
    }
  }

  // Trigger-specific dependency checks
  if (workflow.triggerType === "meeting_request_received") {
    assertBefore("extract_availability", "find_open_slot");
    assertBefore("find_open_slot", "create_calendar_event");
    assertBefore("create_calendar_event", "generate_confirmation_email");
  }

  if (workflow.triggerType === "event_cancelled") {
    assertBefore("load_cancelled_event", "find_fallback_slots");
    assertBefore("find_fallback_slots", "generate_reschedule_email");
  }
}
