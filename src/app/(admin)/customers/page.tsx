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

type ActiveTicket = {
  id: string;
  serviceId: string;
  serviceName: string;
  remaining: number;
  total: number;
  expiresAt: string | null;
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
  activeTickets: ActiveTicket[];
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
  const [messageChannel, setMessageChannel] = useState<"line" | "email">("line");
  const [messageSubject, setMessageSubject] = useState("");
  const [sending, setSending] = useState(false);

  // Bulk dialogs
  const [showBulkPoints, setShowBulkPoints] = useState(false);
  const [bulkPointsAmount, setBulkPointsAmount] = useState("");
  const [bulkPointsNotes, setBulkPointsNotes] = useState("");
  const [processingPoints, setProcessingPoints] = useState(false);

  const [showBulkTickets, setShowBulkTickets] = useState(false);
  const [bulkTicketsServiceId, setBulkTicketsServiceId] = useState("");
  const [bulkTicketsTotal, setBulkTicketsTotal] = useState("");
  const [bulkTicketsExpiresAt, setBulkTicketsExpiresAt] = useState("");
  const [processingTickets, setProcessingTickets] = useState(false);

  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [processingDelete, setProcessingDelete] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Block dialog
  const [blockDialog, setBlockDialog] = useState<{ customer: Customer; action: "block" | "unblock" } | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);

  // Block filter
  const [blockedFilter, setBlockedFilter] = useState<"" | "blocked" | "unblocked">("");

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

  function openBulkPoints() {
    setBulkPointsAmount("");
    setBulkPointsNotes("");
    setShowBulkPoints(true);
  }

  function openBulkTickets() {
    setBulkTicketsServiceId("");
    setBulkTicketsTotal("");
    setBulkTicketsExpiresAt("");
    setShowBulkTickets(true);
  }

  function openBulkDelete() {
    setShowBulkDelete(true);
  }

  async function handleBulkPoints() {
    const amount = Number(bulkPointsAmount);
    if (!amount || isNaN(amount)) { showNotification("error", "請輸入有效的點數"); return; }
    setProcessingPoints(true);
    let success = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/customers/${id}/points`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, reason: "admin_adjust", notes: bulkPointsNotes }),
        });
        if (res.ok) success++;
        else fail++;
      } catch { fail++; }
    }
    showNotification(fail === 0 ? "success" : "error", `已調整 ${success} 位用戶的點數${fail > 0 ? `，${fail} 位失敗` : ""}`);
    setProcessingPoints(false);
    setShowBulkPoints(false);
    setSelectedIds(new Set());
    loadCustomers();
  }

  async function handleBulkTickets() {
    if (!bulkTicketsServiceId) { showNotification("error", "請選擇服務"); return; }
    const total = Number(bulkTicketsTotal);
    if (!total || total <= 0) { showNotification("error", "請輸入有效的張數"); return; }
    setProcessingTickets(true);
    let success = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/customers/${id}/tickets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: bulkTicketsServiceId,
            total,
            expiresAt: bulkTicketsExpiresAt || null,
          }),
        });
        if (res.ok) success++;
        else fail++;
      } catch { fail++; }
    }
    showNotification(fail === 0 ? "success" : "error", `已發放 ${success} 張票券${fail > 0 ? `，${fail} 位失敗` : ""}`);
    setProcessingTickets(false);
    setShowBulkTickets(false);
    setSelectedIds(new Set());
    loadCustomers();
  }

  async function handleBulkDelete() {
    setProcessingDelete(true);
    let success = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
        if (res.ok) success++;
        else fail++;
      } catch { fail++; }
    }
    showNotification(fail === 0 ? "success" : "error", `已刪除 ${success} 位用戶${fail > 0 ? `，${fail} 位失敗` : ""}`);
    setProcessingDelete(false);
    setShowBulkDelete(false);
    setSelectedIds(new Set());
    loadCustomers();
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    if (messageChannel === "email" && !messageSubject.trim()) {
      showNotification("error", "請輸入 Email 主旨");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/customers/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: Array.from(selectedIds),
          message: messageText,
          channel: messageChannel,
          subject: messageSubject || "通知訊息",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const parts = [`已發送 ${data.successCount} 則`];
        if (data.failCount > 0) parts.push(`失敗 ${data.failCount}`);
        if (data.skippedCount > 0) parts.push(`跳過 ${data.skippedCount}（無 Email）`);
        showNotification("success", parts.join("，"));
        setShowMessageDialog(false);
        setSelectedIds(new Set());
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification("error", err.error || "發送失敗");
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
  const filteredCustomers = blockedFilter === "blocked"
    ? customers.filter((c) => c.isBlocked)
    : blockedFilter === "unblocked"
    ? customers.filter((c) => !c.isBlocked)
    : customers;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">封鎖狀態</label>
            <select
              value={blockedFilter}
              onChange={(e) => setBlockedFilter(e.target.value as "" | "blocked" | "unblocked")}
              className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="">全部</option>
              <option value="unblocked">僅顯示未封鎖</option>
              <option value="blocked">僅顯示已封鎖</option>
            </select>
          </div>
        </div>
        {(search || serviceFilter || statusFilter || minBookings || maxBookings || blockedFilter) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => { setSearch(""); setServiceFilter(""); setStatusFilter(""); setMinBookings(""); setMaxBookings(""); setBlockedFilter(""); }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除篩選
            </button>
          </div>
        )}
      </div>

      {/* Bulk action bar (shown only when items selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              已選取 {selectedIds.size} 位用戶
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除選取
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openMessageDialog}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              發送訊息
            </button>
            <button
              onClick={openBulkPoints}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
              調整點數
            </button>
            <button
              onClick={openBulkTickets}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
              發放票券
            </button>
            <button
              onClick={openBulkDelete}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              刪除用戶
            </button>
          </div>
        </div>
      )}

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
                    className="w-5 h-5 rounded-md border-gray-300 text-[#2563EB] focus:ring-[#2563EB]/20 cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">用戶名稱</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">點數</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">預約次數</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">常用服務</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">票券</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-64">備註</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
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
                      className="w-5 h-5 rounded-md border-gray-300 text-[#2563EB] focus:ring-[#2563EB]/20 cursor-pointer"
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
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {c.activeTickets.length === 0 ? (
                        <span className="text-xs text-slate-300">-</span>
                      ) : (
                        <>
                          {c.activeTickets.slice(0, 2).map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-xs font-medium text-emerald-700"
                            >
                              {t.serviceName}
                              <span className="ml-1 text-emerald-500">x{t.remaining}</span>
                            </span>
                          ))}
                          {c.activeTickets.length > 2 && (
                            <span className="relative group inline-block">
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-gray-500 font-medium cursor-default">
                                +{c.activeTickets.length - 2}
                              </span>
                              <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-20 whitespace-nowrap bg-gray-700 text-white text-[11px] px-2 py-1 rounded-md shadow-lg">
                                <span className="flex flex-col">
                                  {c.activeTickets.slice(2).map((t) => (
                                    <span key={t.id}>
                                      {t.serviceName} x{t.remaining}
                                    </span>
                                  ))}
                                </span>
                                <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-700" />
                              </span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 w-64">
                    {c.notes ? (
                      <div
                        className="text-xs text-gray-600 w-64 truncate"
                        title={c.notes}
                      >
                        {c.notes}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(c)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-[#2563EB] transition-colors whitespace-nowrap"
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

      {/* Bulk Points Dialog */}
      {showBulkPoints && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBulkPoints(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">批次調整點數</h3>
              <p className="text-sm text-gray-500 mb-4">將調整 {selectedIds.size} 位用戶的點數</p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">調整數量（正數加點、負數扣點）</label>
                <input
                  type="number"
                  value={bulkPointsAmount}
                  onChange={(e) => setBulkPointsAmount(e.target.value)}
                  placeholder="例：100 或 -50"
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">備註（選填）</label>
                <input
                  type="text"
                  value={bulkPointsNotes}
                  onChange={(e) => setBulkPointsNotes(e.target.value)}
                  placeholder="例：春季活動贈點"
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowBulkPoints(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">取消</button>
                <button
                  onClick={handleBulkPoints}
                  disabled={processingPoints || !bulkPointsAmount}
                  className="inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 shadow-sm transition-colors disabled:opacity-50"
                >
                  {processingPoints ? "處理中..." : "確認調整"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tickets Dialog */}
      {showBulkTickets && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBulkTickets(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">批次發放票券</h3>
              <p className="text-sm text-gray-500 mb-4">將發放給 {selectedIds.size} 位用戶</p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">服務</label>
                <select
                  value={bulkTicketsServiceId}
                  onChange={(e) => setBulkTicketsServiceId(e.target.value)}
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="">請選擇服務</option>
                  {allServices.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">張數</label>
                <input
                  type="number"
                  min={1}
                  value={bulkTicketsTotal}
                  onChange={(e) => setBulkTicketsTotal(e.target.value)}
                  placeholder="每人發放張數"
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">到期日（選填）</label>
                <input
                  type="date"
                  value={bulkTicketsExpiresAt}
                  onChange={(e) => setBulkTicketsExpiresAt(e.target.value)}
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowBulkTickets(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">取消</button>
                <button
                  onClick={handleBulkTickets}
                  disabled={processingTickets || !bulkTicketsServiceId || !bulkTicketsTotal}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  {processingTickets ? "處理中..." : "確認發放"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Dialog */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBulkDelete(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-900">批次刪除用戶</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                即將刪除 <span className="font-medium text-red-600">{selectedIds.size}</span> 位用戶。此操作無法復原，相關的預約、點數、票券紀錄都會一併刪除。
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowBulkDelete(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">取消</button>
                <button
                  onClick={handleBulkDelete}
                  disabled={processingDelete}
                  className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 shadow-sm transition-colors disabled:opacity-50"
                >
                  {processingDelete ? "處理中..." : "確認刪除"}
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
              <h3 className="text-lg font-bold text-gray-900 mb-1">發送訊息</h3>
              <p className="text-sm text-gray-500 mb-4">將發送給 {selectedIds.size} 位用戶</p>

              {/* Channel selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">發送方式</label>
                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMessageChannel("line")}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                      messageChannel === "line"
                        ? "bg-[#06C755] text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                    LINE
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageChannel("email")}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                      messageChannel === "email"
                        ? "bg-[#2563EB] text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    Email
                  </button>
                </div>
                {messageChannel === "email" && (
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    沒有 Email 的用戶將自動跳過
                  </p>
                )}
              </div>

              {/* Email subject (only for email channel) */}
              {messageChannel === "email" && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">主旨</label>
                  <input
                    type="text"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="Email 主旨"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                  />
                </div>
              )}

              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">訊息內容</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                  placeholder="輸入訊息內容..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowMessageDialog(false)}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !messageText.trim() || (messageChannel === "email" && !messageSubject.trim())}
                  className={`inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${
                    messageChannel === "line" ? "bg-[#06C755] hover:bg-[#05a847]" : "bg-[#2563EB] hover:bg-blue-700"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  {sending ? "發送中..." : `發送 ${messageChannel === "line" ? "LINE" : "Email"}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
