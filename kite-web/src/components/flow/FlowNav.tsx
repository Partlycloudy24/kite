import { FlowContextType } from "@/lib/flow/context";
import { FlowData, NodeProps } from "@/lib/flow/dataSchema";
import { useFlowHistory } from "@/lib/flow/history";
import { useEditorSettings } from "@/lib/hooks/useEditorSettings";
import { Node, useReactFlow } from "@xyflow/react";
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  CheckIcon,
  Redo2Icon,
  RefreshCwIcon,
  Share2Icon,
  Undo2Icon,
} from "lucide-react";
import { useCallback, useEffect } from "react";
import FlowExportDialog from "../app/FlowExportDialog";
import FlowSettingsMenu from "./FlowSettingsMenu";

interface Props {
  hasUnsavedChanges: boolean;
  hasUndeployedChanges?: boolean;
  isSaving: boolean;
  isDeploying?: boolean;
  context?: FlowContextType;
  extraShareData?: Record<string, unknown>;
  onSave: (d: FlowData) => void;
  onDeploy?: () => void;
  onExit: () => void;
}

export default function FlowNav({
  hasUnsavedChanges,
  hasUndeployedChanges,
  isSaving,
  context = "command",
  extraShareData,
  onSave,
  onDeploy,
  onExit,
}: Props) {
  const { getEdges, getNodes } = useReactFlow<Node<NodeProps>>();
  const { canUndo, canRedo, undo, redo } = useFlowHistory();
  const { showUndoRedo, showShare } = useEditorSettings();

  const save = useCallback(() => {
    onSave({
      nodes: getNodes(),
      edges: getEdges(),
    });
  }, [onSave, getNodes, getEdges]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onSave, save]);

  const exportType = context === "event_discord" ? "event_listener" : "command";
  const exportTitle =
    context === "event_discord" ? "Export Event Listener" : "Export Command";

  return (
    <div className="h-12 flex items-center justify-between px-4 select-none bg-muted/70 border-b border-border/40">
      <div className="flex items-center space-x-8">
        <button
          className="flex space-x-2 text-foreground/80 hover:text-foreground items-center"
          onClick={onExit}
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <div>Back to App</div>
        </button>
        {isSaving ? (
          <div
            className="flex space-x-2 text-foreground/80 hover:text-foreground items-center"
            onClick={save}
          >
            <RefreshCwIcon className="h-5 w-5 animate-spin" />
            <div>Saving Changes</div>
          </div>
        ) : hasUnsavedChanges ? (
          <button
            className="flex space-x-2 text-foreground/80 hover:text-foreground items-center"
            onClick={save}
          >
            <div className="h-3 w-3 rounded-full bg-foreground/80"></div>
            <div>Save Changes</div>
          </button>
        ) : (
          <div className="flex space-x-2 text-foreground/70 items-center">
            <CheckIcon className="h-5 w-5" />
            <div>No Unsaved Changes</div>
          </div>
        )}
        {hasUndeployedChanges ? (
          <button
            className="flex space-x-2 text-foreground/80 hover:text-foreground items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={hasUnsavedChanges}
            onClick={onDeploy}
          >
            <ArrowUpIcon className="h-5 w-5" />
            <div>Deploy Changes</div>
          </button>
        ) : hasUndeployedChanges === false ? (
          <div className="flex space-x-2 text-foreground/70 items-center">
            <CheckIcon className="h-5 w-5" />
            <div>Changes Deployed</div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center space-x-2">
        {showUndoRedo && (
          <div className="flex items-center space-x-1 mr-1">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-foreground/80 disabled:cursor-not-allowed transition-colors"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2Icon className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-foreground/80 disabled:cursor-not-allowed transition-colors"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2Icon className="h-5 w-5" />
            </button>
          </div>
        )}

        {showShare && (
          <FlowExportDialog
            title={exportTitle}
            type={exportType}
            shareData={
              context === "event_discord"
                ? {
                    flow_source: { nodes: getNodes(), edges: getEdges() },
                    ...extraShareData,
                  }
                : {
                    flow_source: { nodes: getNodes(), edges: getEdges() },
                  }
            }
          >
            <button
              type="button"
              className="flex space-x-1.5 text-foreground/80 hover:text-foreground items-center px-3 py-1.5 rounded-md hover:bg-muted text-sm font-medium transition-colors mr-1"
              title="Export & Share flow"
            >
              <Share2Icon className="h-4 w-4" />
              <span>Share</span>
            </button>
          </FlowExportDialog>
        )}

        <FlowSettingsMenu />
      </div>
    </div>
  );
}
