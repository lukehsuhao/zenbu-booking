"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Pagination } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/table-skeleton";

type ServiceStat = {
  id: string;
  name: string;
  count: number;
};

type Customer = {
  id: string;
  lineUserId: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  pictureUrl: string | null;
  points: number;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  totalBookings: number;
  services: ServiceStat[];
  lastBookingDate: string | null;
};

type BookingRecord = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  customerName: string;
  service: { id: string; name: string };
  provider: { id: string; name: string };
};

type PointTransaction = {
  id: string;
  amount: number;
  reason: string;
  notes: string | null;
  createdAt: string;
};

type CustomerTicket = {
  id: string;
  serviceId: string;
  total: number;
  used: number;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
  service: { id: string; name: string };
};

type ServiceOption = { id: string; name: string };

const statusLabels: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "待審核", color: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  confirmed: { label: "已確認", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  on_hold: { label: "保留", color: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  cancelled: { label: "已取消", color: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  completed: { label: "已完成", color: "bg-gray-100 text-slate-700 ring-slate-600/20", dot: "bg-slate-400" },
};

export default function CustomersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [mounted, setMounted] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minBookings, setMinBookings] = useState("");
  const [maxBookings, setMaxBookings] = useState("");
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Edit modal
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ email: "", phone: "", notes: "" });
  const [editBookings, setEditBookings] = useState<BookingRecord[]>([]);
  const [saving, setSaving] = useState(false);

  // Points & Tickets in edit modal
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [pointAmount, setPointAmount] = useState("");
  const [pointReason, setPointReason] = useState("purchase");
  const [pointNotes, setPointNotes] = useState("");
  const [customerTickets, setCustomerTickets] = useState<CustomerTicket[]>([]);
  const [newTicketServiceId, setNewTicketServiceId] = useState("");
  const [newTicketTotal, setNewTicketTotal] = useState("");
  const [newTicketExpiry, setNewTicketExpiry] = useState("");

  // Message dialog
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Block dialog
  const [blockDialog, setBlockDialog] = useState<{ customer: Customer; action: "block" | "unblock" } | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);

  // Block filter
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);

  const role = session?.user?.role || "admin";
  const isAdmin = role === "admin";

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }

  async function loadCustomers() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (serviceFilter) params.set("serviceId", serviceFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (minBookings) params.set("minBookings", minBookings);
    if (maxBookings) params.set("maxBookings", maxBookings);
    try {
      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      if (res.ok) setCustomers(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadServices() {
    try {
      const res = await fetch("/api/admin/services");
      if (res.ok) setAllServices(await res.json());
    } catch { /* ignore */ }
  }

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted) {
      loadCustomers();
      loadServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, serviceFilter, statusFilter, minBookings, maxBookings]);

  // Debounced search
  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => { loadCustomers(); }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, serviceFilter, statusFilter, minBookings, maxBookings]);

  function handleSelect(index: number, e: React.MouseEvent | React.ChangeEvent) {
    const id = customers[index]?.id;
    if (!id) return;

    if ("shiftKey" in e && e.shiftKey && lastCheckedIndex !== null) {
      // Shift+click: select range
      const start = Math.min(lastCheckedIndex, index);
      const end = Math.max(lastCheckedIndex, index);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          if (customers[i]) next.add(customers[i].id);
        }
        return next;
      });
    } else {
      // Normal click: toggle single
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    setLastCheckedIndex(index);
  }

  function toggleSelectAll() {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    }
  }

  async function loadPointsData(customerId: string) {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/points`);
      if (res.ok) {
        const data = await res.json();
        setPointsBalance(data.balance);
        setPointTransactions(data.transactions || []);
      }
    } catch { /* ignore */ }
  }

  async function loadTicketsData(customerId: string) {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/tickets`);
      if (res.ok) {
        setCustomerTickets(await res.json());
      }
    } catch { /* ignore */ }
  }

  async function openEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setEditForm({
      email: customer.email || "",
      phone: customer.phone || "",
      notes: customer.notes || "",
    });
    // Reset points/tickets form
    setPointAmount("");
    setPointReason("purchase");
    setPointNotes("");
    setNewTicketServiceId("");
    setNewTicketTotal("");
    setNewTicketExpiry("");
    // Load booking history
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`);
      if (res.ok) {
        const data = await res.json();
        setEditBookings(data.bookings || []);
      }
    } catch { /* ignore */ }
    // Load points & tickets
    loadPointsData(customer.id);
    loadTicketsData(customer.id);
  }

  async function handleAddPoints(isDeduct: boolean) {
    if (!editingCustomer) return;
    const num = parseInt(pointAmount);
    if (!num || num <= 0) return;
    const amount = isDeduct ? -num : num;

    if (isDeduct && !confirm(`確定要扣除 ${num} 點？`)) return;

    try {
      const res = await fetch(`/api/admin/customers/${editingCustomer.id}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: pointReason, notes: pointNotes || null }),
      });
      if (res.ok) {
        showNotification("success", isDeduct ? `已扣除 ${num} 點` : `已加入 ${num} 點`);
        setPointAmount("");
        setPointNotes("");
        loadPointsData(editingCustomer.id);
        loadCustomers();
      } else {
        const err = await res.json();
        showNotification("error", err.error || "操作失敗");
      }
    } catch {
      showNotification("error", "操作失敗");
    }
  }

  async function handleAddTicket() {
    if (!editingCustomer || !newTicketServiceId || !newTicketTotal) return;
    const total = parseInt(newTicketTotal);
    if (!total || total <= 0) return;

    try {
      const res = await fetch(`/api/admin/customers/${editingCustomer.id}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: newTicketServiceId,
          total,
          expiresAt: newTicketExpiry || null,
        }),
      });
      if (res.ok) {
        showNotification("success", "票券已新增");
        setNewTicketServiceId("");
        setNewTicketTotal("");
        setNewTicketExpiry("");
        loadTicketsData(editingCustomer.id);
      } else {
        showNotification("error", "新增失敗");
      }
    } catch {
      showNotification("error", "新增失敗");
    }
  }

  async function handleDeleteTicket(ticketId: string) {
    if (!editingCustomer) return;
    if (!confirm("確定要刪除此票券？")) return;
    try {
      const res = await fetch(`/api/admin/customers/${editingCustomer.id}/tickets?ticketId=${ticketId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showNotification("success", "票券已刪除");
        loadTicketsData(editingCustomer.id);
      }
    } catch {
      showNotification("error", "刪除失敗");
    }
  }

  async function handleEditSave() {
    if (!editingCustomer) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCustomer.id, ...editForm }),
      });
      if (res.ok) {
        showNotification("success", "用戶資料已更新");
        setEditingCustomer(null);
        loadCustomers();
      } else {
        showNotification("error", "更新失敗");
      }
    } catch {
      showNotification("error", "更新失敗");
    }
    setSaving(false);
  }

  function openMessageDialog() {
    if (selectedIds.size === 0) {
      showNotification("error", "請先選擇用戶");
      return;
    }
    setMessageText("");
    setShowMessageDialog(true);
  }

  function openSingleMessage(customerId: string) {
    setSelectedIds(new Set([customerId]));
    setMessageText("");
    setShowMessageDialog(true);
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/customers/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds: Array.from(selectedIds), message: messageText }),
      });
      if (res.ok) {
        const data = await res.json();
        showNotification("success", `已發送 ${data.successCount} 則訊息${data.failCount > 0 ? `，${data.failCount} 則失敗` : ""}`);
        setShowMessageDialog(false);
        setSelectedIds(new Set());
      } else {
        showNotification("error", "發送失敗");
      }
    } catch {
      showNotification("error", "發送失敗");
    }
    setSending(false);
  }

  async function handleBlock() {
    if (!blockDialog) return;
    setBlocking(true);
    try {
      const isBlocking = blockDialog.action === "block";
      const res = await fetch("/api/admin/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: blockDialog.customer.id,
          isBlocked: isBlocking,
          ...(isBlocking && blockReason ? { blockReason } : {}),
        }),
      });
      if (res.ok) {
        showNotification("success", isBlocking ? "用戶已加入黑名單" : "用戶已解除封鎖");
        setBlockDialog(null);
        setBlockReason("");
        loadCustomers();
      } else {
        showNotification("error", "操作失敗");
      }
    } catch {
      showNotification("error", "操作失敗");
    }
    setBlocking(false);
  }

  // Pagination
  const filteredCustomers = showBlockedOnly ? customers.filter((c) => c.isBlocked) : customers;
  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!mounted || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500 text-sm">僅管理員可存取此頁面</p>
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
        <h1 className="text-xl font-semibold text-gray-900">用戶列表</h1>
        <p className="text-sm text-gray-500 mt-1">管理所有 LINE 用戶資料與互動記錄</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">搜尋</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="姓名 / Email / 電話"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
            </div>
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
            <label className="block text-xs font-medium text-gray-500 mb-1">預約狀態</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              <option value="confirmed">已確認</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
              <option value="pending">待審核</option>
              <option value="on_hold">保留</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">預約次數</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="最少"
                value={minBookings}
                onChange={(e) => setMinBookings(e.target.value)}
                className="h-10 flex-1 min-w-0 border border-gray-200 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-center"
                min={0}
              />
              <span className="text-xs text-gray-400 px-0.5">~</span>
              <input
                type="number"
                placeholder="最多"
                value={maxBookings}
                onChange={(e) => setMaxBookings(e.target.value)}
                className="h-10 flex-1 min-w-0 border border-gray-200 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-center"
                min={0}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBlockedOnly((v) => !v)}
            className={`h-8 px-3 border rounded-lg text-xs font-medium transition-colors ${
              showBlockedOnly
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
          >
            已封鎖
          </button>
          {(search || serviceFilter || statusFilter || minBookings || maxBookings || showBlockedOnly) && (
            <button
              onClick={() => { setSearch(""); setServiceFilter(""); setStatusFilter(""); setMinBookings(""); setMaxBookings(""); setShowBlockedOnly(false); }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除篩選
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={openMessageDialog}
            className="inline-flex items-center gap-2 h-9 px-4 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            發送訊息{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-5 py-3.5 text-left w-10">
                  <input
                    type="checkbox"
                    checked={customers.length > 0 && selectedIds.size === customers.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/20"
                  />
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">用戶名稱</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">點數</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">預約次數</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">常用服務</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      <p className="text-gray-500 text-sm">暫無用戶資料</p>
                    </div>
                  </td>
                </tr>
              )}
              {paginatedCustomers.map((c, localIndex) => {
                const globalIndex = (currentPage - 1) * pageSize + localIndex;
                return (
                <tr key={c.id} className={`hover:bg-gray-100/50 transition-colors duration-100 ${localIndex % 2 === 1 ? "bg-gray-100/30" : ""}`}>
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onClick={(e) => handleSelect(globalIndex, e)}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/20"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {c.pictureUrl ? (
                        <img src={c.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <img
                          src={`https://api.dicebear.com/7.x/glass/svg?seed=${encodeURIComponent(c.lineUserId)}`}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="font-medium text-[#2563EB] hover:underline cursor-pointer" onClick={() => openEditModal(c)}>{c.displayName || "-"}</span>
                      {c.isBlocked && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 ml-1.5">
                          已封鎖
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">{c.email || <span className="text-slate-300">-</span>}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-xs font-medium text-amber-700">
                      {c.points}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-xs font-medium text-[#2563EB]">
                      {c.totalBookings}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {c.services.slice(0, 2).map((s) => (
                        <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-gray-700">
                          {s.name}
                          <span className="ml-1 text-gray-500">x{s.count}</span>
                        </span>
                      ))}
                      {c.services.length === 0 && <span className="text-xs text-slate-300">-</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-[#2563EB] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        編輯
                      </button>
                      <button
                        onClick={() => openSingleMessage(c.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-[#2563EB] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        發送訊息
                      </button>
                      {c.isBlocked ? (
                        <button
                          onClick={() => { setBlockDialog({ customer: c, action: "unblock" }); setBlockReason(""); }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          解除封鎖
                        </button>
                      ) : (
                        <button
                          onClick={() => { setBlockDialog({ customer: c, action: "block" }); setBlockReason(""); }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          封鎖
                        </button>
                      )}
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

      {/* Edit Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditingCustomer(null)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                {editingCustomer.pictureUrl ? (
                  <img src={editingCustomer.pictureUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <img
                    src={`https://api.dicebear.com/7.x/glass/svg?seed=${encodeURIComponent(editingCustomer.lineUserId)}`}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{editingCustomer.displayName || "未命名用戶"}</h3>
                  <p className="text-xs text-gray-500">LINE ID: {editingCustomer.lineUserId}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">電話</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    placeholder="0912345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">備註</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all resize-none"
                    placeholder="關於此用戶的備註..."
                  />
                </div>
              </div>

              {/* Points Section */}
              <div className="mt-6 pt-5 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">點數管理</h4>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl font-semibold text-amber-600">{pointsBalance}</span>
                  <span className="text-sm text-gray-500">點</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pointAmount}
                      onChange={(e) => setPointAmount(e.target.value)}
                      className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                      placeholder="數量"
                      min={1}
                    />
                    <select
                      value={pointReason}
                      onChange={(e) => setPointReason(e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    >
                      <option value="purchase">購買儲值</option>
                      <option value="admin_adjust">手動調整</option>
                      <option value="campaign">活動獎勵</option>
                      <option value="other">其他</option>
                    </select>
                    <input
                      type="text"
                      value={pointNotes}
                      onChange={(e) => setPointNotes(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                      placeholder="備註"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddPoints(false)}
                      disabled={!pointAmount || parseInt(pointAmount) <= 0}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      加點
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPoints(true)}
                      disabled={!pointAmount || parseInt(pointAmount) <= 0}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      扣點
                    </button>
                  </div>
                </div>
                {pointTransactions.length > 0 && (
                  <div className="mt-4 space-y-1.5 max-h-48 overflow-y-auto">
                    {pointTransactions.map((t) => {
                      const reasonLabels: Record<string, string> = {
                        purchase: "購買儲值",
                        admin_adjust: "手動調整",
                        campaign: "活動獎勵",
                        booking: "預約使用",
                        refund: "退款",
                        reward: "回饋",
                        other: "其他",
                      };
                      return (
                        <div key={t.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-100/50 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">{new Date(t.createdAt).toLocaleDateString("zh-TW")}</span>
                            <span className="text-gray-700">{reasonLabels[t.reason] || t.reason}</span>
                            {t.notes && <span className="text-gray-500">({t.notes})</span>}
                          </div>
                          <span className={`font-medium ${t.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {t.amount > 0 ? "+" : ""}{t.amount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tickets Section */}
              <div className="mt-6 pt-5 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">票券管理</h4>
                {customerTickets.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {customerTickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-100/50">
                        <div>
                          <div className="text-xs font-medium text-gray-900">{ticket.service.name}</div>
                          <div className="text-xs text-gray-500">
                            剩餘 {ticket.total - ticket.used} / {ticket.total} 張
                            {ticket.expiresAt && ` | 到期：${new Date(ticket.expiresAt).toLocaleDateString("zh-TW")}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          刪除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-3 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-gray-900">新增票券</p>
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500 mb-1">選擇服務</label>
                      <select
                        value={newTicketServiceId}
                        onChange={(e) => setNewTicketServiceId(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                      >
                        <option value="">選擇服務</option>
                        {allServices.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500 mb-1">張數</label>
                      <input
                        type="number"
                        value={newTicketTotal}
                        onChange={(e) => setNewTicketTotal(e.target.value)}
                        className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                        placeholder="張數"
                        min={1}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500 mb-1">到期日期</label>
                      <input
                        type="date"
                        value={newTicketExpiry}
                        onChange={(e) => setNewTicketExpiry(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTicket}
                      disabled={!newTicketServiceId || !newTicketTotal}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-[#2563EB] text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      新增
                    </button>
                  </div>
                </div>
              </div>

              {/* Booking history */}
              {editBookings.length > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">預約紀錄</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editBookings.map((b) => {
                      const st = statusLabels[b.status] || { label: b.status, color: "bg-gray-100 text-slate-700 ring-slate-600/20", dot: "bg-slate-400" };
                      return (
                        <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-100/50">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="text-xs font-medium text-gray-900">
                                {new Date(b.date).toLocaleDateString("zh-TW")} {b.startTime}~{b.endTime}
                              </div>
                              <div className="text-xs text-gray-500">{b.service.name} - {b.provider.name}</div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ring-inset ${st.color}`}>
                            <span className={`w-1 h-1 rounded-full ${st.dot}`}></span>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  onClick={() => setEditingCustomer(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-slate-100 hover:bg-slate-200 transition-colors duration-150"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Dialog */}
      {/* Block/Unblock Dialog */}
      {blockDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setBlockDialog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {blockDialog.action === "block" ? "封鎖用戶" : "解除封鎖"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {blockDialog.action === "block"
                  ? `確定要封鎖「${blockDialog.customer.displayName || "未命名用戶"}」嗎？封鎖後該用戶將無法進行預約。`
                  : `確定要解除「${blockDialog.customer.displayName || "未命名用戶"}」的封鎖嗎？`}
              </p>
              {blockDialog.action === "block" && (
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
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleBlock}
                  disabled={blocking}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors duration-150 disabled:opacity-50 ${
                    blockDialog.action === "block"
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {blocking ? "處理中..." : blockDialog.action === "block" ? "確認封鎖" : "確認解除"}
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

      {showMessageDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowMessageDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">發送 LINE 訊息</h3>
              <p className="text-sm text-gray-500 mb-5">將發送給 {selectedIds.size} 位用戶</p>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all resize-none"
                placeholder="輸入訊息內容..."
              />
              <div className="flex gap-2 mt-5">
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !messageText.trim()}
                  className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  {sending ? "發送中..." : "發送"}
                </button>
                <button
                  onClick={() => setShowMessageDialog(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-slate-100 hover:bg-slate-200 transition-colors duration-150"
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
