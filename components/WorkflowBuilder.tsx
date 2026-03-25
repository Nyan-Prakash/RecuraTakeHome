"use client";

import { useState, useRef } from "react";
import { RunWorkflowCard } from "./RunWorkflowCard";

const TRIGGER_LABELS: Record<string, string> = {
  meeting_request_received: "Meeting Request Received",
  meeting_reschedule_requested: "Reschedule Requested",
};

const ACTION_LABELS: Record<string, string> = {
  summarize_email: "Summarize Email",
  extract_availability: "Extract Availability",
  find_open_slot: "Find Open Slot",
  research_attendees: "Research Attendees",
  research_company: "Research Company",
  generate_pre_meeting_notes: "Generate Pre-Meeting Notes",
  create_calendar_event: "Create Calendar Event",
  generate_confirmation_email: "Generate Confirmation Email",
  resolve_cancelled_event: "Resolve Cancelled Event",
  find_fallback_slots: "Find Fallback Slots",
  generate_reschedule_email: "Generate Reschedule Email",
};

type ActionItem = {
  uid: string;
  type: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function WorkflowBuilder() {
  const [name, setName] = useState("New Workflow");
  const [trigger, setTrigger] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [showTriggerMenu, setShowTriggerMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Drag state
  const dragUid = useRef<string | null>(null);
  const [dragOverUid, setDragOverUid] = useState<string | null>(null);
  const [draggingUid, setDraggingUid] = useState<string | null>(null);

  function addAction(type: string) {
    setActions((prev) => [
      ...prev,
      { uid: `${Date.now()}-${Math.random()}`, type },
    ]);
    setShowActionMenu(false);
  }

  function removeAction(uid: string) {
    setActions((prev) => prev.filter((a) => a.uid !== uid));
  }

  function handleDragStart(uid: string) {
    dragUid.current = uid;
    setDraggingUid(uid);
  }

  function handleDragOver(e: React.DragEvent, uid: string) {
    e.preventDefault();
    if (dragUid.current !== uid) {
      setDragOverUid(uid);
    }
  }

  function handleDrop(e: React.DragEvent, targetUid: string) {
    e.preventDefault();
    const sourceUid = dragUid.current;
    if (!sourceUid || sourceUid === targetUid) return;

    setActions((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((a) => a.uid === sourceUid);
      const toIdx = arr.findIndex((a) => a.uid === targetUid);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item!);
      return arr;
    });

    dragUid.current = null;
    setDragOverUid(null);
    setDraggingUid(null);
  }

  function handleDragEnd() {
    dragUid.current = null;
    setDragOverUid(null);
    setDraggingUid(null);
  }

  async function handleSave() {
    if (!trigger) return;
    setSaveState("saving");
    setSaveError(null);

    const payload = {
      name,
      description: "",
      triggerType: trigger,
      isActive: true,
      actions: actions.map((a, i) => ({
        type: a.type,
        order: i + 1,
        isOptional: false,
        isEnabled: true,
        configJson: null,
      })),
    };

    try {
      let res: Response;
      if (savedId) {
        res = await fetch(`/api/workflows/${savedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const json = await res.json() as { workflow: { id: string } };
      setSavedId(json.workflow.id);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaveState("error");
    }
  }

  const canSave = !!trigger && !!name.trim();

  return (
    <div className="max-w-xl mx-auto">
      {/* Name */}
      <div className="mb-7">
        <label
          className="block text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: "var(--muted)", letterSpacing: "0.07em", fontSize: "10px" }}
        >
          Workflow Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-semibold bg-transparent w-full transition-colors"
          style={{
            fontSize: "20px",
            color: "var(--foreground)",
            letterSpacing: "-0.02em",
            border: "none",
            borderBottom: "2px solid var(--border)",
            outline: "none",
            paddingBottom: "6px",
          }}
          placeholder="e.g. Schedule Meeting"
          onFocus={(e) => { e.currentTarget.style.borderBottomColor = "var(--accent)"; }}
          onBlur={(e) => { e.currentTarget.style.borderBottomColor = "var(--border)"; }}
        />
      </div>

      {/* Builder column */}
      <div className="flex flex-col items-center">

        {/* Trigger block */}
        {trigger ? (
          <>
            <div
              className="w-full rounded-xl px-4 py-3.5 flex items-center justify-between border-2 transition-all"
              style={{ background: "var(--accent-subtle)", borderColor: "#c7d2fe" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "#6366f1" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div>
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                    style={{ color: "#818cf8", letterSpacing: "0.06em", fontSize: "10px" }}
                  >
                    Trigger
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "#3730a3" }}>
                    {TRIGGER_LABELS[trigger]}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTrigger(null)}
                className="p-1.5 rounded-lg transition-all cursor-pointer"
                title="Remove trigger"
                style={{ color: "#a5b4fc" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#6366f1";
                  (e.currentTarget as HTMLElement).style.background = "#e0e7ff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#a5b4fc";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <TrashIcon />
              </button>
            </div>
            <Connector />
          </>
        ) : (
          <div className="relative w-full">
            <button
              onClick={() => { setShowTriggerMenu((v) => !v); setShowActionMenu(false); }}
              className="w-full rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 text-sm font-medium transition-all duration-150 cursor-pointer border-2 border-dashed"
              style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#818cf8";
                (e.currentTarget as HTMLElement).style.color = "#6366f1";
                (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <PlusIcon /> Add Trigger
            </button>
            {showTriggerMenu && (
              <div
                className="absolute top-full mt-1.5 w-full rounded-xl overflow-hidden z-20"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => { setTrigger(value); setShowTriggerMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors cursor-pointer"
                    style={{ color: "var(--foreground)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions drag list */}
        {trigger && (
          <div className="w-full flex flex-col">
            {actions.map((action, index) => (
              <div key={action.uid}>
                <div
                  draggable
                  onDragStart={() => handleDragStart(action.uid)}
                  onDragOver={(e) => handleDragOver(e, action.uid)}
                  onDrop={(e) => handleDrop(e, action.uid)}
                  onDragEnd={handleDragEnd}
                  className="w-full rounded-xl px-4 py-3.5 flex items-center justify-between border-2 transition-all"
                  style={{
                    background: "var(--surface)",
                    borderColor: dragOverUid === action.uid
                      ? "#6366f1"
                      : "var(--border)",
                    boxShadow: dragOverUid === action.uid
                      ? "0 0 0 3px rgba(99,102,241,0.15)"
                      : "none",
                    opacity: draggingUid === action.uid ? 0.4 : 1,
                    cursor: "grab",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="transition-colors p-0.5 rounded shrink-0"
                      style={{ color: "var(--border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--muted)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--border)")}
                    >
                      <GripIcon />
                    </div>
                    <div>
                      <div
                        className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                        style={{ color: "var(--muted)", fontSize: "10px", letterSpacing: "0.06em" }}
                      >
                        Step {index + 1}
                      </div>
                      <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                        {ACTION_LABELS[action.type] ?? action.type}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAction(action.uid)}
                    className="p-1.5 rounded-lg transition-all cursor-pointer"
                    title="Remove action"
                    style={{ color: "var(--border)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--error)";
                      (e.currentTarget as HTMLElement).style.background = "var(--error-subtle)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--border)";
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
                {index < actions.length - 1 && <Connector />}
              </div>
            ))}
          </div>
        )}

        {/* Add action button */}
        {trigger && (
          <>
            {actions.length > 0 && <Connector />}
            <div className="relative w-full">
              <button
                onClick={() => { setShowActionMenu((v) => !v); setShowTriggerMenu(false); }}
                className="w-full rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-xs font-medium transition-all duration-150 cursor-pointer border-2 border-dashed"
                style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#818cf8";
                  (e.currentTarget as HTMLElement).style.color = "#6366f1";
                  (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <PlusIcon /> Add Action
              </button>
              {showActionMenu && (
                <div
                  className="absolute top-full mt-1.5 w-full rounded-xl overflow-hidden z-20 max-h-72 overflow-y-auto"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => addAction(value)}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer"
                      style={{ color: "var(--foreground)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border-subtle)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Save */}
      {trigger && (
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!canSave || saveState === "saving"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: saveState === "saved" ? "#16a34a" : "var(--accent)",
              color: "#ffffff",
            }}
            onMouseEnter={(e) => {
              if (canSave && saveState !== "saving") {
                (e.currentTarget as HTMLElement).style.background =
                  saveState === "saved" ? "#15803d" : "var(--accent-hover)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                saveState === "saved" ? "#16a34a" : "var(--accent)";
            }}
          >
            {saveState === "saving" ? (
              <>
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Saving…
              </>
            ) : saveState === "saved" ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved
              </>
            ) : (
              "Save Workflow"
            )}
          </button>
          {saveState === "error" && saveError && (
            <span className="text-xs" style={{ color: "var(--error)" }}>
              {saveError}
            </span>
          )}
        </div>
      )}

      {savedId && trigger && (
        <div className="mt-8 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
          <RunWorkflowCard workflowId={savedId} triggerType={trigger} />
        </div>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-center py-0.5">
      <div className="w-px" style={{ height: "20px", background: "var(--border)" }} />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}
