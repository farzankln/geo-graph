import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { buildGraphFromGeoJSON } from "@/lib/graphHelper";
import { findShortestPath } from "@/lib/dijkstra";
import { Coordinate } from "@/types";

export async function POST(req: Request) {
  try {
    const filePath = path.join(process.cwd(), "public", "testMapData.geojson");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const geoJSONData = JSON.parse(fileContent);

    const { nodes, edges } = buildGraphFromGeoJSON(geoJSONData);
    const body = await req.json();
    const startCoords: Coordinate = body.start;
    const endCoords: Coordinate = body.end;

    if (nodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: "فایل مسیرها خالی است!",
      });
    }

    const findClosestNode = (coords: Coordinate) => {
      let minDist = Infinity;
      let closestNodeId = "";
      nodes.forEach((node) => {
        const dist = Math.hypot(
          node.coords.x - coords.x,
          node.coords.y - coords.y,
        );
        if (dist < minDist) {
          minDist = dist;
          closestNodeId = node.id;
        }
      });
      return { id: closestNodeId, dist: minDist };
    };

    const startNodeResult = findClosestNode(startCoords);
    const endNodeResult = findClosestNode(endCoords);

    if (startNodeResult.dist > 50 || endNodeResult.dist > 50) {
      return NextResponse.json({
        success: false,
        error:
          "مبدأ یا مقصد از شبکه مسیرها فاصله زیادی دارد. مختصات را دقیق‌تر کنید.",
        debug: { startNodeResult, endNodeResult },
      });
    }

    const result = findShortestPath(
      nodes,
      edges,
      startNodeResult.id,
      endNodeResult.id,
    );

    if (!result.found) {
      return NextResponse.json({
        success: false,
        error:
          "متاسفانه گره‌های شروع و پایان در یک جزیره جداگانه هستند! (مسیر قطع است)",
        debug: {
          startNodeId: startNodeResult.id,
          endNodeId: endNodeResult.id,
          totalNodes: nodes.length,
          totalEdges: edges.length,
          // ۱۰ گره اول را برای بررسی ساختار گراف برمی‌گردانیم
          firstFewNodes: nodes.slice(0, 5),
        },
      });
    }

    return NextResponse.json({
      success: true,
      pathCoordinates: result.path,
      distance: Math.round(result.distance),
    });
  } catch (error) {
    console.error("خطای سرور:", error);
    return NextResponse.json(
      { success: false, error: "خطای داخلی سرور" },
      { status: 500 },
    );
  }
}
