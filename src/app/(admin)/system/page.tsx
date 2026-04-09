"use client";

import { useEffect, useState } from "react";
import { RichTextEditor } from "@/components/admin/rich-text-editor";

const COLOR_PRESETS = [
  { key: "blue", label: "經典藍", primary: "#2563EB", accent: "#06B6D4" },
  { key: "teal", label: "清新綠", primary: "#0D9488", accent: "#6366F1" },
  { key: "purple", label: "優雅紫", primary: "#7C3AED", accent: "#EC4899" },
];

export default function SystemPage() {
  const [colorTheme, setColorTheme] = useState("blue");
  const [customPrimary, setCustomPrimary] = useState("#2563EB");
  const [customAccent, setCustomAccent] = useState("#06B6D4");
  const [bookingWindowDays, setBookingWindowDays] = useState(14);
  const [showProviderAvatar, setShowProviderAvatar] = useState(false);
  const [rewardPointsOnComplete, setRewardPointsOnComplete] = useState(0);
  const [showStoreFront, setShowStoreFront] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [storeImageUrl, setStoreImageUrl] = useState("");
  const [storeMediaType, setStoreMediaType] = useState("none");
  const [storeYoutubeUrl, setStoreYoutubeUrl] = useState("");
  const [savingSite, setSavingSite] = useState(false);

  async function loadSiteSettings() {
    const res = await fetch("/api/admin/site-settings");
    if (res.ok) {
      const data = await res.json();
      setColorTheme(data.colorTheme);
      setCustomPrimary(data.customPrimary);
      setCustomAccent(data.customAccent);
      setBookingWindowDays(data.bookingWindowDays ?? 14);
      if (typeof data.showProviderAvatar === "boolean") setShowProviderAvatar(data.showProviderAvatar);
      if (typeof data.rewardPointsOnComplete === "number") setRewardPointsOnComplete(data.rewardPointsOnComplete);
      if (typeof data.showStoreFront === "boolean") setShowStoreFront(data.showStoreFront);
      if (data.storeName != null) setStoreName(data.storeName);
      if (data.storeDescription != null) setStoreDescription(data.storeDescription);
      if (data.storeImageUrl != null) setStoreImageUrl(data.storeImageUrl);
      if (data.storeMediaType) setStoreMediaType(data.storeMediaType);
      if (data.storeYoutubeUrl != null) setStoreYoutubeUrl(data.storeYoutubeUrl);
    }
  }

  useEffect(() => {
    loadSiteSettings();
  }, []);

  async function saveSiteSettings() {
    setSavingSite(true);
    await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colorTheme, customPrimary, customAccent, bookingWindowDays, showProviderAvatar, rewardPointsOnComplete, showStoreFront, storeName, storeDescription, storeImageUrl: storeImageUrl || null, storeMediaType, storeYoutubeUrl: storeYoutubeUrl || null }),
    });
    setSavingSite(false);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">系統設定</h1>
          <p className="text-sm text-gray-500 mt-1">管理預約系統的基本設定</p>
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

      {/* Store Front Settings */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">店家首頁</h2>
          <p className="text-sm text-gray-500 mt-1">設定 LIFF 店家首頁的顯示內容</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0a2.998 2.998 0 00.94-2.159V4.5a.75.75 0 01.75-.75h16.5a.75.75 0 01.75.75v2.69a2.998 2.998 0 00.94 2.16" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">啟用店家首頁</p>
                <p className="text-xs text-gray-500 mt-0.5">關閉時客戶將直接進入預約流程</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowStoreFront(!showStoreFront)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                showStoreFront ? "bg-[#2563EB]" : "bg-slate-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                showStoreFront ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          {showStoreFront && (
            <>
              {/* Store Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">店家名稱</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="例：美麗髮廊"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                />
              </div>

              {/* Store Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">店家介紹</label>
                <RichTextEditor
                  content={storeDescription}
                  onChange={setStoreDescription}
                  placeholder="簡短介紹您的店家或服務特色..."
                />
              </div>

              {/* Store Media */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">首頁媒體</label>
                <div className="flex gap-2 mb-3">
                  {[
                    { value: "none", label: "無" },
                    { value: "image", label: "圖片" },
                    { value: "youtube", label: "YouTube 影片" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStoreMediaType(opt.value)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors duration-150 ${
                        storeMediaType === opt.value
                          ? "bg-[#2563EB] text-white border-[#2563EB]"
                          : "bg-white text-gray-700 border-gray-200 hover:border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {storeMediaType === "image" && (
                  <div>
                    <input
                      type="text"
                      value={storeImageUrl}
                      onChange={(e) => setStoreImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                    />
                    {storeImageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 h-32">
                        <img src={storeImageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                )}
                {storeMediaType === "youtube" && (
                  <div>
                    <input
                      type="text"
                      value={storeYoutubeUrl}
                      onChange={(e) => setStoreYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=xxxxx"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">支援 YouTube 連結，系統會自動轉換為嵌入式播放器</p>
                    {storeYoutubeUrl && (() => {
                      const match = storeYoutubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?#]+)/);
                      const videoId = match?.[1];
                      return videoId ? (
                        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 aspect-video">
                          <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen />
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Booking Window Setting */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">預設可預約天數（全域）</h2>
          <p className="text-sm text-gray-500 mt-1">設定客戶可預約的未來天數（0 = 不限制）。個別服務可在服務管理中覆寫此設定</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-900 mb-1">可預約天數</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={bookingWindowDays}
                  onChange={(e) => setBookingWindowDays(Number(e.target.value))}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                />
                <span className="text-sm text-gray-500">天</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Avatar Toggle */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">服務提供者頭像</h2>
          <p className="text-sm text-gray-500 mt-1">設定是否在預約頁面顯示提供者頭像</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">顯示服務提供者頭像</p>
                <p className="text-xs text-gray-500 mt-0.5">在客戶預約選擇人員時顯示頭像照片</p>
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

      {/* 點數回饋 */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">點數回饋</h2>
          <p className="text-sm text-gray-500 mt-1">設定預約完成後自動回饋的點數</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-900 mb-1">預約完成回饋點數</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={rewardPointsOnComplete}
                  onChange={(e) => setRewardPointsOnComplete(Number(e.target.value))}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                />
                <span className="text-sm text-gray-500">點（0 = 不回饋）</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Color Theme Settings */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">色系設定</h2>
          <p className="text-sm text-gray-500 mt-1">選擇預約頁面的主色調</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Presets */}
          <div className="grid grid-cols-3 gap-4">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => setColorTheme(preset.key)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-150 ${
                  colorTheme === preset.key
                    ? "border-[#2563EB] shadow-md"
                    : "border-gray-200 hover:border-slate-300"
                }`}
              >
                <div className="flex gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg" style={{ background: preset.primary }} />
                  <div className="w-8 h-8 rounded-lg" style={{ background: preset.accent }} />
                </div>
                <p className="text-sm font-medium text-gray-900">{preset.label}</p>
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
                  : "border-gray-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">自訂顏色</p>
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
                    <label className="block text-xs text-gray-500 mb-1.5">主色</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customPrimary}
                        onChange={(e) => setCustomPrimary(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customPrimary}
                        onChange={(e) => setCustomPrimary(e.target.value)}
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">強調色</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customAccent}
                        onChange={(e) => setCustomAccent(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customAccent}
                        onChange={(e) => setCustomAccent(e.target.value)}
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono"
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
