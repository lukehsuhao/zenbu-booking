"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("帳號或密碼錯誤");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1E293B] mt-4">預約管理後台</h1>
          <p className="text-sm text-slate-500 mt-1">登入以繼續</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">密碼</label>
            <input
              type="password"
              placeholder="輸入密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:bg-white transition-all"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#2563EB] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-colors duration-150"
          >
            登入
          </button>
        </form>

        {/* Dev accounts */}
        {mounted && <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-xs font-medium text-slate-400 mb-2">開發用帳號</p>
          <div className="space-y-1.5">
            <button type="button" onClick={() => { setEmail("admin@example.com"); setPassword("admin123"); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-white transition-colors">
              <span className="font-medium text-[#1E293B]">管理員</span> <span className="text-slate-400">admin@example.com / admin123</span>
            </button>
            <button type="button" onClick={() => { setEmail("amy@example.com"); setPassword("provider123"); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-white transition-colors">
              <span className="font-medium text-[#1E293B]">服務提供者</span> <span className="text-slate-400">amy@example.com / provider123</span>
            </button>
          </div>
        </div>}
      </div>
    </div>
  );
}
