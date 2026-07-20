import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { buildGraphFromGeoJSON } from "@/lib/graphHelper";
import { findShortestPath } from "@/lib/dijkstra";
import { Coordinate, GraphNode, GraphEdge } from "@/types";

// ---------- تابع پیدا کردن نزدیک‌ترین نقطه روی یال‌ها ----------
function findClosestPointOnEdges(
  point: Coordinate,
  nodes: GraphNode[],
  edges: GraphEdge[],
): {
  nodeId: string;
  distance: number;
  newNode?: GraphNode;
  newEdges?: GraphEdge[];
} {
  let minDist = Infinity;
  let bestEdge: GraphEdge | null = null;
  let bestProjection: { x: number; y: number } | null = null;
  let bestFromNode: GraphNode | null = null;
  let bestToNode: GraphNode | null = null;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const edge of edges) {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) continue;

    const dx = to.coords.x - from.coords.x;
    const dy = to.coords.y - from.coords.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;

    // پارامتر t برای پروجکشن
    let t =
      ((point.x - from.coords.x) * dx + (point.y - from.coords.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const projX = from.coords.x + t * dx;
    const projY = from.coords.y + t * dy;
    const dist = Math.hypot(point.x - projX, point.y - projY);

    if (dist < minDist) {
      minDist = dist;
      bestEdge = edge;
      bestProjection = { x: projX, y: projY };
      bestFromNode = from;
      bestToNode = to;
    }
  }

  if (!bestEdge || !bestProjection || !bestFromNode || !bestToNode) {
    return { nodeId: "", distance: Infinity };
  }

  // فاصله از نقطه شروع یال
  const distFromStart = Math.hypot(
    bestProjection.x - bestFromNode.coords.x,
    bestProjection.y - bestFromNode.coords.y,
  );
  const edgeLength = Math.hypot(
    bestToNode.coords.x - bestFromNode.coords.x,
    bestToNode.coords.y - bestFromNode.coords.y,
  );

  // اگر پروجکشن خیلی نزدیک به یکی از گره‌های انتهایی است، از همان گره استفاده کن
  if (distFromStart < 0.01 || edgeLength - distFromStart < 0.01) {
    const nearNodeId = distFromStart < 0.01 ? bestFromNode.id : bestToNode.id;
    return { nodeId: nearNodeId, distance: 0 };
  }

  // ایجاد گره جدید در نقطه پروجکشن
  const newNodeId = `proj_${bestProjection.x.toFixed(4)},${bestProjection.y.toFixed(4)}`;
  const newNode: GraphNode = { id: newNodeId, coords: bestProjection };
  const newEdge1: GraphEdge = {
    from: bestFromNode.id,
    to: newNodeId,
    weight: distFromStart,
  };
  const newEdge2: GraphEdge = {
    from: newNodeId,
    to: bestToNode.id,
    weight: edgeLength - distFromStart,
  };

  return {
    nodeId: newNodeId,
    distance: 0,
    newNode,
    newEdges: [newEdge1, newEdge2],
  };
}

// ---------- تابع اصلی POST ----------
export async function POST(req: Request) {
  console.log("📨 درخواست مسیر جدید دریافت شد.");

  try {
    // خواندن فایل GeoJSON
    const filePath = path.join(
      process.cwd(),
      "public",
      "city_map_data.geojson",
    );
    console.log(`📂 فایل GeoJSON: ${filePath}`);

    let fileContent: string;
    try {
      fileContent = fs.readFileSync(filePath, "utf-8");
    } catch (fileError) {
      console.error("❌ خطا در خواندن فایل GeoJSON:", fileError);
      return NextResponse.json(
        {
          success: false,
          error: "فایل نقشه روی سرور موجود نیست یا قابل خواندن نیست.",
        },
        { status: 500 },
      );
    }

    let geoJSONData;
    try {
      geoJSONData = JSON.parse(fileContent);
      console.log("✅ GeoJSON با موفقیت parse شد.");
    } catch (parseError) {
      console.error("❌ خطا در Parse کردن GeoJSON:", parseError);
      return NextResponse.json(
        {
          success: false,
          error: "فرمت فایل نقشه نامعتبر است (JSON معتبر نیست).",
        },
        { status: 500 },
      );
    }

    // ساخت گراف با تشخیص تقاطع (از graphHelper جدید)
    console.log("🔧 شروع ساخت گراف از GeoJSON...");
    const { nodes, edges } = buildGraphFromGeoJSON(geoJSONData);
    console.log(`📊 گراف ساخته شد: ${nodes.length} گره، ${edges.length} یال`);

    if (nodes.length === 0) {
      console.error("❌ گراف خالی است!");
      return NextResponse.json({
        success: false,
        error: "فایل مسیرها خالی است یا هیچ گره‌ای ندارد!",
      });
    }

    // دریافت مختصات از بدنه درخواست
    let body;
    try {
      body = await req.json();
      console.log("📥 بدنه درخواست:", body);
    } catch (jsonError) {
      console.error("❌ خطا در خواندن بدنه درخواست (JSON نامعتبر):", jsonError);
      return NextResponse.json(
        {
          success: false,
          error: "بدنه درخواست باید JSON معتبر باشد.",
        },
        { status: 400 },
      );
    }

    const startCoords: Coordinate = body.start;
    const endCoords: Coordinate = body.end;

    if (
      !startCoords ||
      !endCoords ||
      typeof startCoords.x !== "number" ||
      typeof startCoords.y !== "number" ||
      typeof endCoords.x !== "number" ||
      typeof endCoords.y !== "number"
    ) {
      console.error("❌ مختصات نامعتبر:", { startCoords, endCoords });
      return NextResponse.json(
        {
          success: false,
          error: "مختصات مبدأ یا مقصد نامعتبر است (اعداد مورد نیازند).",
        },
        { status: 400 },
      );
    }

    // ---------- اتصال مبدأ و مقصد به شبکه (پروجکشن روی یال‌ها) ----------
    let updatedNodes = [...nodes];
    let updatedEdges = [...edges];

    const processPoint = (coords: Coordinate, label: string): string | null => {
      const result = findClosestPointOnEdges(
        coords,
        updatedNodes,
        updatedEdges,
      );
      if (result.newNode && result.newEdges) {
        // اضافه کردن گره جدید
        updatedNodes.push(result.newNode);
        // پیدا کردن یال قدیمی و حذف آن
        const oldEdgeIndex = updatedEdges.findIndex(
          (e) =>
            (e.from === result.newEdges![0].from &&
              e.to === result.newEdges![1].to) ||
            (e.from === result.newEdges![1].to &&
              e.to === result.newEdges![0].from),
        );
        if (oldEdgeIndex !== -1) {
          updatedEdges.splice(oldEdgeIndex, 1);
        }
        // اضافه کردن دو یال جدید
        updatedEdges.push(result.newEdges[0]);
        updatedEdges.push(result.newEdges[1]);
        console.log(`✅ گره جدید برای ${label} ایجاد شد: ${result.nodeId}`);
        return result.nodeId;
      } else if (result.nodeId) {
        // نزدیک به گره موجود
        console.log(`✅ گره موجود برای ${label}: ${result.nodeId}`);
        return result.nodeId;
      }
      console.error(`❌ برای ${label} هیچ یالی پیدا نشد.`);
      return null;
    };

    const startNodeId = processPoint(startCoords, "مبدأ");
    const endNodeId = processPoint(endCoords, "مقصد");

    if (!startNodeId || !endNodeId) {
      return NextResponse.json({
        success: false,
        error: "نزدیک‌ترین نقطه روی مسیر برای مبدأ یا مقصد یافت نشد.",
      });
    }

    console.log(`🔍 گره شروع: ${startNodeId}, گره پایان: ${endNodeId}`);

    // اجرای دیکسترا روی گراف به‌روز شده
    console.log(`🚀 شروع الگوریتم دیکسترا از ${startNodeId} به ${endNodeId}`);
    const result = findShortestPath(
      updatedNodes,
      updatedEdges,
      startNodeId,
      endNodeId,
    );

    if (!result.found) {
      console.warn("⚠️ مسیر بین گره‌ها پیدا نشد (جزیره جداگانه).");
      return NextResponse.json({
        success: false,
        error:
          "متاسفانه گره‌های شروع و پایان در یک جزیره جداگانه هستند! (مسیر قطع است)",
        debug: {
          startNodeId,
          endNodeId,
          totalNodes: updatedNodes.length,
          totalEdges: updatedEdges.length,
          sampleNodes: updatedNodes.slice(0, 5).map((n) => ({
            id: n.id,
            coords: n.coords,
          })),
        },
      });
    }

    console.log(
      `✅ مسیر با موفقیت پیدا شد. فاصله: ${result.distance} واحد، تعداد نقاط: ${result.path.length}`,
    );
    return NextResponse.json({
      success: true,
      pathCoordinates: result.path,
      distance: Math.round(result.distance),
    });
  } catch (error) {
    console.error("❌ خطای کلی در سرور (unhandled):", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطای داخلی سرور. لطفاً با پشتیبانی تماس بگیرید.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
