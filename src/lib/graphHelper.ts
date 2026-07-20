import * as GeoJSON from 'geojson';
import { GraphNode, GraphEdge } from "@/types";

export const buildGraphFromGeoJSON = (geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry>) => {
  const rawNodes: GraphNode[] = [];
  const rawEdges: GraphEdge[] = [];
  const nodeMap = new Map<string, { x: number; y: number }>();

  if (!geojson.features) return { nodes: [], edges: [] };

  geojson.features.forEach((feature: GeoJSON.Feature) => {
    if (!feature.geometry) return;
    let coordinateLists: number[][][] = [];

    if (feature.geometry.type === "LineString") {
      coordinateLists.push(feature.geometry.coordinates as number[][]);
    } else if (feature.geometry.type === "MultiLineString") {
      coordinateLists = feature.geometry.coordinates as number[][][];
    }

    coordinateLists.forEach((coords) => {
      for (let i = 0; i < coords.length; i++) {
        const currentCoord = { x: coords[i][0], y: coords[i][1] };
        const currentKey = `${currentCoord.x},${currentCoord.y}`;

        if (!nodeMap.has(currentKey)) {
          nodeMap.set(currentKey, currentCoord);
          rawNodes.push({ id: currentKey, coords: currentCoord });
        }

        if (i < coords.length - 1) {
          const nextCoord = { x: coords[i + 1][0], y: coords[i + 1][1] };
          const nextKey = `${nextCoord.x},${nextCoord.y}`;

          if (!nodeMap.has(nextKey)) {
            nodeMap.set(nextKey, nextCoord);
            rawNodes.push({ id: nextKey, coords: nextCoord });
          }

          const weight = Math.hypot(nextCoord.x - currentCoord.x, nextCoord.y - currentCoord.y);
          rawEdges.push({ from: currentKey, to: nextKey, weight });
        }
      }
    });
  });

  // ------------------- افزایش آستانه ادغام گره‌ها (برای اطمینان کامل) -------------------
  const groupedNodes: GraphNode[][] = [];
  const MERGE_THRESHOLD = 100; // از ۲۰ به ۱۰۰ افزایش یافت!

  rawNodes.forEach(node => {
    let merged = false;
    for (const group of groupedNodes) {
      const refNode = group[0];
      const dist = Math.hypot(node.coords.x - refNode.coords.x, node.coords.y - refNode.coords.y);
      if (dist < MERGE_THRESHOLD) {
        group.push(node);
        merged = true;
        break;
      }
    }
    if (!merged) groupedNodes.push([node]);
  });

  const mergedNodes: GraphNode[] = [];
  const nodeIdMapping = new Map<string, string>();

  groupedNodes.forEach((group, index) => {
    const avgX = group.reduce((sum, n) => sum + n.coords.x, 0) / group.length;
    const avgY = group.reduce((sum, n) => sum + n.coords.y, 0) / group.length;
    const newId = `${avgX},${avgY}`;
    const newNode = { id: newId, coords: { x: avgX, y: avgY } };
    
    mergedNodes.push(newNode);
    group.forEach(n => nodeIdMapping.set(n.id, newId));
  });

  const updatedEdges = rawEdges
    .map(edge => {
      const fromId = nodeIdMapping.get(edge.from) || edge.from;
      const toId = nodeIdMapping.get(edge.to) || edge.to;
      return { from: fromId, to: toId, weight: edge.weight };
    })
    .filter(e => e.from !== e.to);

  return { nodes: mergedNodes, edges: updatedEdges };
};