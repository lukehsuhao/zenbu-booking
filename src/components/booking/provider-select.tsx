"use client";

type Provider = { id: string; name: string };

export function ProviderSelect({ providers, onSelect }: { providers: Provider[]; onSelect: (provider: Provider | null) => void }) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">選擇提供者</h2>
      <div className="space-y-3">
        {providers.map((p) => (
          <button key={p.id} onClick={() => onSelect(p)} className="w-full text-left bg-white rounded-lg shadow p-4 hover:ring-2 hover:ring-blue-500 transition">
            <h3 className="font-bold">{p.name}</h3>
          </button>
        ))}
        {providers.length > 1 && (
          <button onClick={() => onSelect(null)} className="w-full text-left bg-blue-50 rounded-lg shadow p-4 hover:ring-2 hover:ring-blue-500 transition">
            <h3 className="font-bold text-blue-600">不指定，幫我選最快</h3>
          </button>
        )}
      </div>
    </div>
  );
}
