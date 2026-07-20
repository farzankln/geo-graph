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
  { id: "loc-1", name: "خانه", coords: { x: 1544, y: -1100 } },
  { id: "loc-2", name: "بیمارستان", coords: { x: 1164, y: -200 } },
  { id: "loc-3", name: "فروشگاه ابزارآلات", coords: { x: 2303, y: -800 } },
  { id: "loc-4", name: "کتابخانه عمومی", coords: { x: 409, y: -1000 } },
  { id: "loc-5", name: "فروشگاه لباس", coords: { x: 2303, y: -1600 } },
  { id: "loc-6", name: "کلیسا", coords: { x: 409, y: -200 } },
  { id: "loc-7", name: "میوه و تره بار", coords: { x: 1544, y: -1800 } },
  { id: "loc-8", name: "شهرداری", coords: { x: 1018, y: -600 } },
  { id: "loc-9", name: "دانشگاه", coords: { x: 2303, y: -200 } },
  { id: "loc-10", name: "داروخانه ۱", coords: { x: 409, y: -1600 } },
  { id: "loc-11", name: "کافه", coords: { x: 1544, y: -900 } },
  { id: "loc-12", name: "لوازم التحریر", coords: { x: 409, y: -1400 } },
  { id: "loc-13", name: "آلاچیق", coords: { x: 1544, y: -1400 } },
  { id: "loc-14", name: "پارک", coords: { x: 2303, y: -1000 } },
  { id: "loc-15", name: "سوپر مارکت", coords: { x: 2303, y: -1200 } },
  { id: "loc-16", name: "بانک", coords: { x: 1544, y: -600 } },
  { id: "loc-17", name: "داروخانه ۲", coords: { x: 2303, y: -600 } },
  { id: "loc-18", name: "کلانتری", coords: { x: 409, y: -800 } },
];

export default function Home() {
  const [startCoords, setStartCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [endCoords, setEndCoords] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [pathCoords, setPathCoords] = useState<{ x: number; y: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStartId, setActiveStartId] = useState<string | null>(null);
  const [activeEndId, setActiveEndId] = useState<string | null>(null);

  const handleStartSelect = (id: string, coords: { x: number; y: number }) => {
    console.log(`📍 مبدأ انتخاب شد: ${id}`, coords);
    setStartCoords(coords);
    setActiveStartId(id);
  };

  const handleEndSelect = (id: string, coords: { x: number; y: number }) => {
    console.log(`📍 مقصد انتخاب شد: ${id}`, coords);
    setEndCoords(coords);
    setActiveEndId(id);
  };

  const handleRouteCalc = async () => {
    if (!startCoords || !endCoords) {
      const msg = "لطفاً هر دو نقطه مبدأ و مقصد را انتخاب کنید.";
      alert(msg);
      console.warn("⚠️ ", msg);
      return;
    }

    setIsLoading(true);
    console.log("🚀 درخواست مسیر ارسال شد:", {
      start: startCoords,
      end: endCoords,
    });

    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: startCoords, end: endCoords }),
      });

      console.log(`📡 وضعیت پاسخ: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ خطای سرور (کد ${response.status}):`, errorText);
        alert(`خطای سرور (کد ${response.status}). لطفاً مجدداً تلاش کنید.`);
        return;
      }

      const data = await response.json();
      console.log("📦 داده دریافت شده از سرور:", data);

      if (!data.success) {
        const errorMsg = data.error || "خطای نامشخص در محاسبه مسیر";
        console.error("❌ خطای منطقی از سمت سرور:", errorMsg, data.debug || "");
        alert(`❌ ${errorMsg}`);
        return;
      }

      if (data.pathCoordinates && data.pathCoordinates.length > 1) {
        setPathCoords(data.pathCoordinates);
        console.log(
          `✅ مسیر با موفقیت پیدا شد. تعداد نقاط: ${data.pathCoordinates.length}`,
        );
        console.log(`📏 فاصله تقریبی: ${data.distance} واحد`);
        alert(`✅ مسیر پیدا شد! (فاصله: ${data.distance} واحد)`);
      } else {
        const msg = "مسیر پیدا شد اما بسیار کوتاه یا ناقص است!";
        console.warn("⚠️ ", msg, data);
        alert(msg);
      }
    } catch (error) {
      console.error("❌ خطای ارتباطی یا خطای غیرمنتظره:", error);
      alert(
        "خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت را بررسی کنید.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6 flex flex-col md:flex-row gap-6">
      <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden relative">
        <CustomMap
          pathCoords={pathCoords}
          startCoords={startCoords}
          endCoords={endCoords}
          imageUrl="/city_map.svg" // یا "/city_map.svg"
        />
      </div>
      <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-green-600">🟢</span> مبدأ حرکت
          </h2>
          <div className="space-y-2 max-h-60 overflow-y-auto">
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
          <div className="space-y-2 max-h-60 overflow-y-auto">
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
