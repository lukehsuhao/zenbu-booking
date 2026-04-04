"use client";

import { useEffect, useState, useCallback } from "react";
import { ServiceForm } from "@/components/admin/service-form";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
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
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);

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
    const res = await fetch("/api/admin/services");
    setServices(await res.json());
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">服務管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理可預約的服務項目</p>
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

      {showForm && (
        <div className="mb-6">
          <ServiceForm
            service={editing || undefined}
            onSave={() => { setShowForm(false); loadServices(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="space-y-3">
        {services.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.isActive ? "bg-blue-50" : "bg-slate-100"}`}>
                    <svg className={`w-5 h-5 ${s.isActive ? "text-[#2563EB]" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1E293B]">{s.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {s.duration} 分鐘
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        s.assignmentMode === "round_robin"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {s.assignmentMode === "round_robin" ? "輪流指派" : "手動選擇"}
                      </span>
                      {s.requiresApproval && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600">
                          需審核
                        </span>
                      )}
                      {s.description && (
                        <span className="text-xs text-slate-400">{s.description}</span>
                      )}
                    </div>
                    {s.providerServices.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400">人員：</span>
                        {s.providerServices.map((ps) => (
                          <span key={ps.provider.id} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                            {ps.provider.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleActive(s)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                      s.isActive ? "bg-[#2563EB]" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        s.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-medium w-8 ${s.isActive ? "text-[#2563EB]" : "text-slate-400"}`}>
                    {s.isActive ? "啟用" : "停用"}
                  </span>
                  <button
                    onClick={() => toggleExpanded(s.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      expandedService === s.id
                        ? "text-[#2563EB] bg-blue-50"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                    表單欄位
                  </button>
                  <button
                    onClick={() => { setEditing(s); setShowForm(true); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    編輯
                  </button>
                </div>
              </div>
            </div>

            {/* Collapsible Form Fields Section */}
            {expandedService === s.id && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 rounded-b-xl">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-[#1E293B]">表單欄位</h4>
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
                  <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
                    <h5 className="text-xs font-bold text-[#1E293B] mb-3">新增自訂欄位</h5>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">欄位名稱 <span className="text-red-500">*</span></label>
                        <input
                          value={newFieldLabel}
                          onChange={(e) => { setNewFieldLabel(e.target.value); setAddFieldError(""); }}
                          placeholder="例：公司名稱"
                          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${addFieldError && !newFieldLabel.trim() ? "border-red-400" : "border-slate-200"}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">欄位類型</label>
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
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
                        <label className="block text-xs text-slate-500 mb-1">選項（以逗號分隔）</label>
                        <input
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                          placeholder="選項A, 選項B, 選項C"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
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
                      <button onClick={() => { setAddingFieldService(null); setAddFieldError(""); }} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">取消</button>
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
                    <div key={field.id} className="bg-white rounded-xl border border-slate-200 p-4">
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
                            <span className={`text-sm font-medium ${field.enabled ? "text-[#1E293B]" : "text-slate-400"}`}>{field.label}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{FIELD_TYPE_LABELS[field.type] || field.type}</span>
                            {field.isBuiltin && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">內建</span>}
                          </div>
                          {field.options && (
                            <p className="text-xs text-slate-400 mt-0.5">選項：{field.options.join("、")}</p>
                          )}
                          {!field.enabled && field.required && (
                            <p className="text-xs text-amber-500 mt-0.5">未啟用，即使勾選必填也不會顯示在表單中</p>
                          )}
                        </div>

                        {/* Required toggle */}
                        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer flex-shrink-0">
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
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
                    <p className="text-xs text-slate-400 text-center py-4">載入中...</p>
                  )}
                  {(serviceFields[s.id] || []).length === 0 && loadedServices.includes(s.id) && (
                    <p className="text-xs text-slate-400 text-center py-4">尚無表單欄位</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
