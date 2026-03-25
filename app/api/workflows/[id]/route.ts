import { getWorkflowById } from "@/lib/db/workflows";
import { notFound, ok, serverError } from "@/lib/http/responses";

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
