"use client";

type Service = { id: string; name: string; description: string | null; duration: number };

type Promotion = {
  id: string;
  name: string;
  serviceIds: string[] | null;
  rewardType: string;
  rewardPoints: number;
  rewardTickets: number;
};

function getPromoBadgeText(promo: Promotion): string {
  const parts: string[] = [];
  if (promo.rewardPoints > 0) parts.push(`${promo.rewardPoints} 點`);
  if (promo.rewardTickets > 0) parts.push(`${promo.rewardTickets} 張票券`);
  return parts.length > 0 ? `預約送 ${parts.join(" + ")}` : "";
}

function getMatchingPromotion(serviceId: string, promotions: Promotion[]): Promotion | null {
  for (const p of promotions) {
    if (p.serviceIds === null || p.serviceIds.includes(serviceId)) {
      return p;
    }
  }
  return null;
}

export function ServiceSelect({ services, onSelect, promotions = [] }: { services: Service[]; onSelect: (service: Service) => void; promotions?: Promotion[] }) {
  return (
    <div className="px-4 pt-2 pb-4">
      <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>選擇服務</h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>請選擇您需要的服務項目</p>
      <div className="space-y-3">
        {services.map((s) => {
          const matchedPromo = getMatchingPromotion(s.id, promotions);
          const badgeText = matchedPromo ? getPromoBadgeText(matchedPromo) : "";
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="w-full text-left rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "var(--color-bg-card)",
                boxShadow: "var(--shadow-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>{s.name}</h3>
                  {s.description && (
                    <p className="text-sm mt-0.5 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>{s.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: "#EFF6FF", color: "var(--color-primary)" }}
                    >
                      {s.duration} 分鐘
                    </span>
                    {badgeText && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "#FEF3C7", color: "#B45309" }}
                      >
                        {badgeText}
                      </span>
                    )}
                  </div>
                </div>
                <svg className="w-5 h-5 shrink-0" style={{ color: "var(--color-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
