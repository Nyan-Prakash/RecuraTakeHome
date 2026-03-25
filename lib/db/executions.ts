import { prisma } from "./client";

// ---------------------------------------------------------------------------
// Workflow Execution helpers
// ---------------------------------------------------------------------------

export async function createWorkflowExecution(args: {
  workflowId: string;
  triggerType: string;
  triggerPayloadJson: string;
}) {
  return prisma.workflowExecution.create({
    data: {
      workflowId: args.workflowId,
      triggerType: args.triggerType,
      triggerPayloadJson: args.triggerPayloadJson,
      status: "pending",
    },
  });
}

export async function markWorkflowExecutionRunning(id: string) {
  return prisma.workflowExecution.update({
    where: { id },
    data: { status: "running" },
  });
}

export async function markWorkflowExecutionSuccess(id: string) {
  return prisma.workflowExecution.update({
    where: { id },
    data: {
      status: "success",
      completedAt: new Date(),
    },
  });
}

export async function markWorkflowExecutionFailed(
  id: string,
  errorMessage: string
) {
  return prisma.workflowExecution.update({
    where: { id },
    data: {
      status: "failed",
      completedAt: new Date(),
      errorMessage,
    },
  });
}

// ---------------------------------------------------------------------------
// Step Execution helpers
// ---------------------------------------------------------------------------

export async function createStepExecution(args: {
  workflowExecutionId: string;
  workflowActionId: string | null;
  actionType: string;
  inputJson: string | null;
}) {
  return prisma.stepExecution.create({
    data: {
      workflowExecutionId: args.workflowExecutionId,
      workflowActionId: args.workflowActionId,
      actionType: args.actionType,
      inputJson: args.inputJson,
      status: "pending",
    },
  });
}

export async function markStepExecutionRunning(id: string) {
  return prisma.stepExecution.update({
    where: { id },
    data: { status: "running" },
  });
}

export async function markStepExecutionSuccess(
  id: string,
  outputJson: string | null
) {
  return prisma.stepExecution.update({
    where: { id },
    data: {
      status: "success",
      outputJson,
      completedAt: new Date(),
    },
  });
}

export async function markStepExecutionFailed(
  id: string,
  errorMessage: string
) {
  return prisma.stepExecution.update({
    where: { id },
    data: {
      status: "failed",
      completedAt: new Date(),
      errorMessage,
    },
  });
}

// ---------------------------------------------------------------------------
// Read helpers (for smoke scripts and future API routes)
// ---------------------------------------------------------------------------

export async function getWorkflowExecutionWithSteps(executionId: string) {
  return prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      stepExecutions: {
        orderBy: { startedAt: "asc" },
      },
    },
  });
}

export async function getExecutions() {
  const rows = await prisma.workflowExecution.findMany({
    include: {
      workflow: {
        select: { name: true },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    workflowId: row.workflowId,
    workflowName: row.workflow.name,
    triggerType: row.triggerType,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
  }));
}

export async function getExecutionById(id: string) {
  const row = await prisma.workflowExecution.findUnique({
    where: { id },
    include: {
      workflow: {
        select: { id: true, name: true, triggerType: true },
      },
      stepExecutions: {
        orderBy: { startedAt: "asc" },
      },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    workflowId: row.workflowId,
    workflow: row.workflow,
    triggerType: row.triggerType,
    triggerPayload: safeParseJson(row.triggerPayloadJson),
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
    steps: row.stepExecutions.map((step) => ({
      id: step.id,
      actionType: step.actionType,
      status: step.status,
      input: safeParseJson(step.inputJson),
      output: safeParseJson(step.outputJson),
      errorMessage: step.errorMessage,
      startedAt: step.startedAt,
      completedAt: step.completedAt,
    })),
  };
}

function safeParseJson(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value; // return raw string if it can't be parsed
  }
}
