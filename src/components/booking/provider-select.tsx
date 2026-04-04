"use client";

type Provider = { id: string; name: string };


export function ProviderSelect({ providers, onSelect, showAvatar, avatarUrls }: { providers: Provider[]; onSelect: (provider: Provider | null) => void; showAvatar?: boolean; avatarUrls?: Record<string, string> }) {
  return (
    <div className="px-4 pt-2 pb-4">
      <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>選擇提供者</h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>選擇您偏好的服務人員</p>
      <div className="space-y-3">
        {providers.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full text-left rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "var(--color-bg-card)",
              boxShadow: "var(--shadow-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <img
                src={avatarUrls?.[p.id] || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(p.name)}`}
                alt={p.name}
                className="w-12 h-12 rounded-full object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>{p.name}</h3>
              </div>
              <svg className="w-5 h-5 shrink-0" style={{ color: "var(--color-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
        {providers.length > 1 && (
          <button
            onClick={() => onSelect(null)}
            className="w-full text-left rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #F0FDFA, #ECFEFF)",
              boxShadow: "var(--shadow-card)",
              border: "1px solid #CCFBF1",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #06B6D4, #0891B2)" }}
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base" style={{ color: "var(--color-accent)" }}>不指定，幫我選最快</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>自動為您安排最近可用的時段</p>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
