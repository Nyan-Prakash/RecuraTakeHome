import { prisma } from "./client";
import { toWorkflowDefinition } from "../workflow-engine/normalize";
import type { WorkflowActionType, WorkflowDefinition, WorkflowTriggerType } from "../workflow-engine/types";

export type WorkflowActionInput = {
  type: WorkflowActionType;
  order: number;
  isOptional: boolean;
  isEnabled: boolean;
  configJson?: string | null;
};

export async function createWorkflow(data: {
  name: string;
  description: string;
  triggerType: WorkflowTriggerType;
  isActive: boolean;
  actions: WorkflowActionInput[];
}): Promise<WorkflowDefinition> {
  const row = await prisma.workflow.create({
    data: {
      name: data.name,
      description: data.description,
      triggerType: data.triggerType,
      isActive: data.isActive,
      actions: {
        create: data.actions.map((a) => ({
          type: a.type,
          order: a.order,
          isOptional: a.isOptional,
          isEnabled: a.isEnabled,
          configJson: a.configJson ?? null,
        })),
      },
    },
    include: {
      actions: { orderBy: { order: "asc" } },
    },
  });
  return toWorkflowDefinition(row);
}

export async function updateWorkflow(
  id: string,
  data: {
    name: string;
    description: string;
    triggerType: WorkflowTriggerType;
    isActive: boolean;
    actions: WorkflowActionInput[];
  }
): Promise<WorkflowDefinition | null> {
  const existing = await prisma.workflow.findUnique({ where: { id } });
  if (!existing) return null;

  await prisma.workflowAction.deleteMany({ where: { workflowId: id } });

  const row = await prisma.workflow.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      triggerType: data.triggerType,
      isActive: data.isActive,
      actions: {
        create: data.actions.map((a) => ({
          type: a.type,
          order: a.order,
          isOptional: a.isOptional,
          isEnabled: a.isEnabled,
          configJson: a.configJson ?? null,
        })),
      },
    },
    include: {
      actions: { orderBy: { order: "asc" } },
    },
  });
  return toWorkflowDefinition(row);
}

export async function getAllWorkflows(): Promise<WorkflowDefinition[]> {
  const rows = await prisma.workflow.findMany({
    include: {
      actions: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map(toWorkflowDefinition);
}

export async function getWorkflowById(
  id: string
): Promise<WorkflowDefinition | null> {
  const row = await prisma.workflow.findUnique({
    where: { id },
    include: {
      actions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!row) return null;
  return toWorkflowDefinition(row);
}

export async function getActiveWorkflowByTriggerType(
  triggerType: WorkflowTriggerType
): Promise<WorkflowDefinition | null> {
  // At most one active workflow per trigger type is expected in seeded/demo data.
  // If multiple exist, we return the earliest-created one for deterministic behavior.
  const row = await prisma.workflow.findFirst({
    where: {
      triggerType,
      isActive: true,
    },
    include: {
      actions: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!row) return null;
  return toWorkflowDefinition(row);
}
