import { PageHeader } from "@/components/PageHeader";
import { WorkflowBuilder } from "@/components/WorkflowBuilder";

export default function BuildWorkflowPage() {
  return (
    <div>
      <PageHeader
        title="Build a Workflow"
        description="Create a new automation by adding a trigger and actions."
      />
      <WorkflowBuilder />
    </div>
  );
}
