export function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return (
      <span className="text-xs italic" style={{ color: "var(--muted)" }}>
        null
      </span>
    );
  }
  return (
    <pre
      className="text-xs rounded-lg p-3 overflow-auto whitespace-pre-wrap wrap-break-word font-mono leading-relaxed"
      style={{
        background: "#f9f9f7",
        border: "1px solid var(--border)",
        color: "#374151",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
