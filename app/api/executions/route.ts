import { getExecutions } from "@/lib/db/executions";
import { ok, serverError } from "@/lib/http/responses";

export async function GET() {
  try {
    const executions = await getExecutions();
    return ok({ executions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return serverError(message);
  }
}
