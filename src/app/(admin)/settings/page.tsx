"use client";

import { useEffect, useState } from "react";

type ReminderRule = {
  id?: string;
  type: string;
  minutesBefore: number;
  serviceId?: string | null;
};

const MINUTES_OPTIONS = [
  { label: "前1小時", value: 60 },
  { label: "前3小時", value: 180 },
  { label: "前1天", value: 1440 },
  { label: "前2天", value: 2880 },
];

export default function SettingsPage() {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadRules() {
    const res = await fetch("/api/admin/settings");
    setRules(await res.json());
  }

  useEffect(() => {
    loadRules();
  }, []);

  function addRule() {
    setRules([...rules, { type: "line", minutesBefore: 60 }]);
  }

  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index));
  }

  function updateRule(index: number, field: keyof ReminderRule, value: string | number) {
    setRules(rules.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  async function saveRules() {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    });
    setSaving(false);
    await loadRules();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">提醒規則設定</h1>
        <div className="space-x-2">
          <button
            onClick={addRule}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            新增規則
          </button>
          <button
            onClick={saveRules}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>

      <table className="w-full bg-white rounded-lg shadow">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">通知方式</th>
            <th className="px-4 py-3 text-left">提前時間</th>
            <th className="px-4 py-3 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                尚無提醒規則，請點擊「新增規則」
              </td>
            </tr>
          )}
          {rules.map((rule, index) => (
            <tr key={index} className="border-t">
              <td className="px-4 py-3">
                <select
                  value={rule.type}
                  onChange={(e) => updateRule(index, "type", e.target.value)}
                  className="border rounded px-3 py-1.5"
                >
                  <option value="line">LINE</option>
                  <option value="email">Email</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <select
                  value={rule.minutesBefore}
                  onChange={(e) => updateRule(index, "minutesBefore", Number(e.target.value))}
                  className="border rounded px-3 py-1.5"
                >
                  {MINUTES_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => removeRule(index)}
                  className="text-red-600 hover:underline"
                >
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
