"use client";
interface Props {
  locations: { id: string; name: string; coords: { x: number; y: number } }[];
  onSelect: (coords: { x: number; y: number }) => void;
  activeId: string | null;
}

export default function LocationList({ locations, onSelect, activeId }: Props) {
  return (
    <div className="space-y-3 mt-4">
      {locations.map((loc) => (
        <button
          key={loc.id}
          onClick={() => onSelect(loc.coords)}
          className={`w-full text-left p-4 rounded-xl border-2 transition-all shadow-sm flex items-center justify-between
            ${activeId === loc.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300 bg-white"}`}
        >
          <span className="font-bold text-gray-800">{loc.name}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            انتخاب مسیر
          </span>
        </button>
      ))}
    </div>
  );
}
