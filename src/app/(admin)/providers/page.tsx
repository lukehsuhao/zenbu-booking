"use client";

import { useEffect, useState } from "react";
import { ProviderForm } from "@/components/admin/provider-form";
import { AvailabilityEditor } from "@/components/admin/availability-editor";

type Provider = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  calendarId: string | null;
  providerServices: { service: { name: string } }[];
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadProviders() {
    const res = await fetch("/api/admin/providers");
    setProviders(await res.json());
  }

  useEffect(() => { loadProviders(); }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">提供者管理</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          新增提供者
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <ProviderForm
            provider={editing || undefined}
            onSave={() => { setShowForm(false); loadProviders(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="space-y-4">
        {providers.map((p) => (
          <div key={p.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold">{p.name}</h3>
                <p className="text-sm text-gray-500">{p.email}</p>
                <p className="text-sm text-gray-500">
                  服務：{p.providerServices.map((ps) => ps.service.name).join("、") || "未設定"}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                {p.calendarId ? (
                  <span className="text-green-600 text-sm">Google 已連結</span>
                ) : (
                  <a href={`/api/google/auth?providerId=${p.id}`} className="text-blue-600 text-sm hover:underline">連結 Google</a>
                )}
                <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-blue-600 hover:underline text-sm">編輯</button>
                <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="text-gray-600 hover:underline text-sm">
                  {expandedId === p.id ? "收起時段" : "設定時段"}
                </button>
              </div>
            </div>
            {expandedId === p.id && <AvailabilityEditor providerId={p.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
