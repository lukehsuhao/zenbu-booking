"use client";

import { useState } from "react";

type CustomerData = { name: string; phone: string; notes: string };

export function CustomerForm({ defaultName, onSubmit }: { defaultName: string; onSubmit: (data: CustomerData) => void }) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, phone, notes });
  }

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <h2 className="text-xl font-bold mb-4">填寫資料</h2>
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">姓名</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">手機號碼</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912-345-678" className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">備註（選填）</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">下一步</button>
      </div>
    </form>
  );
}
