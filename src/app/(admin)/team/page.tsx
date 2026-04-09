"use client";

import React, { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/admin/table-skeleton";

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLine, setFilterLine] = useState("");

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit expansion
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Link code visibility: { [memberId]: true } means revealed
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());

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

  function openEdit(m: Member) {
    if (editingId === m.id) {
      setEditingId(null);
      return;
    }
    setEditingId(m.id);
    setEditName(m.name);
    setEditEmail(m.email);
    setEditPassword("");
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    if (!editName || !editEmail) { showNotif("error", "請填寫姓名和 Email"); return; }
    setSavingEdit(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: editingId, name: editName, email: editEmail, password: editPassword }),
      });
      if (res.ok) {
        showNotif("success", "已更新");
        setEditingId(null);
        loadMembers();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotif("error", err.error || "更新失敗");
      }
    } catch { showNotif("error", "更新失敗"); }
    setSavingEdit(false);
  }

  function toggleRevealCode(id: string) {
    setRevealedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  // Filtering
  const filteredMembers = members.filter((m) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    }
    if (filterLine === "connected" && !m.lineUserId) return false;
    if (filterLine === "disconnected" && m.lineUserId) return false;
    return true;
  });

  // Pagination
  const totalItems = filteredMembers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">搜尋</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="姓名 / Email"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">LINE 連結</label>
            <select
              value={filterLine}
              onChange={(e) => { setFilterLine(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              <option value="connected">已連結</option>
              <option value="disconnected">未連結</option>
            </select>
          </div>
        </div>
        {(searchQuery || filterLine) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => { setSearchQuery(""); setFilterLine(""); setCurrentPage(1); }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除篩選
            </button>
          </div>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">新增管理員</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">姓名</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="姓名"
                className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">初始密碼</label>
              <input
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="設定登入密碼"
                className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setAddName(""); setAddEmail(""); setAddPassword(""); }}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {adding ? "新增中..." : "確認新增"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">管理員</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LINE</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">待連結碼</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedMembers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-gray-500 text-sm">
                  沒有符合條件的管理員
                </td>
              </tr>
            )}
            {paginatedMembers.map((m, idx) => {
              const isEditing = editingId === m.id;
              const isRevealed = revealedCodes.has(m.id);
              return (
              <React.Fragment key={m.id}>
              <tr className={`hover:bg-gray-100/50 transition-colors duration-100 ${idx % 2 === 1 ? "bg-gray-100/30" : ""}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <svg className="w-4.5 h-4.5 text-amber-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{m.name}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">管理員</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-700">{m.email || <span className="text-slate-300">-</span>}</td>
                <td className="px-5 py-3.5">
                  {m.lineUserId ? (
                    <button
                      onClick={() => handleDisconnect(m.id, m.name)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#06C755]/10 text-[#06C755] hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="點擊取消連結"
                    >
                      已連結
                    </button>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-gray-500">
                      未連結
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  {m.lineLinkCode && !m.lineUserId ? (
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded whitespace-nowrap">
                        {isRevealed ? m.lineLinkCode : "••••-••••-••••-••••-••••-••••"}
                      </code>
                      <button
                        onClick={() => toggleRevealCode(m.id)}
                        className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title={isRevealed ? "隱藏" : "顯示"}
                      >
                        {isRevealed ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                      {isRevealed && (
                        <button
                          onClick={async () => {
                            try { await navigator.clipboard.writeText(m.lineLinkCode!); showNotif("success", "已複製"); } catch {}
                          }}
                          className="p-1 rounded text-gray-400 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                          title="複製"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    {!m.lineUserId && (
                      <button
                        onClick={() => handleGenerateLinkCode(m.id, m.name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#06C755] hover:bg-[#06C755]/10 transition-colors"
                        title="產生 LINE 連結碼"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                        產生連結碼
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(m)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isEditing ? "bg-blue-50 text-[#2563EB]" : "text-gray-700 hover:text-[#2563EB] hover:bg-blue-50"
                      }`}
                      title="編輯管理員"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      編輯
                    </button>
                    <button
                      onClick={() => handleDelete(m.id, m.name)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="刪除管理員"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              {isEditing && (
                <tr>
                  <td colSpan={5} className="px-5 py-4 bg-gray-100/50">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">編輯管理員</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">姓名</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">新密碼（留空不更改）</label>
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="留空不更改"
                            className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={savingEdit}
                          className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {savingEdit ? "儲存中..." : "儲存變更"}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              顯示 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalItems)} / 共 {totalItems} 筆
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                上一頁
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">LINE 綁定流程</h3>
        <ol className="text-sm text-gray-500 space-y-1 list-decimal list-inside">
          <li>在上方點選「產生連結碼」，連結碼會自動複製到剪貼板</li>
          <li>將連結碼傳給管理員本人</li>
          <li>管理員加入官方 LINE 帳號為好友後，將連結碼傳送到聊天室</li>
          <li>系統自動完成綁定，LINE 欄位會顯示「已連結」</li>
        </ol>
      </div>
    </div>
  );
}
