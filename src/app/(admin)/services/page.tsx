"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { ServiceForm } from "@/components/admin/service-form";
import { Pagination } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/table-skeleton";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  isActive: boolean;
  assignmentMode: string;
  requiresApproval: boolean;
  providerServices: { provider: { id: string; name: string } }[];
};

type FormField = {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
  enabled: boolean;
  sortOrder: number;
  isBuiltin: boolean;
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "單行文字",
  textarea: "多行文字",
  radio: "單選",
  checkbox: "多選",
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterApproval, setFilterApproval] = useState("");
  const [filterPricing, setFilterPricing] = useState("");

  // Link popover state
  const [linkPopoverId, setLinkPopoverId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const linkPopoverRef = useRef<HTMLDivElement>(null);

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";

  function getServiceLink(serviceId: string): string {
    if (!liffId) return "";
    return `https://liff.line.me/${liffId}?service=${serviceId}`;
  }

  useEffect(() => {
    if (!linkPopoverId) return;
    function handleClickOutside(e: MouseEvent) {
      if (linkPopoverRef.current && !linkPopoverRef.current.contains(e.target as Node)) {
        setLinkPopoverId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [linkPopoverId]);

  async function copyServiceLink(serviceId: string) {
    const url = getServiceLink(serviceId);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(serviceId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }

  function openServiceLink(serviceId: string) {
    const url = getServiceLink(serviceId);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    setLinkPopoverId(null);
  }

  // Per-service form fields state
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [serviceFields, setServiceFields] = useState<Record<string, FormField[]>>({});
  const [savingFields, setSavingFields] = useState<string | null>(null);
  const [loadedServices, setLoadedServices] = useState<string[]>([]);

  // Add field form state
  const [addingFieldService, setAddingFieldService] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [addingField, setAddingField] = useState(false);
  const [addFieldError, setAddFieldError] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  async function loadServices() {
    try {
      const res = await fetch("/api/admin/services");
      setServices(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  const loadFieldsForService = useCallback(async (serviceId: string) => {
    try {
      const res = await fetch(`/api/admin/form-fields?serviceId=${serviceId}`);
      if (res.ok) {
        const fields = await res.json();
        setServiceFields((prev) => ({ ...prev, [serviceId]: fields }));
      } else {
        setServiceFields((prev) => ({ ...prev, [serviceId]: [] }));
      }
    } catch {
      setServiceFields((prev) => ({ ...prev, [serviceId]: [] }));
    }
    setLoadedServices((prev) => prev.includes(serviceId) ? prev : [...prev, serviceId]);
  }, []);

  useEffect(() => { loadServices(); }, []);

  useEffect(() => {
    if (expandedService && !loadedServices.includes(expandedService)) {
      loadFieldsForService(expandedService);
    }
  }, [expandedService, loadedServices, loadFieldsForService]);

  async function toggleActive(service: Service) {
    await fetch("/api/admin/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...service, isActive: !service.isActive }),
    });
    loadServices();
  }

  function toggleExpanded(serviceId: string) {
    setExpandedService((prev) => (prev === serviceId ? null : serviceId));
  }

  function toggleFormField(serviceId: string, fieldId: string, prop: "enabled" | "required") {
    setServiceFields((prev) => ({
      ...prev,
      [serviceId]: (prev[serviceId] || []).map((f) =>
        f.id === fieldId ? { ...f, [prop]: !f[prop] } : f
      ),
    }));
  }

  async function saveFormFields(serviceId: string) {
    setSavingFields(serviceId);
    await fetch("/api/admin/form-fields", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: serviceFields[serviceId] }),
    });
    setSavingFields(null);
  }

  async function addFormField(serviceId: string) {
    if (!newFieldLabel.trim()) {
      setAddFieldError("請輸入欄位名稱");
      return;
    }
    if ((newFieldType === "radio" || newFieldType === "checkbox") && !newFieldOptions.trim()) {
      setAddFieldError("請輸入至少一個選項");
      return;
    }
    setAddFieldError("");
    setAddingField(true);

    const options = (newFieldType === "radio" || newFieldType === "checkbox")
      ? newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean)
      : null;

    try {
      const res = await fetch("/api/admin/form-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, label: newFieldLabel, type: newFieldType, options, required: newFieldRequired }),
      });
      if (res.ok) {
        setAddingFieldService(null);
        setNewFieldLabel("");
        setNewFieldType("text");
        setNewFieldOptions("");
        setNewFieldRequired(false);
        setAddFieldError("");
        await loadFieldsForService(serviceId);
      }
    } finally {
      setAddingField(false);
    }
  }

  async function deleteFormField(serviceId: string, fieldId: string) {
    if (!confirm("確定要刪除此欄位？")) return;
    await fetch(`/api/admin/form-fields?id=${fieldId}`, { method: "DELETE" });
    loadFieldsForService(serviceId);
  }

  // All unique providers for filter dropdown
  const allProviders = Array.from(
    new Map(
      services.flatMap((s) => s.providerServices.map((ps) => [ps.provider.id, ps.provider.name]))
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  // Filtered services
  const filteredServices = services.filter((s) => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterProvider && !s.providerServices.some((ps) => ps.provider.id === filterProvider)) return false;
    if (filterApproval === "yes" && !s.requiresApproval) return false;
    if (filterApproval === "no" && s.requiresApproval) return false;
    if (filterPricing === "free" && s.price > 0) return false;
    if (filterPricing === "paid" && s.price <= 0) return false;
    return true;
  });

  // Pagination
  const totalItems = filteredServices.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedServices = filteredServices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">服務管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理可預約的服務項目</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新增服務
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">名稱搜尋</label>
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="搜尋服務名稱..."
                className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">服務人員</label>
            <select
              value={filterProvider}
              onChange={(e) => { setFilterProvider(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              {allProviders.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">審核狀態</label>
            <select
              value={filterApproval}
              onChange={(e) => { setFilterApproval(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              <option value="yes">需審核</option>
              <option value="no">免審核</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">定價類型</label>
            <select
              value={filterPricing}
              onChange={(e) => { setFilterPricing(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              <option value="free">免費</option>
              <option value="paid">付費</option>
            </select>
          </div>
        </div>
        {(searchQuery || filterProvider || filterApproval || filterPricing) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => { setSearchQuery(""); setFilterProvider(""); setFilterApproval(""); setFilterPricing(""); setCurrentPage(1); }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除篩選
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <ServiceForm
            service={editing || undefined}
            onSave={() => { setShowForm(false); loadServices(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">啟用</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">服務名稱</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">時長</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">定價</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">指派方式</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">審核</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">服務人員</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedServices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-gray-500 text-sm">
                  沒有符合條件的服務
                </td>
              </tr>
            )}
            {paginatedServices.map((s, idx) => (
              <React.Fragment key={s.id}>
                <tr className={`hover:bg-gray-100/50 transition-colors duration-100 ${idx % 2 === 1 ? "bg-gray-100/30" : ""}`}>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        s.isActive ? "bg-[#2563EB]" : "bg-slate-200"
                      }`}
                      title={s.isActive ? "停用" : "啟用"}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        s.isActive ? "translate-x-5" : "translate-x-1"
                      }`} />
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-900">{s.name}</div>
                    {s.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.description}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">{s.duration} 分鐘</td>
                  <td className="px-5 py-3.5">
                    {s.price > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-xs font-medium text-amber-700">
                        ${s.price}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-xs font-medium text-emerald-600">
                        免費
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      s.assignmentMode === "round_robin"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-slate-100 text-gray-500"
                    }`}>
                      {s.assignmentMode === "round_robin" ? "輪流指派" : "手動選擇"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {s.requiresApproval ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600">需審核</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-gray-500">免審核</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {s.providerServices.length === 0 ? (
                        <span className="text-xs text-slate-300">-</span>
                      ) : (
                        <>
                          {s.providerServices.slice(0, 2).map((ps) => (
                            <span key={ps.provider.id} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                              {ps.provider.name}
                            </span>
                          ))}
                          {s.providerServices.length > 2 && (
                            <span className="relative group inline-block">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-gray-500 font-medium cursor-default">
                                +{s.providerServices.length - 2}
                              </span>
                              <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-20 whitespace-nowrap bg-gray-700 text-white text-[11px] px-2 py-1 rounded-md shadow-lg">
                                <span className="flex flex-col">
                                  {s.providerServices.slice(2).map((ps) => (
                                    <span key={ps.provider.id}>{ps.provider.name}</span>
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
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <div className="relative" ref={linkPopoverId === s.id ? linkPopoverRef : null}>
                        <button
                          onClick={() => setLinkPopoverId(linkPopoverId === s.id ? null : s.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            linkPopoverId === s.id
                              ? "text-[#2563EB] bg-blue-50"
                              : "text-gray-700 hover:text-[#2563EB] hover:bg-blue-50"
                          }`}
                          title="預約連結"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                          </svg>
                          連結
                        </button>
                        {linkPopoverId === s.id && (
                          <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                              <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">預約連結</p>
                              <p className="text-xs text-gray-700 font-mono truncate" title={getServiceLink(s.id)}>
                                {getServiceLink(s.id) || "LIFF ID 未設定"}
                              </p>
                            </div>
                            <button
                              onClick={() => copyServiceLink(s.id)}
                              className="w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                            >
                              {copiedId === s.id ? (
                                <>
                                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                  <span className="text-emerald-600">已複製到剪貼簿</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                  </svg>
                                  <span>複製預約連結</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => openServiceLink(s.id)}
                              className="w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                              <span>開啟新分頁</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleExpanded(s.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          expandedService === s.id
                            ? "text-[#2563EB] bg-blue-50"
                            : "text-gray-700 hover:bg-slate-100"
                        }`}
                        title="表單欄位"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                        表單
                      </button>
                      <button
                        onClick={() => { setEditing(s); setShowForm(true); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-[#2563EB] hover:bg-blue-50 transition-colors whitespace-nowrap"
                        title="編輯服務"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        編輯
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedService === s.id && (
                  <tr>
                    <td colSpan={8} className="px-5 py-4 bg-gray-100/50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-gray-900">表單欄位</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setAddingFieldService(addingFieldService === s.id ? null : s.id);
                        setNewFieldLabel("");
                        setNewFieldType("text");
                        setNewFieldOptions("");
                        setNewFieldRequired(false);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2563EB] text-white hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      新增欄位
                    </button>
                    <button
                      onClick={() => saveFormFields(s.id)}
                      disabled={savingFields === s.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {savingFields === s.id ? "儲存中..." : "儲存"}
                    </button>
                  </div>
                </div>

                {/* Add field form */}
                {addingFieldService === s.id && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
                    <h5 className="text-xs font-bold text-gray-900 mb-3">新增自訂欄位</h5>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">欄位名稱 <span className="text-red-500">*</span></label>
                        <input
                          value={newFieldLabel}
                          onChange={(e) => { setNewFieldLabel(e.target.value); setAddFieldError(""); }}
                          placeholder="例：公司名稱"
                          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${addFieldError && !newFieldLabel.trim() ? "border-red-400" : "border-gray-200"}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">欄位類型</label>
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        >
                          <option value="text">單行文字</option>
                          <option value="textarea">多行文字</option>
                          <option value="radio">單選</option>
                          <option value="checkbox">多選</option>
                        </select>
                      </div>
                    </div>
                    {(newFieldType === "radio" || newFieldType === "checkbox") && (
                      <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">選項（以逗號分隔）</label>
                        <input
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                          placeholder="選項A, 選項B, 選項C"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        />
                      </div>
                    )}
                    {addFieldError && (
                      <p className="text-xs text-red-500 mb-2">{addFieldError}</p>
                    )}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} className="rounded" />
                        必填
                      </label>
                      <div className="flex-1" />
                      <button onClick={() => { setAddingFieldService(null); setAddFieldError(""); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-slate-700">取消</button>
                      <button
                        onClick={() => addFormField(s.id)}
                        disabled={addingField}
                        className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingField ? "新增中..." : "新增"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Field list */}
                <div className="space-y-2">
                  {(serviceFields[s.id] || []).map((field) => (
                    <div key={field.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        {/* Enable toggle */}
                        <button
                          onClick={() => toggleFormField(s.id, field.id, "enabled")}
                          className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${field.enabled ? "bg-[#2563EB]" : "bg-slate-300"}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${field.enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                        </button>

                        {/* Field info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${field.enabled ? "text-gray-900" : "text-gray-500"}`}>{field.label}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-gray-500">{FIELD_TYPE_LABELS[field.type] || field.type}</span>
                            {field.isBuiltin && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">內建</span>}
                          </div>
                          {field.options && (
                            <p className="text-xs text-gray-500 mt-0.5">選項：{field.options.join("、")}</p>
                          )}
                          {!field.enabled && field.required && (
                            <p className="text-xs text-amber-500 mt-0.5">未啟用，即使勾選必填也不會顯示在表單中</p>
                          )}
                        </div>

                        {/* Required toggle */}
                        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={() => toggleFormField(s.id, field.id, "required")}
                            className="rounded"
                          />
                          必填
                        </label>

                        {/* Delete (custom only) */}
                        {!field.isBuiltin && (
                          <button
                            onClick={() => deleteFormField(s.id, field.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(serviceFields[s.id] || []).length === 0 && !loadedServices.includes(s.id) && (
                    <p className="text-xs text-gray-500 text-center py-4">載入中...</p>
                  )}
                  {(serviceFields[s.id] || []).length === 0 && loadedServices.includes(s.id) && (
                    <p className="text-xs text-gray-500 text-center py-4">尚無表單欄位</p>
                  )}
                </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 mt-3">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
}
