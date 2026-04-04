"use client";

import { useState, useEffect, useRef } from "react";

type TimeSlot = { startTime: string; endTime: string };

function parseHour(time: string) {
  return parseInt(time.split(":")[0], 10);
}

export function TimeSlotPicker({ providerId, serviceId, date, onSelect }: {
  providerId: string; serviceId: string; date: string; onSelect: (slot: TimeSlot) => void;
}) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/availability?providerId=${providerId}&serviceId=${serviceId}&date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots || []);
        setLoading(false);
        // Auto-scroll to time slots after loading
        setTimeout(() => {
          containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      });
  }, [providerId, serviceId, date]);

  if (loading) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
        <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>載入中...</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>此日期沒有可預約的時段</p>
      </div>
    );
  }

  const amSlots = slots.filter((s) => parseHour(s.startTime) < 12);
  const pmSlots = slots.filter((s) => parseHour(s.startTime) >= 12);

  function renderSlots(list: TimeSlot[]) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {list.map((slot) => (
          <button
            key={slot.startTime}
            onClick={() => onSelect(slot)}
            className="rounded-xl py-3 text-center text-sm font-medium transition-all duration-200 active:scale-95"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              boxShadow: "var(--shadow-soft)",
              minHeight: "44px",
            }}
          >
            {slot.startTime}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="px-4 pt-2 pb-4">
      <h3 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>{date} 可預約時段</h3>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>點選時段以繼續</p>

      {amSlots.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
            <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.36-7.36l-1.42 1.42M6.05 17.95l-1.42 1.42m12.73 0l-1.42-1.42M6.05 6.05L4.63 4.63" />
            </svg>
            上午
          </p>
          {renderSlots(amSlots)}
        </div>
      )}

      {pmSlots.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
            <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
            下午
          </p>
          {renderSlots(pmSlots)}
        </div>
      )}
    </div>
  );
}
