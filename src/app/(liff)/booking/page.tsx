"use client";

import { useEffect, useState, useCallback } from "react";
import { initLiff, liff } from "@/lib/liff";
import { ServiceSelect } from "@/components/booking/service-select";
import { ProviderSelect } from "@/components/booking/provider-select";
import { CalendarPicker } from "@/components/booking/calendar-picker";
import { TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { DynamicForm } from "@/components/booking/dynamic-form";
import { BookingConfirm } from "@/components/booking/booking-confirm";

type Service = { id: string; name: string; description: string | null; duration: number; assignmentMode?: string; requiresApproval?: boolean };
type Provider = { id: string; name: string; avatarUrl?: string | null };
type TimeSlot = { startTime: string; endTime: string };
type FormFieldDef = { key: string; label: string; type: "text" | "textarea" | "radio" | "checkbox"; options: string[] | null; required: boolean };

const ALL_STEPS = [
  { key: 1, label: "服務" },
  { key: 2, label: "人員" },
  { key: 3, label: "時段" },
  { key: 4, label: "資料" },
  { key: 5, label: "確認" },
];

export default function BookingPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [lineUserId, setLineUserId] = useState("");
  const [lineDisplayName, setLineDisplayName] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formFields, setFormFields] = useState<FormFieldDef[]>([]);
  const [bookingWindowDays, setBookingWindowDays] = useState(0);
  const [showProviderAvatar, setShowProviderAvatar] = useState(true);

  const [confirmationFields, setConfirmationFields] = useState<string[] | undefined>(undefined);
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    googleMeetUrl: string | null;
    date: string;
    startTime: string;
    endTime: string;
    service: string;
    provider: string;
  } | null>(null);

  // Navigate to step and push browser history
  const goToStep = useCallback((newStep: number, newSkipped?: Set<number>) => {
    const skipped = newSkipped || skippedSteps;
    // If this step is skipped, find next non-skipped
    let target = newStep;
    while (target <= 5 && skipped.has(target)) target++;
    setStep(target);
    if (target > 0 && target <= 5) {
      window.history.pushState({ step: target }, "", `#step-${target}`);
    }
  }, [skippedSteps]);

  // Handle browser back button
  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      const prevStep = e.state?.step;
      if (typeof prevStep === "number" && prevStep >= 1) {
        setStep(prevStep);
      } else {
        setStep(1);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    async function init() {
      setMounted(true);
      try {
        await initLiff();
        const profile = await liff.getProfile();
        setLineUserId(profile.userId);
        setLineDisplayName(profile.displayName);
      } catch {
        setLineUserId("dev-user");
        setLineDisplayName("開發用戶");
      }

      // Fetch theme settings
      try {
        const themeRes = await fetch("/api/theme");
        if (themeRes.ok) {
          const themeData = await themeRes.json();
          setConfirmationFields(themeData.confirmationFields);
          if (themeData.bookingWindowDays) setBookingWindowDays(themeData.bookingWindowDays);
          if (typeof themeData.showProviderAvatar === "boolean") setShowProviderAvatar(themeData.showProviderAvatar);
          if (themeData.colors) {
            document.documentElement.style.setProperty("--color-primary", themeData.colors.primary);
            document.documentElement.style.setProperty("--color-accent", themeData.colors.accent);
          }
        }
      } catch { /* use defaults */ }

      const newSkipped = new Set<number>();

      const servicesRes = await fetch("/api/services");
      const servicesData = await servicesRes.json();
      setServices(servicesData);

      if (servicesData.length === 1) {
        newSkipped.add(1);
        setSelectedService(servicesData[0]);
        // Fetch form fields for this service
        await loadFormFieldsForService(servicesData[0].id, newSkipped);
        setSkippedSteps(new Set(newSkipped));
        await loadProvidersInit(servicesData[0].id, newSkipped, servicesData[0]);
      } else {
        setSkippedSteps(newSkipped);
        goToStep(1, newSkipped);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFormFieldsForService(serviceId: string, skipSet: Set<number>) {
    try {
      const res = await fetch(`/api/form-fields?serviceId=${serviceId}`);
      if (res.ok) {
        const fields: FormFieldDef[] = await res.json();
        setFormFields(fields);
        if (fields.length === 0) {
          skipSet.add(4);
        } else {
          skipSet.delete(4);
        }
      }
    } catch { /* use defaults */ }
  }

  async function loadProvidersInit(serviceId: string, currentSkipped: Set<number>, service?: Service) {
    const res = await fetch(`/api/providers?serviceId=${serviceId}`);
    const data = await res.json();
    setProviders(data);

    const isRoundRobin = service?.assignmentMode === "round_robin";

    if (isRoundRobin || data.length === 1) {
      currentSkipped.add(2);
      setSkippedSteps(new Set(currentSkipped));
      if (!isRoundRobin) {
        setSelectedProvider(data[0]);
      } else if (data.length > 0) {
        // Set a placeholder provider for round robin; actual assignment happens server-side
        setSelectedProvider(data[0]);
      }
      goToStep(3, currentSkipped);
    } else {
      setSkippedSteps(new Set(currentSkipped));
      goToStep(2, currentSkipped);
    }
  }

  async function loadProvidersForService(serviceId: string, service?: Service) {
    const res = await fetch(`/api/providers?serviceId=${serviceId}`);
    const data = await res.json();
    setProviders(data);

    const isRoundRobin = service?.assignmentMode === "round_robin";

    if (isRoundRobin || data.length === 1) {
      setSkippedSteps((prev) => new Set([...prev, 2]));
      if (!isRoundRobin) {
        setSelectedProvider(data[0]);
      } else if (data.length > 0) {
        setSelectedProvider(data[0]);
      }
      goToStep(3);
    } else {
      goToStep(2);
    }
  }

  async function handleServiceSelect(service: Service) {
    setSelectedService(service);
    // Load form fields for selected service
    const newSkipped = new Set(skippedSteps);
    await loadFormFieldsForService(service.id, newSkipped);
    setSkippedSteps(newSkipped);
    loadProvidersForService(service.id, service);
  }

  function handleProviderSelect(provider: Provider | null) {
    setSelectedProvider(provider === null ? providers[0] : provider);
    goToStep(3);
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);
  }

  function handleSlotSelect(slot: TimeSlot) {
    setSelectedSlot(slot);
    goToStep(4);
  }

  function handleFormSubmit(data: Record<string, string>) {
    setFormData(data);
    goToStep(5);
  }

  function handleBack() {
    let prev = step - 1;
    while (prev >= 1 && skippedSteps.has(prev)) prev--;
    if (prev < 1) return;
    setStep(prev);
  }

  async function handleConfirm() {
    if (!selectedService || !selectedProvider || !selectedSlot) return;
    setSubmitting(true);

    const isRoundRobin = selectedService.assignmentMode === "round_robin";

    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: isRoundRobin ? undefined : selectedProvider.id,
        serviceId: selectedService.id,
        lineUserId,
        customerName: formData.name || "",
        customerPhone: formData.phone || "",
        customerEmail: formData.email || "",
        date: selectedDate,
        startTime: selectedSlot.startTime,
        notes: formData.notes || "",
        customFields: formData,
      }),
    });

    if (res.ok) {
      const result = await res.json();
      setBookingResult(result);
      setStep(6);
      window.history.replaceState({ step: 6 }, "", "#success");
    } else {
      const err = await res.json();
      alert(err.error || "預約失敗，請重試");
    }
    setSubmitting(false);
  }

  // Loading / hydration guard
  if (!mounted || step === 0) {
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

  // Success state
  if (step === 6) {
    const isPendingApproval = selectedService?.requiresApproval === true;

    let calendarUrl = "";
    if (bookingResult) {
      const dateClean = bookingResult.date.replace(/-/g, "");
      const startClean = bookingResult.startTime.replace(":", "");
      const endClean = bookingResult.endTime.replace(":", "");
      const title = encodeURIComponent(`${bookingResult.service} - ${bookingResult.provider}`);
      const details = encodeURIComponent(
        bookingResult.googleMeetUrl ? `會議連結：${bookingResult.googleMeetUrl}` : isPendingApproval ? "預約待審核" : "預約已確認"
      );
      calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateClean}T${startClean}00/${dateClean}T${endClean}00&ctz=Asia/Taipei&details=${details}`;
    }

    return (
      <div className="px-4 pt-12 pb-8">
        <div className="rounded-2xl p-8 text-center" style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-elevated)", border: "1px solid var(--color-border)" }}>
          {isPendingApproval ? (
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #FEF3C7, #FDE68A)" }}>
              <svg className="w-8 h-8" style={{ color: "#D97706" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #D1FAE5, #A7F3D0)" }}>
              <svg className="w-8 h-8" style={{ color: "#059669" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
            {isPendingApproval ? "您的預約已提交，等待審核中" : "預約成功！"}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            {isPendingApproval
              ? "管理員審核通過後，您將收到確認通知"
              : bookingResult?.googleMeetUrl ? "會議連結已發送到您的 LINE" : "確認訊息已發送到您的 LINE"
            }
          </p>
          {!isPendingApproval && calendarUrl && (
            <a
              href={calendarUrl}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))", boxShadow: "0 4px 12px rgba(37,99,235,0.25)" }}
              target="_blank" rel="noopener noreferrer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              加入行事曆
            </a>
          )}
        </div>
      </div>
    );
  }

  // Visible steps for the indicator
  const visibleSteps = ALL_STEPS.filter((s) => !skippedSteps.has(s.key));

  return (
    <div className="max-w-md mx-auto pb-8">
      {/* Step indicator — pure CSS grid, circles centered, lines as background */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          {/* Connecting lines layer */}
          <div className="absolute top-[14px] left-0 right-0 flex px-[calc(50%/var(--col-count))]" style={{ "--col-count": visibleSteps.length } as React.CSSProperties}>
            {visibleSteps.slice(0, -1).map((s, i) => {
              const nextStep = visibleSteps[i + 1];
              const isFilled = step > s.key && step >= nextStep.key;
              const isHalf = step >= nextStep.key;
              return (
                <div key={s.key} className="flex-1 h-0.5 rounded-full transition-all duration-300"
                  style={{ background: isFilled || isHalf ? "var(--color-primary)" : "var(--color-border)" }}
                />
              );
            })}
          </div>
          {/* Circles + labels */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${visibleSteps.length}, 1fr)` }}>
            {visibleSteps.map((s, i) => {
              const isActive = step === s.key;
              const isCompleted = step > s.key;
              return (
                <div key={s.key} className="flex flex-col items-center relative z-10">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300"
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))"
                        : isCompleted ? "var(--color-primary)" : "var(--color-border)",
                      color: isActive || isCompleted ? "#fff" : "var(--color-text-muted)",
                      boxShadow: isActive ? "0 2px 8px rgba(37,99,235,0.3)" : "none",
                    }}
                  >
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (i + 1)}
                  </div>
                  <span
                    className="text-[10px] mt-1 font-medium transition-all duration-300"
                    style={{ color: isActive ? "var(--color-primary)" : isCompleted ? "var(--color-text)" : "var(--color-text-muted)" }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Back button */}
      {(() => {
        let prev = step - 1;
        while (prev >= 1 && skippedSteps.has(prev)) prev--;
        return prev >= 1 && step <= 5 ? (
          <div className="px-4 mb-1">
            <button onClick={handleBack} className="inline-flex items-center gap-1 text-sm py-2 transition-colors duration-150" style={{ color: "var(--color-text-muted)" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              上一步
            </button>
          </div>
        ) : null;
      })()}

      {step === 1 && <ServiceSelect services={services} onSelect={handleServiceSelect} />}
      {step === 2 && (
        <ProviderSelect
          providers={providers}
          onSelect={handleProviderSelect}
          showAvatar={showProviderAvatar}
          avatarUrls={providers.reduce((acc, p) => {
            acc[p.id] = p.avatarUrl || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(p.name)}`;
            return acc;
          }, {} as Record<string, string>)}
        />
      )}
      {step === 3 && selectedProvider && selectedService && (
        <div>
          <CalendarPicker providerId={selectedProvider.id} serviceId={selectedService.id} onSelect={handleDateSelect} maxDays={bookingWindowDays} />
          {selectedDate && (
            <TimeSlotPicker providerId={selectedProvider.id} serviceId={selectedService.id} date={selectedDate} onSelect={handleSlotSelect} />
          )}
        </div>
      )}
      {step === 4 && (
        <DynamicForm
          fields={formFields}
          defaultValues={{ ...formData, name: formData.name || lineDisplayName }}
          onSubmit={handleFormSubmit}
        />
      )}
      {step === 5 && selectedService && selectedProvider && selectedSlot && (
        <BookingConfirm
          data={{
            serviceName: selectedService.name, serviceDuration: selectedService.duration,
            providerName: selectedProvider.name, date: selectedDate,
            startTime: selectedSlot.startTime, endTime: selectedSlot.endTime,
            customerName: formData.name || "", customerPhone: formData.phone || "", notes: formData.notes || "",
          }}
          onConfirm={handleConfirm} onBack={() => setStep(4)} submitting={submitting} visibleFields={confirmationFields}
        />
      )}
    </div>
  );
}
