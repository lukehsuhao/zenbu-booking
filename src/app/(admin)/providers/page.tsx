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
  lineUserId: string | null;
  avatarUrl: string | null;
  providerServices: { service: { name: string } }[];
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingAvatarId, setUploadingAvatarId] = useState<string | null>(null);

  async function handleAvatarUpload(providerId: string, file: File) {
    setUploadingAvatarId(providerId);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await fetch(`/api/admin/providers/${providerId}/avatar`, {
        method: "POST",
        body: formData,
      });
      await loadProviders();
    } catch (err) {
      console.error("Avatar upload failed", err);
    }
    setUploadingAvatarId(null);
  }

  async function loadProviders() {
    const res = await fetch("/api/admin/providers");
    setProviders(await res.json());
  }

  useEffect(() => { loadProviders(); }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">提供者管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理服務提供者與排班時段</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新增提供者
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <ProviderForm
            key={editing?.id || "new"}
            provider={editing || undefined}
            onSave={() => { setShowForm(false); loadProviders(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="space-y-4">
        {providers.map((p) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  {/* Avatar with upload */}
                  <label className="relative w-11 h-11 rounded-xl flex-shrink-0 cursor-pointer group">
                    <img src={p.avatarUrl || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(p.name)}`} alt={p.name} className="w-11 h-11 rounded-xl object-cover" />
                    <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {uploadingAvatarId === p.id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload(p.id, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div>
                    <h3 className="font-semibold text-[#1E293B]">{p.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{p.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.providerServices.length > 0 ? (
                        p.providerServices.map((ps, i) => (
                          <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-blue-50 text-xs font-medium text-[#2563EB]">
                            {ps.service.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">未設定服務</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* LINE connection status */}
                  {p.lineUserId && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06C755]/10 text-xs font-medium text-[#06C755]">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                      LINE
                    </span>
                  )}
                  {/* Google Calendar status */}
                  {p.calendarId ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-xs font-medium text-emerald-700">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Google 已連結
                    </span>
                  ) : (
                    <a
                      href={`/api/google/auth?providerId=${p.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                      </svg>
                      連結 Google
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (showForm && editing && editing.id !== p.id) {
                        const save = confirm("您正在編輯其他提供者，是否儲存當前的變更？");
                        if (save) {
                          // Trigger form submit by clicking the hidden submit button
                          const form = document.querySelector("form");
                          if (form) form.requestSubmit();
                          // Wait a bit then switch
                          setTimeout(() => { setEditing(p); setShowForm(true); }, 500);
                          return;
                        }
                      }
                      setEditing(p);
                      setShowForm(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    編輯
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      expandedId === p.id
                        ? "bg-[#2563EB] text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {expandedId === p.id ? "收起時段" : "設定時段"}
                  </button>
                </div>
              </div>
            </div>
            {expandedId === p.id && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-5 pb-5">
                <AvailabilityEditor providerId={p.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
