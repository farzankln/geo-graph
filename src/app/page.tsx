"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const CustomMap = dynamic(() => import("@/components/CustomMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      بارگذاری نقشه...
    </div>
  ),
});

const LOCATIONS = [
  { id: "loc-a", name: "مکان رودی اصلی (A)", coords: { x: 439.5, y: -0.6 } },
  { id: "loc-b", name: "پیست مسابقه (B)", coords: { x: 1609, y: -570 } },
  { id: "loc-c", name: "مکان سرپرورده ای (C)", coords: { x: 143.5, y: -1123 } },
  { id: "loc-d", name: "پارکینگ جنوبی (D)", coords: { x: 1248.2, y: -3691 } },
  { id: "loc-e", name: "دیربازه فراخی (E)", coords: { x: 304, y: -2750 } },
];

export default function Home() {
  const [startCoords, setStartCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [endCoords, setEndCoords] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [pathCoords, setPathCoords] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStartId, setActiveStartId] = useState<string | null>(null);
  const [activeEndId, setActiveEndId] = useState<string | null>(null);

  // ✅ خط پاک‌کننده مسیر (setPathCoords([])) را حذف کردیم!
  const handleStartSelect = (id: string, coords: { x: number; y: number }) => {
    setStartCoords(coords);
    setActiveStartId(id);
  };

  const handleEndSelect = (id: string, coords: { x: number; y: number }) => {
    setEndCoords(coords);
    setActiveEndId(id);
  };

  const handleRouteCalc = async () => {
    if (!startCoords || !endCoords) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: startCoords, end: endCoords }),
      });

      if (!response.ok) throw new Error(`خطای سرور (کد ${response.status})`);

      const data = await response.json();

      if (!data.success) {
        alert("سرور مسیری پیدا نکرد: " + (data.error || "خطای نامشخص"));
        return;
      }

      if (data.pathCoordinates && data.pathCoordinates.length > 1) {
        setPathCoords(data.pathCoordinates);
        console.log("✅ مسیر جدید با موفقیت روی نقشه بارگذاری شد!");
      } else {
        alert("مسیر پیدا شد اما بسیار کوتاه یا ناقص است!");
      }
    } catch (error) {
      console.error("خطای ارتباطی:", error);
      alert("خطا در برقراری ارتباط با سرور.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6 flex flex-col md:flex-row gap-6">
      <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden relative h-[50vh] md:h-[85vh]">
        <CustomMap
          pathCoords={pathCoords}
          startCoords={startCoords}
          endCoords={endCoords}
        />
      </div>

      <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-green-600">🟢</span> مبدأ حرکت
          </h2>
          <div className="space-y-2">
            {LOCATIONS.map((loc) => (
              <button
                key={`start-${loc.id}`}
                onClick={() => handleStartSelect(loc.id, loc.coords)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between
                  ${activeStartId === loc.id ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-300 bg-gray-50"}`}
              >
                <span className="font-medium text-gray-700">{loc.name}</span>
                {activeStartId === loc.id && (
                  <span className="text-green-600 text-sm font-bold">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-red-600">🔴</span> مقصد
          </h2>
          <div className="space-y-2">
            {LOCATIONS.map((loc) => (
              <button
                key={`end-${loc.id}`}
                onClick={() => handleEndSelect(loc.id, loc.coords)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between
                  ${activeEndId === loc.id ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-red-300 bg-gray-50"}`}
              >
                <span className="font-medium text-gray-700">{loc.name}</span>
                {activeEndId === loc.id && (
                  <span className="text-red-600 text-sm font-bold">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRouteCalc}
          disabled={!startCoords || !endCoords || isLoading}
          className={`
            w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-sm
            ${
              !startCoords || !endCoords
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
            }
          `}
        >
          {isLoading ? "در حال محاسبه..." : "🚀 نمایش مسیر بهینه"}
        </button>
      </div>
    </main>
  );
}
