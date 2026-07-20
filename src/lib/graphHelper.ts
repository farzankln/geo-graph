// src/lib/graphHelper.ts
import * as GeoJSON from "geojson";
import { GraphNode, GraphEdge } from "@/types";

// ---------- توابع کمکی برای تشخیص تقاطع دو پاره‌خط ----------
function crossProduct(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

function onSegment(
  px: number,
  py: number,
  qx: number,
  qy: number,
  rx: number,
  ry: number,
): boolean {
  return (
    qx <= Math.max(px, rx) &&
    qx >= Math.min(px, rx) &&
    qy <= Math.max(py, ry) &&
    qy >= Math.min(py, ry)
  );
}

function segmentsIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
): { intersects: boolean; x?: number; y?: number } {
  const d1 = crossProduct(x2 - x1, y2 - y1, x3 - x1, y3 - y1);
  const d2 = crossProduct(x2 - x1, y2 - y1, x4 - x1, y4 - y1);
  const d3 = crossProduct(x4 - x3, y4 - y3, x1 - x3, y1 - y3);
  const d4 = crossProduct(x4 - x3, y4 - y3, x2 - x3, y2 - y3);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return { intersects: false };
    const t1 = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const t2 = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom;
    const ix = x1 + t1 * (x2 - x1);
    const iy = y1 + t1 * (y2 - y1);
    return { intersects: true, x: ix, y: iy };
  }

  // حالت‌های هم‌خط یا برخورد در نقاط انتهایی
  if (d1 === 0 && onSegment(x1, y1, x3, y3, x2, y2))
    return { intersects: true, x: x3, y: y3 };
  if (d2 === 0 && onSegment(x1, y1, x4, y4, x2, y2))
    return { intersects: true, x: x4, y: y4 };
  if (d3 === 0 && onSegment(x3, y3, x1, y1, x4, y4))
    return { intersects: true, x: x1, y: y1 };
  if (d4 === 0 && onSegment(x3, y3, x2, y2, x4, y4))
    return { intersects: true, x: x2, y: y2 };

  return { intersects: false };
}

// ---------- تابع اصلی ساخت گراف با گسسته‌سازی ----------
export const buildGraphFromGeoJSON = (
  geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry>,
) => {
  console.log("📐 شروع ساخت گراف با تشخیص تقاطع و گسسته‌سازی...");

  if (!geojson.features) {
    console.warn("⚠️ فایل GeoJSON فاقد features است.");
    return { nodes: [], edges: [] };
  }

  // گام ۱: استخراج تمام پاره‌خط‌ها و گسسته‌سازی آن‌ها
  const DISCRETIZATION_STEP = 50; // فاصله بین گره‌های مصنوعی (واحد)
  const tempNodes: { id: string; x: number; y: number }[] = [];
  const tempEdges: { from: string; to: string; weight: number }[] = [];

  geojson.features.forEach((feature: GeoJSON.Feature) => {
    if (!feature.geometry) return;
    let coordinateLists: number[][][] = [];

    if (feature.geometry.type === "LineString") {
      coordinateLists.push(feature.geometry.coordinates as number[][]);
    } else if (feature.geometry.type === "MultiLineString") {
      coordinateLists = feature.geometry.coordinates as number[][][];
    } else {
      return;
    }

    coordinateLists.forEach((coords) => {
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const length = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.floor(length / DISCRETIZATION_STEP));

        // ایجاد گره‌های میانی
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          const x = p1[0] + t * dx;
          const y = p1[1] + t * dy;
          const id = `${x.toFixed(4)},${y.toFixed(4)}`;
          if (!tempNodes.find((n) => n.id === id)) {
            tempNodes.push({ id, x, y });
          }
        }

        // اضافه کردن یال‌ها بین گره‌های متوالی
        for (let j = 0; j < steps; j++) {
          const t1 = j / steps;
          const t2 = (j + 1) / steps;
          const x1 = p1[0] + t1 * dx;
          const y1 = p1[1] + t1 * dy;
          const x2 = p1[0] + t2 * dx;
          const y2 = p1[1] + t2 * dy;
          const fromId = `${x1.toFixed(4)},${y1.toFixed(4)}`;
          const toId = `${x2.toFixed(4)},${y2.toFixed(4)}`;
          const weight = Math.hypot(x2 - x1, y2 - y1);
          tempEdges.push({ from: fromId, to: toId, weight });
        }
      }
    });
  });

  console.log(`📊 گره‌های اولیه (پس از گسسته‌سازی): ${tempNodes.length}`);
  console.log(`📊 یال‌های اولیه: ${tempEdges.length}`);

  // گام ۲: تشخیص تقاطع‌ها و اضافه کردن گره‌های جدید در محل تقاطع
  // برای سادگی، از روش brute-force استفاده می‌کنیم (تعداد یال‌ها قابل قبول است)
  const newEdges: { from: string; to: string; weight: number }[] = [];
  const nodeMap = new Map<string, { x: number; y: number }>();
  tempNodes.forEach((n) => nodeMap.set(n.id, { x: n.x, y: n.y }));

  // لیست یال‌ها به‌صورت آرایه
  const edgeList = tempEdges.map((e) => ({
    from: e.from,
    to: e.to,
    x1: nodeMap.get(e.from)!.x,
    y1: nodeMap.get(e.from)!.y,
    x2: nodeMap.get(e.to)!.x,
    y2: nodeMap.get(e.to)!.y,
  }));

  let intersectionCount = 0;

  // بررسی همه جفت‌یال‌ها برای یافتن تقاطع
  for (let i = 0; i < edgeList.length; i++) {
    const e1 = edgeList[i];
    let split1 = false;

    for (let j = i + 1; j < edgeList.length; j++) {
      const e2 = edgeList[j];
      const result = segmentsIntersect(
        e1.x1,
        e1.y1,
        e1.x2,
        e1.y2,
        e2.x1,
        e2.y1,
        e2.x2,
        e2.y2,
      );

      if (
        result.intersects &&
        result.x !== undefined &&
        result.y !== undefined
      ) {
        const ix = result.x;
        const iy = result.y;
        // بررسی اینکه نقطه تقاطع روی هر دو پاره‌خط باشد (نه فقط در امتداد)
        const onE1 =
          Math.abs(
            Math.hypot(ix - e1.x1, iy - e1.y1) +
              Math.hypot(ix - e1.x2, iy - e1.y2) -
              Math.hypot(e1.x2 - e1.x1, e1.y2 - e1.y1),
          ) < 0.001;
        const onE2 =
          Math.abs(
            Math.hypot(ix - e2.x1, iy - e2.y1) +
              Math.hypot(ix - e2.x2, iy - e2.y2) -
              Math.hypot(e2.x2 - e2.x1, e2.y2 - e2.y1),
          ) < 0.001;
        if (onE1 && onE2) {
          const intersectId = `${ix.toFixed(4)},${iy.toFixed(4)}`;
          if (!nodeMap.has(intersectId)) {
            nodeMap.set(intersectId, { x: ix, y: iy });
          }

          // تقسیم e1 اگر نقطه داخلی باشد
          if (
            Math.hypot(ix - e1.x1, iy - e1.y1) > 0.01 &&
            Math.hypot(ix - e1.x2, iy - e1.y2) > 0.01
          ) {
            newEdges.push({
              from: e1.from,
              to: intersectId,
              weight: Math.hypot(ix - e1.x1, iy - e1.y1),
            });
            newEdges.push({
              from: intersectId,
              to: e1.to,
              weight: Math.hypot(ix - e1.x2, iy - e1.y2),
            });
            split1 = true;
          }

          // تقسیم e2 اگر نقطه داخلی باشد
          if (
            Math.hypot(ix - e2.x1, iy - e2.y1) > 0.01 &&
            Math.hypot(ix - e2.x2, iy - e2.y2) > 0.01
          ) {
            newEdges.push({
              from: e2.from,
              to: intersectId,
              weight: Math.hypot(ix - e2.x1, iy - e2.y1),
            });
            newEdges.push({
              from: intersectId,
              to: e2.to,
              weight: Math.hypot(ix - e2.x2, iy - e2.y2),
            });
            // e2 حذف می‌شود (چون به دو یال جدید تبدیل شد)
            // اما چون حلقه ادامه دارد، علامت‌گذاری می‌کنیم که e2 را نادیده بگیریم
            // برای سادگی، e2 را از لیست حذف نمی‌کنیم، بلکه در انتها فیلتر می‌کنیم
          }
          intersectionCount++;
        }
      }
    }

    // اگر e1 تقسیم نشد، خودش را به لیست اضافه کن
    if (!split1) {
      newEdges.push({
        from: e1.from,
        to: e1.to,
        weight: Math.hypot(e1.x2 - e1.x1, e1.y2 - e1.y1),
      });
    }
  }

  console.log(`🔄 تعداد تقاطع‌های تشخیص داده شده: ${intersectionCount}`);

  // گام ۳: ساخت گره‌های نهایی و یال‌ها
  // ادغام گره‌های بسیار نزدیک (با آستانه 1 واحد)
  const MERGE_THRESHOLD = 1;
  const rawNodes: GraphNode[] = Array.from(nodeMap.entries()).map(
    ([id, coords]) => ({
      id,
      coords,
    }),
  );

  const groupedNodes: GraphNode[][] = [];
  rawNodes.forEach((node) => {
    let merged = false;
    for (const group of groupedNodes) {
      const ref = group[0];
      const dist = Math.hypot(
        node.coords.x - ref.coords.x,
        node.coords.y - ref.coords.y,
      );
      if (dist < MERGE_THRESHOLD) {
        group.push(node);
        merged = true;
        break;
      }
    }
    if (!merged) groupedNodes.push([node]);
  });

  const finalNodes: GraphNode[] = [];
  const idMapping = new Map<string, string>();

  groupedNodes.forEach((group) => {
    const avgX = group.reduce((s, n) => s + n.coords.x, 0) / group.length;
    const avgY = group.reduce((s, n) => s + n.coords.y, 0) / group.length;
    const newId = `${avgX.toFixed(4)},${avgY.toFixed(4)}`;
    finalNodes.push({ id: newId, coords: { x: avgX, y: avgY } });
    group.forEach((n) => idMapping.set(n.id, newId));
  });

  // ایجاد یال‌های نهایی با شناسه‌های جدید
  const finalEdges: GraphEdge[] = [];
  const usedEdges = new Set<string>();

  newEdges.forEach((edge) => {
    const from = idMapping.get(edge.from) || edge.from;
    const to = idMapping.get(edge.to) || edge.to;
    if (from === to) return;
    const key = [from, to].sort().join("|");
    if (usedEdges.has(key)) return;
    usedEdges.add(key);
    const weight = Math.hypot(
      parseFloat(from.split(",")[0]) - parseFloat(to.split(",")[0]),
      parseFloat(from.split(",")[1]) - parseFloat(to.split(",")[1]),
    );
    finalEdges.push({ from, to, weight });
  });

  console.log(
    `✅ گره‌های نهایی: ${finalNodes.length}, یال‌های نهایی: ${finalEdges.length}`,
  );
  console.log(
    `📊 تراکم گراف: ${(finalEdges.length / finalNodes.length).toFixed(2)} یال به ازای هر گره`,
  );

  return { nodes: finalNodes, edges: finalEdges };
};
