"use client";

import { useState } from "react";

type FormFieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "radio" | "checkbox";
  options: string[] | null;
  required: boolean;
};

export function DynamicForm({
  fields,
  defaultValues,
  onSubmit,
}: {
  fields: FormFieldDef[];
  defaultValues: Record<string, string>;
  onSubmit: (data: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.key] = defaultValues[f.key] || "";
    }
    return init;
  });

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function toggleCheckbox(key: string, option: string) {
    const current = values[key] ? values[key].split(",").filter(Boolean) : [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setValue(key, next.join(","));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  const inputStyle = {
    background: "var(--color-bg)",
    border: "1.5px solid var(--color-border)",
    color: "var(--color-text)",
  };

  function handleFocus(e: React.FocusEvent<HTMLElement>) {
    e.currentTarget.style.borderColor = "var(--color-primary)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
  }

  function handleBlur(e: React.FocusEvent<HTMLElement>) {
    e.currentTarget.style.borderColor = "var(--color-border)";
    e.currentTarget.style.boxShadow = "none";
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
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              {field.label}
              {field.required && <span style={{ color: "#EF4444" }}> *</span>}
            </label>

            {field.type === "text" && (
              <input
                type={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text"}
                value={values[field.key]}
                onChange={(e) => setValue(field.key, e.target.value)}
                placeholder={field.key === "phone" ? "0912345678" : field.key === "email" ? "example@email.com" : ""}
                className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all duration-200"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required={field.required}
              />
            )}

            {field.type === "textarea" && (
              <textarea
                value={values[field.key]}
                onChange={(e) => setValue(field.key, e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all duration-200 resize-none"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                rows={3}
                required={field.required}
              />
            )}

            {field.type === "radio" && field.options && (
              <div className="space-y-2 mt-1">
                {field.options.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150"
                    style={{
                      background: values[field.key] === opt ? "var(--color-primary)" : "var(--color-bg)",
                      color: values[field.key] === opt ? "#fff" : "var(--color-text)",
                      border: `1.5px solid ${values[field.key] === opt ? "var(--color-primary)" : "var(--color-border)"}`,
                    }}
                  >
                    <input
                      type="radio"
                      name={field.key}
                      value={opt}
                      checked={values[field.key] === opt}
                      onChange={() => setValue(field.key, opt)}
                      className="sr-only"
                      required={field.required && !values[field.key]}
                    />
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: values[field.key] === opt ? "#fff" : "var(--color-border)",
                      }}
                    >
                      {values[field.key] === opt && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {field.type === "checkbox" && field.options && (
              <div className="space-y-2 mt-1">
                {field.options.map((opt) => {
                  const checked = values[field.key]?.split(",").includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150"
                      style={{
                        background: checked ? "var(--color-primary)" : "var(--color-bg)",
                        color: checked ? "#fff" : "var(--color-text)",
                        border: `1.5px solid ${checked ? "var(--color-primary)" : "var(--color-border)"}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCheckbox(field.key, opt)}
                        className="sr-only"
                      />
                      <div
                        className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: checked ? "#fff" : "var(--color-border)",
                          background: checked ? "rgba(255,255,255,0.2)" : "transparent",
                        }}
                      >
                        {checked && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}

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
