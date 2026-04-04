"use client";

import { useEffect, useState, useRef } from "react";

type ReminderRule = {
  id?: string;
  type: string;
  minutesBefore: number;
  serviceId?: string | null;
  messageTemplate?: string | null;
  notifyProvider: boolean;
  providerMessageTemplate?: string | null;
};

const MINUTES_OPTIONS = [
  { label: "前1小時", value: 60 },
  { label: "前3小時", value: 180 },
  { label: "前1天", value: 1440 },
  { label: "前2天", value: 2880 },
];

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

function generatePreview(template: string): string {
  let preview = template;
  for (const v of TEMPLATE_VARIABLES) {
    preview = preview.replaceAll(v.key, v.sample);
  }
  return preview;
}

export default function SettingsPage() {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedProviderIndex, setCopiedProviderIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, "customer" | "provider">>({});
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const providerTextareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  async function loadRules() {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    // Fill in default message for rules that don't have a custom template
    setRules(data.map((r: ReminderRule) => ({
      ...r,
      messageTemplate: r.messageTemplate || DEFAULT_MESSAGE,
      notifyProvider: r.notifyProvider ?? false,
      providerMessageTemplate: r.providerMessageTemplate || DEFAULT_PROVIDER_MESSAGE,
    })));
  }

  useEffect(() => {
    loadRules();
  }, []);

  function addRule() {
    setRules([...rules, { type: "line", minutesBefore: 60, messageTemplate: DEFAULT_MESSAGE, notifyProvider: false, providerMessageTemplate: DEFAULT_PROVIDER_MESSAGE }]);
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

  function updateRule(index: number, field: keyof ReminderRule, value: string | number | boolean | null) {
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">提醒設定</h1>
          <p className="text-sm text-slate-500 mt-1">設定預約前的自動提醒通知與訊息內容</p>
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

      <div className="space-y-3">
        {rules.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <p className="text-slate-500 text-sm">尚無提醒規則</p>
            <p className="text-slate-400 text-xs mt-1">點擊「新增規則」開始設定</p>
          </div>
        )}
        {rules.map((rule, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200">
            <div className="p-5">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  rule.type === "line" ? "bg-emerald-50" : "bg-blue-50"
                }`}>
                  {rule.type === "line" ? (
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  )}
                </div>

                {/* Fields */}
                <div className="flex-1 flex items-center gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">通知方式</label>
                    <select
                      value={rule.type}
                      onChange={(e) => updateRule(index, "type", e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                    >
                      <option value="line">LINE</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">提前時間</label>
                    <select
                      value={rule.minutesBefore}
                      onChange={(e) => updateRule(index, "minutesBefore", Number(e.target.value))}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                    >
                      {MINUTES_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Template toggle */}
                <button
                  onClick={() => setExpandedTemplate(expandedTemplate === index ? null : index)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    expandedTemplate === index
                      ? "text-[#2563EB] bg-blue-50"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  編輯訊息
                </button>

                {/* Delete */}
                <button
                  onClick={() => removeRule(index)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Collapsible Message Editor */}
            {expandedTemplate === index && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 rounded-b-xl">
                {/* Tab buttons */}
                <div className="flex gap-0 mb-4 border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab({ ...activeTab, [index]: "customer" })}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      (activeTab[index] || "customer") === "customer"
                        ? "text-[#2563EB]"
                        : "text-slate-500 hover:text-slate-700"
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
                        : "text-slate-500 hover:text-slate-700"
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
                </div>

                {/* Customer message tab */}
                {(activeTab[index] || "customer") === "customer" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-[#1E293B]">客戶訊息</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyMessageToClipboard(index)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
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
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                    />

                    <div className="mt-3">
                      <p className="text-xs text-slate-500 mb-2">可用變數（點擊插入）：</p>
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
                      <p className="text-xs text-slate-500 mb-2">預覽效果：</p>
                      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">
                        {generatePreview(rule.messageTemplate || DEFAULT_MESSAGE)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Provider message tab */}
                {activeTab[index] === "provider" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-[#1E293B]">提供者訊息</h4>
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
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
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
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
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                        />

                        <div className="mt-3">
                          <p className="text-xs text-slate-500 mb-2">可用變數（點擊插入）：</p>
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
                          <p className="text-xs text-slate-500 mb-2">預覽效果：</p>
                          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">
                            {generatePreview(rule.providerMessageTemplate || DEFAULT_PROVIDER_MESSAGE)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
