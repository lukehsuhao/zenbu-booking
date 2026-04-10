"use client";

import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/admin/table-skeleton";

type Promotion = {
  id: string;
  name: string;
  description: string | null;
  serviceIds: string | null;
  rewardType: string;
  rewardPoints: number;
  rewardTickets: number;
  ticketServiceId: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  participantCount?: number;
};

type ServiceOption = { id: string; name: string };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function isExpired(endDate: string) {
  return new Date(endDate) < new Date();
}

function toInputDate(d: string) {
  return new Date(d).toISOString().slice(0, 10);
}

function rewardLabel(p: Promotion, services: ServiceOption[]) {
  const parts: string[] = [];
  if ((p.rewardType === "points" || p.rewardType === "both") && p.rewardPoints > 0) {
    parts.push(`送 ${p.rewardPoints} 點`);
  }
  if ((p.rewardType === "tickets" || p.rewardType === "both") && p.rewardTickets > 0) {
    const svc = services.find((s) => s.id === p.ticketServiceId);
    parts.push(`送 ${p.rewardTickets} 張票券${svc ? `（${svc.name}）` : ""}`);
  }
  return parts.join(" + ") || "無獎勵";
}

function parseServiceIds(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [rewardType, setRewardType] = useState("points");
  const [rewardPoints, setRewardPoints] = useState(0);
  const [rewardTickets, setRewardTickets] = useState(0);
  const [ticketServiceId, setTicketServiceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function loadPromotions() {
    try {
      const res = await fetch("/api/admin/promotions");
      if (res.ok) setPromotions(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadServices() {
    const res = await fetch("/api/admin/services");
    if (res.ok) {
      const data = await res.json();
      setServices(data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
    }
  }

  useEffect(() => {
    loadPromotions();
    loadServices();
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
    setSelectedServiceIds([]);
    setRewardType("points");
    setRewardPoints(0);
    setRewardTickets(0);
    setTicketServiceId("");
    setStartDate("");
    setEndDate("");
    setIsActive(true);
    setEditing(null);
  }

  function openAdd() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(p: Promotion) {
    setEditing(p);
    setName(p.name);
    setDescription(p.description || "");
    setSelectedServiceIds(parseServiceIds(p.serviceIds));
    setRewardType(p.rewardType);
    setRewardPoints(p.rewardPoints);
    setRewardTickets(p.rewardTickets);
    setTicketServiceId(p.ticketServiceId || "");
    setStartDate(toInputDate(p.startDate));
    setEndDate(toInputDate(p.endDate));
    setIsActive(p.isActive);
    setShowForm(true);
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const body = {
      id: editing?.id,
      name,
      description,
      serviceIds: selectedServiceIds.length > 0 ? JSON.stringify(selectedServiceIds) : null,
      rewardType,
      rewardPoints: rewardType === "points" || rewardType === "both" ? rewardPoints : 0,
      rewardTickets: rewardType === "tickets" || rewardType === "both" ? rewardTickets : 0,
      ticketServiceId: (rewardType === "tickets" || rewardType === "both") ? ticketServiceId || null : null,
      startDate,
      endDate,
      isActive,
    };
    await fetch("/api/admin/promotions", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setShowForm(false);
    resetForm();
    loadPromotions();
  }

  async function toggleActiveStatus(p: Promotion) {
    await fetch("/api/admin/promotions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, isActive: !p.isActive }),
    });
    loadPromotions();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此活動？")) return;
    await fetch(`/api/admin/promotions?id=${id}`, { method: "DELETE" });
    loadPromotions();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">活動設定</h1>
          <p className="text-sm text-gray-500 mt-1">管理促銷活動與獎勵方案</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新增活動
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-5">{editing ? "編輯活動" : "新增活動"}</h3>

            <div className="space-y-6">
              {/* 活動名稱 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">活動名稱</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  placeholder="例：春季限時送點活動"
                  required
                />
              </div>

              {/* 說明 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">活動說明</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  placeholder="活動描述（選填）"
                />
              </div>

              {/* 適用服務 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">適用服務</label>
                <p className="text-xs text-gray-500 mb-2">未選擇任何服務 = 適用全部服務</p>
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-150 ${
                        selectedServiceIds.includes(s.id)
                          ? "bg-blue-50 text-[#2563EB] border-2 border-[#2563EB]"
                          : "bg-[#F8FAFC] text-gray-700 border border-gray-200 hover:border-slate-300"
                      }`}
                    >
                      {selectedServiceIds.includes(s.id) ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      )}
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 獎勵類型 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">獎勵類型</label>
                <div className="flex gap-3">
                  {[
                    { value: "points", label: "送點數" },
                    { value: "tickets", label: "送票券" },
                    { value: "both", label: "送點數+票券" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rewardType"
                        value={opt.value}
                        checked={rewardType === opt.value}
                        onChange={(e) => setRewardType(e.target.value)}
                        className="accent-[#2563EB]"
                      />
                      <span className="text-sm text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 點數 */}
              {(rewardType === "points" || rewardType === "both") && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">贈送點數</label>
                  <input
                    type="number"
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    min={0}
                  />
                </div>
              )}

              {/* 票券 */}
              {(rewardType === "tickets" || rewardType === "both") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">贈送票券張數</label>
                    <input
                      type="number"
                      value={rewardTickets}
                      onChange={(e) => setRewardTickets(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">票券適用服務</label>
                    <select
                      value={ticketServiceId}
                      onChange={(e) => setTicketServiceId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    >
                      <option value="">請選擇服務</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* 活動期間 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">開始日期</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">結束日期</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              {/* 啟用 */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-900">啟用活動</label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    isActive ? "bg-[#2563EB]" : "bg-slate-200"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    isActive ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150 disabled:opacity-50"
                >
                  {saving ? "儲存中..." : "儲存"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="bg-slate-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors duration-150"
                >
                  取消
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">名稱搜尋</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="搜尋活動名稱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">獎勵類型</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              <option value="points">送點數</option>
              <option value="tickets">送票券</option>
              <option value="both">送點數+票券</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">活動狀態</label>
            <div className="flex h-10 bg-white rounded-lg border border-gray-200 overflow-hidden">
              {[
                { value: "", label: "全部" },
                { value: "active", label: "進行中" },
                { value: "expired", label: "已結束" },
                { value: "inactive", label: "已停用" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`flex-1 text-xs font-medium border-r last:border-r-0 border-gray-200 transition-colors ${
                    statusFilter === opt.value ? "bg-[#2563EB] text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {(searchQuery || typeFilter || statusFilter) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => { setSearchQuery(""); setTypeFilter(""); setStatusFilter(""); }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除篩選
            </button>
          </div>
        )}
      </div>

      {/* Promotion table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">啟用</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">活動名稱</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">活動期間</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">獎勵</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">適用服務</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">參與人數</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">狀態</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(() => {
              const filtered = promotions
                .filter((p) => {
                  if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                  if (typeFilter && p.rewardType !== typeFilter) return false;
                  if (statusFilter === "active" && (isExpired(p.endDate) || !p.isActive)) return false;
                  if (statusFilter === "expired" && !isExpired(p.endDate)) return false;
                  if (statusFilter === "inactive" && p.isActive) return false;
                  return true;
                })
                .sort((a, b) => {
                  const aExpired = isExpired(a.endDate);
                  const bExpired = isExpired(b.endDate);
                  if (aExpired !== bExpired) return aExpired ? 1 : -1;
                  if (!aExpired && !bExpired) return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
                  return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
                });

              if (filtered.length === 0) return (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p className="text-gray-500 text-sm">
                      {promotions.length === 0 ? "尚未建立任何活動" : "沒有符合篩選條件的活動"}
                    </p>
                  </td>
                </tr>
              );

              return filtered.map((p, idx) => {
                const expired = isExpired(p.endDate);
                const svcIds = parseServiceIds(p.serviceIds);
                return (
                  <tr key={p.id} className={`hover:bg-gray-100/50 transition-colors duration-100 ${idx % 2 === 1 ? "bg-gray-100/30" : ""}`}>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActiveStatus(p)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          p.isActive ? "bg-[#2563EB]" : "bg-slate-200"
                        }`}
                        title={p.isActive ? "停用" : "啟用"}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          p.isActive ? "translate-x-5" : "translate-x-1"
                        }`} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      {p.description && <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-700 whitespace-nowrap">
                      {formatDate(p.startDate)} ~ {formatDate(p.endDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-xs font-medium text-emerald-600">
                        {rewardLabel(p, services)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {svcIds.length === 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-gray-500 font-medium">全部服務</span>
                        ) : (
                          svcIds.slice(0, 3).map((sid) => {
                            const svc = services.find((s) => s.id === sid);
                            return (
                              <span key={sid} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                                {svc?.name || sid}
                              </span>
                            );
                          })
                        )}
                        {svcIds.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-gray-500 font-medium">+{svcIds.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-xs font-medium text-[#2563EB]">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        {p.participantCount ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {expired ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-500">已過期</span>
                      ) : p.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600">進行中</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-gray-500">已停用</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-[#2563EB] hover:bg-blue-50 transition-colors whitespace-nowrap"
                          title="編輯活動"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="刪除"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
