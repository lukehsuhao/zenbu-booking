"use client";

import { useEffect, useState } from "react";

const DAYS = ["日", "一", "二", "三", "四", "五", "六"];

type Slot = { dayOfWeek: number; startTime: string; endTime: string };

export function AvailabilityEditor({ providerId }: { providerId: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    fetch(`/api/admin/providers/${providerId}/availability`)
      .then((r) => r.json())
      .then(setSlots);
  }, [providerId]);

  function addSlot() {
    setSlots([...slots, { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }]);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: keyof Slot, value: string | number) {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  }

  async function save() {
    await fetch(`/api/admin/providers/${providerId}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilities: slots }),
    });
    alert("已儲存");
  }

  return (
    <div className="mt-4">
      <h4 className="font-medium mb-2">每週可預約時段</h4>
      {slots.map((slot, i) => (
        <div key={i} className="flex gap-2 items-center mb-2">
          <select value={slot.dayOfWeek} onChange={(e) => updateSlot(i, "dayOfWeek", Number(e.target.value))} className="border rounded px-2 py-1">
            {DAYS.map((d, idx) => (<option key={idx} value={idx}>週{d}</option>))}
          </select>
          <input type="time" value={slot.startTime} onChange={(e) => updateSlot(i, "startTime", e.target.value)} className="border rounded px-2 py-1" />
          <span>~</span>
          <input type="time" value={slot.endTime} onChange={(e) => updateSlot(i, "endTime", e.target.value)} className="border rounded px-2 py-1" />
          <button onClick={() => removeSlot(i)} className="text-red-500 hover:underline text-sm">刪除</button>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <button onClick={addSlot} className="text-blue-600 hover:underline text-sm">+ 新增時段</button>
        <button onClick={save} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">儲存</button>
      </div>
    </div>
  );
}
