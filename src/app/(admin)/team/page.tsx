"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  name: string;
  email: string;
  lineUserId: string | null;
  lineLinkCode: string | null;
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team");
      if (res.ok) setMembers(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  function showNotif(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  }

  async function handleAdd() {
    if (!addName || !addEmail || !addPassword) { showNotif("error", "請填寫所有欄位"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName, email: addEmail, password: addPassword }),
      });
      if (res.ok) {
        showNotif("success", "管理員已新增");
        setAddName(""); setAddEmail(""); setAddPassword("");
        setShowAddForm(false);
        loadMembers();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotif("error", err.error || "新增失敗");
      }
    } catch { showNotif("error", "新增失敗"); }
    setAdding(false);
  }

  async function handleGenerateLinkCode(id: string, name: string) {
    try {
      const res = await fetch("/api/admin/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateLinkCode", id }),
      });
      if (res.ok) {
        const { code } = await res.json();
        try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
        showNotif("success", `${name} 的連結碼：${code}（已複製）`);
        loadMembers();
      }
    } catch { showNotif("error", "產生連結碼失敗"); }
  }

  async function handleDisconnect(id: string, name: string) {
    if (!confirm(`確定要取消 ${name} 的 LINE 連結？`)) return;
    try {
      const res = await fetch("/api/admin/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", id }),
      });
      if (res.ok) { showNotif("success", "LINE 已取消連結"); loadMembers(); }
    } catch { showNotif("error", "取消連結失敗"); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`確定要刪除管理員「${name}」？此操作無法復原。`)) return;
    try {
      const res = await fetch("/api/admin/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { showNotif("success", "已刪除"); loadMembers(); }
      else {
        const err = await res.json().catch(() => ({}));
        showNotif("error", err.error || "刪除失敗");
      }
    } catch { showNotif("error", "刪除失敗"); }
  }

  return (
    <div>
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${
          notification.type === "success"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">管理員列表</h1>
          <p className="text-sm text-gray-500 mt-1">管理後台成員與 LINE 帳號連結</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新增管理員
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">新增管理員</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="姓名"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">初始密碼</label>
              <input
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="設定登入密碼"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {adding ? "新增中..." : "確認新增"}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddName(""); setAddEmail(""); setAddPassword(""); }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-3">
        {loading && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-48" />
                  </div>
                  <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-28" />
                </div>
              </div>
            ))}
          </>
        )}
        {!loading && members.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 text-sm">
            尚無管理員
          </div>
        )}
        {members.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{m.name}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">管理員</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{m.email}</p>
                </div>
              </div>

              {/* LINE status + actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {m.lineUserId ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06C755]/10 text-sm font-medium text-[#06C755]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      LINE 已連結
                    </span>
                    <button
                      onClick={() => handleDisconnect(m.id, m.name)}
                      className="text-xs text-gray-500 hover:text-red-500 transition-colors px-2 py-1.5"
                    >
                      取消連結
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleGenerateLinkCode(m.id, m.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06C755] text-white text-sm font-medium hover:bg-[#05a847] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                    產生 LINE 連結碼
                  </button>
                )}

                <button
                  onClick={() => handleDelete(m.id, m.name)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="刪除管理員"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Link code hint */}
            {m.lineLinkCode && !m.lineUserId && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500">待連結碼：</span>
                <code className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">{m.lineLinkCode}</code>
                <span className="text-xs text-gray-500">（請將此碼傳送至官方帳號聊天室）</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-gray-100 rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">LINE 綁定流程</h3>
        <ol className="text-sm text-gray-500 space-y-1 list-decimal list-inside">
          <li>在上方點選「產生 LINE 連結碼」，連結碼會自動複製</li>
          <li>將連結碼傳給管理員本人</li>
          <li>管理員加入官方 LINE 帳號為好友後，將連結碼傳送到聊天室</li>
          <li>系統自動完成綁定，頁面會顯示「LINE 已連結」</li>
        </ol>
      </div>
    </div>
  );
}
