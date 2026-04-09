"use client";

import React, { useEffect, useState } from "react";
import { ProviderForm } from "@/components/admin/provider-form";
import { AvailabilityEditor } from "@/components/admin/availability-editor";
import { Pagination } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/table-skeleton";

type Provider = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  calendarId: string | null;
  lineUserId: string | null;
  avatarUrl: string | null;
  providerServices: { service: { id: string; name: string } }[];
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedRow, setExpandedRow] = useState<{ id: string; mode: "availability" | "edit" } | null>(null);
  const [uploadingAvatarId, setUploadingAvatarId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterLine, setFilterLine] = useState("");
  const [filterGoogle, setFilterGoogle] = useState("");

  // Selection & messaging
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageChannel, setMessageChannel] = useState<"line" | "email">("line");
  const [messageSubject, setMessageSubject] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // All services from the system (for bulk edit)
  const [allServicesList, setAllServicesList] = useState<{ id: string; name: string }[]>([]);

  // Bulk delete
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [processingDelete, setProcessingDelete] = useState(false);

  // Bulk services edit
  const [showBulkServices, setShowBulkServices] = useState(false);
  const [bulkServicesMode, setBulkServicesMode] = useState<"replace" | "add" | "remove">("replace");
  const [bulkSelectedServiceIds, setBulkSelectedServiceIds] = useState<Set<string>>(new Set());
  const [processingBulkServices, setProcessingBulkServices] = useState(false);

  // Bulk availability
  const [showBulkAvail, setShowBulkAvail] = useState(false);
  const [bulkAvailMode, setBulkAvailMode] = useState<"add" | "clear">("add");
  const [bulkAvailDays, setBulkAvailDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [bulkAvailStart, setBulkAvailStart] = useState("09:00");
  const [bulkAvailEnd, setBulkAvailEnd] = useState("18:00");
  const [bulkAvailType, setBulkAvailType] = useState<"available" | "excluded">("available");
  const [processingBulkAvail, setProcessingBulkAvail] = useState(false);

  function showNotif(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  }

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
    try {
      const res = await fetch("/api/admin/providers");
      if (res.ok) setProviders(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadAllServices() {
    try {
      const res = await fetch("/api/admin/services");
      if (res.ok) setAllServicesList(await res.json());
    } catch { /* ignore */ }
  }

  useEffect(() => { loadProviders(); loadAllServices(); }, []);

  function handleSelectRow(index: number, e: React.MouseEvent | React.ChangeEvent) {
    const prov = filteredProviders[index];
    if (!prov) return;
    if ("shiftKey" in e && e.shiftKey && lastCheckedIndex !== null) {
      const start = Math.min(lastCheckedIndex, index);
      const end = Math.max(lastCheckedIndex, index);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          const p = filteredProviders[i];
          if (p) next.add(p.id);
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(prov.id)) next.delete(prov.id);
        else next.add(prov.id);
        return next;
      });
    }
    setLastCheckedIndex(index);
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredProviders.length && filteredProviders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProviders.map((p) => p.id)));
    }
  }

  function openBulkMessage() {
    if (selectedIds.size === 0) {
      showNotif("error", "請先勾選至少一位提供者");
      return;
    }
    setMessageText("");
    setMessageSubject("");
    setMessageChannel("line");
    setShowMessageDialog(true);
  }

  function openSingleMessage(id: string) {
    setSelectedIds(new Set([id]));
    setMessageText("");
    setMessageSubject("");
    setMessageChannel("line");
    setShowMessageDialog(true);
  }

  function openBulkDelete() {
    setShowBulkDelete(true);
  }

  async function handleBulkDelete() {
    setProcessingDelete(true);
    let success = 0;
    let fail = 0;
    const errors: string[] = [];
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
        if (res.ok) {
          success++;
        } else {
          fail++;
          const data = await res.json().catch(() => ({}));
          if (data.error) errors.push(data.error);
        }
      } catch { fail++; }
    }
    showNotif(
      fail === 0 ? "success" : "error",
      fail === 0
        ? `已刪除 ${success} 位提供者`
        : `已刪除 ${success} 位，失敗 ${fail} 位${errors[0] ? `（${errors[0]}）` : ""}`
    );
    setProcessingDelete(false);
    setShowBulkDelete(false);
    setSelectedIds(new Set());
    loadProviders();
  }

  function openBulkServices() {
    setBulkServicesMode("replace");
    setBulkSelectedServiceIds(new Set());
    setShowBulkServices(true);
  }

  async function handleBulkServices() {
    setProcessingBulkServices(true);
    const newIds = Array.from(bulkSelectedServiceIds);
    let success = 0;
    let fail = 0;
    for (const providerId of selectedIds) {
      try {
        const prov = providers.find((p) => p.id === providerId);
        if (!prov) { fail++; continue; }

        let finalIds: string[];
        if (bulkServicesMode === "replace") {
          finalIds = newIds;
        } else if (bulkServicesMode === "add") {
          const existing = new Set(prov.providerServices.map((ps) => ps.service.id));
          for (const sid of newIds) existing.add(sid);
          finalIds = Array.from(existing);
        } else {
          // remove mode
          const removeSet = new Set(newIds);
          finalIds = prov.providerServices
            .map((ps) => ps.service.id)
            .filter((sid) => !removeSet.has(sid));
        }

        const res = await fetch(`/api/admin/providers/${providerId}/services`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceIds: finalIds }),
        });
        if (res.ok) success++;
        else fail++;
      } catch { fail++; }
    }
    showNotif(
      fail === 0 ? "success" : "error",
      fail === 0 ? `已更新 ${success} 位提供者的服務` : `成功 ${success}，失敗 ${fail}`
    );
    setProcessingBulkServices(false);
    setShowBulkServices(false);
    setSelectedIds(new Set());
    loadProviders();
  }

  function openBulkAvailability() {
    setBulkAvailMode("add");
    setBulkAvailDays(new Set([1, 2, 3, 4, 5]));
    setBulkAvailStart("09:00");
    setBulkAvailEnd("18:00");
    setBulkAvailType("available");
    setShowBulkAvail(true);
  }

  async function handleBulkAvailability() {
    if (bulkAvailMode === "add" && bulkAvailDays.size === 0) {
      showNotif("error", "請至少選擇一天");
      return;
    }
    setProcessingBulkAvail(true);
    let success = 0;
    let fail = 0;
    for (const providerId of selectedIds) {
      try {
        if (bulkAvailMode === "clear") {
          const res = await fetch(`/api/admin/providers/${providerId}/availability`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ availabilities: [] }),
          });
          if (res.ok) success++;
          else fail++;
        } else {
          // Add mode: GET existing, append new slots, PUT back
          const getRes = await fetch(`/api/admin/providers/${providerId}/availability`);
          if (!getRes.ok) { fail++; continue; }
          const existing = await getRes.json();
          const newSlots = Array.from(bulkAvailDays).map((day) => ({
            dayOfWeek: day,
            startTime: bulkAvailStart,
            endTime: bulkAvailEnd,
            type: bulkAvailType,
            specificDate: null,
            bufferBefore: 0,
            bufferAfter: 0,
          }));
          const combined = [...existing, ...newSlots];
          const res = await fetch(`/api/admin/providers/${providerId}/availability`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ availabilities: combined }),
          });
          if (res.ok) success++;
          else fail++;
        }
      } catch { fail++; }
    }
    showNotif(
      fail === 0 ? "success" : "error",
      fail === 0
        ? bulkAvailMode === "clear" ? `已清空 ${success} 位提供者的時段` : `已為 ${success} 位提供者新增時段`
        : `成功 ${success}，失敗 ${fail}`
    );
    setProcessingBulkAvail(false);
    setShowBulkAvail(false);
    setSelectedIds(new Set());
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    if (messageChannel === "email" && !messageSubject.trim()) {
      showNotif("error", "請輸入 Email 主旨");
      return;
    }
    setSendingMessage(true);
    try {
      const selectedProviders = providers.filter((p) => selectedIds.has(p.id));

      let payload: Record<string, unknown>;
      if (messageChannel === "line") {
        const targets = selectedProviders.filter((p) => p.lineUserId).map((p) => p.lineUserId as string);
        if (targets.length === 0) {
          showNotif("error", "所選提供者都沒有連結 LINE");
          setSendingMessage(false);
          return;
        }
        payload = { lineUserIds: targets, message: messageText, channel: "line" };
      } else {
        const targets = selectedProviders.filter((p) => p.email).map((p) => p.email as string);
        if (targets.length === 0) {
          showNotif("error", "所選提供者都沒有 Email");
          setSendingMessage(false);
          return;
        }
        payload = { emails: targets, message: messageText, channel: "email", subject: messageSubject };
      }

      const res = await fetch("/api/admin/customers/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const parts = [`已發送 ${data.successCount} 則`];
        if (data.failCount > 0) parts.push(`失敗 ${data.failCount}`);
        if (data.skippedCount > 0) parts.push(`跳過 ${data.skippedCount}`);
        showNotif("success", parts.join("，"));
        setShowMessageDialog(false);
        setSelectedIds(new Set());
      } else {
        const err = await res.json().catch(() => ({}));
        showNotif("error", err.error || "發送失敗");
      }
    } catch {
      showNotif("error", "發送失敗");
    }
    setSendingMessage(false);
  }

  // All unique services for filter dropdown
  const allServices = Array.from(
    new Map(
      providers.flatMap((p) => p.providerServices.map((ps) => [ps.service.id, ps.service.name]))
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  // Filtered providers
  const filteredProviders = providers.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.email.toLowerCase().includes(q)) return false;
    }
    if (filterService && !p.providerServices.some((ps) => ps.service.id === filterService)) return false;
    if (filterLine === "connected" && !p.lineUserId) return false;
    if (filterLine === "disconnected" && p.lineUserId) return false;
    if (filterGoogle === "connected" && !p.calendarId) return false;
    if (filterGoogle === "disconnected" && p.calendarId) return false;
    return true;
  });

  // Pagination
  const totalItems = filteredProviders.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedProviders = filteredProviders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">提供者列表</h1>
          <p className="text-sm text-gray-500 mt-1">管理服務提供者與排班時段</p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setExpandedRow(null); }}
          className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新增提供者
        </button>
      </div>

      {/* Bulk action bar (shown only when items selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              已選取 {selectedIds.size} 位提供者
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除選取
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openBulkMessage}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              發送訊息
            </button>
            <button
              onClick={openBulkServices}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              </svg>
              編輯服務
            </button>
            <button
              onClick={openBulkAvailability}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              編輯時段
            </button>
            <button
              onClick={openBulkDelete}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 shadow-sm transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              刪除提供者
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <label className="block text-xs font-medium text-gray-500 mb-1">服務</label>
            <select
              value={filterService}
              onChange={(e) => { setFilterService(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              {allServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Google 日曆</label>
            <select
              value={filterGoogle}
              onChange={(e) => { setFilterGoogle(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              <option value="connected">已連結</option>
              <option value="disconnected">未連結</option>
            </select>
          </div>
        </div>
        {(searchQuery || filterService || filterLine || filterGoogle) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => { setSearchQuery(""); setFilterService(""); setFilterLine(""); setFilterGoogle(""); setCurrentPage(1); }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除篩選
            </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="mb-6">
          <ProviderForm
            key="new"
            onSave={() => { setShowAddForm(false); loadProviders(); }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-5 py-3.5 text-left w-10">
                <input
                  type="checkbox"
                  checked={filteredProviders.length > 0 && selectedIds.size === filteredProviders.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/20"
                />
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">提供者</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">服務</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LINE</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Google</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedProviders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-500 text-sm">
                  沒有符合條件的提供者
                </td>
              </tr>
            )}
            {paginatedProviders.map((p, idx) => {
              const globalIndex = (currentPage - 1) * pageSize + idx;
              return (
              <React.Fragment key={p.id}>
                <tr className={`hover:bg-gray-100/50 transition-colors duration-100 ${idx % 2 === 1 ? "bg-gray-100/30" : ""}`}>
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onClick={(e) => handleSelectRow(globalIndex, e)}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/20"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <label className="relative w-9 h-9 rounded-full flex-shrink-0 cursor-pointer group">
                        <img src={p.avatarUrl || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(p.name)}`} alt={p.name} className="w-9 h-9 rounded-full object-cover" />
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {uploadingAvatarId === p.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
                      <span className="font-medium text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">{p.email || <span className="text-slate-300">-</span>}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {p.providerServices.length === 0 ? (
                        <span className="text-xs text-slate-300">-</span>
                      ) : (
                        <>
                          {p.providerServices.slice(0, 2).map((ps) => (
                            <span key={ps.service.id} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                              {ps.service.name}
                            </span>
                          ))}
                          {p.providerServices.length > 2 && (
                            <span className="relative group inline-block">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-gray-500 font-medium cursor-default">
                                +{p.providerServices.length - 2}
                              </span>
                              <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-20 whitespace-nowrap bg-gray-700 text-white text-[11px] px-2 py-1 rounded-md shadow-lg">
                                <span className="flex flex-col">
                                  {p.providerServices.slice(2).map((ps) => (
                                    <span key={ps.service.id}>{ps.service.name}</span>
                                  ))}
                                </span>
                                <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-700" />
                              </span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {p.lineUserId ? (
                      <button
                        onClick={async () => {
                          if (!confirm(`確定要取消 ${p.name} 的 LINE 連結？`)) return;
                          await fetch("/api/admin/providers", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: p.id, name: p.name, email: p.email, lineDisconnect: true }),
                          });
                          loadProviders();
                        }}
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
                    {p.calendarId ? (
                      <button
                        onClick={async () => {
                          if (!confirm(`確定要取消 ${p.name} 的 Google 日曆連結？`)) return;
                          await fetch("/api/admin/providers", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: p.id, name: p.name, email: p.email, googleDisconnect: true }),
                          });
                          loadProviders();
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="點擊取消連結"
                      >
                        已連結
                      </button>
                    ) : (
                      <a
                        href={`/api/google/auth?providerId=${p.id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        連結
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <button
                        onClick={() => setExpandedRow(
                          expandedRow?.id === p.id && expandedRow.mode === "availability"
                            ? null
                            : { id: p.id, mode: "availability" }
                        )}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          expandedRow?.id === p.id && expandedRow.mode === "availability"
                            ? "bg-blue-50 text-[#2563EB]"
                            : "text-gray-700 hover:bg-slate-100"
                        }`}
                        title="設定時段"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        時段
                      </button>
                      <button
                        onClick={() => setExpandedRow(
                          expandedRow?.id === p.id && expandedRow.mode === "edit"
                            ? null
                            : { id: p.id, mode: "edit" }
                        )}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          expandedRow?.id === p.id && expandedRow.mode === "edit"
                            ? "bg-blue-50 text-[#2563EB]"
                            : "text-gray-700 hover:text-[#2563EB] hover:bg-blue-50"
                        }`}
                        title="編輯提供者"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        編輯
                      </button>
                      {p.lineUserId && (
                        <button
                          onClick={() => openSingleMessage(p.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#06C755] hover:bg-[#06C755]/10 transition-colors"
                          title="傳送訊息"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                          </svg>
                          訊息
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedRow?.id === p.id && (
                  <tr>
                    <td colSpan={7} className="px-5 py-4 bg-gray-100/50">
                      {expandedRow.mode === "availability" ? (
                        <AvailabilityEditor providerId={p.id} />
                      ) : (
                        <ProviderForm
                          key={p.id}
                          provider={p}
                          onSave={() => { setExpandedRow(null); loadProviders(); }}
                          onCancel={() => setExpandedRow(null)}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>

      {/* Bulk Delete Dialog */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBulkDelete(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-900">批次刪除提供者</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                即將刪除 <span className="font-medium text-red-600">{selectedIds.size}</span> 位提供者。有預約紀錄的提供者無法刪除。
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowBulkDelete(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">取消</button>
                <button
                  onClick={handleBulkDelete}
                  disabled={processingDelete}
                  className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 shadow-sm transition-colors disabled:opacity-50"
                >
                  {processingDelete ? "處理中..." : "確認刪除"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Services Dialog */}
      {showBulkServices && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBulkServices(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">批次編輯服務</h3>
              <p className="text-sm text-gray-500 mb-4">將套用到 {selectedIds.size} 位提供者</p>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">操作方式</label>
                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBulkServicesMode("replace")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      bulkServicesMode === "replace" ? "bg-emerald-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    取代為
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkServicesMode("add")}
                    className={`px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                      bulkServicesMode === "add" ? "bg-emerald-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    新增
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkServicesMode("remove")}
                    className={`px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                      bulkServicesMode === "remove" ? "bg-red-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    移除
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  {bulkServicesMode === "replace" && "每位提供者的現有服務將被取代為下方所選的服務"}
                  {bulkServicesMode === "add" && "下方所選的服務會加入每位提供者的現有服務中"}
                  {bulkServicesMode === "remove" && "下方所選的服務會從每位提供者的服務清單中移除"}
                </p>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-2">選擇服務</label>
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {allServicesList.length === 0 ? (
                    <p className="text-sm text-gray-500 p-4 text-center">尚無服務</p>
                  ) : (
                    allServicesList.map((s) => {
                      const checked = bulkSelectedServiceIds.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setBulkSelectedServiceIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id);
                                else next.add(s.id);
                                return next;
                              });
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                          />
                          <span className="text-sm text-gray-900">{s.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowBulkServices(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">取消</button>
                <button
                  onClick={handleBulkServices}
                  disabled={processingBulkServices || (bulkServicesMode !== "replace" && bulkSelectedServiceIds.size === 0)}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  {processingBulkServices ? "處理中..." : "確認套用"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Availability Dialog */}
      {showBulkAvail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBulkAvail(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">批次編輯時段</h3>
              <p className="text-sm text-gray-500 mb-4">將套用到 {selectedIds.size} 位提供者</p>

              {/* Mode selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">操作方式</label>
                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBulkAvailMode("add")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      bulkAvailMode === "add" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    新增時段
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkAvailMode("clear")}
                    className={`px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                      bulkAvailMode === "clear" ? "bg-red-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    清空所有時段
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  {bulkAvailMode === "add" && "下方設定的時段會加到每位提供者的現有時段中"}
                  {bulkAvailMode === "clear" && "每位提供者的所有時段都會被清空"}
                </p>
              </div>

              {bulkAvailMode === "add" && (
                <>
                  {/* Type selector */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2">時段類型</label>
                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setBulkAvailType("available")}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          bulkAvailType === "available" ? "bg-emerald-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        可預約
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkAvailType("excluded")}
                        className={`px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                          bulkAvailType === "excluded" ? "bg-rose-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        排除
                      </button>
                    </div>
                  </div>

                  {/* Day picker */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2">選擇星期</label>
                    <div className="flex gap-1">
                      {["日", "一", "二", "三", "四", "五", "六"].map((d, idx) => {
                        const active = bulkAvailDays.has(idx);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setBulkAvailDays((prev) => {
                                const next = new Set(prev);
                                if (next.has(idx)) next.delete(idx);
                                else next.add(idx);
                                return next;
                              });
                            }}
                            className={`w-9 h-9 rounded-lg text-xs font-semibold transition-colors ${
                              active
                                ? bulkAvailType === "available" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time range */}
                  <div className="mb-5">
                    <label className="block text-xs font-medium text-gray-500 mb-2">時間區間</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={bulkAvailStart}
                        onChange={(e) => setBulkAvailStart(e.target.value)}
                        className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        type="time"
                        value={bulkAvailEnd}
                        onChange={(e) => setBulkAvailEnd(e.target.value)}
                        className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowBulkAvail(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">取消</button>
                <button
                  onClick={handleBulkAvailability}
                  disabled={processingBulkAvail}
                  className={`inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${
                    bulkAvailMode === "clear" ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {processingBulkAvail ? "處理中..." : "確認套用"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Dialog */}
      {showMessageDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowMessageDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">發送訊息</h3>
              <p className="text-sm text-gray-500 mb-4">將發送給 {selectedIds.size} 位提供者</p>

              {/* Channel selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">發送方式</label>
                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMessageChannel("line")}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                      messageChannel === "line"
                        ? "bg-[#06C755] text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                    LINE
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageChannel("email")}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                      messageChannel === "email"
                        ? "bg-[#2563EB] text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    Email
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  {messageChannel === "line"
                    ? "未連結 LINE 的提供者將自動跳過"
                    : "沒有 Email 的提供者將自動跳過"}
                </p>
              </div>

              {/* Email subject (only for email channel) */}
              {messageChannel === "email" && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">主旨</label>
                  <input
                    type="text"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="Email 主旨"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                  />
                </div>
              )}

              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">訊息內容</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  placeholder="輸入要傳送的訊息..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowMessageDialog(false)}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageText.trim() || (messageChannel === "email" && !messageSubject.trim())}
                  className={`inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${
                    messageChannel === "line" ? "bg-[#06C755] hover:bg-[#05a847]" : "bg-[#2563EB] hover:bg-blue-700"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  {sendingMessage ? "發送中..." : `發送 ${messageChannel === "line" ? "LINE" : "Email"}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
