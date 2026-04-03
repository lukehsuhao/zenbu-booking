"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  googleMeetUrl: string | null;
  provider: { name: string };
  service: { name: string };
};

export default function DashboardPage() {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const now = new Date();
    const tzOffset = 8 * 60;
    const local = new Date(now.getTime() + (tzOffset + now.getTimezoneOffset()) * 60000);
    const todayStr = local.toISOString().slice(0, 10);

    // Load today's bookings
    const res = await fetch(`/api/admin/bookings?date=${todayStr}&status=confirmed`);
    const todayData: Booking[] = await res.json();
    setTodayBookings(todayData);

    // Load all bookings for stats
    const allRes = await fetch("/api/admin/bookings");
    const allBookings: Booking[] = await allRes.json();

    const todayDate = new Date(todayStr + "T00:00:00+08:00");
    const weekAgo = new Date(todayDate.getTime() - 6 * 86400000);
    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    for (const b of allBookings) {
      if (b.status === "cancelled") continue;
      const d = new Date(b.date);
      if (d >= todayDate && d < new Date(todayDate.getTime() + 86400000)) todayCount++;
      if (d >= weekAgo && d < new Date(todayDate.getTime() + 86400000)) weekCount++;
      if (d >= monthStart && d < new Date(todayDate.getTime() + 86400000)) monthCount++;
    }

    setStats({ today: todayCount, week: weekCount, month: monthCount });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">儀表板</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded shadow p-6">
          <div className="text-sm text-gray-500">今日預約</div>
          <div className="text-3xl font-bold mt-1">{stats.today}</div>
        </div>
        <div className="bg-white rounded shadow p-6">
          <div className="text-sm text-gray-500">本週預約</div>
          <div className="text-3xl font-bold mt-1">{stats.week}</div>
        </div>
        <div className="bg-white rounded shadow p-6">
          <div className="text-sm text-gray-500">本月預約</div>
          <div className="text-3xl font-bold mt-1">{stats.month}</div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">今日預約</h2>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">時間</th>
              <th className="px-4 py-3 text-left">顧客</th>
              <th className="px-4 py-3 text-left">服務</th>
              <th className="px-4 py-3 text-left">提供者</th>
              <th className="px-4 py-3 text-left">Meet</th>
            </tr>
          </thead>
          <tbody>
            {todayBookings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  今日暫無預約
                </td>
              </tr>
            )}
            {todayBookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-3">{b.startTime}~{b.endTime}</td>
                <td className="px-4 py-3">
                  <div>{b.customerName}</div>
                  <div className="text-xs text-gray-400">{b.customerPhone}</div>
                </td>
                <td className="px-4 py-3">{b.service.name}</td>
                <td className="px-4 py-3">{b.provider.name}</td>
                <td className="px-4 py-3">
                  {b.googleMeetUrl ? (
                    <a href={b.googleMeetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                      開啟
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
