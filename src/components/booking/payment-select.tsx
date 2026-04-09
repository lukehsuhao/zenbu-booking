"use client";

import { useEffect, useState } from "react";

type PaymentMethod = "free" | "ticket" | "points" | "cash";
type PaymentInfo = { method: PaymentMethod; ticketId?: string; pointsUsed?: number };
type TicketData = { id: string; serviceId: string; total: number; used: number; expiresAt: string | null; service: { id: string; name: string } };

type Props = {
  service: { id: string; name: string; price: number; acceptTicket?: boolean; acceptPoints?: boolean; pointsPerUnit?: number };
  lineUserId: string;
  onSelect: (payment: PaymentInfo) => void;
};

export function PaymentSelect({ service, lineUserId, onSelect }: Props) {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [pointsInput, setPointsInput] = useState(0);

  const pointsPerUnit = service.pointsPerUnit || 1;

  // If free, immediately call onSelect
  useEffect(() => {
    if (service.price === 0) {
      onSelect({ method: "free" });
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        const [ticketRes, pointsRes] = await Promise.all([
          service.acceptTicket ? fetch(`/api/member/tickets?lineUserId=${lineUserId}`) : null,
          service.acceptPoints ? fetch(`/api/member/points?lineUserId=${lineUserId}`) : null,
        ]);

        if (ticketRes && ticketRes.ok) {
          const allTickets: TicketData[] = await ticketRes.json();
          const now = new Date();
          const valid = allTickets.filter(
            (t) =>
              t.service.id === service.id &&
              t.total - t.used > 0 &&
              (!t.expiresAt || new Date(t.expiresAt) > now)
          );
          setTickets(valid);
        }

        if (pointsRes && pointsRes.ok) {
          const data = await pointsRes.json();
          setPointsBalance(data.balance || 0);
        }
      } catch {
        // silently fail, user can still pay cash
      }
      setLoading(false);
    }

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.id, lineUserId]);

  if (service.price === 0) return null;

  if (loading) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center justify-center py-12 gap-3">
          <div
            className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
            style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
          />
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>載入付款方式...</span>
        </div>
      </div>
    );
  }

  const maxPoints = Math.min(pointsBalance, service.price * pointsPerUnit);
  const pointsDeductYuan = pointsPerUnit > 0 ? Math.floor(pointsInput / pointsPerUnit) : 0;
  const remainingYuan = service.price - pointsDeductYuan;

  function handleConfirm() {
    if (!selected) return;
    if (selected === "ticket" && selectedTicketId) {
      onSelect({ method: "ticket", ticketId: selectedTicketId });
    } else if (selected === "points" && pointsInput > 0) {
      onSelect({ method: "points", pointsUsed: pointsInput });
    } else if (selected === "cash") {
      onSelect({ method: "cash" });
    }
  }

  const hasValidTicket = service.acceptTicket && tickets.length > 0;
  const hasPoints = service.acceptPoints && pointsBalance > 0;

  return (
    <div className="px-4 pt-2 pb-4">
      <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>選擇付款方式</h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>服務費用 {service.price} 元</p>

      <div className="space-y-3">
        {/* Ticket option */}
        {hasValidTicket && tickets.map((ticket) => {
          const remaining = ticket.total - ticket.used;
          const isSelected = selected === "ticket" && selectedTicketId === ticket.id;
          return (
            <button
              key={ticket.id}
              onClick={() => { setSelected("ticket"); setSelectedTicketId(ticket.id); }}
              className="w-full text-left rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "var(--color-bg-card)",
                boxShadow: "var(--shadow-card)",
                border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: "linear-gradient(135deg, #FEF3C7, #FDE68A)" }}
                >
                  <svg className="w-6 h-6" style={{ color: "#D97706" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>使用票券</h3>
                  <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>剩餘 {remaining} 張</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-primary)" }}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {/* Points option */}
        {hasPoints && (
          <div>
            <button
              onClick={() => {
                setSelected("points");
                if (pointsInput === 0) setPointsInput(Math.min(maxPoints, service.price * pointsPerUnit));
              }}
              className="w-full text-left rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "var(--color-bg-card)",
                boxShadow: "var(--shadow-card)",
                border: selected === "points" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: "linear-gradient(135deg, #ECFDF5, #A7F3D0)" }}
                >
                  <svg className="w-6 h-6" style={{ color: "#059669" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>使用點數抵扣</h3>
                  <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>可用點數 {pointsBalance} 點</p>
                </div>
                {selected === "points" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-primary)" }}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
            {selected === "points" && (
              <div className="mt-2 px-4 py-3 rounded-xl" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--color-text)" }}>使用點數</label>
                <input
                  type="number"
                  min={1}
                  max={maxPoints}
                  value={pointsInput}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(maxPoints, Number(e.target.value)));
                    setPointsInput(val);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                />
                <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                  抵扣 {pointsDeductYuan} 元，剩餘 {remainingYuan > 0 ? `${remainingYuan} 元線下付款` : "無需付款"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Cash option */}
        <button
          onClick={() => setSelected("cash")}
          className="w-full text-left rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
          style={{
            background: "var(--color-bg-card)",
            boxShadow: "var(--shadow-card)",
            border: selected === "cash" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)" }}
            >
              <svg className="w-6 h-6" style={{ color: "var(--color-primary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>全額線下付款</h3>
              <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>{service.price} 元</p>
            </div>
            {selected === "cash" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-primary)" }}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selected}
        className="w-full text-white py-3.5 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.98] disabled:opacity-40 mt-5"
        style={{
          background: selected
            ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))"
            : "var(--color-border)",
          boxShadow: selected ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
          minHeight: "48px",
        }}
      >
        下一步
      </button>
    </div>
  );
}
