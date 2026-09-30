import {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  ControlButton,
  Controls,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnSelectionChangeFunc,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import debounce from "just-debounce-it";
import { DragEvent, useCallback, useEffect, useMemo, useRef } from "react";

import { edgeTypes, nodeTypes } from "@/lib/flow/components";
import { FlowData } from "@/lib/flow/dataSchema";
import { useFlowHistory } from "@/lib/flow/history";
import { getLayoutedElements } from "@/lib/flow/layout";
import { createNode, getNodeValues } from "@/lib/flow/nodes";
import { useFlowClipboard } from "@/lib/hooks/flowClipboard";
import { useHookedTheme } from "@/lib/hooks/theme";
import "@xyflow/react/dist/base.css";
import { ListTreeIcon } from "lucide-react";

interface Props {
  initialData?: FlowData;
  onChange: () => void;
  onSelectionChange?: OnSelectionChangeFunc;
}

export default function FlowEditor({
  initialData,
  onChange,
  onSelectionChange,
}: Props) {
  const { theme } = useHookedTheme();
  const { takeSnapshot, registerFlowMutator, isApplying } = useFlowHistory();

  // TODO: refactor?
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialData?.nodes || []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialData?.edges || []
  );
  const { getEdge, getNode, screenToFlowPosition, fitView } = useReactFlow();

  const isDraggingRef = useRef(false);

  useEffect(() => {
    return registerFlowMutator({ setNodes, setEdges });
  }, [registerFlowMutator, setNodes, setEdges]);

  const onNodeDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const onNodeDragStop = useCallback(() => {
    isDraggingRef.current = false;
    takeSnapshot();
  }, [takeSnapshot]);

  const onSelectionDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const onSelectionDragStop = useCallback(() => {
    isDraggingRef.current = false;
    takeSnapshot();
  }, [takeSnapshot]);

  const onConnect = useCallback(
    (con: Connection) => {
      setEdges((eds) => {
        const nextEdges = addEdge(con, eds);
        takeSnapshot({ nodes, edges: nextEdges });
        return nextEdges;
      });
      onChange();
    },
    [setEdges, nodes, takeSnapshot, onChange]
  );

  const wrappedOnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filteredChanges = changes.filter((change) => {
        if (change.type === "remove") {
          const node = getNode(change.id);
          const values = getNodeValues(node!.type!);
          return !values.fixed;
        }

        return true;
      });

      const removedNodeIds = filteredChanges
        .filter((c) => c.type === "remove")
        .map((c) => (c as { id: string }).id);

      if (removedNodeIds.length > 0) {
        const removedSet = new Set(removedNodeIds);
        setEdges((eds) =>
          eds.filter(
            (edge) => !removedSet.has(edge.source) && !removedSet.has(edge.target)
          )
        );
      }

      if (filteredChanges.length > 0) {
        onNodesChange(filteredChanges);
        onChange();
      }
    },
    [onNodesChange, onChange, getNode, setEdges]
  );

  const wrappedOnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const filteredChanges = changes.filter((change) => {
        if (change.type === "remove") {
          const edge = getEdge(change.id);
          return edge?.type !== "fixed";
        }

        return true;
      });

      if (filteredChanges.length > 0) {
        onEdgesChange(filteredChanges);
        onChange();
      }
    },
    [getEdge, onEdgesChange, onChange]
  );

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedNodeIds = new Set(deletedNodes.map((n) => n.id));
      const childIdsToDelete = new Set<string>();

      for (const node of deletedNodes) {
        const nodeValues = getNodeValues(node.type!);

        // delete children if this node owns them
        if (nodeValues.ownsChildren) {
          edges
            .filter((edge) => edge.source === node.id)
            .forEach((edge) => {
              childIdsToDelete.add(edge.target);
              deletedNodeIds.add(edge.target);
            });
        }
      }

      const nextEdges = edges.filter(
        (edge) =>
          !deletedNodeIds.has(edge.source) && !deletedNodeIds.has(edge.target)
      );
      setEdges(nextEdges);

      const nextNodes = nodes.filter((n) => !deletedNodeIds.has(n.id));
      if (childIdsToDelete.size > 0) {
        setNodes(nextNodes);
      }

      takeSnapshot({ nodes: nextNodes, edges: nextEdges });
      onChange();
    },
    [nodes, edges, setEdges, setNodes, takeSnapshot, onChange]
  );

  const format = useCallback(() => {
    const formattedNodes = getLayoutedElements(nodes, edges, {
      direction: "TB",
    });

    takeSnapshot({ nodes: formattedNodes.nodes, edges });
    setNodes(formattedNodes.nodes);
    onChange();
    setTimeout(() => {
      fitView();
    }, 50);
  }, [nodes, edges, setNodes, fitView, takeSnapshot, onChange]);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      const type = e.dataTransfer?.getData("application/reactflow");
      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      const [newNodes, newEdges] = createNode(type, position);

      setNodes((nds) => {
        const nextNodes = nds.concat(newNodes);
        setEdges((eds) => {
          const nextEdges = eds.concat(newEdges);
          takeSnapshot({ nodes: nextNodes, edges: nextEdges });
          return nextEdges;
        });
        return nextNodes;
      });
      onChange();
    },
    [screenToFlowPosition, setNodes, setEdges, takeSnapshot, onChange]
  );

  const onMouseMove = useFlowClipboard({ setNodes, setEdges, onChange });

  // Debounced snapshot for node data/field edits and miscellaneous changes
  const debouncedSnapshot = useMemo(
    () =>
      debounce(() => {
        if (!isDraggingRef.current && !isApplying()) {
          takeSnapshot();
        }
      }, 500),
    [takeSnapshot, isApplying]
  );

  useEffect(() => {
    if (!isDraggingRef.current && !isApplying()) {
      debouncedSnapshot();
    }
  }, [nodes, edges, debouncedSnapshot, isApplying]);

  const isValidConnection = useCallback(
    (con: Connection | Edge) => {
      if (!con.source || !con.target) return false;

      const source = getNode(con.source)!;
      const target = getNode(con.target)!;

      // This is a bit of a mess, but it works for now
      if (
        (target.type === "entry_command" || target.type === "entry_event") &&
        !source.type?.startsWith("option")
      )
        return false;
      if (
        source.type?.startsWith("option") &&
        target.type !== "entry_command" &&
        target.type !== "entry_event"
      )
        return false;

      // Prevent cycles
      /*const hasCycle = (node: Node, visited = new Set()) => {
        if (visited.has(node.id)) return false;

        visited.add(node.id);

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === con.source) return true;
          if (hasCycle(outgoer, visited)) return true;
        }
      };

      if (target.id === con.source) return false;
      return !hasCycle(target);*/
      return true;
    },
    [getNode]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={wrappedOnNodesChange}
      onEdgesChange={wrappedOnEdgesChange}
      onNodesDelete={onNodesDelete}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onSelectionDragStart={onSelectionDragStart}
      onSelectionDragStop={onSelectionDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onMouseMove={onMouseMove}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onSelectionChange={onSelectionChange}
      colorMode={theme === "dark" ? "dark" : "light"}
      defaultEdgeOptions={{ type: "delete_button" }}
      multiSelectionKeyCode={null}
      deleteKeyCode={["Backspace", "Delete"]}
      proOptions={{
        hideAttribution: true,
      }}
      className="!bg-background flex-auto"
      fitView
    >
      <Controls
        showInteractive={false}
        position="bottom-right"
        className="scale-110"
      >
        <ControlButton onClick={format}>
          <ListTreeIcon className="size-5" />
        </ControlButton>
      </Controls>
      <Background
        variant={BackgroundVariant.Dots}
        gap={18}
        size={1}
        className="!bg-muted/20"
        color="#615d84"
      />
    </ReactFlow>
  );
}
