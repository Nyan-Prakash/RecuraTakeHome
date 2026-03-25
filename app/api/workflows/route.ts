import { getAllWorkflows, createWorkflow } from "@/lib/db/workflows";
import { ok, badRequest, serverError } from "@/lib/http/responses";

export async function GET() {
  try {
    const workflows = await getAllWorkflows();
    return ok({ workflows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return serverError(message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, triggerType, isActive, actions } = body;

    if (!name || !triggerType) {
      return badRequest("name and triggerType are required");
    }

    const workflow = await createWorkflow({
      name,
      description: description ?? "",
      triggerType,
      isActive: isActive ?? true,
      actions: actions ?? [],
    });

    return ok({ workflow }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return serverError(message);
  }
}
