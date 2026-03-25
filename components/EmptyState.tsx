export function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-gray-200 rounded-lg px-6 py-12 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
