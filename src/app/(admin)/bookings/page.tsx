"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Pagination } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/table-skeleton";

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
  paidWith: string | null;
  pointsUsed: number;
  provider: { id: string; name: string };
  service: { id: string; name: string };
};

type ServiceOption = { id: string; name: string };
type ProviderOption = { id: string; name: string };

const statusLabels: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "待審核", color: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  confirmed: { label: "已確認", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  on_hold: { label: "保留", color: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  cancelled: { label: "已取消", color: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  completed: { label: "已完成", color: "bg-gray-100 text-slate-700 ring-slate-600/20", dot: "bg-slate-400" },
};

const statusOptions = [
  { value: "", label: "全部狀態" },
  { value: "pending", label: "待審核" },
  { value: "confirmed", label: "已確認" },
  { value: "on_hold", label: "保留" },
  { value: "cancelled", label: "已取消" },
  { value: "completed", label: "已完成" },
];

const editStatusOptions = [
  { value: "pending", label: "待審核" },
  { value: "confirmed", label: "已確認" },
  { value: "on_hold", label: "保留" },
  { value: "cancelled", label: "已取消" },
  { value: "completed", label: "已完成" },
];

export default function BookingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [mounted, setMounted] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const role = session?.user?.role || "admin";
  const providerId = session?.user?.providerId;
  const isProvider = role === "provider";

  // Block dialog state
  const [blockDialog, setBlockDialog] = useState<{ booking: Booking } | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);

  // Message dialog state
  const [messageDialog, setMessageDialog] = useState<{ booking: Booking } | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Cancel dialog state
  const [cancelDialog, setCancelDialog] = useState<{ booking: Booking } | null>(null);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Edit modal state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    serviceId: "",
    providerId: "",
    date: "",
    startTime: "",
    customerName: "",
    customerPhone: "",
    notes: "",
    status: "",
  });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Options for dropdowns
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [allProviders, setAllProviders] = useState<ProviderOption[]>([]);

  function isOwnBooking(booking: Booking): boolean {
    return booking.providerId === providerId;
  }

  function canEditBooking(booking: Booking): boolean {
    if (!isProvider) return true; // admin can edit all
    return isOwnBooking(booking);
  }

  async function loadBookings() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (statusFilters.length > 0) params.set("status", statusFilters.join(","));
    if (serviceFilter) params.set("serviceId", serviceFilter);
    if (providerFilter) params.set("providerId", providerFilter);
    try {
      const res = await fetch(`/api/admin/bookings?${params.toString()}`);
      setBookings(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadOptions() {
    try {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/admin/services"),
        fetch("/api/admin/providers"),
      ]);
      if (sRes.ok) setAllServices(await sRes.json());
      if (pRes.ok) setAllProviders(await pRes.json());
    } catch { /* ignore */ }
  }

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted) {
      loadBookings();
      loadOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, dateFrom, dateTo, statusFilters, serviceFilter, providerFilter]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, statusFilters, serviceFilter, providerFilter]);

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }

  function openCancelDialog(booking: Booking) {
    // Build default message from template
    const dateStr = booking.date.slice(0, 10);
    const defaultMsg = `${booking.customerName} 您好，您的 ${booking.service.name} 預約已取消。\n原預約時間：${dateStr} ${booking.startTime} - ${booking.endTime}\n如有疑問請聯繫我們。`;
    setCancelDialog({ booking });
    setCancelMessage(defaultMsg);
  }

  async function confirmCancel() {
    if (!cancelDialog) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/bookings/${cancelDialog.booking.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerMessage: cancelMessage }),
      });
      if (res.ok) {
        showNotification("success", "預約已取消");
        setCancelDialog(null);
        loadBookings();
      } else {
        showNotification("error", "取消失敗");
      }
    } catch {
      showNotification("error", "取消失敗");
    }
    setCancelling(false);
  }

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (res.ok) {
        showNotification("success", "已審核通過");
        loadBookings();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification("error", err.error || "審核失敗");
      }
    } catch {
      showNotification("error", "審核失敗");
    }
  }

  function openEditModal(booking: Booking) {
    setEditingBooking(booking);
    setEditForm({
      serviceId: booking.serviceId,
      providerId: booking.providerId,
      date: booking.date.slice(0, 10),
      startTime: booking.startTime,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      notes: booking.notes || "",
      status: booking.status,
    });
  }

  // Notification confirm after edit
  const [notifyConfirm, setNotifyConfirm] = useState<{ bookingId: string; date: string; startTime: string } | null>(null);

  async function handleEditSave() {
    if (!editingBooking) return;
    setSaving(true);
    try {
      const timeChanged = editForm.date !== editingBooking.date.slice(0, 10) || editForm.startTime !== editingBooking.startTime;
      const res = await fetch(`/api/admin/bookings/${editingBooking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, skipNotification: true }),
      });
      if (res.ok) {
        showNotification("success", "預約已更新");
        const savedBooking = editingBooking;
        setEditingBooking(null);
        loadBookings();
        // If time/date changed, ask whether to notify
        if (timeChanged) {
          setNotifyConfirm({ bookingId: savedBooking.id, date: editForm.date, startTime: editForm.startTime });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification("error", err.error || "更新失敗");
      }
    } catch {
      showNotification("error", "更新失敗");
    }
    setSaving(false);
  }

  async function sendRescheduleNotification(bookingId: string, notifyCustomer: boolean, notifyProvider: boolean) {
    try {
      await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notify_reschedule", notifyCustomer, notifyProvider }),
      });
      showNotification("success", "通知已發送");
    } catch {
      showNotification("error", "通知發送失敗");
    }
    setNotifyConfirm(null);
  }

  async function handleBlockUser() {
    if (!blockDialog) return;
    setBlocking(true);
    try {
      // Find customer by lineUserId
      const searchRes = await fetch(`/api/admin/customers?search=${encodeURIComponent(blockDialog.booking.lineUserId)}`);
      if (!searchRes.ok) { showNotification("error", "找不到用戶"); setBlocking(false); return; }
      const customers = await searchRes.json();
      const customer = customers.find((c: { lineUserId: string }) => c.lineUserId === blockDialog.booking.lineUserId);
      if (!customer) { showNotification("error", "找不到用戶"); setBlocking(false); return; }

      const res = await fetch("/api/admin/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customer.id,
          isBlocked: true,
          ...(blockReason ? { blockReason } : {}),
        }),
      });
      if (res.ok) {
        showNotification("success", "用戶已加入黑名單");
        setBlockDialog(null);
        setBlockReason("");
      } else {
        showNotification("error", "操作失敗");
      }
    } catch {
      showNotification("error", "操作失敗");
    }
    setBlocking(false);
  }

  async function handleSendMessage() {
    if (!messageDialog || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch("/api/admin/customers/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserIds: [messageDialog.booking.lineUserId], message: messageText }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.successCount > 0) {
          showNotification("success", "訊息已發送");
          setMessageDialog(null);
        } else {
          showNotification("error", "發送失敗");
        }
      } else {
        showNotification("error", "發送失敗");
      }
    } catch {
      showNotification("error", "發送失敗");
    }
    setSendingMessage(false);
  }

  // Pagination
  const totalItems = bookings.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedBookings = bookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!mounted || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
          notification.type === "success"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {notification.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">預約紀錄</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isProvider ? "查看所有預約紀錄（僅能編輯自己的預約）" : "管理所有預約紀錄"}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">日期開始</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">日期結束</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">服務</label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              {allServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">提供者</label>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              {allProviders.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status tabs */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-gray-500">狀態：</label>
          <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setStatusFilters([])}
              className={`px-3 py-1.5 text-xs font-medium border-r border-gray-200 transition-colors ${
                statusFilters.length === 0
                  ? "bg-[#2563EB] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              全部
            </button>
            {statusOptions.filter(o => o.value).map((opt, i, arr) => {
              const isSelected = statusFilters.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilters((prev) =>
                    isSelected ? prev.filter((s) => s !== opt.value) : [...prev, opt.value]
                  )}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    i < arr.length - 1 ? "border-r border-gray-200" : ""
                  } ${
                    isSelected
                      ? "bg-[#2563EB] text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
              setDateFrom(today);
              setDateTo(today);
            }}
            className="ml-auto h-8 px-3 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
          >
            今天
          </button>
          {(dateFrom || dateTo || statusFilters.length > 0 || serviceFilter || providerFilter) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilters([]); setServiceFilter(""); setProviderFilter(""); }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除篩選
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">日期</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">時間</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">顧客</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">服務</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">提供者</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">備註</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">狀態</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <p className="text-gray-500 text-sm">暫無預約紀錄</p>
                    </div>
                  </td>
                </tr>
              )}
              {paginatedBookings.map((b, index) => {
                const dateStr = new Date(b.date).toLocaleDateString("zh-TW");
                const st = statusLabels[b.status] || { label: b.status, color: "bg-gray-100 text-slate-700 ring-slate-600/20", dot: "bg-slate-400" };
                const editable = canEditBooking(b);
                return (
                  <tr key={b.id} className={`hover:bg-gray-100/50 transition-colors duration-100 ${index % 2 === 1 ? "bg-gray-100/30" : ""}`}>
                    <td className="px-5 py-3.5 font-medium text-gray-900">{dateStr}</td>
                    <td className="px-5 py-3.5 text-gray-700">{b.startTime}~{b.endTime}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-900">{b.customerName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{b.customerPhone}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-xs font-medium text-[#2563EB]">
                        {b.service.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{b.provider.name}</td>
                    <td className="px-5 py-3.5">
                      {b.notes ? (
                        <span className="text-xs text-gray-500 line-clamp-2 max-w-[120px]" title={b.notes}>{b.notes}</span>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                        {st.label}
                      </span>
                      {b.paidWith === "ticket" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20 ml-1">票券</span>
                      )}
                      {b.paidWith === "points" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 ml-1">點數 {b.pointsUsed}</span>
                      )}
                      {b.paidWith === "cash" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-slate-700 ring-1 ring-inset ring-slate-600/20 ml-1">現金</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {editable && b.status === "pending" && (
                          <button
                            onClick={() => handleApprove(b.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            審核通過
                          </button>
                        )}
                        {b.googleMeetUrl && (
                          <a
                            href={b.googleMeetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:text-blue-800 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                            Meet
                          </a>
                        )}
                        {editable && (
                          <button
                            onClick={() => openEditModal(b)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-[#2563EB] transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                            編輯
                          </button>
                        )}
                        {editable && (b.status === "confirmed" || b.status === "pending" || b.status === "on_hold") && (
                          <button
                            onClick={() => openCancelDialog(b)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            取消
                          </button>
                        )}
                        {!isProvider && (
                          <button
                            onClick={() => { setMessageDialog({ booking: b }); setMessageText(""); }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#06C755] hover:text-[#05a847] transition-colors"
                            title="傳訊息"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                            </svg>
                            訊息
                          </button>
                        )}
                        {!isProvider && (
                          <button
                            onClick={() => { setBlockDialog({ booking: b }); setBlockReason(""); }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                            title="封鎖用戶"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            封鎖
                          </button>
                        )}
                        {/* non-editable bookings: no action buttons, no label */}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>
      )}

      {/* Cancel Booking Dialog */}
      {cancelDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCancelDialog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-900">取消預約</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                即將取消 <span className="font-medium text-gray-900">{cancelDialog.booking.customerName}</span> 的預約，確認後將透過 LINE 通知用戶。
              </p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">通知訊息（可編輯）</label>
                <textarea
                  value={cancelMessage}
                  onChange={(e) => setCancelMessage(e.target.value)}
                  rows={6}
                  placeholder="輸入取消通知訊息..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setCancelDialog(null)}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling}
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  {cancelling ? "取消中..." : "確認取消"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Dialog */}
      {messageDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMessageDialog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-[#06C755]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-900">傳送 LINE 訊息</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                傳送給：<span className="font-medium text-gray-900">{messageDialog.booking.customerName}</span>
              </p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">訊息內容</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={5}
                  placeholder="輸入要傳送的訊息..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setMessageDialog(null)}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageText.trim()}
                  className="inline-flex items-center gap-2 bg-[#06C755] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#05a847] shadow-sm transition-colors disabled:opacity-50"
                >
                  {sendingMessage ? "發送中..." : "發送訊息"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block User Dialog */}
      {blockDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setBlockDialog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">封鎖用戶</h3>
              <p className="text-sm text-gray-500 mb-4">
                確定要封鎖「{blockDialog.booking.customerName}」嗎？封鎖後該用戶將無法進行預約。
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-1.5">封鎖原因（選填）</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  placeholder="例如：多次未到、違規行為..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBlockUser}
                  disabled={blocking}
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 shadow-sm transition-colors duration-150 disabled:opacity-50"
                >
                  {blocking ? "處理中..." : "確認封鎖"}
                </button>
                <button
                  onClick={() => setBlockDialog(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-slate-100 hover:bg-slate-200 transition-colors duration-150"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditingBooking(null)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-5">編輯預約</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">服務項目</label>
                  <select
                    value={editForm.serviceId}
                    onChange={(e) => setEditForm({ ...editForm, serviceId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  >
                    {allServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">服務提供者</label>
                  <select
                    value={editForm.providerId}
                    onChange={(e) => setEditForm({ ...editForm, providerId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  >
                    {allProviders.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">日期</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">時間</label>
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">顧客姓名</label>
                  <input
                    type="text"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">顧客電話</label>
                  <input
                    type="text"
                    value={editForm.customerPhone}
                    onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">備註</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">狀態</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  >
                    {editStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6 pt-5 border-t border-gray-200">
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {saving ? "儲存中..." : "儲存"}
                </button>
                <button
                  onClick={() => setEditingBooking(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-slate-100 hover:bg-slate-200 transition-colors duration-150"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notify confirm dialog after edit */}
      {notifyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setNotifyConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">預約時間已更改</h3>
            <p className="text-sm text-gray-500 mb-5">是否要通知相關人員？</p>
            <div className="space-y-3">
              {isProvider ? (
                // Provider: only ask about notifying customer
                <>
                  <button
                    onClick={() => sendRescheduleNotification(notifyConfirm.bookingId, true, false)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                    style={{ background: "var(--color-primary, #2563EB)" }}
                  >
                    通知客戶
                  </button>
                  <button
                    onClick={() => setNotifyConfirm(null)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 transition-colors hover:bg-gray-100"
                  >
                    不通知
                  </button>
                </>
              ) : (
                // Admin: ask about notifying customer and/or provider
                <>
                  <button
                    onClick={() => sendRescheduleNotification(notifyConfirm.bookingId, true, true)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                    style={{ background: "var(--color-primary, #2563EB)" }}
                  >
                    通知客戶與服務提供者
                  </button>
                  <button
                    onClick={() => sendRescheduleNotification(notifyConfirm.bookingId, true, false)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-[#2563EB] border border-[#2563EB] transition-colors hover:bg-blue-50"
                  >
                    只通知客戶
                  </button>
                  <button
                    onClick={() => setNotifyConfirm(null)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 transition-colors hover:bg-gray-100"
                  >
                    不通知
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
