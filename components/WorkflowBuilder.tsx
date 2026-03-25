"use client";

import { useState, useId } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { RunWorkflowCard } from "./RunWorkflowCard";

const TRIGGER_LABELS: Record<string, string> = {
  meeting_request_received: "Meeting Request Received",
  event_cancelled: "Event Cancelled",
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
  load_cancelled_event: "Load Cancelled Event",
  find_fallback_slots: "Find Fallback Slots",
  generate_reschedule_email: "Generate Reschedule Email",
};

type ActionItem = {
  uid: string;
  type: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function WorkflowBuilder() {
  const instanceId = useId();
  const [name, setName] = useState("New Workflow");
  const [trigger, setTrigger] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [showTriggerMenu, setShowTriggerMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

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

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const reordered = Array.from(actions);
    const removed = reordered.splice(result.source.index, 1);
    if (removed.length === 0) return;
    reordered.splice(result.destination.index, 0, removed[0]!);
    setActions(reordered);
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
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      const json = await res.json();
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
      <div className="mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none w-full pb-1 transition-colors"
          placeholder="Workflow name"
        />
      </div>

      {/* Builder column */}
      <div className="flex flex-col items-center gap-2">

        {/* Trigger block */}
        {trigger ? (
          <div className="w-full bg-indigo-50 border-2 border-indigo-300 rounded-xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-indigo-500 text-lg">⚡</span>
              <div>
                <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-0.5">Trigger</div>
                <div className="font-semibold text-indigo-900">{TRIGGER_LABELS[trigger]}</div>
              </div>
            </div>
            <button
              onClick={() => setTrigger(null)}
              className="text-indigo-300 hover:text-indigo-600 transition-colors p-1 rounded"
              title="Remove trigger"
            >
              <TrashIcon />
            </button>
          </div>
        ) : (
          <div className="relative w-full">
            <button
              onClick={() => { setShowTriggerMenu((v) => !v); setShowActionMenu(false); }}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl px-5 py-4 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <PlusIcon /> Add Trigger
            </button>
            {showTriggerMenu && (
              <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => { setTrigger(value); setShowTriggerMenu(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <span className="text-indigo-400">⚡</span> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connector line */}
        {trigger && (
          <div className="w-0.5 h-4 bg-gray-300" />
        )}

        {/* Actions drag list */}
        {trigger && (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId={`actions-${instanceId}`}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`w-full flex flex-col gap-2 transition-colors rounded-xl ${snapshot.isDraggingOver ? "bg-gray-50" : ""}`}
                >
                  {actions.map((action, index) => (
                    <Draggable key={action.uid} draggableId={action.uid} index={index}>
                      {(provided, snapshot) => (
                        <>
                          {index > 0 && !snapshot.isDragging && (
                            <div className="w-0.5 h-4 bg-gray-300 mx-auto -mt-1 -mb-1" />
                          )}
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`w-full bg-white border-2 rounded-xl px-5 py-4 flex items-center justify-between transition-shadow ${
                              snapshot.isDragging
                                ? "border-indigo-300 shadow-lg"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                {...provided.dragHandleProps}
                                className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                                title="Drag to reorder"
                              >
                                <GripIcon />
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                                  Step {index + 1}
                                </div>
                                <div className="font-semibold text-gray-800">
                                  {ACTION_LABELS[action.type] ?? action.type}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeAction(action.uid)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                              title="Remove action"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Connector + Add action button */}
        {trigger && (
          <>
            {actions.length > 0 && <div className="w-0.5 h-4 bg-gray-300" />}
            <div className="relative w-full">
              <button
                onClick={() => { setShowActionMenu((v) => !v); setShowTriggerMenu(false); }}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl px-5 py-3 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
              >
                <PlusIcon /> Add Action
              </button>
              {showActionMenu && (
                <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-72 overflow-y-auto">
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => addAction(value)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
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
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved!" : "Save Workflow"}
          </button>
              {saveState === "error" && saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
        </div>
      )}

      {savedId && trigger && (
        <div className="mt-8 border-t border-gray-200 pt-8">
          <RunWorkflowCard workflowId={savedId} triggerType={trigger} />
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}
