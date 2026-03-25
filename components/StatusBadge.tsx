type Status = "pending" | "running" | "success" | "failed" | "skipped" | "scheduled" | "cancelled" | "active" | "inactive";

const STYLES: Record<Status, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  running: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  skipped: "bg-gray-50 text-gray-500 border-gray-200",
  scheduled: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
  active: "bg-green-50 text-green-700 border-green-200",
  inactive: "bg-gray-50 text-gray-400 border-gray-200",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status as Status] ?? "bg-gray-50 text-gray-500 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
}
