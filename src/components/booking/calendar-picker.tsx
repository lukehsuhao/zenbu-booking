"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { zhTW } from "date-fns/locale";
import "react-day-picker/style.css";

function CalendarSkeleton() {
  return (
    <div className="w-full max-w-[280px] animate-pulse">
      {/* Header (month + arrows) */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-6 h-6 rounded-md bg-gray-200" />
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="w-6 h-6 rounded-md bg-gray-200" />
      </div>
      {/* Day of week headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded mx-auto w-4" />
        ))}
      </div>
      {/* 6 rows x 7 cols of day cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i} className="h-8 w-8 rounded bg-gray-100 mx-auto" />
        ))}
      </div>
    </div>
  );
}

export function CalendarPicker({ providerId, serviceId, onSelect, maxDays = 0, minAdvanceDays = 0 }: {
  providerId: string; serviceId: string; onSelect: (date: string) => void; maxDays?: number; minAdvanceDays?: number;
}) {
  const [month, setMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Date>();

  useEffect(() => {
    const y = month.getFullYear();
    const m = month.getMonth() + 1;
    const monthStr = `${y}-${m.toString().padStart(2, "0")}`;
    setLoading(true);
    fetch(`/api/availability?providerId=${providerId}&serviceId=${serviceId}&month=${monthStr}`)
      .then((r) => r.json())
      .then((data) => {
        setAvailableDates(data.dates || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [providerId, serviceId, month]);

  const availableSet = new Set(availableDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = maxDays > 0 ? new Date(today.getTime() + maxDays * 86400000) : null;
  const minDate = minAdvanceDays > 0 ? new Date(today.getTime() + minAdvanceDays * 86400000) : null;

  function isAvailable(date: Date) {
    if (loading) return false;
    if (date < today) return false;
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    const dateStr = date.toLocaleDateString("en-CA");
    return availableSet.has(dateStr);
  }

  // "Full" means: within bookable window but no slots available
  function isFull(date: Date) {
    if (loading) return false;
    if (date < today) return false;
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
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
      <div className="flex items-center gap-3 mb-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#2563eb" }} />
          可預約
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-rose-200" />
          無可預約時段
        </span>
      </div>
      <div
        className="rounded-2xl p-4 flex justify-center relative"
        style={{
          background: "var(--color-bg-card)",
          boxShadow: "var(--shadow-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        {loading ? (
          <CalendarSkeleton />
        ) : (
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            onMonthChange={setMonth}
            locale={zhTW}
            disabled={(date) => !isAvailable(date)}
            modifiers={{
              available: (date) => isAvailable(date),
              full: (date) => isFull(date),
            }}
            modifiersClassNames={{
              available: "rdp-available-day",
              full: "rdp-full-day",
            }}
          />
        )}
      </div>
      <style jsx global>{`
        .rdp-available-day {
          font-weight: 700;
          color: #2563eb;
        }
        .rdp-full-day {
          position: relative;
          color: #9ca3af !important;
          text-decoration: line-through;
          text-decoration-color: #fca5a5;
          text-decoration-thickness: 2px;
        }
        .rdp-full-day::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 4px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #fca5a5;
          transform: translateX(-50%);
        }
      `}</style>
    </div>
  );
}
