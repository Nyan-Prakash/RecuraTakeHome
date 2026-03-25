import { getAllWorkflows } from "@/lib/db/workflows";
import { ok, serverError } from "@/lib/http/responses";

export async function GET() {
  try {
    const workflows = await getAllWorkflows();
    return ok({ workflows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return serverError(message);
  }
}
