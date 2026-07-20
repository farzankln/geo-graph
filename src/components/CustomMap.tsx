"use client";
import { MapContainer, ImageOverlay, Polyline, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CRS, LatLngExpression, divIcon } from "leaflet";
import { useEffect, useState } from "react";

// محدوده‌ی واقعی مختصات (از GeoJSON)
const GEO_BOUNDS = {
  minX: 0,
  maxX: 3087,
  minY: -2174,
  maxY: 0,
};

interface MapProps {
  pathCoords: { x: number; y: number }[];
  startCoords?: { x: number; y: number } | null;
  endCoords?: { x: number; y: number } | null;
  imageUrl: string;
  geojsonData?: any;
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
  imageUrl,
  geojsonData,
}: MapProps) {
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  if (!imageSize) {
    return (
      <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
        در حال بارگذاری نقشه...
      </div>
    );
  }

  const { width, height } = imageSize;
  const bounds: [[number, number], [number, number]] = [
    [0, 0],
    [height, width],
  ];

  const toPixel = (x: number, y: number) => {
    const { minX, maxX, minY, maxY } = GEO_BOUNDS;
    return {
      x: ((x - minX) / (maxX - minX)) * width,
      y: ((y - minY) / (maxY - minY)) * height,
    };
  };

  const toLeafletCoords = (x: number, y: number): [number, number] => {
    const { x: px, y: py } = toPixel(x, y);
    return [py, px];
  };

  const leafletCoords: LatLngExpression[] = (pathCoords || []).map((coord) =>
    toLeafletCoords(coord.x, coord.y),
  );

  const allRoadsPolylines: LatLngExpression[][] = [];
  if (geojsonData?.features) {
    geojsonData.features.forEach((feature: any) => {
      if (feature.geometry?.type === "MultiLineString") {
        feature.geometry.coordinates.forEach((line: number[][]) => {
          const points = line.map((coord: number[]) =>
            toLeafletCoords(coord[0], coord[1]),
          );
          allRoadsPolylines.push(points);
        });
      }
    });
  }

  const startPos = startCoords
    ? toLeafletCoords(startCoords.x, startCoords.y)
    : null;
  const endPos = endCoords ? toLeafletCoords(endCoords.x, endCoords.y) : null;

  return (
    <>
      {/* استایل سراسری برای انیمیشن خط‌چین */}
      <style>{`
        .animated-dash {
          stroke-dasharray: 12 12;
          animation: dash 1.2s linear infinite;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -24;
          }
        }
      `}</style>

      <MapContainer
        bounds={bounds}
        crs={CRS.Simple}
        style={{ height: "100%", width: "100%", borderRadius: "12px" }}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        zoomControl={true}
        attributionControl={false}
        minZoom={-4}
        maxZoom={3}
        zoomSnap={0.25}
        zoomDelta={0.5}
      >
        <ImageOverlay url={imageUrl} bounds={bounds} />

        {/* خطوط خیابان‌ها (آبی) */}
        {allRoadsPolylines.map((linePoints, index) => (
          <Polyline
            key={`road-${index}`}
            positions={linePoints}
            pathOptions={{
              color: "#3b82f6",
              weight: 3,
              opacity: 0.6,
              lineJoin: "round",
            }}
          />
        ))}

        {/* مسیر قرمز متحرک (خط‌چین با انیمیشن) */}
        {leafletCoords.length > 1 && (
          <Polyline
            positions={leafletCoords}
            pathOptions={{
              color: "#ff0000",
              weight: 8,
              opacity: 1,
              className: "animated-dash", // کلاس انیمیشن
            }}
          />
        )}

        {/* نشانگرها */}
        {startPos && (
          <Marker
            position={startPos}
            icon={createCustomIcon("A", "bg-green-600")}
          />
        )}
        {endPos && (
          <Marker
            position={endPos}
            icon={createCustomIcon("B", "bg-red-600")}
          />
        )}
      </MapContainer>
    </>
  );
}
