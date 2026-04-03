"use client";

import { useState } from "react";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  isActive: boolean;
};

export function ServiceForm({
  service,
  onSave,
  onCancel,
}: {
  service?: Service;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [duration, setDuration] = useState(service?.duration || 30);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = service ? "PUT" : "POST";
    const body = { id: service?.id, name, description, duration };
    await fetch("/api/admin/services", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">{service ? "編輯服務" : "新增服務"}</h3>
      <label className="block mb-2 text-sm font-medium">服務名稱</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2 mb-4" required />
      <label className="block mb-2 text-sm font-medium">說明</label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2 mb-4" />
      <label className="block mb-2 text-sm font-medium">時長（分鐘）</label>
      <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full border rounded px-3 py-2 mb-4" min={15} step={15} required />
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">儲存</button>
        <button type="button" onClick={onCancel} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">取消</button>
      </div>
    </form>
  );
}
