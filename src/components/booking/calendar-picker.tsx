"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { zhTW } from "date-fns/locale";
import "react-day-picker/style.css";

export function CalendarPicker({ providerId, serviceId, onSelect }: {
  providerId: string; serviceId: string; onSelect: (date: string) => void;
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

  function isDisabled(date: Date) {
    if (date < today) return true;
    const dateStr = date.toLocaleDateString("en-CA");
    return !availableSet.has(dateStr);
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    setSelected(date);
    onSelect(date.toLocaleDateString("en-CA"));
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">選擇日期</h2>
      <div className="bg-white rounded-lg shadow p-4 flex justify-center">
        <DayPicker mode="single" selected={selected} onSelect={handleSelect} onMonthChange={setMonth}
          locale={zhTW} disabled={isDisabled}
          modifiers={{ available: (date) => !isDisabled(date) }}
          modifiersStyles={{ available: { fontWeight: "bold", color: "#2563eb" } }} />
      </div>
    </div>
  );
}
