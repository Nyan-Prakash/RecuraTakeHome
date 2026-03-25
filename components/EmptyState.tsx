export function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl px-6 py-14 text-center border border-dashed"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ background: "var(--border-subtle)" }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--muted)" }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {message}
      </p>
    </div>
  );
}
