type Status =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "skipped"
  | "scheduled"
  | "cancelled"
  | "active"
  | "inactive";

const STYLES: Record<
  Status,
  { bg: string; color: string; border: string; dot: string }
> = {
  pending: {
    bg: "#fffbeb",
    color: "#92400e",
    border: "#fde68a",
    dot: "#f59e0b",
  },
  running: {
    bg: "#eff6ff",
    color: "#1e40af",
    border: "#bfdbfe",
    dot: "#3b82f6",
  },
  success: {
    bg: "#f0fdf4",
    color: "#14532d",
    border: "#bbf7d0",
    dot: "#22c55e",
  },
  failed: {
    bg: "#fef2f2",
    color: "#991b1b",
    border: "#fecaca",
    dot: "#ef4444",
  },
  skipped: {
    bg: "#f9f9f7",
    color: "#6b7280",
    border: "#e5e5e2",
    dot: "#9ca3af",
  },
  scheduled: {
    bg: "#f0fdf4",
    color: "#14532d",
    border: "#bbf7d0",
    dot: "#22c55e",
  },
  cancelled: {
    bg: "#f9f9f7",
    color: "#6b7280",
    border: "#e5e5e2",
    dot: "#9ca3af",
  },
  active: {
    bg: "#f0fdf4",
    color: "#14532d",
    border: "#bbf7d0",
    dot: "#22c55e",
  },
  inactive: {
    bg: "#f9f9f7",
    color: "#9ca3af",
    border: "#e5e5e2",
    dot: "#d1d5db",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const style =
    STYLES[status as Status] ?? {
      bg: "#f9f9f7",
      color: "#6b7280",
      border: "#e5e5e2",
      dot: "#9ca3af",
    };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{
        background: style.bg,
        color: style.color,
        borderColor: style.border,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: style.dot }}
      />
      {status}
    </span>
  );
}
