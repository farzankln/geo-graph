"use client";
import { MapContainer, ImageOverlay, Polyline, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CRS, LatLngExpression, divIcon } from "leaflet";

interface MapProps {
  pathCoords: { x: number; y: number }[]; // تغییر تایپ به آرایه‌ای از اشیاء
  startCoords?: { x: number; y: number } | null;
  endCoords?: { x: number; y: number } | null;
}

const createCustomIcon = (text: string, color: string) => {
  return divIcon({
    html: `<div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white ${color} text-white font-bold text-xs shadow-lg">${text}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: "bg-transparent",
  });
};

export default function CustomMap({
  pathCoords,
  startCoords,
  endCoords,
}: MapProps) {
  const bounds: [[number, number], [number, number]] = [
    [-3700, -10],
    [100, 1620],
  ];

  // ✅ اصلاح مهم: به جای coord[0] و coord[1]، از coord.x و coord.y استفاده کنید
  const leafletCoords: LatLngExpression[] = (pathCoords || []).map((coord) => {
    return [coord.y ?? 0, coord.x ?? 0];
  });

  // دیباگ برای اطمینان از درست بودن مختصات
  if (typeof window !== "undefined" && leafletCoords.length > 0) {
    console.log("✅ اولین نقطه صحیح برای Leaflet:", leafletCoords[0]);
  }

  return (
    <MapContainer
      key="unique-map-key"
      center={[-1800, 800]}
      zoom={0}
      minZoom={-2}
      maxZoom={2}
      crs={CRS.Simple}
      style={{ height: "100%", width: "100%", borderRadius: "12px" }}
      attributionControl={false}
      zoomControl={false}
    >
      <ImageOverlay url="/test_map.png" bounds={bounds} />

      {/* مسیر قرمز ضخیم */}
      {leafletCoords.length > 1 && (
        <Polyline
          positions={leafletCoords}
          pathOptions={{ color: "#ff0000", weight: 8, opacity: 1 }}
        />
      )}

      {startCoords && (
        <Marker
          position={[startCoords.y, startCoords.x]}
          icon={createCustomIcon("A", "bg-green-600")}
        />
      )}

      {endCoords && (
        <Marker
          position={[endCoords.y, endCoords.x]}
          icon={createCustomIcon("B", "bg-red-600")}
        />
      )}
    </MapContainer>
  );
}
