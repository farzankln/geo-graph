import { GraphNode, GraphEdge } from "@/types";

export function findShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string,
) {
  console.log(`🔍 شروع دیکسترا: از ${startId} به ${endId}`);

  // ساخت adjacency list
  const adjacencyList = new Map<string, { nodeId: string; weight: number }[]>();
  edges.forEach((edge) => {
    if (!adjacencyList.has(edge.from)) adjacencyList.set(edge.from, []);
    if (!adjacencyList.has(edge.to)) adjacencyList.set(edge.to, []);
    adjacencyList
      .get(edge.from)!
      .push({ nodeId: edge.to, weight: edge.weight });
    adjacencyList
      .get(edge.to)!
      .push({ nodeId: edge.from, weight: edge.weight });
  });

  console.log(`📋 تعداد گره‌های مجاور: ${adjacencyList.size}`);

  // دیکسترا
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();
  const pq = new Map<string, number>(); // صف اولویت ساده

  nodes.forEach((n) => distances.set(n.id, Infinity));
  distances.set(startId, 0);
  pq.set(startId, 0);

  let iterations = 0;
  while (pq.size > 0) {
    let currentNodeId = "";
    let minDist = Infinity;
    for (const [key, val] of pq.entries()) {
      if (val < minDist) {
        minDist = val;
        currentNodeId = key;
      }
    }
    pq.delete(currentNodeId);

    if (currentNodeId === endId) {
      console.log(`✅ گره مقصد پیدا شد (تکرار ${iterations})`);
      break;
    }
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);
    iterations++;

    const neighbors = adjacencyList.get(currentNodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        const newDist = distances.get(currentNodeId)! + neighbor.weight;
        if (newDist < distances.get(neighbor.nodeId)!) {
          distances.set(neighbor.nodeId, newDist);
          previous.set(neighbor.nodeId, currentNodeId);
          pq.set(neighbor.nodeId, newDist);
        }
      }
    }
  }

  // بازسازی مسیر
  const path: string[] = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    const prev = previous.get(current);
    if (prev === null || prev === undefined) break;
    current = prev;
  }

  if (path[0] !== startId) {
    console.warn("⚠️ مسیر پیدا نشد (هیچ مسیری بین گره‌ها وجود ندارد).");
    return { path: [], found: false, distance: 0 };
  }

  const nodeLookup = new Map(nodes.map((n) => [n.id, n.coords]));
  const pathCoords = path.map((id) => nodeLookup.get(id)).filter(Boolean);

  console.log(
    `✅ مسیر پیدا شد با ${pathCoords.length} نقطه، فاصله: ${distances.get(endId)}`,
  );
  return {
    path: pathCoords,
    found: true,
    distance: distances.get(endId) ?? 0,
  };
}
