"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { initLiff, liff } from "@/lib/liff";

type BookingItem = {
  id: string;
  serviceId: string;
  providerId: string;
  serviceName: string;
  providerName: string;
  showProviderSelection?: boolean;
  bookingWindowDays?: number;
  minAdvanceDays?: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
};

type PointTransaction = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
};

type Ticket = {
  id: string;
  serviceId: string;
  serviceName: string;
  remaining: number;
  total: number;
  expiresAt: string | null;
  status: string; // "active" | "expired" | "used"
};

type Profile = {
  displayName: string;
  email: string;
  phone: string;
  isBlocked?: boolean;
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: "已確認", color: "#059669", bg: "#D1FAE5" },
  pending: { label: "待審核", color: "#D97706", bg: "#FEF3C7" },
  completed: { label: "已完成", color: "#6B7280", bg: "#F3F4F6" },
  cancelled: { label: "已取消", color: "#DC2626", bg: "#FEE2E2" },
};

const REASON_LABELS: Record<string, string> = {
  purchase: "儲值",
  booking: "預約扣點",
  refund: "退點",
  reward: "獎勵",
  admin_adjust: "管理員調整",
};

const TABS = ["我的預約", "點數", "票券", "個人資料"] as const;
type Tab = (typeof TABS)[number];

export default function MemberPage({ onBack, onBookService }: { onBack?: () => void; onBookService?: (serviceId: string) => void } = {}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [lineUserId, setLineUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("我的預約");

  // Booking state
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingItem | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [rescheduling, setRescheduling] = useState(false);

  // Points state
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsTransactions, setPointsTransactions] = useState<PointTransaction[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<Profile>({ displayName: "", email: "", phone: "" });
  const [isBlocked, setIsBlocked] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Active ticket count for badge
  const activeTicketCount = tickets.filter((t) => t.status === "active").length;

  const fetchBookings = useCallback(async (userId: string) => {
    setLoadingBookings(true);
    try {
      const res = await fetch(`/api/member/bookings?lineUserId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch {
      /* ignore */
    }
    setLoadingBookings(false);
  }, []);

  const fetchPoints = useCallback(async (userId: string) => {
    setLoadingPoints(true);
    try {
      const res = await fetch(`/api/member/points?lineUserId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setPointsBalance(data.balance ?? 0);
        setPointsTransactions(data.transactions ?? []);
      }
    } catch {
      /* ignore */
    }
    setLoadingPoints(false);
  }, []);

  const fetchTickets = useCallback(async (userId: string) => {
    setLoadingTickets(true);
    try {
      const res = await fetch(`/api/member/tickets?lineUserId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const raw = await res.json();
        const list = raw.tickets ?? raw ?? [];
        const now = new Date();
        setTickets(list.map((t: Record<string, unknown>) => {
          const remaining = (t.total as number) - (t.used as number || 0);
          const expired = t.expiresAt ? new Date(t.expiresAt as string) < now : false;
          return {
            id: t.id,
            serviceId: t.serviceId || (t.service as Record<string, string>)?.id || "",
            serviceName: t.serviceName || (t.service as Record<string, string>)?.name || "未知服務",
            remaining,
            total: t.total,
            expiresAt: t.expiresAt || null,
            status: expired ? "expired" : remaining <= 0 ? "used" : "active",
          };
        }));
      }
    } catch {
      /* ignore */
    }
    setLoadingTickets(false);
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/member/profile?lineUserId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setProfile({
          displayName: data.displayName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
        });
        if (data.isBlocked) setIsBlocked(true);
      }
    } catch {
      /* ignore */
    }
    setLoadingProfile(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    async function init() {
      try {
        const themeRes = await fetch("/api/theme");
        if (themeRes.ok) {
          const themeData = await themeRes.json();
          if (themeData.colors) {
            document.documentElement.style.setProperty("--color-primary", themeData.colors.primary);
            document.documentElement.style.setProperty("--color-accent", themeData.colors.accent);
          }
        }
      } catch {
        /* use defaults */
      }

      let userId = "";
      try {
        await initLiff();
        const liffProfile = await liff.getProfile();
        userId = liffProfile.userId;
        setLineUserId(userId);
        setDisplayName(liffProfile.displayName);
        setPictureUrl(liffProfile.pictureUrl || "");
      } catch {
        userId = "dev-user";
        setLineUserId(userId);
        setDisplayName("開發用戶");
      }

      // Fetch initial data in parallel
      await Promise.all([
        fetchBookings(userId),
        fetchPoints(userId),
        fetchTickets(userId),
        fetchProfile(userId),
      ]);
    }
    init();
  }, [fetchBookings, fetchPoints, fetchTickets, fetchProfile]);

  // Refresh tab-specific data when switching tabs
  useEffect(() => {
    if (!lineUserId) return;
    if (activeTab === "點數") fetchPoints(lineUserId);
    else if (activeTab === "票券") fetchTickets(lineUserId);
    else if (activeTab === "個人資料") fetchProfile(lineUserId);
  }, [activeTab, lineUserId, fetchPoints, fetchTickets, fetchProfile]);

  async function handleCancel(bookingId: string) {
    if (!confirm("確定要取消這筆預約嗎？")) return;
    setCancellingId(bookingId);
    try {
      const res = await fetch(
        `/api/member/bookings/${bookingId}?lineUserId=${encodeURIComponent(lineUserId)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchBookings(lineUserId);
      } else {
        const err = await res.json();
        alert(err.error || "取消失敗");
      }
    } catch {
      alert("取消失敗，請重試");
    }
    setCancellingId(null);
  }

  function openReschedule(booking: BookingItem) {
    setRescheduleId(booking.id);
    setRescheduleBooking(booking);
    setRescheduleDate("");
    setRescheduleTime("");
    setAvailableSlots([]);
    // Fetch available dates for current month
    const now = new Date();
    setCalendarMonth(now);
    fetchAvailableDates(booking.providerId, booking.serviceId, now);
  }

  async function fetchAvailableDates(providerId: string, serviceId: string, month: Date) {
    const y = month.getFullYear();
    const m = month.getMonth() + 1;
    const monthStr = `${y}-${m.toString().padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/availability?providerId=${providerId}&serviceId=${serviceId}&month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableDates(data.dates || []);
      }
    } catch { /* ignore */ }
  }

  async function fetchAvailableSlots(providerId: string, serviceId: string, date: string) {
    try {
      const res = await fetch(`/api/availability?providerId=${providerId}&serviceId=${serviceId}&date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots || []);
      }
    } catch { /* ignore */ }
  }

  function handleDateSelect(date: string) {
    setRescheduleDate(date);
    setRescheduleTime("");
    if (rescheduleBooking) {
      fetchAvailableSlots(rescheduleBooking.providerId, rescheduleBooking.serviceId, date);
    }
  }

  function handleMonthChange(newMonth: Date) {
    setCalendarMonth(newMonth);
    if (rescheduleBooking) {
      fetchAvailableDates(rescheduleBooking.providerId, rescheduleBooking.serviceId, newMonth);
    }
  }

  async function handleReschedule(bookingId: string) {
    if (!rescheduleDate || !rescheduleTime) {
      alert("請選擇新的日期和時間");
      return;
    }
    setRescheduling(true);
    try {
      const res = await fetch(
        `/api/member/bookings/${bookingId}?lineUserId=${encodeURIComponent(lineUserId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: rescheduleDate, startTime: rescheduleTime }),
        }
      );
      if (res.ok) {
        setRescheduleId(null);
        setRescheduleDate("");
        setRescheduleTime("");
        await fetchBookings(lineUserId);
      } else {
        const err = await res.json();
        alert(err.error || "更改失敗");
      }
    } catch {
      alert("更改失敗，請重試");
    }
    setRescheduling(false);
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/member/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId,
          displayName: profile.displayName,
          email: profile.email,
          phone: profile.phone,
        }),
      });
      if (res.ok) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      } else {
        const err = await res.json();
        alert(err.error || "儲存失敗");
      }
    } catch {
      alert("儲存失敗，請重試");
    }
    setSavingProfile(false);
  }

  if (!mounted) return null;

  if (isBlocked) {
    return (
      <div className="max-w-md mx-auto">
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => onBack ? onBack() : router.push("/")}
            className="inline-flex items-center gap-1 text-sm py-2 transition-colors duration-150"
            style={{ color: "var(--color-text-muted)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回首頁
          </button>
        </div>
        <div className="px-4 py-12">
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: "var(--color-text)" }}>
              帳號已被停用
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              您的帳號已被停用，無法使用會員功能。如有疑問請聯繫客服。
            </p>
          </div>
        </div>
      </div>
    );
  }

  const upcoming = bookings.filter((b) => b.status === "confirmed" || b.status === "pending");
  const past = bookings.filter((b) => b.status === "completed" || b.status === "cancelled");
  const isInitialLoading = loadingBookings && bookings.length === 0 && !lineUserId;

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => onBack ? onBack() : router.push("/")}
          className="inline-flex items-center gap-1 text-sm py-2 transition-colors duration-150"
          style={{ color: "var(--color-text-muted)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          返回首頁
        </button>
      </div>

      {/* User info row: avatar + name left, points right */}
      <div className="px-4 pb-3 flex items-center gap-3">
        {pictureUrl ? (
          <img src={pictureUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
          >
            {displayName?.charAt(0) || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
            {displayName || "載入中..."}
          </p>
          {activeTicketCount > 0 && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{activeTicketCount} 張票券</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>點數</p>
          <p className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
            {pointsBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="px-4 mb-4 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex" style={{ minWidth: "max-content" }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="text-sm font-medium px-4 py-3 transition-colors duration-150 relative whitespace-nowrap"
              style={{
                color: activeTab === tab ? "var(--color-primary)" : "var(--color-text-muted)",
                borderBottom: activeTab === tab ? "2px solid var(--color-primary)" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Initial loading */}
      {isInitialLoading && (
        <div className="flex flex-col items-center py-12 gap-3">
          <div
            className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
            style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>載入資料中...</p>
        </div>
      )}

      {/* Tab 1: 我的預約 */}
      {activeTab === "我的預約" && (
        <>
          {loadingBookings ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div
                className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
                style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>載入預約資料中...</p>
            </div>
          ) : (
            <>
              {/* Upcoming bookings */}
              <div className="px-4 mb-6">
                <h2 className="text-base font-bold mb-3" style={{ color: "var(--color-text)" }}>
                  即將到來的預約
                </h2>
                {upcoming.length === 0 ? (
                  <div
                    className="rounded-xl p-6 text-center"
                    style={{
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>目前沒有預約</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((b) => {
                      const status = STATUS_MAP[b.status] || STATUS_MAP.confirmed;
                      return (
                        <div
                          key={b.id}
                          className="rounded-xl p-4"
                          style={{
                            background: "var(--color-bg-card)",
                            boxShadow: "var(--shadow-soft)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                              {b.serviceName}
                            </p>
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ color: status.color, background: status.bg }}
                            >
                              {status.label}
                            </span>
                          </div>
                          <div className="space-y-1 mb-3">
                            {b.showProviderSelection && (
                              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                服務人員：{b.providerName}
                              </p>
                            )}
                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              日期：{b.date}
                            </p>
                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              時間：{b.startTime} - {b.endTime}
                            </p>
                          </div>

                          {/* Reschedule form — calendar + time slots */}
                          {rescheduleId === b.id && (
                            <div
                              className="mb-3 p-3 rounded-xl"
                              style={{ background: "#F8FAFC", border: "1px solid var(--color-border)" }}
                            >
                              <p className="text-xs font-bold mb-3" style={{ color: "var(--color-text)" }}>
                                選擇新的時段
                              </p>

                              {/* Simple calendar */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <button
                                    onClick={() => {
                                      const prev = new Date(calendarMonth);
                                      prev.setMonth(prev.getMonth() - 1);
                                      handleMonthChange(prev);
                                    }}
                                    className="p-1 rounded"
                                    style={{ color: "var(--color-text-muted)" }}
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                  </button>
                                  <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                                    {calendarMonth.getFullYear()} 年 {calendarMonth.getMonth() + 1} 月
                                  </span>
                                  <button
                                    onClick={() => {
                                      const next = new Date(calendarMonth);
                                      next.setMonth(next.getMonth() + 1);
                                      handleMonthChange(next);
                                    }}
                                    className="p-1 rounded"
                                    style={{ color: "var(--color-text-muted)" }}
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                  </button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center">
                                  {["日","一","二","三","四","五","六"].map(d => (
                                    <div key={d} className="text-[10px] py-1" style={{ color: "var(--color-text-muted)" }}>{d}</div>
                                  ))}
                                  {(() => {
                                    const year = calendarMonth.getFullYear();
                                    const month = calendarMonth.getMonth();
                                    const firstDay = new Date(year, month, 1).getDay();
                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                    const today = new Date().toLocaleDateString("en-CA");
                                    // 套用服務的 bookingWindowDays / minAdvanceDays 限制
                                    const todayDate = new Date(today + "T00:00:00");
                                    const windowDays = b.bookingWindowDays || 0;
                                    const minAdvance = b.minAdvanceDays || 0;
                                    const maxDateStr = windowDays > 0
                                      ? new Date(todayDate.getTime() + windowDays * 86400000).toLocaleDateString("en-CA")
                                      : null;
                                    const minDateStr = minAdvance > 0
                                      ? new Date(todayDate.getTime() + minAdvance * 86400000).toLocaleDateString("en-CA")
                                      : today;
                                    const availSet = new Set(availableDates);
                                    const cells = [];
                                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
                                    for (let d = 1; d <= daysInMonth; d++) {
                                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                                      const inWindow = dateStr >= minDateStr && (!maxDateStr || dateStr <= maxDateStr);
                                      const isAvail = availSet.has(dateStr) && dateStr >= today && inWindow;
                                      const isSelected = rescheduleDate === dateStr;
                                      cells.push(
                                        <button
                                          key={d}
                                          disabled={!isAvail}
                                          onClick={() => handleDateSelect(dateStr)}
                                          className={`text-xs py-1.5 rounded-lg transition-colors ${isSelected ? "text-white font-bold" : isAvail ? "font-medium" : "opacity-30"}`}
                                          style={{
                                            background: isSelected ? "var(--color-primary)" : "transparent",
                                            color: isSelected ? "#fff" : isAvail ? "var(--color-primary)" : "var(--color-text-muted)",
                                          }}
                                        >
                                          {d}
                                        </button>
                                      );
                                    }
                                    return cells;
                                  })()}
                                </div>
                              </div>

                              {/* Time slots */}
                              {rescheduleDate && (
                                <div className="mb-3">
                                  <p className="text-[10px] font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
                                    {rescheduleDate} 可選時段
                                  </p>
                                  {availableSlots.length === 0 ? (
                                    <p className="text-xs text-center py-2" style={{ color: "var(--color-text-muted)" }}>此日期無可用時段</p>
                                  ) : (
                                    <div className="grid grid-cols-4 gap-1.5">
                                      {availableSlots.map(slot => (
                                        <button
                                          key={slot.startTime}
                                          onClick={() => setRescheduleTime(slot.startTime)}
                                          className={`py-2 rounded-lg text-xs font-medium transition-colors ${rescheduleTime === slot.startTime ? "text-white" : ""}`}
                                          style={{
                                            background: rescheduleTime === slot.startTime ? "var(--color-primary)" : "var(--color-bg-card)",
                                            color: rescheduleTime === slot.startTime ? "#fff" : "var(--color-text)",
                                            border: `1px solid ${rescheduleTime === slot.startTime ? "var(--color-primary)" : "var(--color-border)"}`,
                                          }}
                                        >
                                          {slot.startTime}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReschedule(b.id)}
                                  disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                                  className="flex-1 text-white py-2 rounded-lg text-xs font-medium transition-all duration-150 disabled:opacity-40"
                                  style={{ background: "var(--color-primary)" }}
                                >
                                  {rescheduling ? "更改中..." : "確認更改"}
                                </button>
                                <button
                                  onClick={() => {
                                    setRescheduleId(null);
                                    setRescheduleDate("");
                                    setRescheduleTime("");
                                    setRescheduleBooking(null);
                                  }}
                                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                                  style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          {rescheduleId !== b.id && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openReschedule(b)}
                                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                                style={{
                                  color: "var(--color-primary)",
                                  border: "1px solid var(--color-primary)",
                                  background: "transparent",
                                }}
                              >
                                更改時段
                              </button>
                              <button
                                onClick={() => handleCancel(b.id)}
                                disabled={cancellingId === b.id}
                                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-150 disabled:opacity-50"
                                style={{
                                  color: "#DC2626",
                                  border: "1px solid #FCA5A5",
                                  background: "transparent",
                                }}
                              >
                                {cancellingId === b.id ? "取消中..." : "取消預約"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Past bookings */}
              {past.length > 0 && (
                <div className="px-4">
                  <h2 className="text-base font-bold mb-3" style={{ color: "var(--color-text)" }}>
                    過去的預約
                  </h2>
                  <div className="space-y-3">
                    {past.map((b) => {
                      const status = STATUS_MAP[b.status] || STATUS_MAP.completed;
                      return (
                        <div
                          key={b.id}
                          className="rounded-xl p-4 opacity-70"
                          style={{
                            background: "var(--color-bg-card)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                              {b.serviceName}
                            </p>
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ color: status.color, background: status.bg }}
                            >
                              {status.label}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {b.showProviderSelection && (
                              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                服務人員：{b.providerName}
                              </p>
                            )}
                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              日期：{b.date}
                            </p>
                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              時間：{b.startTime} - {b.endTime}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tab 2: 點數 */}
      {activeTab === "點數" && (
        <div className="px-4">
          {loadingPoints ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div
                className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
                style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>載入點數資料中...</p>
            </div>
          ) : (
            <>
              {/* Balance display */}
              <div
                className="rounded-2xl p-6 text-center mb-6"
                style={{
                  background: "var(--color-bg-card)",
                  boxShadow: "var(--shadow-card)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                  目前點數餘額
                </p>
                <p className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
                  {pointsBalance.toLocaleString()}{" "}
                  <span className="text-base font-medium">點</span>
                </p>
              </div>

              {/* Transaction history */}
              <h3 className="text-base font-bold mb-3" style={{ color: "var(--color-text)" }}>
                異動紀錄
              </h3>
              {pointsTransactions.length === 0 ? (
                <div
                  className="rounded-xl p-6 text-center"
                  style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>尚無點數紀錄</p>
                </div>
              ) : (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "var(--color-bg-card)",
                    boxShadow: "var(--shadow-card)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {pointsTransactions.map((tx, idx) => (
                    <div
                      key={tx.id}
                      className="flex items-center px-4 py-3"
                      style={{
                        borderBottom:
                          idx < pointsTransactions.length - 1
                            ? "1px solid var(--color-border)"
                            : "none",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-left" style={{ color: "var(--color-text)" }}>
                          {REASON_LABELS[tx.reason] || tx.reason}
                        </p>
                        <p className="text-xs text-left" style={{ color: "var(--color-text-muted)" }}>
                          {new Date(tx.createdAt).toLocaleDateString("zh-TW")}
                        </p>
                      </div>
                      <p
                        className="text-sm font-bold flex-shrink-0 tabular-nums text-right w-20"
                        style={{ color: tx.amount >= 0 ? "#059669" : "#DC2626" }}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {tx.amount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab 3: 票券 */}
      {activeTab === "票券" && (
        <div className="px-4">
          {loadingTickets ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div
                className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
                style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>載入票券資料中...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div
              className="rounded-xl p-6 text-center"
              style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>尚無票券</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const isInactive = ticket.status === "expired" || ticket.remaining === 0;
                const progressPct = ticket.total > 0 ? (ticket.remaining / ticket.total) * 100 : 0;
                return (
                  <div
                    key={ticket.id}
                    className="rounded-2xl p-4"
                    style={{
                      background: "var(--color-bg-card)",
                      boxShadow: isInactive ? "none" : "var(--shadow-card)",
                      border: "1px solid var(--color-border)",
                      opacity: isInactive ? 0.5 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p
                        className="text-sm font-bold"
                        style={{ color: isInactive ? "var(--color-text-muted)" : "var(--color-text)" }}
                      >
                        {ticket.serviceName}
                      </p>
                      {!isInactive && onBookService && (
                        <button
                          onClick={() => onBookService(ticket.serviceId)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 active:scale-95"
                          style={{
                            background: "var(--color-primary)",
                            color: "#fff",
                          }}
                        >
                          預約
                        </button>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          剩餘 {ticket.remaining} / {ticket.total} 張
                        </p>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: "var(--color-border)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${progressPct}%`,
                            background: isInactive ? "var(--color-text-muted)" : "var(--color-primary)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Expiry */}
                    {ticket.expiresAt && (
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        到期日：{new Date(ticket.expiresAt).toLocaleDateString("zh-TW")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: 個人資料 */}
      {activeTab === "個人資料" && (
        <div className="px-4">
          {loadingProfile ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div
                className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
                style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>載入個人資料中...</p>
            </div>
          ) : (
            <div
              className="rounded-2xl p-5"
              style={{
                background: "var(--color-bg-card)",
                boxShadow: "var(--shadow-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="space-y-4">
                {/* Display Name */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--color-text)" }}
                  >
                    顯示名稱
                  </label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150"
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-primary)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--color-text)" }}
                  >
                    電子信箱
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150"
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-primary)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--color-text)" }}
                  >
                    電話號碼
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="0912345678"
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150"
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-primary)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full mt-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-150 disabled:opacity-50"
                style={{ background: "var(--color-primary)" }}
              >
                {savingProfile ? "儲存中..." : "儲存變更"}
              </button>

              {/* Success notification */}
              {profileSaved && (
                <div
                  className="mt-3 py-2 rounded-lg text-center text-sm font-medium"
                  style={{ background: "#D1FAE5", color: "#059669" }}
                >
                  已成功儲存！
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
