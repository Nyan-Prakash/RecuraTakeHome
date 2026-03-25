import { getWorkflowById } from "@/lib/db/workflows";
import { executeWorkflow } from "@/lib/workflow-engine/engine";
import { badRequest, notFound, ok, serverError } from "@/lib/http/responses";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;

    const workflow = await getWorkflowById(id);
    if (!workflow) {
      return notFound("Workflow not found");
    }

    let triggerPayload: unknown;
    try {
      triggerPayload = await req.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    let result;
    try {
      result = await executeWorkflow({ workflowId: id, triggerPayload });
    } catch (err) {
      // Pre-execution errors: invalid payload, inactive workflow, etc.
      const message = err instanceof Error ? err.message : "Execution error";
      return badRequest(message);
    }

    // Workflow ran (possibly failed) — always return 200 with structured result
    return ok({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return serverError(message);
  }
}
