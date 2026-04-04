"use client";

import { useEffect, useState } from "react";

const ALL_CONFIRMATION_FIELDS = [
  { key: "service", label: "服務項目" },
  { key: "provider", label: "提供者" },
  { key: "date", label: "日期" },
  { key: "time", label: "時間" },
  { key: "name", label: "姓名" },
  { key: "phone", label: "電話" },
  { key: "notes", label: "備註" },
];

const COLOR_PRESETS = [
  { key: "blue", label: "經典藍", primary: "#2563EB", accent: "#06B6D4" },
  { key: "teal", label: "清新綠", primary: "#0D9488", accent: "#6366F1" },
  { key: "purple", label: "優雅紫", primary: "#7C3AED", accent: "#EC4899" },
];

export default function SystemPage() {
  const [confirmationFields, setConfirmationFields] = useState<string[]>(["service", "provider", "date", "time", "name", "phone"]);
  const [colorTheme, setColorTheme] = useState("blue");
  const [customPrimary, setCustomPrimary] = useState("#2563EB");
  const [customAccent, setCustomAccent] = useState("#06B6D4");
  const [bookingWindowDays, setBookingWindowDays] = useState(14);
  const [showProviderAvatar, setShowProviderAvatar] = useState(true);
  const [savingSite, setSavingSite] = useState(false);

  async function loadSiteSettings() {
    const res = await fetch("/api/admin/site-settings");
    if (res.ok) {
      const data = await res.json();
      setConfirmationFields(data.confirmationFields);
      setColorTheme(data.colorTheme);
      setCustomPrimary(data.customPrimary);
      setCustomAccent(data.customAccent);
      setBookingWindowDays(data.bookingWindowDays ?? 14);
      if (typeof data.showProviderAvatar === "boolean") setShowProviderAvatar(data.showProviderAvatar);
    }
  }

  useEffect(() => {
    loadSiteSettings();
  }, []);

  function toggleField(key: string) {
    setConfirmationFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  }

  async function saveSiteSettings() {
    setSavingSite(true);
    await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationFields, colorTheme, customPrimary, customAccent, bookingWindowDays, showProviderAvatar }),
    });
    setSavingSite(false);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">系統設定</h1>
          <p className="text-sm text-slate-500 mt-1">管理預約系統的基本設定</p>
        </div>
        <button
          onClick={saveSiteSettings}
          disabled={savingSite}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors duration-150 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {savingSite ? "儲存中..." : "儲存"}
        </button>
      </div>

      {/* Booking Window Setting */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1E293B]">預約時間範圍</h2>
          <p className="text-sm text-slate-500 mt-1">設定客戶可預約的未來天數（0 = 不限制）</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1E293B] mb-1">可預約天數</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={bookingWindowDays}
                  onChange={(e) => setBookingWindowDays(Number(e.target.value))}
                  className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                />
                <span className="text-sm text-slate-500">天</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Avatar Toggle */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1E293B]">服務提供者頭像</h2>
          <p className="text-sm text-slate-500 mt-1">設定是否在預約頁面顯示提供者頭像</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#1E293B]">顯示服務提供者頭像</p>
                <p className="text-xs text-slate-500 mt-0.5">在客戶預約選擇人員時顯示頭像照片</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowProviderAvatar(!showProviderAvatar)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                showProviderAvatar ? "bg-[#2563EB]" : "bg-slate-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                showProviderAvatar ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Fields Settings */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1E293B]">確認頁面顯示欄位</h2>
          <p className="text-sm text-slate-500 mt-1">選擇預約確認頁面要顯示哪些資訊</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALL_CONFIRMATION_FIELDS.map((field) => {
              const isActive = confirmationFields.includes(field.key);
              return (
                <button
                  key={field.key}
                  onClick={() => toggleField(field.key)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all duration-150 ${
                    isActive
                      ? "bg-blue-50 border-[#2563EB] text-[#2563EB]"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {isActive && (
                    <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                  {field.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Color Theme Settings */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1E293B]">色系設定</h2>
          <p className="text-sm text-slate-500 mt-1">選擇預約頁面的主色調</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
          {/* Presets */}
          <div className="grid grid-cols-3 gap-4">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => setColorTheme(preset.key)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-150 ${
                  colorTheme === preset.key
                    ? "border-[#2563EB] shadow-md"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg" style={{ background: preset.primary }} />
                  <div className="w-8 h-8 rounded-lg" style={{ background: preset.accent }} />
                </div>
                <p className="text-sm font-medium text-[#1E293B]">{preset.label}</p>
                {colorTheme === preset.key && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-[#2563EB] rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom */}
          <div>
            <button
              onClick={() => setColorTheme("custom")}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-150 text-left ${
                colorTheme === "custom"
                  ? "border-[#2563EB] shadow-md"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#1E293B]">自訂顏色</p>
                {colorTheme === "custom" && (
                  <div className="w-5 h-5 bg-[#2563EB] rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </div>
              {colorTheme === "custom" && (
                <div className="flex gap-6 mt-4" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">主色</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customPrimary}
                        onChange={(e) => setCustomPrimary(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customPrimary}
                        onChange={(e) => setCustomPrimary(e.target.value)}
                        className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">強調色</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customAccent}
                        onChange={(e) => setCustomAccent(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customAccent}
                        onChange={(e) => setCustomAccent(e.target.value)}
                        className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
