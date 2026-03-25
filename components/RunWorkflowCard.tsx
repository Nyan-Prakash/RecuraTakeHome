"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import type { WorkflowRunResult } from "@/lib/api/types";

const SAMPLE_EMAIL =
  "Hi Dave, I'd love to talk about a design partner opportunity. I'm free Tuesday afternoon or Thursday morning. Let me know what works best.";
const SAMPLE_SENDER = "TimCook@apple.com";

function parseSenderEmail(email: string): { name: string; company: string } | null {
  const atIndex = email.indexOf("@");
  if (atIndex < 1) return null;
  const name = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const company = domain.split(".")[0];
  if (!name || !company) return null;
  return { name, company };
}

export function RunWorkflowCard({ workflowId }: { workflowId: string }) {
  const [emailText, setEmailText] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseSenderEmail(senderEmail);

  async function handleRun() {
    if (!emailText.trim()) {
      setError("Email body is required.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailText: emailText.trim(),
          ...(senderEmail.trim() ? { senderEmail: senderEmail.trim() } : {}),
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { result: WorkflowRunResult };
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="font-semibold text-gray-900 mb-1">Run Workflow</h3>
      <p className="text-sm text-gray-500 mb-4">
        Paste a scheduling email to process it through this workflow.
      </p>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">Sender email address</label>
          <button
            type="button"
            onClick={() => setSenderEmail(SAMPLE_SENDER)}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Load sample
          </button>
        </div>
        <input
          type="text"
          className="w-full border border-gray-200 rounded p-2 text-sm text-gray-800 font-mono placeholder-gray-400 focus:outline-none focus:border-gray-400"
          placeholder="e.g. TimCook@apple.com"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          disabled={loading}
        />
        {senderEmail && (
          <div className="mt-1.5 flex gap-4 text-xs text-gray-500">
            <span>
              Research person:{" "}
              <span className={parsed ? "text-gray-800 font-medium" : "text-red-400"}>
                {parsed ? parsed.name : "—"}
              </span>
            </span>
            <span>
              Research company:{" "}
              <span className={parsed ? "text-gray-800 font-medium" : "text-red-400"}>
                {parsed ? parsed.company : "—"}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">Email body</label>
          <button
            type="button"
            onClick={() => setEmailText(SAMPLE_EMAIL)}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Load sample
          </button>
        </div>
        <textarea
          className="w-full border border-gray-200 rounded p-3 text-sm text-gray-800 font-mono placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-y"
          rows={5}
          placeholder="Paste scheduling email body here..."
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={() => void handleRun()}
        disabled={loading}
        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Running…" : "Run workflow"}
      </button>

      {result && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">Result:</span>
            <StatusBadge status={result.status} />
          </div>

          <dl className="space-y-1 text-sm mb-4">
            <div className="flex gap-2">
              <dt className="text-gray-400 w-32 shrink-0">Execution ID</dt>
              <dd className="text-gray-700 font-mono text-xs truncate">{result.workflowExecutionId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-400 w-32 shrink-0">Steps</dt>
              <dd className="text-gray-700">{result.steps.length} completed</dd>
            </div>
            {result.errorMessage && (
              <div className="flex gap-2">
                <dt className="text-gray-400 w-32 shrink-0">Error</dt>
                <dd className="text-red-600 text-xs">{result.errorMessage}</dd>
              </div>
            )}
          </dl>

          {result.context.replyDraft && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Reply draft</p>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap font-mono text-gray-700">
                {result.context.replyDraft}
              </pre>
            </div>
          )}

          {result.context.createdEvent && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Created event</p>
              <div className="text-xs bg-gray-50 border border-gray-200 rounded p-3 text-gray-700 space-y-0.5">
                <p><span className="font-medium">Title:</span> {result.context.createdEvent.title}</p>
                <p><span className="font-medium">Start:</span> {result.context.createdEvent.startTime}</p>
                <p><span className="font-medium">End:</span> {result.context.createdEvent.endTime}</p>
              </div>
            </div>
          )}

          {result.context.selectedSlot && !result.context.createdEvent && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Selected slot</p>
              <div className="text-xs bg-gray-50 border border-gray-200 rounded p-3 text-gray-700">
                {result.context.selectedSlot.startTime} → {result.context.selectedSlot.endTime}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/executions/${result.workflowExecutionId}`}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View execution →
            </Link>
            <Link
              href="/executions"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              All executions
            </Link>
            {result.context.createdEvent && (
              <Link
                href="/calendar"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Go to calendar
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
