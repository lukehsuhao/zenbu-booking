"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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

type ServiceOption = { id: string; name: string };
type ProviderOption = { id: string; name: string };

const statusLabels: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "待審核", color: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  confirmed: { label: "已確認", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  on_hold: { label: "保留", color: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  cancelled: { label: "已取消", color: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  completed: { label: "已完成", color: "bg-slate-50 text-slate-700 ring-slate-600/20", dot: "bg-slate-400" },
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
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");

  const role = session?.user?.role || "admin";
  const providerId = session?.user?.providerId;
  const isProvider = role === "provider";

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
    if (statusFilter) params.set("status", statusFilter);
    if (serviceFilter) params.set("serviceId", serviceFilter);
    if (providerFilter) params.set("providerId", providerFilter);
    const res = await fetch(`/api/admin/bookings?${params.toString()}`);
    setBookings(await res.json());
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

  useEffect(() => {
    loadBookings();
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, statusFilter, serviceFilter, providerFilter]);

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }

  async function handleCancel(id: string) {
    if (!confirm("確定要取消此預約？")) return;
    await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
    loadBookings();
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

  async function handleEditSave() {
    if (!editingBooking) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${editingBooking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        showNotification("success", "預約已更新");
        setEditingBooking(null);
        loadBookings();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification("error", err.error || "更新失敗");
      }
    } catch {
      showNotification("error", "更新失敗");
    }
    setSaving(false);
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
        <h1 className="text-2xl font-bold text-[#1E293B]">預約紀錄</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isProvider ? "查看所有預約紀錄（僅能編輯自己的預約）" : "管理所有預約紀錄"}
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Row 1: Date range + Service + Provider */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
            <span className="text-sm text-slate-400">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
          </div>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          >
            <option value="">全部服務</option>
            {allServices.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          >
            <option value="">全部提供者</option>
            {allProviders.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {(dateFrom || dateTo || statusFilter || serviceFilter || providerFilter) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter(""); setServiceFilter(""); setProviderFilter(""); }}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              清除篩選
            </button>
          )}
        </div>
        {/* Row 2: Status pills */}
        <div className="flex gap-1.5 bg-white rounded-xl border border-slate-200 shadow-sm p-1 w-fit">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                statusFilter === opt.value
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">日期</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">時間</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">顧客</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">服務</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">提供者</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">備註</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">狀態</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <p className="text-slate-400 text-sm">暫無預約紀錄</p>
                    </div>
                  </td>
                </tr>
              )}
              {bookings.map((b, index) => {
                const dateStr = new Date(b.date).toLocaleDateString("zh-TW");
                const st = statusLabels[b.status] || { label: b.status, color: "bg-slate-50 text-slate-700 ring-slate-600/20", dot: "bg-slate-400" };
                const editable = canEditBooking(b);
                return (
                  <tr key={b.id} className={`hover:bg-slate-50/50 transition-colors duration-100 ${index % 2 === 1 ? "bg-slate-50/30" : ""}`}>
                    <td className="px-5 py-3.5 font-medium text-[#1E293B]">{dateStr}</td>
                    <td className="px-5 py-3.5 text-slate-600">{b.startTime}~{b.endTime}</td>
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
                      {b.notes ? (
                        <span className="text-xs text-slate-500 line-clamp-2 max-w-[120px]" title={b.notes}>{b.notes}</span>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 w-48">
                      <div className="flex items-center gap-2 min-w-[180px]">
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
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-[#2563EB] transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                            編輯
                          </button>
                        )}
                        {editable && (b.status === "confirmed" || b.status === "pending" || b.status === "on_hold") && (
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            取消
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
      </div>

      {/* Edit Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditingBooking(null)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#1E293B] mb-5">編輯預約</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">服務項目</label>
                  <select
                    value={editForm.serviceId}
                    onChange={(e) => setEditForm({ ...editForm, serviceId: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  >
                    {allServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">服務提供者</label>
                  <select
                    value={editForm.providerId}
                    onChange={(e) => setEditForm({ ...editForm, providerId: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  >
                    {allProviders.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1E293B] mb-1.5">日期</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1E293B] mb-1.5">時間</label>
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">顧客姓名</label>
                  <input
                    type="text"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">顧客電話</label>
                  <input
                    type="text"
                    value={editForm.customerPhone}
                    onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">備註</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">狀態</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                  >
                    {editStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
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
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors duration-150"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
