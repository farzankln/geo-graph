import { GraphNode, GraphEdge } from "@/types";

export function findShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string,
) {
  // تبدیل آرایه یال‌ها به یک نقشه مجاورت (Adjacency List)
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

  // اجرای الگوریتم Dijkstra
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();
  const pq = new Map<string, number>(); // صف اولویت ساده

  nodes.forEach((n) => distances.set(n.id, Infinity));
  distances.set(startId, 0);
  pq.set(startId, 0);

  while (pq.size > 0) {
    // پیدا کردن گره با کمترین فاصله در صف اولویت
    let currentNodeId = "";
    let minDist = Infinity;
    for (const [key, val] of pq.entries()) {
      if (val < minDist) {
        minDist = val;
        currentNodeId = key;
      }
    }
    pq.delete(currentNodeId);

    if (currentNodeId === endId) break;
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

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

  // بازسازی مسیر (Path Reconstruction)
  const path: string[] = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    const prev = previous.get(current);
    if (prev === null || prev === undefined) break;
    current = prev;
  }

  if (path[0] !== startId) return { path: [], found: false, distance: 0 }; // مسیری پیدا نشد

  // تبدیل شناسه‌ها به مختصات برای فرانت‌اند
  const nodeLookup = new Map(nodes.map((n) => [n.id, n.coords]));
  const pathCoords = path.map((id) => nodeLookup.get(id)).filter(Boolean);

  return {
    path: pathCoords,
    found: true,
    distance: distances.get(endId),
  };
}
