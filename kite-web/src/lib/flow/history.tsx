import { Edge, Node, useReactFlow } from "@xyflow/react";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FlowData } from "./dataSchema";

export interface FlowSnapshot {
  nodes: Node[];
  edges: Edge[];
}

export interface FlowMutator {
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}

interface FlowHistoryContextValue {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  takeSnapshot: (snapshot?: FlowSnapshot) => void;
  registerFlowMutator: (mutator: FlowMutator) => () => void;
  isApplying: () => boolean;
}

const FlowHistoryContext = createContext<FlowHistoryContextValue | null>(null);

export function cleanSnapshot(
  nodes: Node[] = [],
  edges: Edge[] = []
): FlowSnapshot {
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Prune any edges whose source or target node no longer exists
  const validEdges = edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
      },
      data: node.data ? JSON.parse(JSON.stringify(node.data)) : {},
      parentId: node.parentId,
    })),
    edges: validEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
    })),
  };
}

export function areFlowsEqual(
  a: FlowSnapshot | null,
  b: FlowSnapshot | null
): boolean {
  if (!a || !b) return a === b;
  if (a.nodes.length !== b.nodes.length || a.edges.length !== b.edges.length) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

interface Props {
  children: ReactNode;
  initialFlow?: FlowData;
  onChange?: () => void;
}

export function FlowHistoryProvider({
  children,
  initialFlow,
  onChange,
}: Props) {
  const {
    getNodes,
    getEdges,
    setNodes: setReactFlowNodes,
    setEdges: setReactFlowEdges,
  } = useReactFlow();

  const pastRef = useRef<FlowSnapshot[]>([]);
  const futureRef = useRef<FlowSnapshot[]>([]);
  const presentRef = useRef<FlowSnapshot | null>(
    initialFlow
      ? cleanSnapshot(initialFlow.nodes || [], initialFlow.edges || [])
      : null
  );

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isApplyingRef = useRef(false);
  const mutatorRef = useRef<FlowMutator | null>(null);

  useEffect(() => {
    if (!presentRef.current && initialFlow) {
      presentRef.current = cleanSnapshot(
        initialFlow.nodes || [],
        initialFlow.edges || []
      );
    }
  }, [initialFlow]);

  const takeSnapshot = useCallback(
    (customSnapshot?: FlowSnapshot) => {
      if (isApplyingRef.current) return;

      const rawNodes = customSnapshot ? customSnapshot.nodes : getNodes();
      const rawEdges = customSnapshot ? customSnapshot.edges : getEdges();
      const newSnapshot = cleanSnapshot(rawNodes, rawEdges);

      if (areFlowsEqual(presentRef.current, newSnapshot)) {
        return;
      }

      if (presentRef.current) {
        pastRef.current = [...pastRef.current.slice(-49), presentRef.current];
      }
      presentRef.current = newSnapshot;
      futureRef.current = [];

      setCanUndo(pastRef.current.length > 0);
      setCanRedo(false);
    },
    [getNodes, getEdges]
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0 || isApplyingRef.current) return;

    const previousSnapshot = pastRef.current[pastRef.current.length - 1];
    const newPast = pastRef.current.slice(0, pastRef.current.length - 1);

    if (presentRef.current) {
      futureRef.current = [presentRef.current, ...futureRef.current];
    }

    pastRef.current = newPast;
    presentRef.current = previousSnapshot;

    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);

    isApplyingRef.current = true;

    const clonedNodes = JSON.parse(JSON.stringify(previousSnapshot.nodes));
    const clonedEdges = JSON.parse(JSON.stringify(previousSnapshot.edges));

    if (mutatorRef.current) {
      mutatorRef.current.setNodes(clonedNodes);
      mutatorRef.current.setEdges(clonedEdges);
    }
    setReactFlowNodes(clonedNodes);
    setReactFlowEdges(clonedEdges);

    if (onChange) {
      onChange();
    }

    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  }, [setReactFlowNodes, setReactFlowEdges, onChange]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0 || isApplyingRef.current) return;

    const nextSnapshot = futureRef.current[0];
    const newFuture = futureRef.current.slice(1);

    if (presentRef.current) {
      pastRef.current = [...pastRef.current.slice(-49), presentRef.current];
    }

    futureRef.current = newFuture;
    presentRef.current = nextSnapshot;

    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);

    isApplyingRef.current = true;

    const clonedNodes = JSON.parse(JSON.stringify(nextSnapshot.nodes));
    const clonedEdges = JSON.parse(JSON.stringify(nextSnapshot.edges));

    if (mutatorRef.current) {
      mutatorRef.current.setNodes(clonedNodes);
      mutatorRef.current.setEdges(clonedEdges);
    }
    setReactFlowNodes(clonedNodes);
    setReactFlowEdges(clonedEdges);

    if (onChange) {
      onChange();
    }

    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  }, [setReactFlowNodes, setReactFlowEdges, onChange]);

  const registerFlowMutator = useCallback((mutator: FlowMutator) => {
    mutatorRef.current = mutator;
    return () => {
      mutatorRef.current = null;
    };
  }, []);

  const isApplying = useCallback(() => isApplyingRef.current, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, [contenteditable], [role=dialog]") ||
        window.getSelection()?.toString()
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === "z" || e.key === "Z") {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key === "y" || e.key === "Y") {
          e.preventDefault();
          redo();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  return (
    <FlowHistoryContext.Provider
      value={{
        canUndo,
        canRedo,
        undo,
        redo,
        takeSnapshot,
        registerFlowMutator,
        isApplying,
      }}
    >
      {children}
    </FlowHistoryContext.Provider>
  );
}

export function useFlowHistory() {
  const context = useContext(FlowHistoryContext);
  if (!context) {
    throw new Error("useFlowHistory must be used within a FlowHistoryProvider");
  }
  return context;
}
