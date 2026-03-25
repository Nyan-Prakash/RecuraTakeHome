import { PageHeader } from "@/components/PageHeader";
import { WorkflowBuilder } from "@/components/WorkflowBuilder";

export default function WorkflowsPage() {
  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Build automation workflows by adding a trigger and actions."
      />
      <WorkflowBuilder />
    </div>
  );
}
