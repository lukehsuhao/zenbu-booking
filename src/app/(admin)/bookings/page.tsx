"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string;
  providerId: string;
  serviceId: string;
  lineUserId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  googleMeetUrl: string | null;
  notes: string | null;
  provider: { id: string; name: string };
  service: { id: string; name: string };
};

const statusLabels: Record<string, { label: string; color: string }> = {
  confirmed: { label: "已確認", color: "bg-green-100 text-green-800" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800" },
  completed: { label: "已完成", color: "bg-gray-100 text-gray-800" },
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function loadBookings() {
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/bookings?${params.toString()}`);
    setBookings(await res.json());
  }

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, statusFilter]);

  async function handleCancel(id: string) {
    if (!confirm("確定要取消此預約？")) return;
    await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
    loadBookings();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">預約紀錄</h1>

      <div className="flex gap-4 mb-4">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">全部狀態</option>
          <option value="confirmed">已確認</option>
          <option value="cancelled">已取消</option>
          <option value="completed">已完成</option>
        </select>
        {(dateFilter || statusFilter) && (
          <button
            onClick={() => { setDateFilter(""); setStatusFilter(""); }}
            className="text-sm text-gray-500 underline"
          >
            清除篩選
          </button>
        )}
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">日期</th>
              <th className="px-4 py-3 text-left">時間</th>
              <th className="px-4 py-3 text-left">顧客</th>
              <th className="px-4 py-3 text-left">服務</th>
              <th className="px-4 py-3 text-left">提供者</th>
              <th className="px-4 py-3 text-left">狀態</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  暫無預約紀錄
                </td>
              </tr>
            )}
            {bookings.map((b) => {
              const dateStr = new Date(b.date).toLocaleDateString("zh-TW");
              const st = statusLabels[b.status] || { label: b.status, color: "bg-gray-100 text-gray-800" };
              return (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-3">{dateStr}</td>
                  <td className="px-4 py-3">{b.startTime}~{b.endTime}</td>
                  <td className="px-4 py-3">
                    <div>{b.customerName}</div>
                    <div className="text-xs text-gray-400">{b.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3">{b.service.name}</td>
                  <td className="px-4 py-3">{b.provider.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    {b.googleMeetUrl && (
                      <a
                        href={b.googleMeetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Meet
                      </a>
                    )}
                    {b.status === "confirmed" && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        取消
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
