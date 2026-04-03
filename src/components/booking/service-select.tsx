"use client";

type Service = { id: string; name: string; description: string | null; duration: number };

export function ServiceSelect({ services, onSelect }: { services: Service[]; onSelect: (service: Service) => void }) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">選擇服務</h2>
      <div className="space-y-3">
        {services.map((s) => (
          <button key={s.id} onClick={() => onSelect(s)} className="w-full text-left bg-white rounded-lg shadow p-4 hover:ring-2 hover:ring-blue-500 transition">
            <h3 className="font-bold">{s.name}</h3>
            {s.description && <p className="text-sm text-gray-500 mt-1">{s.description}</p>}
            <p className="text-sm text-blue-600 mt-1">{s.duration} 分鐘</p>
          </button>
        ))}
      </div>
    </div>
  );
}
