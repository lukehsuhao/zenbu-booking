"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AvailabilityEditor } from "@/components/admin/availability-editor";

type ProviderProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  calendarId: string | null;
  lineUserId: string | null;
  providerServices: { service: { id: string; name: string } }[];
};

type ServiceOption = { id: string; name: string };

export default function MySettingsPage() {
  const { data: session } = useSession();
  const providerId = session?.user?.providerId;

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [savingServices, setSavingServices] = useState(false);

  useEffect(() => {
    if (providerId) loadProfile();
    loadAllServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  async function loadAllServices() {
    try {
      const res = await fetch("/api/admin/services");
      if (res.ok) setAllServices(await res.json());
    } catch { /* ignore */ }
  }

  async function loadProfile() {
    try {
      const res = await fetch(`/api/admin/providers/${providerId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditName(data.name);
        setEditEmail(data.email);
        setSelectedServiceIds(data.providerServices?.map((ps: { service: { id: string } }) => ps.service.id) || []);
      }
    } catch { /* ignore */ }
  }

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }

  async function handleSaveProfile() {
    if (!providerId) return;
    if (newPassword && newPassword !== confirmPassword) {
      showNotification("error", "密碼不一致");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { name: editName, email: editEmail };
      if (newPassword) body.password = newPassword;

      const res = await fetch(`/api/admin/providers/${providerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showNotification("success", "個人資料已更新");
        setNewPassword("");
        setConfirmPassword("");
        loadProfile();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification("error", err.error || "更新失敗");
      }
    } catch {
      showNotification("error", "更新失敗");
    }
    setSaving(false);
  }

  if (!providerId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500 text-sm">無法載入設定，請重新登入</p>
      </div>
    );
  }

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
          notification.type === "success"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {notification.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">我的設定</h1>
        <p className="text-sm text-gray-500 mt-1">管理個人資料與可預約時段</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          個人資料
        </h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">姓名</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">新密碼（留空表示不更改）</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="輸入新密碼"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
            />
          </div>
          {newPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">確認新密碼</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入新密碼"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>
          )}
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>

      {/* Services selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            可提供的服務
          </h2>
          <button
            onClick={async () => {
              setSavingServices(true);
              try {
                const res = await fetch(`/api/admin/providers/${providerId}/services`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ serviceIds: selectedServiceIds }),
                });
                if (res.ok) {
                  showNotification("success", "服務設定已更新");
                  loadProfile();
                } else {
                  showNotification("error", "更新失敗");
                }
              } catch {
                showNotification("error", "更新失敗");
              }
              setSavingServices(false);
            }}
            disabled={savingServices}
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150 disabled:opacity-50"
          >
            {savingServices ? "儲存中..." : "儲存"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {allServices.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedServiceIds((prev) =>
                prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
              )}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-150 ${
                selectedServiceIds.includes(s.id)
                  ? "bg-[#2563EB] text-white shadow-sm shadow-blue-500/20 border border-transparent"
                  : "bg-[#F8FAFC] text-gray-700 border border-gray-200 hover:border-[#2563EB] hover:text-[#2563EB]"
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

      {/* Google Calendar status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Google 日曆
        </h2>
        {profile?.calendarId ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-sm font-medium text-emerald-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Google 日曆已連結
            </span>
            <button
              onClick={async () => {
                if (!confirm("確定要取消連結 Google 日曆？")) return;
                const res = await fetch(`/api/admin/providers/${providerId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: profile.name, email: profile.email, googleDisconnect: true }),
                });
                if (res.ok) { showNotification("success", "Google 日曆已取消連結"); loadProfile(); }
                else showNotification("error", "取消連結失敗");
              }}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              取消連結
            </button>
          </div>
        ) : (
          <a
            href={`/api/google/auth?providerId=${providerId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            連結 Google 日曆
          </a>
        )}
      </div>

      {/* LINE Connection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#06C755]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          連接個人 LINE
        </h2>
        {profile?.lineUserId ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06C755]/10 text-sm font-medium text-[#06C755]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              LINE 已連結
            </span>
            <button
              onClick={async () => {
                if (!confirm("確定要取消連結 LINE？取消後將無法收到預約通知。")) return;
                const res = await fetch(`/api/admin/providers/${providerId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: profile.name, email: profile.email, lineDisconnect: true }),
                });
                if (res.ok) { showNotification("success", "LINE 已取消連結"); loadProfile(); }
                else showNotification("error", "取消連結失敗");
              }}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              取消連結
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              連結步驟：加入官方帳號好友後，將下方的連結碼傳送到聊天室中即可完成連結。
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/admin/providers/${providerId}/link-code`, { method: "POST" });
                    if (res.ok) {
                      const { code } = await res.json();
                      await navigator.clipboard.writeText(code);
                      showNotification("success", `連結碼 ${code} 已複製，請傳送到官方帳號的聊天室`);
                    }
                  } catch {
                    showNotification("error", "取得連結碼失敗");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#06C755] text-white text-sm font-medium hover:bg-[#05a847] shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                取得連結碼
              </button>
            </div>
            <ol className="text-xs text-gray-500 mt-3 space-y-1 list-decimal list-inside">
              <li>加入官方 LINE 帳號為好友</li>
              <li>點擊上方「取得連結碼」按鈕（碼會自動複製）</li>
              <li>到官方帳號的聊天室中貼上連結碼並送出</li>
              <li>系統會自動完成連結並回覆確認訊息</li>
            </ol>
          </div>
        )}
      </div>

      {/* Availability Editor */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          可預約時段
        </h2>
        <AvailabilityEditor providerId={providerId} />
      </div>
    </div>
  );
}
