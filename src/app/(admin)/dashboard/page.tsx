"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Booking = {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  googleMeetUrl: string | null;
  providerId: string;
  provider: { name: string };
  service: { name: string };
};

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  const [mounted, setMounted] = useState(false);

  const role = session?.user?.role || "admin";
  const providerId = session?.user?.providerId;
  const isProvider = role === "provider";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (session) loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadDashboard() {
    const now = new Date();
    const tzOffset = 8 * 60;
    const local = new Date(now.getTime() + (tzOffset + now.getTimezoneOffset()) * 60000);
    const todayStr = local.toISOString().slice(0, 10);

    // Build query params with optional provider filter
    const todayParams = new URLSearchParams({ date: todayStr, status: "confirmed" });
    if (isProvider && providerId) todayParams.set("providerId", providerId);

    const allParams = new URLSearchParams();
    if (isProvider && providerId) allParams.set("providerId", providerId);

    // Load today's bookings
    const res = await fetch(`/api/admin/bookings?${todayParams.toString()}`);
    const todayData: Booking[] = await res.json();
    setTodayBookings(todayData);

    // Load all bookings for stats
    const allRes = await fetch(`/api/admin/bookings?${allParams.toString()}`);
    const allBookings: Booking[] = await allRes.json();

    const todayDate = new Date(todayStr + "T00:00:00+08:00");
    const weekAgo = new Date(todayDate.getTime() - 6 * 86400000);
    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const next7Days = new Date(todayDate.getTime() + 7 * 86400000);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    const upcoming: Booking[] = [];

    for (const b of allBookings) {
      if (b.status === "cancelled") continue;
      const d = new Date(b.date);
      if (d >= todayDate && d < new Date(todayDate.getTime() + 86400000)) todayCount++;
      if (d >= weekAgo && d < new Date(todayDate.getTime() + 86400000)) weekCount++;
      if (d >= monthStart && d < new Date(todayDate.getTime() + 86400000)) monthCount++;
      // Upcoming: tomorrow to next 7 days
      if (d > todayDate && d <= next7Days) {
        upcoming.push(b);
      }
    }

    setStats({ today: todayCount, week: weekCount, month: monthCount });
    setUpcomingBookings(upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  }

  if (!mounted || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1E293B]">儀表板</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isProvider ? "我的預約總覽與今日排程" : "預約總覽與今日排程"}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{isProvider ? "我的今日預約" : "今日預約"}</p>
              <p className="text-3xl font-bold text-[#1E293B] mt-2">{stats.today}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#2563EB]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{isProvider ? "我的本週預約" : "本週預約"}</p>
              <p className="text-3xl font-bold text-[#1E293B] mt-2">{stats.week}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#06B6D4]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{isProvider ? "我的本月預約" : "本月預約"}</p>
              <p className="text-3xl font-bold text-[#1E293B] mt-2">{stats.month}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Today's bookings */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-[#1E293B]">{isProvider ? "我的今日預約" : "今日預約"}</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">時間</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">顧客</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">服務</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">提供者</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Meet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todayBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                      </svg>
                      <p className="text-slate-400 text-sm">今日暫無預約</p>
                    </div>
                  </td>
                </tr>
              )}
              {todayBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors duration-100">
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#1E293B]">
                      {b.startTime}~{b.endTime}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-[#1E293B]">{b.customerName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{b.customerPhone}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-xs font-medium text-[#2563EB]">
                      {b.service.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{b.provider.name}</td>
                  <td className="px-5 py-3.5">
                    {b.googleMeetUrl ? (
                      <a href={b.googleMeetUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:text-blue-800 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        開啟
                      </a>
                    ) : (
                      <span className="text-slate-300 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming bookings */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-[#06B6D4]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          <h2 className="text-lg font-semibold text-[#1E293B]">{isProvider ? "我的未來 7 天預約" : "未來 7 天預約"}</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">日期</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">時間</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">顧客</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">服務</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">提供者</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {upcomingBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <p className="text-slate-400 text-sm">未來 7 天暫無預約</p>
                  </td>
                </tr>
              )}
              {upcomingBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors duration-100">
                  <td className="px-5 py-3.5 font-medium text-[#1E293B]">{new Date(b.date).toLocaleDateString("zh-TW")}</td>
                  <td className="px-5 py-3.5 text-slate-600">{b.startTime}~{b.endTime}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-[#1E293B]">{b.customerName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{b.customerPhone}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-cyan-50 text-xs font-medium text-[#06B6D4]">
                      {b.service.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{b.provider.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
