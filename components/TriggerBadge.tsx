const LABELS: Record<string, string> = {
  meeting_request_received: "Meeting Request",
  event_cancelled: "Event Cancelled",
};

const STYLES: Record<string, { bg: string; color: string; border: string }> = {
  meeting_request_received: {
    bg: "#eef2ff",
    color: "#3730a3",
    border: "#c7d2fe",
  },
  event_cancelled: {
    bg: "#fff7ed",
    color: "#9a3412",
    border: "#fed7aa",
  },
};

export function TriggerBadge({ triggerType }: { triggerType: string }) {
  const label = LABELS[triggerType] ?? triggerType;
  const style = STYLES[triggerType] ?? {
    bg: "#f9f9f7",
    color: "#6b7280",
    border: "#e5e5e2",
  };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{
        background: style.bg,
        color: style.color,
        borderColor: style.border,
      }}
    >
      {label}
    </span>
  );
}
