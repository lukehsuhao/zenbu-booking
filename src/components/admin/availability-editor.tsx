"use client";

import { useEffect, useMemo, useState } from "react";

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

type GroupedSlot = {
  key: string;
  dayOfWeeks: number[]; // which weekdays this group applies to
  startTime: string;
  endTime: string;
  type: string;
  specificDate: string;
  bufferBefore: number;
  bufferAfter: number;
};

function makeKey(): string {
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function groupKey(s: Slot): string {
  return `${s.type}|${s.startTime}|${s.endTime}|${s.bufferBefore}|${s.bufferAfter}|${s.specificDate}`;
}

function groupSlots(slots: Slot[]): GroupedSlot[] {
  const map = new Map<string, GroupedSlot>();
  for (const s of slots) {
    const k = groupKey(s);
    if (!map.has(k)) {
      map.set(k, {
        key: `g_${k}`,
        dayOfWeeks: [],
        startTime: s.startTime,
        endTime: s.endTime,
        type: s.type,
        specificDate: s.specificDate,
        bufferBefore: s.bufferBefore,
        bufferAfter: s.bufferAfter,
      });
    }
    const group = map.get(k)!;
    // Expand "every day" (7) into 0-6
    if (s.dayOfWeek === 7) {
      for (let d = 0; d < 7; d++) {
        if (!group.dayOfWeeks.includes(d)) group.dayOfWeeks.push(d);
      }
    } else {
      if (!group.dayOfWeeks.includes(s.dayOfWeek)) group.dayOfWeeks.push(s.dayOfWeek);
    }
  }
  return Array.from(map.values()).map((g) => ({
    ...g,
    dayOfWeeks: g.dayOfWeeks.sort((a, b) => a - b),
  }));
}

function expandGroups(groups: GroupedSlot[]): Slot[] {
  const result: Slot[] = [];
  for (const g of groups) {
    // Skip groups with no days selected
    if (g.dayOfWeeks.length === 0) continue;
    // Collapse to dayOfWeek=7 if all 7 days selected and not a specific date
    if (g.dayOfWeeks.length === 7 && !g.specificDate) {
      result.push({
        dayOfWeek: 7,
        startTime: g.startTime,
        endTime: g.endTime,
        type: g.type,
        specificDate: g.specificDate,
        bufferBefore: g.bufferBefore,
        bufferAfter: g.bufferAfter,
      });
    } else {
      for (const d of g.dayOfWeeks) {
        result.push({
          dayOfWeek: d,
          startTime: g.startTime,
          endTime: g.endTime,
          type: g.type,
          specificDate: g.specificDate,
          bufferBefore: g.bufferBefore,
          bufferAfter: g.bufferAfter,
        });
      }
    }
  }
  return result;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function AvailabilityEditor({ providerId }: { providerId: string }) {
  const [groups, setGroups] = useState<GroupedSlot[]>([]);
  const [originalGroups, setOriginalGroups] = useState<GroupedSlot[]>([]);
  const [expandedBuffers, setExpandedBuffers] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/providers/${providerId}/availability`)
      .then((r) => r.json())
      .then((data: Slot[]) => {
        const normalized = data.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          type: s.type || "available",
          specificDate: s.specificDate || "",
          bufferBefore: s.bufferBefore || 0,
          bufferAfter: s.bufferAfter || 0,
        }));
        const grouped = groupSlots(normalized);
        setGroups(grouped);
        setOriginalGroups(JSON.parse(JSON.stringify(grouped)));
        setLoading(false);
      });
  }, [providerId]);

  // Detect unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(groups) !== JSON.stringify(originalGroups);
  }, [groups, originalGroups]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function addGroup(type: string) {
    const newGroup: GroupedSlot = {
      key: makeKey(),
      dayOfWeeks: type === "available" ? [1, 2, 3, 4, 5] : [], // default Mon-Fri for available
      startTime: "09:00",
      endTime: "18:00",
      type,
      specificDate: "",
      bufferBefore: 0,
      bufferAfter: 0,
    };
    setGroups([...groups, newGroup]);
  }

  function duplicateGroup(key: string) {
    const idx = groups.findIndex((g) => g.key === key);
    if (idx < 0) return;
    const copy = { ...groups[idx], key: makeKey() };
    setGroups([...groups.slice(0, idx + 1), copy, ...groups.slice(idx + 1)]);
  }

  function removeGroup(key: string) {
    setGroups(groups.filter((g) => g.key !== key));
    setConfirmDelete(null);
    setExpandedBuffers((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function updateGroup(key: string, patch: Partial<GroupedSlot>) {
    setGroups(groups.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }

  function toggleDay(key: string, day: number) {
    const group = groups.find((g) => g.key === key);
    if (!group) return;
    const has = group.dayOfWeeks.includes(day);
    const newDays = has
      ? group.dayOfWeeks.filter((d) => d !== day)
      : [...group.dayOfWeeks, day].sort((a, b) => a - b);
    updateGroup(key, { dayOfWeeks: newDays });
  }

  function selectAllDays(key: string) {
    updateGroup(key, { dayOfWeeks: [0, 1, 2, 3, 4, 5, 6] });
  }

  function selectWeekdays(key: string) {
    updateGroup(key, { dayOfWeeks: [1, 2, 3, 4, 5] });
  }

  function toggleBuffer(key: string) {
    setExpandedBuffers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    // Validate: every group must have at least one day (or a specific date)
    const invalidGroup = groups.find((g) => g.dayOfWeeks.length === 0 && !g.specificDate);
    if (invalidGroup) {
      showToast("error", "每個時段至少需選擇一天");
      return;
    }

    setSaving(true);
    try {
      const expandedSlots = expandGroups(groups);
      const res = await fetch(`/api/admin/providers/${providerId}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilities: expandedSlots }),
      });
      if (res.ok) {
        setOriginalGroups(JSON.parse(JSON.stringify(groups)));
        showToast("success", "時段已儲存");
      } else {
        showToast("error", "儲存失敗");
      }
    } catch {
      showToast("error", "儲存失敗");
    }
    setSaving(false);
  }

  // Weekly preview: compute coverage per day
  const weeklyPreview = useMemo(() => {
    const byDay: Array<{ available: Array<[number, number]>; excluded: Array<[number, number]> }> = Array.from({ length: 7 }, () => ({
      available: [],
      excluded: [],
    }));
    for (const g of groups) {
      if (g.specificDate) continue; // skip specific-date exclusions
      const start = timeToMinutes(g.startTime);
      const end = timeToMinutes(g.endTime);
      for (const d of g.dayOfWeeks) {
        if (g.type === "available") byDay[d].available.push([start, end]);
        else byDay[d].excluded.push([start, end]);
      }
    }
    return byDay;
  }, [groups]);

  const availableGroups = groups.filter((g) => g.type === "available");
  const excludedGroups = groups.filter((g) => g.type === "excluded");

  function renderGroupCard(group: GroupedSlot) {
    const isExcluded = group.type === "excluded";
    const isConfirming = confirmDelete === group.key;
    const isAllDays = group.dayOfWeeks.length === 7;
    const isWeekdaysOnly = group.dayOfWeeks.length === 5 && [1, 2, 3, 4, 5].every((d) => group.dayOfWeeks.includes(d));

    return (
      <div
        key={group.key}
        className={`bg-white rounded-xl border px-4 py-3.5 transition-colors ${
          isExcluded ? "border-red-100" : "border-gray-200"
        }`}
      >
        {/* Top row: day chips + quick select */}
        {!group.specificDate && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="flex gap-1">
              {DAYS.map((d, idx) => {
                const active = group.dayOfWeeks.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleDay(group.key, idx)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      active
                        ? isExcluded
                          ? "bg-rose-500 text-white"
                          : "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={() => selectWeekdays(group.key)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  isWeekdaysOnly
                    ? isExcluded
                      ? "bg-rose-50 text-rose-600"
                      : "bg-emerald-50 text-emerald-600"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                平日
              </button>
              <button
                onClick={() => selectAllDays(group.key)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  isAllDays
                    ? isExcluded
                      ? "bg-rose-50 text-rose-600"
                      : "bg-emerald-50 text-emerald-600"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                每天
              </button>
            </div>
          </div>
        )}

        {/* Bottom row: time + actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={group.startTime}
              onChange={(e) => updateGroup(group.key, { startTime: e.target.value })}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
            <input
              type="time"
              value={group.endTime}
              onChange={(e) => updateGroup(group.key, { endTime: e.target.value })}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
          </div>

          {/* Specific date (excluded only) */}
          {isExcluded && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">|</span>
              <label className="text-xs text-gray-500 whitespace-nowrap">指定日期</label>
              <input
                type="date"
                value={group.specificDate}
                onChange={(e) => updateGroup(group.key, { specificDate: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
              {group.specificDate && (
                <button
                  onClick={() => updateGroup(group.key, { specificDate: "" })}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => toggleBuffer(group.key)}
              className={`p-1.5 rounded-lg transition-colors ${
                expandedBuffers.has(group.key)
                  ? isExcluded
                    ? "text-rose-600 bg-rose-50"
                    : "text-emerald-600 bg-emerald-50"
                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              }`}
              title="緩衝時間"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75M4.5 9v10.5A1.5 1.5 0 006 21h3v-6h6v6h3a1.5 1.5 0 001.5-1.5V9" />
              </svg>
            </button>
            <button
              onClick={() => duplicateGroup(group.key)}
              className={`p-1.5 rounded-lg text-gray-400 transition-colors ${
                isExcluded
                  ? "hover:text-rose-600 hover:bg-rose-50"
                  : "hover:text-emerald-600 hover:bg-emerald-50"
              }`}
              title="複製時段"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            </button>
            {isConfirming ? (
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={() => removeGroup(group.key)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  確認刪除
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(group.key)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="刪除時段"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Buffer settings (collapsible) */}
        {expandedBuffers.has(group.key) && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-600 mb-2">緩衝時間</div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">前緩衝</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={group.bufferBefore}
                  onChange={(e) => updateGroup(group.key, { bufferBefore: Number(e.target.value) })}
                  className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-center"
                />
                <span className="text-xs text-gray-400">分鐘</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">後緩衝</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={group.bufferAfter}
                  onChange={(e) => updateGroup(group.key, { bufferAfter: Number(e.target.value) })}
                  className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-center"
                />
                <span className="text-xs text-gray-400">分鐘</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              緩衝時間會在此時段前後保留空檔，該時段將視為已被預約。
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pt-5">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium border ${
          toast.type === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900">時段設定</h4>
          {hasChanges && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              尚未儲存
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => addGroup("available")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            新增可預約時段
          </button>
          <button
            onClick={() => addGroup("excluded")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            新增排除時段
          </button>
          <button
            onClick={save}
            disabled={saving || !hasChanges}
            className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
              hasChanges
                ? "bg-[#2563EB] text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            } disabled:opacity-50`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {saving ? "儲存中..." : "儲存變更"}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!loading && groups.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          尚未設定時段，點擊上方按鈕開始新增
        </div>
      )}

      {/* Available groups */}
      {availableGroups.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-gray-600">可預約時段</span>
            <span className="text-xs text-gray-400">({availableGroups.length})</span>
          </div>
          <div className="space-y-2">
            {availableGroups.map((g) => renderGroupCard(g))}
          </div>
        </div>
      )}

      {/* Excluded groups */}
      {excludedGroups.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-semibold text-gray-600">排除時段</span>
            <span className="text-xs text-gray-400">({excludedGroups.length})</span>
          </div>
          <div className="space-y-2">
            {excludedGroups.map((g) => renderGroupCard(g))}
          </div>
        </div>
      )}

      {/* Weekly preview (moved to bottom) */}
      {!loading && groups.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span className="text-sm font-medium text-gray-700">週覽</span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium ml-1">
                每週共 {(weeklyPreview.reduce((total, day) => {
                  const avail = day.available.reduce((sum, [s, e]) => sum + (e - s), 0);
                  const excl = day.excluded.reduce((sum, [s, e]) => sum + (e - s), 0);
                  return total + Math.max(0, avail - excl);
                }, 0) / 60).toFixed(1)} 小時可預約
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-200" />
                <span className="text-[11px] text-gray-500">可預約</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-rose-200" />
                <span className="text-[11px] text-gray-500">排除</span>
              </div>
            </div>
          </div>

          {/* Hour ruler */}
          <div className="flex items-center gap-3 mb-1.5 pl-10 pr-16">
            <div className="flex-1 flex justify-between text-[9px] text-gray-300 font-medium">
              <span>0</span>
              <span>6</span>
              <span>12</span>
              <span>18</span>
              <span>24</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {DAYS.map((d, idx) => {
              const dayData = weeklyPreview[idx];
              const hasAvail = dayData.available.length > 0;
              const hasExcl = dayData.excluded.length > 0;
              const availMinutes = dayData.available.reduce((sum, [s, e]) => sum + (e - s), 0);
              const exclMinutes = dayData.excluded.reduce((sum, [s, e]) => sum + (e - s), 0);
              const netMinutes = Math.max(0, availMinutes - exclMinutes);
              const isRest = !hasAvail && !hasExcl;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 w-8 whitespace-nowrap flex-shrink-0">
                    週{d}
                  </span>
                  <div className="flex-1 flex gap-px">
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const cellStart = hour * 60;
                      const cellEnd = (hour + 1) * 60;
                      const isAvailable = dayData.available.some(([s, e]) => s < cellEnd && e > cellStart);
                      const isExcluded = dayData.excluded.some(([s, e]) => s < cellEnd && e > cellStart);
                      return (
                        <div
                          key={hour}
                          className={`flex-1 h-6 ${
                            isExcluded
                              ? "bg-rose-200"
                              : isAvailable
                              ? "bg-emerald-200"
                              : "bg-gray-50"
                          } ${hour === 0 ? "rounded-l" : ""} ${hour === 23 ? "rounded-r" : ""}`}
                        />
                      );
                    })}
                  </div>
                  <span className={`text-xs w-14 text-right flex-shrink-0 whitespace-nowrap ${
                    isRest ? "text-gray-300" : "text-gray-600 font-medium"
                  }`}>
                    {isRest ? "休息" : `${(netMinutes / 60).toFixed(1)} 小時`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
