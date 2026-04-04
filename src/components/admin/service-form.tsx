"use client";

import { useState, useEffect } from "react";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  bufferBefore?: number;
  bufferAfter?: number;
  slotInterval?: number;
  isActive: boolean;
  assignmentMode?: string;
  requiresApproval?: boolean;
  providerServices?: { provider: { id: string; name: string } }[];
};

type ProviderOption = {
  id: string;
  name: string;
};

export function ServiceForm({
  service,
  onSave,
  onCancel,
}: {
  service?: Service;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [duration, setDuration] = useState(service?.duration || 30);
  const [bufferBefore, setBufferBefore] = useState(service?.bufferBefore || 0);
  const [bufferAfter, setBufferAfter] = useState(service?.bufferAfter || 0);
  const [slotInterval, setSlotInterval] = useState(service?.slotInterval || 30);
  const [assignmentMode, setAssignmentMode] = useState(service?.assignmentMode || "manual");
  const [requiresApproval, setRequiresApproval] = useState(service?.requiresApproval || false);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>(
    service?.providerServices?.map((ps) => ps.provider.id) || []
  );
  const [allProviders, setAllProviders] = useState<ProviderOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/providers")
      .then((res) => res.json())
      .then((data) => setAllProviders(data))
      .catch(() => {});
  }, []);

  function toggleProvider(id: string) {
    setSelectedProviderIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = service ? "PUT" : "POST";
    const body = {
      id: service?.id,
      name,
      description,
      duration,
      bufferBefore,
      bufferAfter,
      slotInterval,
      assignmentMode,
      requiresApproval,
      providerIds: selectedProviderIds,
    };
    await fetch("/api/admin/services", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold text-[#1E293B] mb-5">{service ? "編輯服務" : "新增服務"}</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">服務名稱</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">說明</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">時長（分鐘）</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
            min={15}
            step={15}
            required
          />
        </div>

        {/* 時段刻度 */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">預約時段刻度</label>
          <select
            value={slotInterval}
            onChange={(e) => setSlotInterval(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
          >
            <option value={10}>每 10 分鐘</option>
            <option value={15}>每 15 分鐘</option>
            <option value={20}>每 20 分鐘</option>
            <option value={30}>每 30 分鐘</option>
            <option value={60}>每 60 分鐘</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">決定可預約時段的間隔，例如選擇 15 分鐘則可預約 9:00、9:15、9:30...</p>
        </div>

        {/* 緩衝時間 */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">緩衝時間</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">前緩衝（分鐘）</label>
              <input
                type="number"
                value={bufferBefore}
                onChange={(e) => setBufferBefore(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                min={0}
                step={5}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">後緩衝（分鐘）</label>
              <input
                type="number"
                value={bufferAfter}
                onChange={(e) => setBufferAfter(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                min={0}
                step={5}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">預約前後預留的空檔時間，該時段將視為已被佔用，確保提供者有準備或休息時間</p>
        </div>

        {/* 指派模式 */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">指派模式</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-[#1E293B] cursor-pointer">
              <input
                type="radio"
                name="assignmentMode"
                value="manual"
                checked={assignmentMode === "manual"}
                onChange={() => setAssignmentMode("manual")}
                className="accent-[#2563EB]"
              />
              手動選擇
              <span className="text-xs text-slate-400">（用戶預約時自行選擇人員）</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-[#1E293B] cursor-pointer">
              <input
                type="radio"
                name="assignmentMode"
                value="round_robin"
                checked={assignmentMode === "round_robin"}
                onChange={() => setAssignmentMode("round_robin")}
                className="accent-[#2563EB]"
              />
              輪流指派
              <span className="text-xs text-slate-400">（系統自動分配人員）</span>
            </label>
          </div>
        </div>

        {/* 需要審核 */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setRequiresApproval(!requiresApproval)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                requiresApproval ? "bg-amber-500" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  requiresApproval ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <div>
              <span className="text-sm font-medium text-[#1E293B]">此項目需要審核</span>
              <p className="text-xs text-slate-400 mt-0.5">啟用後，客戶預約此服務需要經過管理員審核才會生效</p>
            </div>
          </label>
        </div>

        {/* 指派人員 */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">指派人員</label>
          {allProviders.length === 0 ? (
            <p className="text-xs text-slate-400">尚無可用人員</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allProviders.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProvider(p.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-150 ${
                    selectedProviderIds.includes(p.id)
                      ? "bg-blue-50 text-[#2563EB] border-2 border-[#2563EB]"
                      : "bg-[#F8FAFC] text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {selectedProviderIds.includes(p.id) ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  )}
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          儲存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors duration-150"
        >
          取消
        </button>
      </div>
    </form>
  );
}
