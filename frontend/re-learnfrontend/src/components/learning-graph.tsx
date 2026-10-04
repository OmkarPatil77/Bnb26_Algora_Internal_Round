import { useMemo } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
export default function LearningGraph() {
  const nodes = useMemo<Node[]>(
    () => [
      {
        id: "lists",
        position: { x: 0, y: 105 },
        data: { label: "Lists & names" },
        className: "graph-node graph-node-resolved",
      },
      {
        id: "alias",
        position: { x: 220, y: 20 },
        data: { label: "Aliasing · resolved" },
        className: "graph-node graph-node-resolved",
      },
      {
        id: "assign",
        position: { x: 220, y: 125 },
        data: { label: "Assignment direction" },
        className: "graph-node graph-node-active",
      },
      {
        id: "loops",
        position: { x: 220, y: 230 },
        data: { label: "Loop variables" },
        className: "graph-node graph-node-active",
      },
      {
        id: "range",
        position: { x: 440, y: 75 },
        data: { label: "`range()` stops" },
        className: "graph-node",
      },
      {
        id: "return",
        position: { x: 440, y: 195 },
        data: { label: "Return vs print" },
        className: "graph-node",
      },
    ],
    [],
  );
  const edges = useMemo<Edge[]>(
    () => [
      { id: "e1", source: "lists", target: "alias", label: "names" },
      { id: "e2", source: "lists", target: "assign", label: "values" },
      { id: "e3", source: "assign", target: "loops" },
      { id: "e4", source: "loops", target: "range" },
      { id: "e5", source: "loops", target: "return" },
    ],
    [],
  );
  return (
    <div className="h-[340px] w-full overflow-hidden rounded-xl bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        elementsSelectable={false}
      >
        <Background color="var(--border)" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
