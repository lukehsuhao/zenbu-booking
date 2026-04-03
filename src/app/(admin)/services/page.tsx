"use client";

import { useEffect, useState } from "react";
import { ServiceForm } from "@/components/admin/service-form";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  isActive: boolean;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadServices() {
    const res = await fetch("/api/admin/services");
    setServices(await res.json());
  }

  useEffect(() => { loadServices(); }, []);

  async function toggleActive(service: Service) {
    await fetch("/api/admin/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...service, isActive: !service.isActive }),
    });
    loadServices();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">服務管理</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          新增服務
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <ServiceForm
            service={editing || undefined}
            onSave={() => { setShowForm(false); loadServices(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <table className="w-full bg-white rounded-lg shadow">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">名稱</th>
            <th className="px-4 py-3 text-left">時長</th>
            <th className="px-4 py-3 text-left">狀態</th>
            <th className="px-4 py-3 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="px-4 py-3">{s.name}</td>
              <td className="px-4 py-3">{s.duration} 分鐘</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs ${s.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                  {s.isActive ? "啟用" : "停用"}
                </span>
              </td>
              <td className="px-4 py-3 space-x-2">
                <button onClick={() => { setEditing(s); setShowForm(true); }} className="text-blue-600 hover:underline">編輯</button>
                <button onClick={() => toggleActive(s)} className="text-gray-600 hover:underline">
                  {s.isActive ? "停用" : "啟用"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
