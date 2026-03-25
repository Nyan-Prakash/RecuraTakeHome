import { prisma } from "./client";
import { toWorkflowDefinition } from "../workflow-engine/normalize";
import type { WorkflowDefinition, WorkflowTriggerType } from "../workflow-engine/types";

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
