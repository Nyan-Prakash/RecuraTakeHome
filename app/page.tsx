import Link from "next/link";

const NAV_CARDS = [
  {
    href: "/workflows",
    title: "Workflows",
    description: "Browse and run automation workflows.",
  },
  {
    href: "/executions",
    title: "Executions",
    description: "View the history and status of workflow runs.",
  },
  {
    href: "/calendar",
    title: "Calendar",
    description: "Browse events and trigger cancellation workflows.",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Workflow Automation Tool
      </h1>
      <p className="text-gray-500 mb-10">AI-powered scheduling workflows</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {NAV_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-400 transition-colors"
          >
            <h2 className="font-semibold text-gray-900 mb-1">{card.title}</h2>
            <p className="text-sm text-gray-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
