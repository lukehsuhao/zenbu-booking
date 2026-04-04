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

export function BookingConfirm({ data, onConfirm, onBack, submitting, visibleFields }: {
  data: BookingData; onConfirm: () => void; onBack: () => void; submitting: boolean;
  visibleFields?: string[];
}) {
  const show = (field: string) => !visibleFields || visibleFields.includes(field);

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
        {show("service") && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            label="服務"
            value={`${data.serviceName}（${data.serviceDuration} 分鐘）`}
          />
        )}
        {show("provider") && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            label="提供者"
            value={data.providerName}
          />
        )}
        {show("date") && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
            label="日期"
            value={data.date}
          />
        )}
        {show("time") && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
            label="時間"
            value={`${data.startTime} - ${data.endTime}`}
          />
        )}
        {show("name") && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            label="姓名"
            value={data.customerName}
          />
        )}
        {show("phone") && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
            label="電話"
            value={data.customerPhone}
          />
        )}
        {show("notes") && data.notes && (
          <InfoRow
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
            label="備註"
            value={data.notes}
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
