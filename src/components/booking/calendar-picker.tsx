"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { zhTW } from "date-fns/locale";
import "react-day-picker/style.css";

export function CalendarPicker({ providerId, serviceId, onSelect, maxDays = 0 }: {
  providerId: string; serviceId: string; onSelect: (date: string) => void; maxDays?: number;
}) {
  const [month, setMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selected, setSelected] = useState<Date>();

  useEffect(() => {
    const y = month.getFullYear();
    const m = month.getMonth() + 1;
    const monthStr = `${y}-${m.toString().padStart(2, "0")}`;
    fetch(`/api/availability?providerId=${providerId}&serviceId=${serviceId}&month=${monthStr}`)
      .then((r) => r.json())
      .then((data) => setAvailableDates(data.dates || []));
  }, [providerId, serviceId, month]);

  const availableSet = new Set(availableDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = maxDays > 0 ? new Date(today.getTime() + maxDays * 86400000) : null;

  function isDisabled(date: Date) {
    if (date < today) return true;
    if (maxDate && date > maxDate) return true;
    const dateStr = date.toLocaleDateString("en-CA");
    return !availableSet.has(dateStr);
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    setSelected(date);
    onSelect(date.toLocaleDateString("en-CA"));
  }

  return (
    <div className="px-4 pt-2 pb-4">
      <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>選擇日期</h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>藍色日期為可預約日</p>
      <div
        className="rounded-2xl p-4 flex justify-center"
        style={{
          background: "var(--color-bg-card)",
          boxShadow: "var(--shadow-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <DayPicker mode="single" selected={selected} onSelect={handleSelect} onMonthChange={setMonth}
          locale={zhTW} disabled={isDisabled}
          modifiers={{ available: (date) => !isDisabled(date) }}
          modifiersStyles={{ available: { fontWeight: "bold", color: "#2563eb" } }} />
      </div>
    </div>
  );
}
