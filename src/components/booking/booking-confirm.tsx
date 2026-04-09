"use client";

type BookingData = {
  serviceName: string; serviceDuration: number; providerName: string;
  date: string; startTime: string; endTime: string;
  customerName: string; customerPhone: string; notes: string;
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
      <div className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--color-text-muted)" }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</p>
        <p className="text-sm font-medium mt-0.5" style={{ color: "var(--color-text)" }}>{value}</p>
      </div>
    </div>
  );
}

export function BookingConfirm({ data, onConfirm, onBack, submitting, showProvider, paymentSummary }: {
  data: BookingData; onConfirm: () => void; onBack: () => void; submitting: boolean;
  showProvider?: boolean;
  paymentSummary?: { method: string; pointsUsed?: number; remaining?: number; price?: number } | null;
}) {

  return (
    <div className="px-4 pt-2 pb-4">
      <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>確認預約</h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>請確認以下預約資訊</p>

      <div
        className="rounded-2xl p-5 mb-5"
        style={{
          background: "var(--color-bg-card)",
          boxShadow: "var(--shadow-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* 服務 — 必須顯示 */}
        <InfoRow
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          label="服務"
          value={`${data.serviceName}（${data.serviceDuration} 分鐘）`}
        />
        {/* 提供者 — 只有讓用戶選擇時才顯示 */}
        {showProvider && data.providerName && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            label="提供者"
            value={data.providerName}
          />
        )}
        {/* 日期時間 — 必須顯示 */}
        <InfoRow
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
          label="日期"
          value={data.date}
        />
        <InfoRow
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
          label="時間"
          value={`${data.startTime} - ${data.endTime}`}
        />
        {/* 以下欄位有填才顯示 */}
        {data.customerName && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            label="姓名"
            value={data.customerName}
          />
        )}
        {data.customerPhone && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
            label="電話"
            value={data.customerPhone}
          />
        )}
        {data.notes && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
            label="備註"
            value={data.notes}
          />
        )}
        {paymentSummary && paymentSummary.method !== "free" && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" /></svg>}
            label="付款方式"
            value={
              paymentSummary.method === "ticket"
                ? "票券"
                : paymentSummary.method === "points"
                  ? `點數抵扣 ${paymentSummary.pointsUsed ?? 0} 點${paymentSummary.remaining && paymentSummary.remaining > 0 ? `（剩餘 ${paymentSummary.remaining} 元線下付款）` : ""}`
                  : paymentSummary.method === "cash"
                    ? `線下付款 ${paymentSummary.price ?? 0} 元`
                    : ""
            }
          />
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="w-full text-white py-3.5 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
          style={{
            background: submitting ? "var(--color-text-muted)" : "linear-gradient(135deg, #10B981, #059669)",
            boxShadow: submitting ? "none" : "0 4px 12px rgba(16,185,129,0.3)",
            minHeight: "48px",
          }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              預約中...
            </span>
          ) : "確認預約"}
        </button>
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200"
          style={{ color: "var(--color-text-muted)", minHeight: "44px" }}
        >
          <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          返回修改
        </button>
      </div>
    </div>
  );
}
