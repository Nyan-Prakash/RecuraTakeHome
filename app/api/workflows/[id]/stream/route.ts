import { getWorkflowById } from "@/lib/db/workflows";
import { executeWorkflow } from "@/lib/workflow-engine/engine";
import type { WorkflowStreamEvent } from "@/lib/workflow-engine/engine";

type Params = { params: Promise<{ id: string }> };

function encodeSSE(event: WorkflowStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const workflow = await getWorkflowById(id);
  if (!workflow) {
    return new Response(JSON.stringify({ error: "Workflow not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let triggerPayload: unknown;
  try {
    triggerPayload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Request body must be valid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // If the client already disconnected (e.g. React StrictMode double-invoke),
      // don't start the workflow at all.
      if (req.signal.aborted) {
        controller.close();
        return;
      }

      function emit(event: WorkflowStreamEvent) {
        controller.enqueue(encoder.encode(encodeSSE(event)));
      }

      try {
        await executeWorkflow({ workflowId: id, triggerPayload, onEvent: emit });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Execution error";
        // Emit a workflow_complete with failure so the client always gets a terminal event
        emit({
          type: "workflow_complete",
          status: "failed",
          context: { triggerType: workflow.triggerType as "meeting_request_received" | "meeting_reschedule_requested" },
          errorMessage: message,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
