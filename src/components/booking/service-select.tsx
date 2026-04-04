"use client";

type Service = { id: string; name: string; description: string | null; duration: number };

const SERVICE_ICONS: Record<string, string> = {};

function getServiceIcon(name: string) {
  if (SERVICE_ICONS[name]) return SERVICE_ICONS[name];
  const lower = name.toLowerCase();
  if (lower.includes("諮詢") || lower.includes("consult")) return "\u{1F4AC}";
  if (lower.includes("美") || lower.includes("beauty")) return "\u2728";
  if (lower.includes("按摩") || lower.includes("massage")) return "\u{1F64F}";
  return "\u{1F4CB}";
}

export function ServiceSelect({ services, onSelect }: { services: Service[]; onSelect: (service: Service) => void }) {
  return (
    <div className="px-4 pt-2 pb-4">
      <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>選擇服務</h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>請選擇您需要的服務項目</p>
      <div className="space-y-3">
        {services.map((s) => (
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
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)" }}
              >
                {getServiceIcon(s.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>{s.name}</h3>
                {s.description && (
                  <p className="text-sm mt-0.5 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>{s.description}</p>
                )}
                <span
                  className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "#EFF6FF", color: "var(--color-primary)" }}
                >
                  {s.duration} 分鐘
                </span>
              </div>
              <svg className="w-5 h-5 mt-1 shrink-0" style={{ color: "var(--color-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
