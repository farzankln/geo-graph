"use client";
import { MapContainer, ImageOverlay, Polyline, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CRS, LatLngExpression, divIcon } from "leaflet";
import { useEffect, useState } from "react";

interface MapProps {
  pathCoords: { x: number; y: number }[];
  startCoords?: { x: number; y: number } | null;
  endCoords?: { x: number; y: number } | null;
  imageUrl: string; // مسیر تصویر (مثلاً "/city_map.png")
}

const createCustomIcon = (text: string, color: string) => {
  return divIcon({
    html: `<div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white ${color} text-white font-bold text-xs shadow-lg">${text}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: "bg-transparent",
  });
};

// تبدیل مختصات: در CRS.Simple، lat = -y و lng = x
function geoJsonToLeaflet(x: number, y: number): [number, number] {
  return [-y, x];
}

export default function CustomMap({
  pathCoords,
  startCoords,
  endCoords,
  imageUrl,
}: MapProps) {
  // State برای ذخیره ابعاد تصویر
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    // بارگذاری تصویر برای دریافت ابعاد
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // اگر ابعاد هنوز دریافت نشده، یک placeholder نمایش بده
  if (!imageSize) {
    return (
      <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
        در حال بارگذاری نقشه...
      </div>
    );
  }

  const { width, height } = imageSize;

  // محدوده تصویر: گوشه بالا-چپ (0,0) و گوشه پایین-راست (height, width)
  const bounds: [[number, number], [number, number]] = [
    [0, 0],
    [height, width],
  ];

  // مرکز تصویر
  const center: [number, number] = [height / 2, width / 2];

  // تبدیل نقاط مسیر
  const leafletCoords: LatLngExpression[] = (pathCoords || []).map((coord) =>
    geoJsonToLeaflet(coord.x, coord.y),
  );

  const startPos = startCoords
    ? geoJsonToLeaflet(startCoords.x, startCoords.y)
    : null;
  const endPos = endCoords ? geoJsonToLeaflet(endCoords.x, endCoords.y) : null;

  if (typeof window !== "undefined" && leafletCoords.length > 0) {
    console.log("✅ اولین نقطه Leaflet:", leafletCoords[0]);
  }

  return (
    <MapContainer
      key="unique-map-key"
      center={center}
      zoom={-1} // نمایش کامل تصویر
      minZoom={-2}
      maxZoom={2}
      crs={CRS.Simple}
      style={{ height: "100%", width: "100%", borderRadius: "12px" }}
      attributionControl={false}
      zoomControl={false}
    >
      <ImageOverlay url={imageUrl} bounds={bounds} />

      {leafletCoords.length > 1 && (
        <Polyline
          positions={leafletCoords}
          pathOptions={{ color: "#ff0000", weight: 8, opacity: 1 }}
        />
      )}

      {startPos && (
        <Marker
          position={startPos}
          icon={createCustomIcon("A", "bg-green-600")}
        />
      )}

      {endPos && (
        <Marker position={endPos} icon={createCustomIcon("B", "bg-red-600")} />
      )}
    </MapContainer>
  );
}
