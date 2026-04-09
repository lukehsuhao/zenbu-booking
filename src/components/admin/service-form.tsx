"use client";

import { useState, useEffect } from "react";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  bufferBefore?: number;
  bufferAfter?: number;
  slotInterval?: number;
  bookingWindowDays?: number;
  minAdvanceDays?: number;
  isActive: boolean;
  assignmentMode?: string;
  requiresApproval?: boolean;
  showProviderSelection?: boolean;
  hasDisclaimer?: boolean;
  disclaimerText?: string | null;
  approvalMessageLine?: string | null;
  approvalMessageEmail?: string | null;
  rejectionMessageLine?: string | null;
  rejectionMessageEmail?: string | null;
  approvalNotifyLine?: boolean;
  approvalNotifyEmail?: boolean;
  rejectionNotifyLine?: boolean;
  rejectionNotifyEmail?: boolean;
  bookingConfirmMessage?: string | null;
  bookingConfirmProviderMsg?: string | null;
  notifyAdminOnBooking?: boolean;
  adminBookingMessage?: string | null;
  rescheduleCustomerMsg?: string | null;
  rescheduleProviderMsg?: string | null;
  rescheduleAdminMsg?: string | null;
  cancelCustomerMsg?: string | null;
  cancelProviderMsg?: string | null;
  cancelAdminMsg?: string | null;
  price?: number;
  acceptTicket?: boolean;
  acceptPoints?: boolean;
  pointsPerUnit?: number;
  providerServices?: { provider: { id: string; name: string } }[];
};

type ProviderOption = {
  id: string;
  name: string;
};

export function ServiceForm({
  service,
  onSave,
  onCancel,
}: {
  service?: Service;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [duration, setDuration] = useState(service?.duration || 30);
  const [bufferBefore, setBufferBefore] = useState(service?.bufferBefore || 0);
  const [bufferAfter, setBufferAfter] = useState(service?.bufferAfter || 0);
  const [slotInterval, setSlotInterval] = useState(service?.slotInterval || 30);
  const [assignmentMode, setAssignmentMode] = useState(service?.assignmentMode || "manual");
  const [bookingWindowDays, setBookingWindowDays] = useState(service?.bookingWindowDays ?? 14);
  const [minAdvanceDays, setMinAdvanceDays] = useState(service?.minAdvanceDays ?? 0);
  const [hasDisclaimer, setHasDisclaimer] = useState(service?.hasDisclaimer || false);
  const [disclaimerText, setDisclaimerText] = useState(service?.disclaimerText || "");
  const [requiresApproval, setRequiresApproval] = useState(service?.requiresApproval || false);
  const [showProviderSelection, setShowProviderSelection] = useState(service?.showProviderSelection || false);
  const [approvalMessageLine, setApprovalMessageLine] = useState(service?.approvalMessageLine || "{{姓名}} 您好，您預約的 {{服務名稱}}（{{日期}} {{時間}}）已通過審核。");
  const [approvalMessageEmail, setApprovalMessageEmail] = useState(service?.approvalMessageEmail || "");
  const [rejectionMessageLine, setRejectionMessageLine] = useState(service?.rejectionMessageLine || "{{姓名}} 您好，很抱歉您預約的 {{服務名稱}}（{{日期}} {{時間}}）未通過審核。如有疑問請聯繫我們。");
  const [rejectionMessageEmail, setRejectionMessageEmail] = useState(service?.rejectionMessageEmail || "");
  const [approvalNotifyLine, setApprovalNotifyLine] = useState(service?.approvalNotifyLine ?? true);
  const [approvalNotifyEmail, setApprovalNotifyEmail] = useState(service?.approvalNotifyEmail ?? false);
  const [rejectionNotifyLine, setRejectionNotifyLine] = useState(service?.rejectionNotifyLine ?? true);
  const [rejectionNotifyEmail, setRejectionNotifyEmail] = useState(service?.rejectionNotifyEmail ?? false);
  const [bookingConfirmMessage, setBookingConfirmMessage] = useState(service?.bookingConfirmMessage || "{{姓名}} 您好，您已成功預約 {{服務名稱}}！\n日期：{{日期}}\n時間：{{時間}}\n提供者：{{提供者}}\n\n如需取消或更改，請提前聯繫我們。");
  const [bookingConfirmProviderMsg, setBookingConfirmProviderMsg] = useState(service?.bookingConfirmProviderMsg || "【新預約通知】{{姓名}} 預約了 {{服務名稱}}\n日期：{{日期}}\n時間：{{時間}}");
  const [notifyAdminOnBooking, setNotifyAdminOnBooking] = useState(service?.notifyAdminOnBooking || false);
  const [adminBookingMessage, setAdminBookingMessage] = useState(service?.adminBookingMessage || "【新預約】{{姓名}} 預約了 {{服務名稱}}（{{日期}} {{時間}}），提供者：{{提供者}}。");
  const [rescheduleCustomerMsg, setRescheduleCustomerMsg] = useState(service?.rescheduleCustomerMsg || "{{姓名}} 您好，您的預約已更改。\n服務：{{服務名稱}}\n新日期：{{日期}}\n新時間：{{時間}}\n提供者：{{提供者}}");
  const [rescheduleProviderMsg, setRescheduleProviderMsg] = useState(service?.rescheduleProviderMsg || "【時段更改】{{姓名}} 的 {{服務名稱}} 預約已更改\n新日期：{{日期}}\n新時間：{{時間}}");
  const [rescheduleAdminMsg, setRescheduleAdminMsg] = useState(service?.rescheduleAdminMsg || "【時段更改】{{姓名}} 的 {{服務名稱}} 預約已更改\n新日期：{{日期}}\n新時間：{{時間}}\n提供者：{{提供者}}");
  const [cancelCustomerMsg, setCancelCustomerMsg] = useState(service?.cancelCustomerMsg || "{{姓名}} 您好，您的 {{服務名稱}} 預約已取消。\n原預約時間：{{日期}} {{時間}}\n如有疑問請聯繫我們。");
  const [cancelProviderMsg, setCancelProviderMsg] = useState(service?.cancelProviderMsg || "【預約取消】{{姓名}} 的 {{服務名稱}} 預約已取消\n原預約時間：{{日期}} {{時間}}");
  const [cancelAdminMsg, setCancelAdminMsg] = useState(service?.cancelAdminMsg || "【預約取消】{{姓名}} 的 {{服務名稱}} 預約已取消\n原預約時間：{{日期}} {{時間}}\n提供者：{{提供者}}");
  const [price, setPrice] = useState(service?.price ?? 0);
  const [acceptTicket, setAcceptTicket] = useState(service?.acceptTicket ?? false);
  const [acceptPoints, setAcceptPoints] = useState(service?.acceptPoints ?? false);
  const [pointsPerUnit, setPointsPerUnit] = useState(service?.pointsPerUnit ?? 1);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>(
    service?.providerServices?.map((ps) => ps.provider.id) || []
  );
  const [allProviders, setAllProviders] = useState<ProviderOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/providers")
      .then((res) => res.json())
      .then((data) => setAllProviders(data))
      .catch(() => {});
  }, []);

  function toggleProvider(id: string) {
    setSelectedProviderIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = service ? "PUT" : "POST";
    const body = {
      id: service?.id,
      name,
      description,
      duration,
      bufferBefore,
      bufferAfter,
      slotInterval,
      bookingWindowDays,
      minAdvanceDays,
      assignmentMode,
      showProviderSelection,
      hasDisclaimer,
      disclaimerText: hasDisclaimer ? disclaimerText : null,
      requiresApproval,
      approvalMessageLine: requiresApproval ? approvalMessageLine : null,
      approvalMessageEmail: requiresApproval ? approvalMessageEmail : null,
      rejectionMessageLine: requiresApproval ? rejectionMessageLine : null,
      rejectionMessageEmail: requiresApproval ? rejectionMessageEmail : null,
      approvalNotifyLine,
      approvalNotifyEmail,
      rejectionNotifyLine,
      rejectionNotifyEmail,
      bookingConfirmMessage,
      bookingConfirmProviderMsg,
      notifyAdminOnBooking,
      adminBookingMessage: notifyAdminOnBooking ? adminBookingMessage : null,
      rescheduleCustomerMsg,
      rescheduleProviderMsg,
      rescheduleAdminMsg,
      cancelCustomerMsg,
      cancelProviderMsg,
      cancelAdminMsg,
      price,
      acceptTicket: price > 0 ? acceptTicket : false,
      acceptPoints: price > 0 ? acceptPoints : false,
      pointsPerUnit: price > 0 && acceptPoints ? pointsPerUnit : 1,
      providerIds: selectedProviderIds,
    };
    await fetch("/api/admin/services", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold text-[#1E293B] mb-5">{service ? "編輯服務" : "新增服務"}</h3>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">服務名稱</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">說明</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">時長（分鐘）</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
            min={15}
            step={15}
            required
          />
        </div>

        {/* 時段刻度 */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">預約時段刻度</label>
          <select
            value={slotInterval}
            onChange={(e) => setSlotInterval(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
          >
            <option value={10}>每 10 分鐘</option>
            <option value={15}>每 15 分鐘</option>
            <option value={20}>每 20 分鐘</option>
            <option value={30}>每 30 分鐘</option>
            <option value={60}>每 60 分鐘</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">決定可預約時段的間隔，例如選擇 15 分鐘則可預約 9:00、9:15、9:30...</p>
        </div>

        {/* 緩衝時間 */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">緩衝時間</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">前緩衝（分鐘）</label>
              <input
                type="number"
                value={bufferBefore}
                onChange={(e) => setBufferBefore(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                min={0}
                step={5}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">後緩衝（分鐘）</label>
              <input
                type="number"
                value={bufferAfter}
                onChange={(e) => setBufferAfter(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                min={0}
                step={5}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">預約前後預留的空檔時間，該時段將視為已被佔用，確保提供者有準備或休息時間</p>
        </div>

        {/* 可預約天數 */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">可預約天數</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={bookingWindowDays}
              onChange={(e) => setBookingWindowDays(Number(e.target.value))}
              className="w-24 border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
              min={0}
            />
            <span className="text-sm text-slate-500">天（0 = 不限制）</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">客戶可預約的未來天數，設定 0 表示不限制。此設定會覆蓋系統設定中的全域預設值</p>
        </div>

        {/* 最少提前預約天數 */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">最少提前預約天數</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minAdvanceDays}
              onChange={(e) => setMinAdvanceDays(Number(e.target.value))}
              className="w-24 border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
              min={0}
            />
            <span className="text-sm text-slate-500">天（0 = 不限制）</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">0 = 不限制，例如設為 2 表示最快只能預約 2 天後的時段</p>
        </div>

        {/* 指派模式 */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">指派模式</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-[#1E293B] cursor-pointer">
              <input
                type="radio"
                name="assignmentMode"
                value="manual"
                checked={assignmentMode === "manual"}
                onChange={() => setAssignmentMode("manual")}
                className="accent-[#2563EB]"
              />
              手動選擇
              <span className="text-xs text-slate-400">（用戶預約時自行選擇人員）</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-[#1E293B] cursor-pointer">
              <input
                type="radio"
                name="assignmentMode"
                value="round_robin"
                checked={assignmentMode === "round_robin"}
                onChange={() => setAssignmentMode("round_robin")}
                className="accent-[#2563EB]"
              />
              輪流指派
              <span className="text-xs text-slate-400">（系統自動分配人員）</span>
            </label>
          </div>
        </div>

        {/* 行前說明 */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setHasDisclaimer(!hasDisclaimer)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                hasDisclaimer ? "bg-[#2563EB]" : "bg-slate-200"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${hasDisclaimer ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <div>
              <span className="text-sm font-medium text-[#1E293B]">行前說明 / 注意事項</span>
              <p className="text-xs text-slate-400 mt-0.5">啟用後，用戶預約前需閱讀並同意相關事項才能繼續</p>
            </div>
          </label>
        </div>
        {hasDisclaimer && (
          <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-5 space-y-3">
            <div>
              <label className="block text-sm font-medium text-[#1E293B]">說明內容</label>
              <p className="text-xs text-slate-400 mt-1">用戶將在預約流程中看到此內容，並需勾選「我已閱讀並同意上述事項」才能繼續預約</p>
            </div>
            <textarea
              value={disclaimerText}
              onChange={(e) => setDisclaimerText(e.target.value)}
              rows={6}
              placeholder={"例如：\n1. 請提前 10 分鐘抵達\n2. 如需取消請於 24 小時前通知\n3. 遲到超過 15 分鐘將視為取消"}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
            />
          </div>
        )}

        {/* 需要審核 */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setRequiresApproval(!requiresApproval)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                requiresApproval ? "bg-amber-500" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  requiresApproval ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <div>
              <span className="text-sm font-medium text-[#1E293B]">此項目需要審核</span>
              <p className="text-xs text-slate-400 mt-0.5">啟用後，客戶預約此服務需要經過管理員審核才會生效</p>
            </div>
          </label>
        </div>

        {/* 審核訊息設定 */}
        {requiresApproval && (
          <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-5 space-y-5">
            <div>
              <h4 className="text-sm font-bold text-[#1E293B]">審核通知設定</h4>
              <p className="text-xs text-slate-400 mt-1">可用變數：{"{{姓名}}"} {"{{服務名稱}}"} {"{{提供者}}"} {"{{日期}}"} {"{{時間}}"} {"{{電話}}"} {"{{Email}}"}</p>
            </div>

            {/* 審核通過 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-700">審核通過訊息</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={approvalNotifyLine} onChange={(e) => setApprovalNotifyLine(e.target.checked)} className="rounded" />
                    LINE
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={approvalNotifyEmail} onChange={(e) => setApprovalNotifyEmail(e.target.checked)} className="rounded" />
                    Email
                  </label>
                </div>
              </div>
              {approvalNotifyLine && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">LINE 訊息</label>
                  <textarea
                    value={approvalMessageLine}
                    onChange={(e) => setApprovalMessageLine(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                  />
                </div>
              )}
              {approvalNotifyEmail && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Email 訊息</label>
                  <textarea
                    value={approvalMessageEmail}
                    onChange={(e) => setApprovalMessageEmail(e.target.value)}
                    rows={3}
                    placeholder="審核通過的 Email 通知內容"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                  />
                </div>
              )}
            </div>

            {/* 審核不通過 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">審核不通過訊息</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={rejectionNotifyLine} onChange={(e) => setRejectionNotifyLine(e.target.checked)} className="rounded" />
                    LINE
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={rejectionNotifyEmail} onChange={(e) => setRejectionNotifyEmail(e.target.checked)} className="rounded" />
                    Email
                  </label>
                </div>
              </div>
              {rejectionNotifyLine && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">LINE 訊息</label>
                  <textarea
                    value={rejectionMessageLine}
                    onChange={(e) => setRejectionMessageLine(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                  />
                </div>
              )}
              {rejectionNotifyEmail && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Email 訊息</label>
                  <textarea
                    value={rejectionMessageEmail}
                    onChange={(e) => setRejectionMessageEmail(e.target.value)}
                    rows={3}
                    placeholder="審核不通過的 Email 通知內容"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 預約成功通知訊息 */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <h4 className="text-sm font-bold text-[#1E293B]">預約成功通知訊息</h4>
            <p className="text-xs text-slate-400 mt-1">可用變數：{"{{姓名}}"} {"{{服務名稱}}"} {"{{提供者}}"} {"{{日期}}"} {"{{時間}}"} {"{{電話}}"} {"{{Email}}"}</p>
          </div>

          {/* 客戶訊息 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-emerald-700">通知客戶</label>
            <textarea
              value={bookingConfirmMessage}
              onChange={(e) => setBookingConfirmMessage(e.target.value)}
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* 提供者訊息 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#2563EB]">通知服務提供者</label>
            <textarea
              value={bookingConfirmProviderMsg}
              onChange={(e) => setBookingConfirmProviderMsg(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
            />
          </div>

          {/* 管理員訊息 */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-amber-700">通知管理員</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-slate-500">{notifyAdminOnBooking ? "已開啟" : "未開啟"}</span>
                <button
                  type="button"
                  onClick={() => setNotifyAdminOnBooking(!notifyAdminOnBooking)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    notifyAdminOnBooking ? "bg-amber-500" : "bg-slate-200"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${notifyAdminOnBooking ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>
            {notifyAdminOnBooking && (
              <>
                <textarea
                  value={adminBookingMessage}
                  onChange={(e) => setAdminBookingMessage(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                />
                <p className="text-xs text-slate-400">若管理員同時是服務提供者，僅會收到提供者訊息，不重複通知</p>
              </>
            )}
          </div>
        </div>

        {/* 更改時段通知訊息 */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <h4 className="text-sm font-bold text-[#1E293B]">更改時段通知訊息</h4>
            <p className="text-xs text-slate-400 mt-1">可用變數：{"{{姓名}}"} {"{{服務名稱}}"} {"{{提供者}}"} {"{{日期}}"} {"{{時間}}"} {"{{電話}}"} {"{{Email}}"}</p>
          </div>

          {/* 客戶訊息 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-emerald-700">通知客戶</label>
            <textarea
              value={rescheduleCustomerMsg}
              onChange={(e) => setRescheduleCustomerMsg(e.target.value)}
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* 提供者訊息 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#2563EB]">通知服務提供者</label>
            <textarea
              value={rescheduleProviderMsg}
              onChange={(e) => setRescheduleProviderMsg(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
            />
          </div>

          {/* 管理員訊息 */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-amber-700">通知管理員</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-slate-500">{notifyAdminOnBooking ? "已開啟" : "未開啟"}</span>
                <button
                  type="button"
                  onClick={() => setNotifyAdminOnBooking(!notifyAdminOnBooking)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    notifyAdminOnBooking ? "bg-amber-500" : "bg-slate-200"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${notifyAdminOnBooking ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>
            {notifyAdminOnBooking && (
              <textarea
                value={rescheduleAdminMsg}
                onChange={(e) => setRescheduleAdminMsg(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
              />
            )}
          </div>
        </div>

        {/* 取消預約通知訊息 */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <h4 className="text-sm font-bold text-[#1E293B]">取消預約通知訊息</h4>
            <p className="text-xs text-slate-400 mt-1">可用變數：{"{{姓名}}"} {"{{服務名稱}}"} {"{{提供者}}"} {"{{日期}}"} {"{{時間}}"} {"{{電話}}"} {"{{Email}}"}</p>
          </div>

          {/* 客戶訊息 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-emerald-700">通知客戶</label>
            <textarea
              value={cancelCustomerMsg}
              onChange={(e) => setCancelCustomerMsg(e.target.value)}
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* 提供者訊息 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#2563EB]">通知服務提供者</label>
            <textarea
              value={cancelProviderMsg}
              onChange={(e) => setCancelProviderMsg(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
            />
          </div>

          {/* 管理員訊息 */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-amber-700">通知管理員</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-slate-500">{notifyAdminOnBooking ? "已開啟" : "未開啟"}</span>
                <button
                  type="button"
                  onClick={() => setNotifyAdminOnBooking(!notifyAdminOnBooking)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    notifyAdminOnBooking ? "bg-amber-500" : "bg-slate-200"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${notifyAdminOnBooking ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>
            {notifyAdminOnBooking && (
              <textarea
                value={cancelAdminMsg}
                onChange={(e) => setCancelAdminMsg(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
              />
            )}
          </div>
        </div>

        {/* 定價 */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-[#1E293B]">定價</h4>
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">服務定價（元）</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
              min={0}
            />
            <p className="text-xs text-slate-400 mt-1">0 = 免費</p>
          </div>
          {price > 0 && (
            <div className="space-y-4">
              {/* 接受票券 */}
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setAcceptTicket(!acceptTicket)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    acceptTicket ? "bg-[#2563EB]" : "bg-slate-200"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${acceptTicket ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <div>
                  <span className="text-sm font-medium text-[#1E293B]">接受票券</span>
                  <p className="text-xs text-slate-400 mt-0.5">允許客戶使用此服務的票券來預約</p>
                </div>
              </label>

              {/* 接受點數抵扣 */}
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setAcceptPoints(!acceptPoints)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    acceptPoints ? "bg-[#2563EB]" : "bg-slate-200"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${acceptPoints ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <div>
                  <span className="text-sm font-medium text-[#1E293B]">接受點數抵扣</span>
                  <p className="text-xs text-slate-400 mt-0.5">允許客戶使用點數來抵扣服務費用</p>
                </div>
              </label>

              {acceptPoints && (
                <div className="ml-14">
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">點數換算比例（1 點 = X 元）</label>
                  <input
                    type="number"
                    value={pointsPerUnit}
                    onChange={(e) => setPointsPerUnit(Number(e.target.value))}
                    className="w-32 border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
                    min={1}
                  />
                  <p className="text-xs text-slate-400 mt-1">例如設 1，則 100 點可抵 100 元</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 人員指派 — grouped section */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-[#1E293B]">人員指派</h4>

          {/* 讓用戶選擇 toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setShowProviderSelection(!showProviderSelection)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                showProviderSelection ? "bg-[#2563EB]" : "bg-slate-200"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${showProviderSelection ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <div>
              <span className="text-sm font-medium text-[#1E293B]">讓用戶選擇服務提供者</span>
              <p className="text-xs text-slate-400 mt-0.5">關閉時系統將自動分配人員，用戶不會看到人員選擇步驟</p>
            </div>
          </label>

          {/* 指派人員 */}
          <div>
            <label className="block text-xs text-slate-500 mb-2">可提供此服務的人員</label>
            {allProviders.length === 0 ? (
              <p className="text-xs text-slate-400">尚無可用人員</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allProviders.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProvider(p.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-150 ${
                      selectedProviderIds.includes(p.id)
                        ? "bg-blue-50 text-[#2563EB] border-2 border-[#2563EB]"
                        : "bg-[#F8FAFC] text-slate-600 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {selectedProviderIds.includes(p.id) ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    )}
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          儲存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors duration-150"
        >
          取消
        </button>
      </div>
    </form>
  );
}
