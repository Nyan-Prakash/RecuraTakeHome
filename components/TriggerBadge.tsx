const LABELS: Record<string, string> = {
  meeting_request_received: "Meeting Request",
  event_cancelled: "Event Cancelled",
};

const STYLES: Record<string, string> = {
  meeting_request_received: "bg-indigo-50 text-indigo-700 border-indigo-200",
  event_cancelled: "bg-orange-50 text-orange-700 border-orange-200",
};

export function TriggerBadge({ triggerType }: { triggerType: string }) {
  const label = LABELS[triggerType] ?? triggerType;
  const style = STYLES[triggerType] ?? "bg-gray-50 text-gray-500 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
}
