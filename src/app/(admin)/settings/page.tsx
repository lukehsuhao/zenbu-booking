"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Pagination } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/table-skeleton";

type ReminderRule = {
  id?: string;
  type: string;
  timing: string; // "before" | "after"
  minutesBefore: number;
  serviceId?: string | null;
  serviceIds?: string[]; // array of service IDs; empty = all services
  notifyCustomer?: boolean;
  messageTemplate?: string | null;
  notifyProvider: boolean;
  providerMessageTemplate?: string | null;
  notifyAdmin: boolean;
  adminMessageTemplate?: string | null;
  isActive?: boolean;
};

const UNIT_OPTIONS = [
  { label: "分鐘", value: 1 },
  { label: "小時", value: 60 },
  { label: "天", value: 1440 },
];

function minutesToDisplay(minutes: number): { value: number; unit: number } {
  if (minutes > 0 && minutes % 1440 === 0) return { value: minutes / 1440, unit: 1440 };
  if (minutes > 0 && minutes % 60 === 0) return { value: minutes / 60, unit: 60 };
  return { value: minutes, unit: 1 };
}

function formatMinutes(minutes: number): string {
  if (minutes > 0 && minutes % 1440 === 0) return `${minutes / 1440} 天`;
  if (minutes > 0 && minutes % 60 === 0) return `${minutes / 60} 小時`;
  return `${minutes} 分鐘`;
}

const TEMPLATE_VARIABLES = [
  { key: "{{姓名}}", label: "姓名", sample: "王小明" },
  { key: "{{電話}}", label: "電話", sample: "0912-345-678" },
  { key: "{{Email}}", label: "Email", sample: "example@mail.com" },
  { key: "{{服務名稱}}", label: "服務名稱", sample: "美甲服務" },
  { key: "{{提供者}}", label: "提供者", sample: "Amy" },
  { key: "{{日期}}", label: "日期", sample: "2026/04/10" },
  { key: "{{時間}}", label: "時間", sample: "14:00" },
  { key: "{{備註}}", label: "備註", sample: "需要停車位" },
];

const DEFAULT_MESSAGE = "{{姓名}} 您好，提醒您預約了 {{服務名稱}}，時間為 {{日期}} {{時間}}，服務提供者為 {{提供者}}。如需取消或更改，請提前聯繫我們。";

const DEFAULT_PROVIDER_MESSAGE = "提醒：{{姓名}} 預約了 {{服務名稱}}，時間為 {{日期}} {{時間}}。";

const DEFAULT_ADMIN_MESSAGE = "【新預約通知】{{姓名}} 預約了 {{服務名稱}}，時間：{{日期}} {{時間}}，提供者：{{提供者}}。";

function generatePreview(template: string): string {
  let preview = template;
  for (const v of TEMPLATE_VARIABLES) {
    preview = preview.replaceAll(v.key, v.sample);
  }
  return preview;
}

function ServiceMultiSelect({
  selected,
  allServices,
  onChange,
}: {
  selected: string[];
  allServices: { id: string; name: string }[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const displayText = selected.length === 0
    ? "所有服務"
    : selected.length === 1
    ? allServices.find((s) => s.id === selected[0])?.name || "1 個服務"
    : `${selected.length} 個服務`;

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((i) => i !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-9 min-w-[160px] max-w-[200px] border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate">{displayText}</span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <button
              onClick={() => onChange([])}
              className="text-xs text-[#2563EB] hover:underline"
            >
              清除選取（所有服務）
            </button>
            {selected.length < allServices.length && (
              <button
                onClick={() => onChange(allServices.map((s) => s.id))}
                className="text-xs text-gray-500 hover:text-gray-700 hover:underline ml-auto"
              >
                全選
              </button>
            )}
          </div>
          <div className="py-1">
            {allServices.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">尚無服務</p>
            ) : (
              allServices.map((s) => {
                const checked = selected.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(s.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]/20 cursor-pointer"
                    />
                    <span className="text-gray-700">{s.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [allServices, setAllServices] = useState<{ id: string; name: string }[]>([]);
  const [filterType, setFilterType] = useState("");
  const [filterTiming, setFilterTiming] = useState("");
  const [filterService, setFilterService] = useState("");
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedProviderIndex, setCopiedProviderIndex] = useState<number | null>(null);
  const [copiedAdminIndex, setCopiedAdminIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, "customer" | "provider" | "admin">>({});
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const providerTextareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const adminTextareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  async function loadRules() {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      // Fill in default message for rules that don't have a custom template
      setRules(data.map((r: ReminderRule & { serviceIds?: string | string[] | null }) => {
        // Parse serviceIds: might come as JSON string from DB or already as array
        let svcIds: string[] = [];
        if (Array.isArray(r.serviceIds)) {
          svcIds = r.serviceIds;
        } else if (typeof r.serviceIds === "string" && r.serviceIds) {
          try {
            const parsed = JSON.parse(r.serviceIds);
            if (Array.isArray(parsed)) svcIds = parsed;
          } catch { /* ignore */ }
        } else if (r.serviceId) {
          // Legacy: single serviceId → convert to array
          svcIds = [r.serviceId];
        }
        return {
          ...r,
          serviceIds: svcIds,
          timing: r.timing || "before",
          isActive: r.isActive ?? true,
          notifyCustomer: r.notifyCustomer ?? true,
          messageTemplate: r.messageTemplate || DEFAULT_MESSAGE,
          notifyProvider: r.notifyProvider ?? false,
          providerMessageTemplate: r.providerMessageTemplate || DEFAULT_PROVIDER_MESSAGE,
          notifyAdmin: r.notifyAdmin ?? false,
          adminMessageTemplate: r.adminMessageTemplate || DEFAULT_ADMIN_MESSAGE,
        };
      }));
    } catch { /* ignore */ }
    setLoading(false);
  }

  const { status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    setMounted(true);
    loadRules();
    fetch("/api/admin/services").then(r => r.ok ? r.json() : []).then(data => setAllServices(data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))));
  }, [sessionStatus]);

  function addRule() {
    const newRule: ReminderRule = {
      type: "line",
      timing: "before",
      minutesBefore: 60,
      serviceId: null,
      serviceIds: [],
      notifyCustomer: true,
      messageTemplate: DEFAULT_MESSAGE,
      notifyProvider: false,
      providerMessageTemplate: DEFAULT_PROVIDER_MESSAGE,
      notifyAdmin: false,
      adminMessageTemplate: DEFAULT_ADMIN_MESSAGE,
      isActive: true,
    };
    setRules([newRule, ...rules]);
    setCurrentPage(1);
    setExpandedTemplate(0);
  }

  function removeRule(index: number) {
    if (!confirm("確定要刪除此提醒規則？")) return;
    setRules(rules.filter((_, i) => i !== index));
  }

  function copyMessageToClipboard(index: number) {
    const text = rules[index].messageTemplate || DEFAULT_MESSAGE;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }

  function copyProviderMessageToClipboard(index: number) {
    const text = rules[index].providerMessageTemplate || DEFAULT_PROVIDER_MESSAGE;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedProviderIndex(index);
      setTimeout(() => setCopiedProviderIndex(null), 2000);
    });
  }

  function updateRule(index: number, field: keyof ReminderRule, value: string | number | boolean | string[] | null) {
    setRules(rules.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function insertVariable(index: number, variable: string) {
    const textarea = textareaRefs.current[index];
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = rules[index].messageTemplate || "";
    const newValue = current.substring(0, start) + variable + current.substring(end);
    updateRule(index, "messageTemplate", newValue);
    // Restore cursor position after React re-render
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  }

  function copyAdminMessageToClipboard(index: number) {
    const text = rules[index].adminMessageTemplate || DEFAULT_ADMIN_MESSAGE;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAdminIndex(index);
      setTimeout(() => setCopiedAdminIndex(null), 2000);
    });
  }

  function insertAdminVariable(index: number, variable: string) {
    const textarea = adminTextareaRefs.current[index];
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = rules[index].adminMessageTemplate || "";
    const newValue = current.substring(0, start) + variable + current.substring(end);
    updateRule(index, "adminMessageTemplate", newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  }

  function insertProviderVariable(index: number, variable: string) {
    const textarea = providerTextareaRefs.current[index];
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = rules[index].providerMessageTemplate || "";
    const newValue = current.substring(0, start) + variable + current.substring(end);
    updateRule(index, "providerMessageTemplate", newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  }

  async function saveRules() {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    });
    setSaving(false);
    await loadRules();
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">通知訊息設定</h1>
          <p className="text-sm text-gray-500 mt-1">設定預約前後的自動通知提醒與訊息內容</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addRule}
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            新增規則
          </button>
          <button
            onClick={saveRules}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">通知方式</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              <option value="line">LINE</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">發送時機</label>
            <select
              value={filterTiming}
              onChange={(e) => { setFilterTiming(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              <option value="before">服務前</option>
              <option value="after">服務後</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">適用服務</label>
            <select
              value={filterService}
              onChange={(e) => { setFilterService(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              <option value="__all__">通用（所有服務）</option>
              {allServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        {(filterType || filterTiming || filterService) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => { setFilterType(""); setFilterTiming(""); setFilterService(""); setCurrentPage(1); }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除篩選
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">啟用</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">適用服務</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">通知方式</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">時機</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">時間</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">通知對象</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">訊息</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rules.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <p className="text-gray-500 text-sm">尚無提醒規則</p>
                  <p className="text-gray-500 text-xs mt-1">點擊「新增規則」開始設定</p>
                </td>
              </tr>
            )}
            {(() => {
              const filtered = rules.filter((r) => {
                if (filterType && r.type !== filterType) return false;
                if (filterTiming && (r.timing || "before") !== filterTiming) return false;
                if (filterService === "__all__" && r.serviceIds && r.serviceIds.length > 0) return false;
                if (filterService && filterService !== "__all__" && !(r.serviceIds || []).includes(filterService)) return false;
                return true;
              });
              return filtered;
            })().slice((currentPage - 1) * pageSize, currentPage * pageSize).map((rule, localIdx) => {
              const index = rules.indexOf(rule);
              const isExpanded = expandedTemplate === index;
              const isActive = rule.isActive ?? true;
              return (
                <React.Fragment key={index}>
                  <tr className={`hover:bg-gray-100/50 transition-colors duration-100 ${localIdx % 2 === 1 ? "bg-gray-100/30" : ""}`}>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <button
                        onClick={() => updateRule(index, "isActive", !isActive)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          isActive ? "bg-[#2563EB]" : "bg-slate-200"
                        }`}
                        title={isActive ? "停用" : "啟用"}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          isActive ? "translate-x-5" : "translate-x-1"
                        }`} />
                      </button>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <ServiceMultiSelect
                        selected={rule.serviceIds || []}
                        allServices={allServices}
                        onChange={(ids) => updateRule(index, "serviceIds", ids)}
                      />
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <select
                        value={rule.type}
                        onChange={(e) => updateRule(index, "type", e.target.value)}
                        className="h-9 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                      >
                        <option value="line">LINE</option>
                        <option value="email">Email</option>
                      </select>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="inline-flex h-9 rounded-lg border border-gray-200 overflow-hidden w-fit">
                        <button
                          type="button"
                          onClick={() => updateRule(index, "timing", "before")}
                          className={`px-3 text-xs font-medium transition-colors ${
                            (rule.timing || "before") === "before"
                              ? "bg-[#2563EB] text-white"
                              : "bg-white text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          服務前
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRule(index, "timing", "after")}
                          className={`px-3 text-xs font-medium transition-colors ${
                            rule.timing === "after"
                              ? "bg-[#2563EB] text-white"
                              : "bg-white text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          服務後
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={minutesToDisplay(rule.minutesBefore).value}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const { unit } = minutesToDisplay(rule.minutesBefore);
                            updateRule(index, "minutesBefore", val * unit);
                          }}
                          className="w-16 h-9 border border-gray-200 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-center"
                        />
                        <select
                          value={minutesToDisplay(rule.minutesBefore).unit}
                          onChange={(e) => {
                            const newUnit = Number(e.target.value);
                            const { value } = minutesToDisplay(rule.minutesBefore);
                            updateRule(index, "minutesBefore", value * newUnit);
                          }}
                          className="h-9 border border-gray-200 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                        >
                          {UNIT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateRule(index, "notifyCustomer", !(rule.notifyCustomer ?? true))}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                            (rule.notifyCustomer ?? true)
                              ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200 line-through decoration-gray-400"
                          }`}
                          title="點擊切換通知客戶"
                        >
                          客戶
                        </button>
                        <button
                          onClick={() => updateRule(index, "notifyProvider", !rule.notifyProvider)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                            rule.notifyProvider
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200 line-through decoration-gray-400"
                          }`}
                          title="點擊切換通知提供者"
                        >
                          提供者
                        </button>
                        <button
                          onClick={() => updateRule(index, "notifyAdmin", !rule.notifyAdmin)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                            rule.notifyAdmin
                              ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200 line-through decoration-gray-400"
                          }`}
                          title="點擊切換通知管理員"
                        >
                          管理員
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => setExpandedTemplate(isExpanded ? null : index)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            isExpanded
                              ? "text-[#2563EB] bg-blue-50"
                              : "text-gray-700 hover:bg-slate-100"
                          }`}
                          title="編輯"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          編輯
                        </button>
                        <button
                          onClick={() => removeRule(index)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="刪除"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="px-5 py-4 bg-gray-100/50">
                {/* Tab buttons */}
                <div className="flex gap-0 mb-4 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab({ ...activeTab, [index]: "customer" })}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      (activeTab[index] || "customer") === "customer"
                        ? "text-[#2563EB]"
                        : "text-gray-500 hover:text-slate-700"
                    }`}
                  >
                    客戶訊息
                    {(activeTab[index] || "customer") === "customer" && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-t" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab({ ...activeTab, [index]: "provider" })}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeTab[index] === "provider"
                        ? "text-[#2563EB]"
                        : "text-gray-500 hover:text-slate-700"
                    }`}
                  >
                    提供者訊息
                    {activeTab[index] === "provider" && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-t" />
                    )}
                    {rule.notifyProvider && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab({ ...activeTab, [index]: "admin" })}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeTab[index] === "admin"
                        ? "text-[#2563EB]"
                        : "text-gray-500 hover:text-slate-700"
                    }`}
                  >
                    管理員訊息
                    {activeTab[index] === "admin" && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-t" />
                    )}
                    {rule.notifyAdmin && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    )}
                  </button>
                </div>

                {/* Customer message tab */}
                {(activeTab[index] || "customer") === "customer" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-900">客戶訊息</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyMessageToClipboard(index)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                        >
                          {copiedIndex === index ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              <span className="text-emerald-500">已複製</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                              </svg>
                              複製訊息
                            </>
                          )}
                        </button>
                        {(rule.messageTemplate || "") !== DEFAULT_MESSAGE && (
                          <button
                            onClick={() => updateRule(index, "messageTemplate", DEFAULT_MESSAGE)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                            </svg>
                            恢復預設
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      ref={(el) => { textareaRefs.current[index] = el; }}
                      value={rule.messageTemplate || DEFAULT_MESSAGE}
                      onChange={(e) => updateRule(index, "messageTemplate", e.target.value)}
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                    />

                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">可用變數（點擊插入）：</p>
                      <div className="flex flex-wrap gap-2">
                        {TEMPLATE_VARIABLES.map((v) => (
                          <button
                            key={v.key}
                            onClick={() => insertVariable(index, v.key)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-[#2563EB] hover:bg-blue-100 transition-colors border border-blue-100"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2">預覽效果：</p>
                      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">
                        {generatePreview(rule.messageTemplate || DEFAULT_MESSAGE)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Provider message tab */}
                {activeTab[index] === "provider" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-900">提供者訊息</h4>
                    </div>

                    {/* Toggle for notifyProvider */}
                    <label className="inline-flex items-center gap-2 cursor-pointer mb-4">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={rule.notifyProvider}
                          onChange={(e) => updateRule(index, "notifyProvider", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2563EB]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]" />
                      </div>
                      <span className="text-sm text-slate-700">啟用提供者通知</span>
                    </label>

                    {rule.notifyProvider && (
                      <div>
                        <div className="flex items-center justify-end mb-2 gap-1">
                          <button
                            onClick={() => copyProviderMessageToClipboard(index)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                          >
                            {copiedProviderIndex === index ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                <span className="text-emerald-500">已複製</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                </svg>
                                複製訊息
                              </>
                            )}
                          </button>
                          {(rule.providerMessageTemplate || "") !== DEFAULT_PROVIDER_MESSAGE && (
                            <button
                              onClick={() => updateRule(index, "providerMessageTemplate", DEFAULT_PROVIDER_MESSAGE)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                              </svg>
                              恢復預設
                            </button>
                          )}
                        </div>

                        <textarea
                          ref={(el) => { providerTextareaRefs.current[index] = el; }}
                          value={rule.providerMessageTemplate || DEFAULT_PROVIDER_MESSAGE}
                          onChange={(e) => updateRule(index, "providerMessageTemplate", e.target.value)}
                          rows={4}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                        />

                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-2">可用變數（點擊插入）：</p>
                          <div className="flex flex-wrap gap-2">
                            {TEMPLATE_VARIABLES.map((v) => (
                              <button
                                key={v.key}
                                onClick={() => insertProviderVariable(index, v.key)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-[#2563EB] hover:bg-blue-100 transition-colors border border-blue-100"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs text-gray-500 mb-2">預覽效果：</p>
                          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">
                            {generatePreview(rule.providerMessageTemplate || DEFAULT_PROVIDER_MESSAGE)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin message tab */}
                {activeTab[index] === "admin" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-900">管理員訊息</h4>
                    </div>

                    {/* Toggle for notifyAdmin */}
                    <label className="inline-flex items-center gap-2 cursor-pointer mb-4">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={rule.notifyAdmin}
                          onChange={(e) => updateRule(index, "notifyAdmin", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2563EB]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                      </div>
                      <span className="text-sm text-slate-700">啟用管理員通知</span>
                    </label>

                    {rule.notifyAdmin && (
                      <div>
                        <div className="flex items-center justify-end mb-2 gap-1">
                          <button
                            onClick={() => copyAdminMessageToClipboard(index)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                          >
                            {copiedAdminIndex === index ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                <span className="text-emerald-500">已複製</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                </svg>
                                複製訊息
                              </>
                            )}
                          </button>
                          {(rule.adminMessageTemplate || "") !== DEFAULT_ADMIN_MESSAGE && (
                            <button
                              onClick={() => updateRule(index, "adminMessageTemplate", DEFAULT_ADMIN_MESSAGE)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                              </svg>
                              恢復預設
                            </button>
                          )}
                        </div>

                        <textarea
                          ref={(el) => { adminTextareaRefs.current[index] = el; }}
                          value={rule.adminMessageTemplate || DEFAULT_ADMIN_MESSAGE}
                          onChange={(e) => updateRule(index, "adminMessageTemplate", e.target.value)}
                          rows={4}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                        />

                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-2">可用變數（點擊插入）：</p>
                          <div className="flex flex-wrap gap-2">
                            {TEMPLATE_VARIABLES.map((v) => (
                              <button
                                key={v.key}
                                onClick={() => insertAdminVariable(index, v.key)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-[#2563EB] hover:bg-blue-100 transition-colors border border-blue-100"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs text-gray-500 mb-2">預覽效果：</p>
                          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">
                            {generatePreview(rule.adminMessageTemplate || DEFAULT_ADMIN_MESSAGE)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
          totalPages={Math.ceil(rules.filter((r) => {
            if (filterType && r.type !== filterType) return false;
            if (filterTiming && (r.timing || "before") !== filterTiming) return false;
            if (filterService === "__all__" && r.serviceIds && r.serviceIds.length > 0) return false;
            if (filterService && filterService !== "__all__" && !(r.serviceIds || []).includes(filterService)) return false;
            return true;
          }).length / pageSize)}
          totalItems={rules.filter((r) => {
            if (filterType && r.type !== filterType) return false;
            if (filterTiming && (r.timing || "before") !== filterTiming) return false;
            if (filterService === "__all__" && r.serviceIds && r.serviceIds.length > 0) return false;
            if (filterService && filterService !== "__all__" && !(r.serviceIds || []).includes(filterService)) return false;
            return true;
          }).length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
}
