"use client";

import { useState, useEffect } from "react";

type Provider = { id: string; name: string; email: string; isActive: boolean };
type Service = { id: string; name: string; duration: number };

export function ProviderForm({
  provider,
  onSave,
  onCancel,
}: {
  provider?: Provider;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(provider?.name || "");
  const [email, setEmail] = useState(provider?.email || "");
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/services").then((r) => r.json()).then(setAllServices);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = provider ? "PUT" : "POST";
    const body = { id: provider?.id, name, email };
    const res = await fetch("/api/admin/providers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const saved = await res.json();

    if (selectedServiceIds.length > 0) {
      await fetch(`/api/admin/providers/${saved.id}/services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds: selectedServiceIds }),
      });
    }

    onSave();
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">{provider ? "編輯提供者" : "新增提供者"}</h3>
      <label className="block mb-2 text-sm font-medium">姓名</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2 mb-4" required />
      <label className="block mb-2 text-sm font-medium">Email</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2 mb-4" required />
      <label className="block mb-2 text-sm font-medium">可提供的服務</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {allServices.map((s) => (
          <button key={s.id} type="button" onClick={() => toggleService(s.id)}
            className={`px-3 py-1 rounded border text-sm ${selectedServiceIds.includes(s.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700"}`}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">儲存</button>
        <button type="button" onClick={onCancel} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">取消</button>
      </div>
    </form>
  );
}
