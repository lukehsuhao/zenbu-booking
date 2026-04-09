"use client";

import { useEffect, useState } from "react";
import { initLiff } from "@/lib/liff";
import { VideoPlayer } from "@/components/liff/video-player";

type ThemeData = {
  showStoreFront: boolean;
  storeName: string;
  storeDescription: string;
  storeImageUrl: string | null;
  storeMediaType: string;
  storeYoutubeUrl: string | null;
  colors: { primary: string; accent: string };
};

type Promotion = {
  id: string;
  name: string;
  description: string | null;
  serviceIds: string[] | null;
  rewardType: string;
  rewardPoints: number;
  rewardTickets: number;
  ticketServiceId: string | null;
  startDate: string;
  endDate: string;
};

function getPromotionRewardText(p: Promotion): string {
  const parts: string[] = [];
  if (p.rewardPoints > 0) parts.push(`${p.rewardPoints} 點`);
  if (p.rewardTickets > 0) parts.push(`${p.rewardTickets} 張票券`);
  return parts.length > 0 ? `預約即送 ${parts.join(" + ")}` : "";
}

function getRemainingDays(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function StoreFrontPage() {
  const [mounted, setMounted] = useState(false);
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [theme, setTheme] = useState<ThemeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  // SPA navigation: null = store front, "booking" = booking flow, "member" = member area
  const [view, setView] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    async function load() {
      // 初始化 LIFF（在 LINE 內自動取得用戶身份）
      try { await initLiff(); } catch { /* 非 LINE 環境也能用 */ }

      try {
        const res = await fetch("/api/theme");
        if (res.ok) {
          const data: ThemeData = await res.json();
          if (data.colors) {
            document.documentElement.style.setProperty("--color-primary", data.colors.primary);
            document.documentElement.style.setProperty("--color-accent", data.colors.accent);
          }
          if (!data.showStoreFront) {
            // No store front → go straight to booking
            setView("booking");
          }
          setTheme(data);
        } else {
          setView("booking");
        }
      } catch {
        setView("booking");
      }

      // Fetch active promotions
      try {
        const promoRes = await fetch("/api/promotions");
        if (promoRes.ok) {
          const promoData: Promotion[] = await promoRes.json();
          setPromotions(promoData);
        }
      } catch { /* ignore */ }

      setLoading(false);
    }
    load();
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div
          className="w-10 h-10 rounded-full border-3 border-t-transparent animate-spin"
          style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>載入中...</p>
      </div>
    );
  }

  // Shared header for all views
  const header = (
    <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-white sticky top-0 z-20">
      <h1
        className="text-xl font-bold cursor-pointer active:opacity-70 transition-opacity"
        style={{ color: "var(--color-text)" }}
        onClick={() => setView(null)}
      >
        {theme?.storeName || "線上預約"}
      </h1>
      {view === "member" ? (
        <button
          onClick={() => setView("booking")}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-full border transition-colors duration-150"
          style={{
            color: "#fff",
            background: "var(--color-primary)",
            borderColor: "var(--color-primary)",
          }}
        >
          前往預約
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={() => setView("member")}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-full border transition-colors duration-150"
          style={{
            color: "var(--color-text-muted)",
            borderColor: "var(--color-border)",
          }}
        >
          會員專區
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.375 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </button>
      )}
    </div>
  );

  // SPA: render booking flow inline
  if (view === "booking") {
    const BookingPage = require("./booking/page").default;
    return (
      <div className="min-h-screen bg-white">
        {header}
        <BookingPage />
      </div>
    );
  }

  // SPA: render member area inline
  if (view === "member") {
    const MemberPage = require("./member/page").default;
    return (
      <div className="min-h-screen bg-white">
        {header}
        <MemberPage onBack={() => setView(null)} onBookService={() => setView("booking")} />
      </div>
    );
  }

  // Store front view
  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingBottom: "110px" }}>
      {header}

      {/* Media (image or YouTube) */}
      {theme?.storeMediaType === "image" && theme.storeImageUrl && (
        <div className="px-5 mb-4">
          <img
            src={theme.storeImageUrl}
            alt={theme.storeName || ""}
            className="w-full rounded-2xl object-cover max-h-48"
          />
        </div>
      )}
      {theme?.storeMediaType === "youtube" && theme.storeYoutubeUrl && (
        <div className="px-5 mb-4">
          <VideoPlayer src={theme.storeYoutubeUrl} />
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 px-5 pb-4">
        {theme?.storeDescription && (
          <div
            className="prose prose-sm max-w-none"
            style={{ color: "var(--color-text)" }}
            dangerouslySetInnerHTML={{ __html: theme.storeDescription }}
          />
        )}

        {/* Promotions moved to above the fixed button */}
      </div>

      {/* Fixed bottom area — promotions + button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white" style={{ boxShadow: "0 -4px 12px rgba(0,0,0,0.05)" }}>
        {/* Collapsible promotions */}
        {promotions.length > 0 && (
          <div className="px-5 pt-3">
            <button
              onClick={() => setPromoExpanded(!promoExpanded)}
              className="w-full flex items-center justify-between text-sm font-bold mb-2"
              style={{ color: "var(--color-text)" }}
            >
              <span className="flex items-center gap-1.5">
                <span>🔥</span> 限時活動
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#D97706" }}>{promotions.length}</span>
              </span>
              <svg className={`w-4 h-4 transition-transform duration-200 ${promoExpanded ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--color-text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {promoExpanded && (
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {promotions.map((promo) => {
                  const remaining = getRemainingDays(promo.endDate);
                  const rewardText = getPromotionRewardText(promo);
                  return (
                    <div
                      key={promo.id}
                      className="relative rounded-xl p-[2px] overflow-hidden"
                      style={{ background: "linear-gradient(135deg, #F59E0B, #F97316, #EF4444)" }}
                    >
                      <div className="rounded-[10px] bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-xs" style={{ color: "var(--color-text)" }}>{promo.name}</h3>
                            {rewardText && (
                              <p className="text-xs mt-0.5 font-medium" style={{ color: "#D97706" }}>{rewardText}</p>
                            )}
                          </div>
                          <span
                            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}
                          >
                            {remaining} 天
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="px-5 pb-5 pt-2">
        <button
          onClick={() => setView("booking")}
          className="w-full text-white py-3.5 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.98]"
          style={{
            background: "var(--color-primary)",
            minHeight: "48px",
          }}
        >
          開始預約
        </button>
        </div>
      </div>
    </div>
  );
}
