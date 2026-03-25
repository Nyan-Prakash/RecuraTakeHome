export function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 text-xs italic">null</span>;
  }
  return (
    <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto whitespace-pre-wrap break-words font-mono text-gray-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
