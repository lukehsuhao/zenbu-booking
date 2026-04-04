"use client";

import { useEffect, useState } from "react";

const DAYS = ["日", "一", "二", "三", "四", "五", "六"];

type Slot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: string;
  specificDate: string;
  bufferBefore: number;
  bufferAfter: number;
};

function defaultSlot(type: string): Slot {
  return {
    dayOfWeek: type === "excluded" ? 7 : 1,
    startTime: "09:00",
    endTime: "12:00",
    type,
    specificDate: "",
    bufferBefore: 0,
    bufferAfter: 0,
  };
}

function dayLabel(dayOfWeek: number): string {
  if (dayOfWeek === 7) return "每天";
  return `週${DAYS[dayOfWeek]}`;
}

export function AvailabilityEditor({ providerId }: { providerId: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [expandedBuffers, setExpandedBuffers] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/admin/providers/${providerId}/availability`)
      .then((r) => r.json())
      .then((data: Slot[]) =>
        setSlots(
          data.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            type: s.type || "available",
            specificDate: s.specificDate || "",
            bufferBefore: s.bufferBefore || 0,
            bufferAfter: s.bufferAfter || 0,
          }))
        )
      );
  }, [providerId]);

  function addSlot(type: string) {
    setSlots([...slots, defaultSlot(type)]);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
    setExpandedBuffers((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < index) next.add(v);
        else if (v > index) next.add(v - 1);
      });
      return next;
    });
  }

  function updateSlot(index: number, field: keyof Slot, value: string | number) {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  }

  function toggleBuffer(index: number) {
    setExpandedBuffers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function save() {
    await fetch(`/api/admin/providers/${providerId}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilities: slots }),
    });
    alert("已儲存");
  }

  const availableSlots = slots
    .map((s, i) => ({ slot: s, index: i }))
    .filter((x) => x.slot.type === "available");
  const excludedSlots = slots
    .map((s, i) => ({ slot: s, index: i }))
    .filter((x) => x.slot.type === "excluded");

  function renderSlotCard(slot: Slot, index: number) {
    const isExcluded = slot.type === "excluded";
    const indicatorColor = isExcluded ? "bg-red-500" : "bg-emerald-500";
    const borderColor = isExcluded
      ? "border-red-200 hover:border-red-300"
      : "border-slate-200 hover:border-slate-300";

    return (
      <div key={index} className={`bg-white rounded-xl border ${borderColor} px-4 py-3 transition-colors`}>
        <div className="flex items-center gap-3">
          {/* Type indicator */}
          <div className={`w-2.5 h-2.5 rounded-full ${indicatorColor} flex-shrink-0`} />

          {/* Day selector */}
          <select
            value={slot.dayOfWeek}
            onChange={(e) => updateSlot(index, "dayOfWeek", Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all font-medium text-[#1E293B]"
          >
            <option value={7}>每天</option>
            {DAYS.map((d, idx) => (
              <option key={idx} value={idx}>週{d}</option>
            ))}
          </select>

          {/* Time range */}
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={slot.startTime}
              onChange={(e) => updateSlot(index, "startTime", e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
            <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
            <input
              type="time"
              value={slot.endTime}
              onChange={(e) => updateSlot(index, "endTime", e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
          </div>

          {/* Type toggle */}
          <select
            value={slot.type}
            onChange={(e) => updateSlot(index, "type", e.target.value)}
            className={`border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all font-medium ${
              isExcluded
                ? "border-red-200 text-red-700"
                : "border-emerald-200 text-emerald-700"
            }`}
          >
            <option value="available">可預約</option>
            <option value="excluded">排除</option>
          </select>

          {/* Buffer toggle */}
          <button
            onClick={() => toggleBuffer(index)}
            className={`p-1.5 rounded-lg transition-colors ${
              expandedBuffers.has(index)
                ? "text-[#2563EB] bg-blue-50"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
            title="緩衝時間"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={() => removeSlot(index)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>

        {/* Specific date picker (excluded only) */}
        {isExcluded && (
          <div className="mt-3 ml-5 flex items-center gap-2">
            <label className="text-xs text-slate-500">指定日期（選填）：</label>
            <input
              type="date"
              value={slot.specificDate}
              onChange={(e) => updateSlot(index, "specificDate", e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
            {slot.specificDate && (
              <button
                onClick={() => updateSlot(index, "specificDate", "")}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                清除
              </button>
            )}
          </div>
        )}

        {/* Buffer settings (collapsible) */}
        {expandedBuffers.has(index) && (
          <div className="mt-3 ml-5 p-3 bg-slate-50 rounded-lg">
            <div className="text-xs font-medium text-slate-600 mb-2">緩衝時間</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">前緩衝</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={slot.bufferBefore}
                  onChange={(e) => updateSlot(index, "bufferBefore", Number(e.target.value))}
                  className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-center"
                />
                <span className="text-xs text-slate-400">分鐘</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">後緩衝</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={slot.bufferAfter}
                  onChange={(e) => updateSlot(index, "bufferAfter", Number(e.target.value))}
                  className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-center"
                />
                <span className="text-xs text-slate-400">分鐘</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              緩衝時間會在此時段前後保留空檔，該時段將視為已被預約，確保提供者有足夠的準備或休息時間。
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pt-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          可預約時段設定
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => addSlot("available")}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            新增可預約
          </button>
          <button
            onClick={() => addSlot("excluded")}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            新增排除
          </button>
          <button
            onClick={save}
            className="inline-flex items-center gap-1 bg-[#2563EB] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            儲存
          </button>
        </div>
      </div>

      {slots.length === 0 && (
        <p className="text-xs text-slate-400 py-4 text-center">尚未設定時段，點擊「新增可預約」或「新增排除」開始</p>
      )}

      {/* Available slots section */}
      {availableSlots.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-slate-600">可預約時段</span>
            <span className="text-xs text-slate-400">({availableSlots.length})</span>
          </div>
          <div className="space-y-2">
            {availableSlots.map(({ slot, index }) => renderSlotCard(slot, index))}
          </div>
        </div>
      )}

      {/* Excluded slots section */}
      {excludedSlots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-semibold text-slate-600">排除時段</span>
            <span className="text-xs text-slate-400">({excludedSlots.length})</span>
            {excludedSlots.some((x) => x.slot.specificDate) && (
              <span className="text-xs text-slate-400 ml-1">— 含指定日期排除</span>
            )}
          </div>
          <div className="space-y-2">
            {excludedSlots.map(({ slot, index }) => renderSlotCard(slot, index))}
          </div>
        </div>
      )}
    </div>
  );
}
