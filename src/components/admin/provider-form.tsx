"use client";

import { useState, useEffect } from "react";

type Provider = { id: string; name: string; email: string; isActive: boolean; avatarUrl?: string | null };
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
  const [password, setPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(provider?.avatarUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/admin/services").then((r) => r.json()).then(setAllServices);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) { setError("請輸入姓名"); return; }
    if (!email.trim()) { setError("請輸入 Email"); return; }
    if (!provider && !password.trim()) { setError("請輸入密碼"); return; }

    setSaving(true);
    try {
      const method = provider ? "PUT" : "POST";
      const body: Record<string, unknown> = { id: provider?.id, name, email };
      if (password.trim()) body.password = password;
      const res = await fetch("/api/admin/providers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 || data.error?.includes("Unique")) {
          setError("此 Email 已被其他提供者使用");
        } else {
          setError(data.error || "儲存失敗，請稍後再試");
        }
        setSaving(false);
        return;
      }

      const saved = await res.json();

      if (selectedServiceIds.length > 0) {
        await fetch(`/api/admin/providers/${saved.id}/services`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceIds: selectedServiceIds }),
        });
      }

      setSuccess(provider ? "提供者已更新" : "提供者已新增");
      setTimeout(() => {
        onSave();
      }, 800);
    } catch {
      setError("儲存失敗，請檢查網路連線");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !provider?.id) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}/avatar`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAvatarPreview(data.avatarUrl + "?t=" + Date.now());
      }
    } catch (err) {
      console.error("Avatar upload failed", err);
    }
    setUploadingAvatar(false);
    e.target.value = "";
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold text-[#1E293B] mb-5">{provider ? "編輯提供者" : "新增提供者"}</h3>

      {/* Toast notifications */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {/* Avatar upload section (only for editing) */}
      {provider && (
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
          <label className="relative w-16 h-16 rounded-full flex-shrink-0 cursor-pointer group">
            <img src={avatarPreview || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(name)}`} alt={name} className="w-16 h-16 rounded-full object-cover" />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
          <div>
            <p className="text-sm font-medium text-[#1E293B]">頭像</p>
            <p className="text-xs text-slate-500 mt-0.5">點擊圖片上傳新頭像</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">姓名 <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
            {provider ? "新密碼" : "密碼"} {!provider ? <span className="text-red-500">*</span> : <span className="text-xs text-slate-400 font-normal ml-1">留空則不變更</span>}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder={provider ? "留空則不變更密碼" : "請輸入密碼"}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
            required={!provider}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-2">可提供的服務</label>
          <div className="flex flex-wrap gap-2">
            {allServices.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleService(s.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  selectedServiceIds.includes(s.id)
                    ? "bg-blue-50 text-[#2563EB] border-2 border-[#2563EB]"
                    : "bg-[#F8FAFC] text-slate-600 border border-slate-200 hover:border-slate-300"
                }`}
              >
                {selectedServiceIds.includes(s.id) ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                )}
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              儲存中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              儲存
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors duration-150"
        >
          取消
        </button>
      </div>
    </form>
  );
}
