import { getWorkflowById, updateWorkflow } from "@/lib/db/workflows";
import { notFound, ok, badRequest, serverError } from "@/lib/http/responses";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const workflow = await getWorkflowById(id);

    if (!workflow) {
      return notFound("Workflow not found");
    }

    return ok({ workflow });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return serverError(message);
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, triggerType, isActive, actions } = body;

    if (!name || !triggerType) {
      return badRequest("name and triggerType are required");
    }

    const workflow = await updateWorkflow(id, {
      name,
      description: description ?? "",
      triggerType,
      isActive: isActive ?? true,
      actions: actions ?? [],
    });

    if (!workflow) {
      return notFound("Workflow not found");
    }

    return ok({ workflow });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return serverError(message);
  }
}
