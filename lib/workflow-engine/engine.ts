import { getWorkflowById } from "../db/workflows";
import {
  createWorkflowExecution,
  createStepExecution,
  markStepExecutionFailed,
  markStepExecutionRunning,
  markStepExecutionSuccess,
  markWorkflowExecutionFailed,
  markWorkflowExecutionRunning,
  markWorkflowExecutionSuccess,
} from "../db/executions";
import { getActionHandler } from "./actionRegistry";
import { parseActionConfig } from "./config";
import { serializeForDb, safeSerializeForDb } from "./serialization";
import { initializeExecutionContext } from "./triggers";
import { validateWorkflowForExecution } from "./validate";
import type {
  ExecutionContext,
  StepRunResult,
  WorkflowRunResult,
} from "./types";

// ---------------------------------------------------------------------------
// Streaming event types
// ---------------------------------------------------------------------------

export type WorkflowStreamEvent =
  | { type: "workflow_start"; workflowExecutionId: string; totalSteps: number }
  | { type: "step_start"; stepIndex: number; actionType: string; stepExecutionId: string }
  | { type: "step_complete"; stepIndex: number; actionType: string; stepExecutionId: string; output: unknown }
  | { type: "step_failed"; stepIndex: number; actionType: string; stepExecutionId: string; errorMessage: string }
  | { type: "workflow_complete"; status: "success" | "failed"; context: ExecutionContext; errorMessage: string | null };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ExecuteWorkflowArgs = {
  workflowId: string;
  triggerPayload: unknown;
  onEvent?: (event: WorkflowStreamEvent) => void;
};

/**
 * Executes a workflow by ID with the given trigger payload.
 *
 * - Loads and validates the workflow definition.
 * - Initializes execution context from the trigger payload.
 * - Creates and persists workflow + step execution records.
 * - Runs enabled actions sequentially, merging context after each step.
 * - Returns a structured WorkflowRunResult whether execution succeeds or fails.
 *
 * Throws only for unrecoverable pre-execution errors (workflow not found,
 * invalid payload, failed DB creation). After execution begins, failures
 * are captured in the returned result.
 */
export async function executeWorkflow(
  args: ExecuteWorkflowArgs
): Promise<WorkflowRunResult> {
  const { workflowId, triggerPayload, onEvent } = args;

  // ------------------------------------------------------------------
  // 1. Load workflow
  // ------------------------------------------------------------------
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error(`executeWorkflow: workflow not found for id "${workflowId}"`);
  }

  // ------------------------------------------------------------------
  // 2. Validate workflow
  // ------------------------------------------------------------------
  validateWorkflowForExecution(workflow);

  // ------------------------------------------------------------------
  // 3. Validate trigger payload and initialize context
  // ------------------------------------------------------------------
  const context = initializeExecutionContext(
    workflow.triggerType,
    triggerPayload
  );

  // ------------------------------------------------------------------
  // 4. Create workflow execution record
  // ------------------------------------------------------------------
  const workflowExecution = await createWorkflowExecution({
    workflowId: workflow.id,
    triggerType: workflow.triggerType,
    triggerPayloadJson: serializeForDb(triggerPayload),
  });

  const workflowExecutionId = workflowExecution.id;

  // ------------------------------------------------------------------
  // 5. Mark running
  // ------------------------------------------------------------------
  await markWorkflowExecutionRunning(workflowExecutionId);

  // ------------------------------------------------------------------
  // 6. Execute enabled actions sequentially
  // ------------------------------------------------------------------
  const enabledActions = workflow.actions
    .filter((a) => a.isEnabled)
    .sort((a, b) => a.order - b.order);

  const steps: StepRunResult[] = [];
  let currentContext: ExecutionContext = { ...context };

  onEvent?.({ type: "workflow_start", workflowExecutionId, totalSteps: enabledActions.length });

  for (const [stepIndex, action] of enabledActions.entries()) {
    // Snapshot context before the step runs
    const inputSnapshot = safeSerializeForDb(currentContext);

    // Create step execution record
    const stepExecution = await createStepExecution({
      workflowExecutionId,
      workflowActionId: action.id,
      actionType: action.type,
      inputJson: inputSnapshot,
    });

    const stepExecutionId = stepExecution.id;

    // Mark step running
    await markStepExecutionRunning(stepExecutionId);
    onEvent?.({ type: "step_start", stepIndex, actionType: action.type, stepExecutionId });

    try {
      // Resolve handler and config
      const handler = getActionHandler(action.type);
      const config = parseActionConfig(action.configJson);

      // Execute handler
      const result = await handler({ context: currentContext, config, workflowExecutionId });

      // Merge updated context shallowly
      currentContext = { ...currentContext, ...result.updatedContext };

      // Persist step success
      await markStepExecutionSuccess(
        stepExecutionId,
        safeSerializeForDb(result.output)
      );

      steps.push({
        stepExecutionId,
        actionType: action.type,
        status: "success",
        output: result.output,
        errorMessage: null,
      });

      onEvent?.({ type: "step_complete", stepIndex, actionType: action.type, stepExecutionId, output: result.output });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      // Persist step failure
      await markStepExecutionFailed(stepExecutionId, errorMessage);

      steps.push({
        stepExecutionId,
        actionType: action.type,
        status: "failed",
        output: null,
        errorMessage,
      });

      onEvent?.({ type: "step_failed", stepIndex, actionType: action.type, stepExecutionId, errorMessage });

      // Persist workflow failure and stop
      await markWorkflowExecutionFailed(workflowExecutionId, errorMessage);

      onEvent?.({ type: "workflow_complete", status: "failed", context: currentContext, errorMessage });

      return {
        workflowExecutionId,
        workflowId: workflow.id,
        triggerType: workflow.triggerType,
        status: "failed",
        context: currentContext,
        steps,
        errorMessage,
      };
    }
  }

  // ------------------------------------------------------------------
  // 7. All steps succeeded
  // ------------------------------------------------------------------
  await markWorkflowExecutionSuccess(workflowExecutionId);

  onEvent?.({ type: "workflow_complete", status: "success", context: currentContext, errorMessage: null });

  return {
    workflowExecutionId,
    workflowId: workflow.id,
    triggerType: workflow.triggerType,
    status: "success",
    context: currentContext,
    steps,
    errorMessage: null,
  };
}
