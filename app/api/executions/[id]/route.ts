import { getExecutionById } from "@/lib/db/executions";
import { notFound, ok, serverError } from "@/lib/http/responses";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const execution = await getExecutionById(id);

    if (!execution) {
      return notFound("Execution not found");
    }

    return ok({ execution });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return serverError(message);
  }
}
