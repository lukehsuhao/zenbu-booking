"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { initLiff } from "@/lib/liff";

function ConnectLineContent() {
  const searchParams = useSearchParams();
  const providerId = searchParams.get("providerId");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("正在連接 LINE 帳號...");

  useEffect(() => {
    if (!providerId) {
      setStatus("error");
      setMessage("缺少 providerId 參數");
      return;
    }

    async function connect() {
      try {
        const liff = await initLiff();
        const profile = await liff.getProfile();
        const lineUserId = profile.userId;

        const res = await fetch(`/api/admin/providers/${providerId}/connect-line`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId }),
        });

        if (res.ok) {
          setStatus("success");
          setMessage(`LINE 帳號已成功連結！（${profile.displayName}）`);
        } else {
          const err = await res.json().catch(() => ({}));
          setStatus("error");
          setMessage(err.error || "連結失敗，請稍後再試");
        }
      } catch (err) {
        console.error("Connect LINE error:", err);
        setStatus("error");
        setMessage("連結失敗，請確認您在 LINE 應用程式中開啟此頁面");
      }
    }

    connect();
  }, [providerId]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 max-w-sm w-full text-center">
      {status === "loading" && (
        <>
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#06C755] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-sm">{message}</p>
        </>
      )}
      {status === "success" && (
        <>
          <div className="w-16 h-16 rounded-full bg-[#06C755]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#06C755]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#1E293B] mb-2">連結成功</h2>
          <p className="text-slate-600 text-sm">{message}</p>
          <p className="text-slate-400 text-xs mt-4">您可以關閉此頁面</p>
        </>
      )}
      {status === "error" && (
        <>
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#1E293B] mb-2">連結失敗</h2>
          <p className="text-slate-600 text-sm">{message}</p>
        </>
      )}
    </div>
  );
}

export default function ConnectLinePage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Suspense fallback={
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#06C755] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-sm">載入中...</p>
        </div>
      }>
        <ConnectLineContent />
      </Suspense>
    </div>
  );
}
