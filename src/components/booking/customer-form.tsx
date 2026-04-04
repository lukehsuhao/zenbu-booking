"use client";

import { useState } from "react";

type CustomerData = { name: string; phone: string; notes: string };

export function CustomerForm({ defaultName, defaultPhone = "", defaultNotes = "", onSubmit }: {
  defaultName: string; defaultPhone?: string; defaultNotes?: string; onSubmit: (data: CustomerData) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [notes, setNotes] = useState(defaultNotes);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, phone, notes });
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pt-2 pb-4">
      <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>填寫資料</h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>請填寫您的聯絡資訊</p>
      <div
        className="rounded-2xl p-5 space-y-5"
        style={{
          background: "var(--color-bg-card)",
          boxShadow: "var(--shadow-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
            姓名 <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all duration-200"
            style={{
              background: "var(--color-bg)",
              border: "1.5px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
            手機號碼 <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0912345678"
            className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all duration-200"
            style={{
              background: "var(--color-bg)",
              border: "1.5px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
            備註（選填）
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all duration-200 resize-none"
            style={{
              background: "var(--color-bg)",
              border: "1.5px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }}
            rows={3}
          />
        </div>
        <button
          type="submit"
          className="w-full text-white py-3.5 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
            boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
            minHeight: "48px",
          }}
        >
          下一步
        </button>
      </div>
    </form>
  );
}
