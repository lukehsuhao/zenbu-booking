"use client";

import { useState, useEffect } from "react";

type TimeSlot = { startTime: string; endTime: string };

export function TimeSlotPicker({ providerId, serviceId, date, onSelect }: {
  providerId: string; serviceId: string; date: string; onSelect: (slot: TimeSlot) => void;
}) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/availability?providerId=${providerId}&serviceId=${serviceId}&date=${date}`)
      .then((r) => r.json())
      .then((data) => { setSlots(data.slots || []); setLoading(false); });
  }, [providerId, serviceId, date]);

  if (loading) return <p className="p-4 text-center text-gray-500">載入中...</p>;
  if (slots.length === 0) return <p className="p-4 text-center text-gray-500">此日期沒有可預約的時段</p>;

  return (
    <div className="p-4">
      <h3 className="font-bold mb-3">{date} 可預約時段</h3>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => (
          <button key={slot.startTime} onClick={() => onSelect(slot)}
            className="bg-white border rounded-lg py-3 text-center font-medium hover:bg-blue-50 hover:border-blue-500 transition">
            {slot.startTime}
          </button>
        ))}
      </div>
    </div>
  );
}
