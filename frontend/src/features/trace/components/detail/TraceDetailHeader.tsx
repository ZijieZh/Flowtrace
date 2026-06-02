
import { ReactNode, useEffect, useState } from "react";
import { ArrowLeft, Pencil, Check, X } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useRunRename } from "@/features/trace/api/trace-core";

type TraceDetailHeaderProps = {
  traceId: string;
  agentName: string;

  /** Current run id (omit when no run selected). */
  runId?: string;
  /** Current run name (from useRunState). Empty string falls back to a placeholder. */
  runName?: string;

  isEditingName: boolean;
  editedName: string;

  onBack: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveName: () => void;
  onNameChange: (value: string) => void;

  headerRight?: ReactNode;
};

export function TraceDetailHeader({
  traceId,
  agentName,
  runId,
  runName,
  isEditingName,
  editedName,
  onBack,
  onStartEdit,
  onCancelEdit,
  onSaveName,
  onNameChange,
  headerRight,
}: TraceDetailHeaderProps) {
  // ── Run name inline-edit (local to header) ──────────────────────────────
  const renameRun = useRunRename(runId ?? "");
  const [isEditingRun, setIsEditingRun] = useState(false);
  const [editedRun, setEditedRun] = useState("");

  useEffect(() => {
    if (!isEditingRun) setEditedRun(runName ?? "");
  }, [runName, isEditingRun]);

  const startEditRun = () => {
    setEditedRun(runName ?? "");
    setIsEditingRun(true);
  };
  const cancelEditRun = () => setIsEditingRun(false);
  const saveRun = () => {
    const next = editedRun.trim();
    if (!runId || next === (runName ?? "")) {
      setIsEditingRun(false);
      return;
    }
    renameRun.mutate(
      { body: { name: next } },
      { onSettled: () => setIsEditingRun(false) },
    );
  };

  return (
    <div className="relative z-10 w-full">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Back */}
          <Button
            variant="ghost"
            onClick={onBack}
            className="rounded-full w-8 h-8 p-0 hover:bg-slate-200 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          {/* Agent Name */}
          {isEditingName ? (
            <div className="flex items-center gap-2 min-w-0">
              <Input
                value={editedName}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveName();
                  if (e.key === "Escape") onCancelEdit();
                }}
                className="h-8 text-base font-medium w-64"
                autoFocus
                onFocus={(e) => e.target.select()}
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={onSaveName}
                className="h-7 w-7 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 cursor-pointer shrink-0"
              >
                <Check className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onCancelEdit}
                className="h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={onStartEdit}
              className="flex items-center gap-2 text-base font-medium text-slate-700 hover:text-slate-900 transition-colors group cursor-pointer min-w-0"
            >
              <span className="truncate cursor-pointer">
                {agentName}
              </span>
              <Pencil className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}

          {/* Run name (when a run is selected) */}
          {runId && !isEditingName && (
            <>
              <span className="text-slate-300 shrink-0">/</span>
              {isEditingRun ? (
                <div className="flex items-center gap-1 min-w-0">
                  <Input
                    value={editedRun}
                    onChange={(e) => setEditedRun(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRun();
                      if (e.key === "Escape") cancelEditRun();
                    }}
                    placeholder="run name"
                    className="h-7 text-sm w-48"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={saveRun}
                    disabled={renameRun.isPending}
                    className="h-7 w-7 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 cursor-pointer shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelEditRun}
                    className="h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={startEditRun}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors group/run cursor-pointer min-w-0"
                >
                  <span className="truncate">
                    {runName?.trim() || <span className="italic text-slate-400">unnamed run</span>}
                  </span>
                  <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover/run:opacity-100 transition-opacity shrink-0" />
                </button>
              )}
            </>
          )}

        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerRight && (
            <div className="flex items-center shrink-0">
              {headerRight}
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
