"use client";

import { useEffect, useState, useCallback } from "react";
import { initLiff, liff } from "@/lib/liff";
import { ServiceSelect } from "@/components/booking/service-select";
import { ProviderSelect } from "@/components/booking/provider-select";
import { CalendarPicker } from "@/components/booking/calendar-picker";
import { TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { DynamicForm } from "@/components/booking/dynamic-form";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { PaymentSelect } from "@/components/booking/payment-select";
import { BookingContentSkeleton } from "@/components/booking/booking-skeleton";

type Service = { id: string; name: string; description: string | null; duration: number; bookingWindowDays?: number; minAdvanceDays?: number; assignmentMode?: string; showProviderSelection?: boolean; hasDisclaimer?: boolean; disclaimerText?: string | null; requiresApproval?: boolean; price?: number; acceptTicket?: boolean; acceptPoints?: boolean; pointsPerUnit?: number };
type Provider = { id: string; name: string; avatarUrl?: string | null };
type TimeSlot = { startTime: string; endTime: string };
type FormFieldDef = { key: string; label: string; type: "text" | "textarea" | "radio" | "checkbox"; options: string[] | null; required: boolean };

const ALL_STEPS = [
  { key: 1, label: "服務" },
  { key: 2, label: "人員" },
  { key: 3, label: "時段" },
  { key: 4, label: "資料" },
  { key: 5, label: "付款" },
  { key: 6, label: "確認" },
];

export default function BookingPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [lineUserId, setLineUserId] = useState("");
  const [lineDisplayName, setLineDisplayName] = useState("");
  const [linePictureUrl, setLinePictureUrl] = useState("");
  const [authError, setAuthError] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [promotions, setPromotions] = useState<{ id: string; name: string; serviceIds: string[] | null; rewardType: string; rewardPoints: number; rewardTickets: number }[]>([]);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formFields, setFormFields] = useState<FormFieldDef[]>([]);
  const [bookingWindowDays, setBookingWindowDays] = useState(0);
  const [showProviderAvatar, setShowProviderAvatar] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<{ method: string; ticketId?: string; pointsUsed?: number } | null>(null);

  // confirmationFields removed — confirm page now auto-shows based on filled data
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
  const [pendingServiceAction, setPendingServiceAction] = useState<(() => void) | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    googleMeetUrl: string | null;
    date: string;
    startTime: string;
    endTime: string;
    service: string;
    provider: string;
    rewards?: { name: string; points: number; tickets: number }[];
  } | null>(null);

  // Navigate to step and push browser history
  const goToStep = useCallback((newStep: number, newSkipped?: Set<number>) => {
    const skipped = newSkipped || skippedSteps;
    // If this step is skipped, find next non-skipped
    let target = newStep;
    while (target <= 6 && skipped.has(target)) target++;
    setStep(target);
    if (target > 0 && target <= 6) {
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
        if (!profile.userId) throw new Error("No LINE userId");
        setLineUserId(profile.userId);
        setLineDisplayName(profile.displayName);
        setLinePictureUrl(profile.pictureUrl || "");
      } catch {
        // 開發環境允許跳過 LINE 登入
        if (typeof window !== "undefined" && window.location.hostname === "localhost") {
          setLineUserId("dev-user");
          setLineDisplayName("開發用戶");
        } else {
          setAuthError(true);
          return;
        }
      }

      // Fetch theme settings
      try {
        const themeRes = await fetch("/api/theme");
        if (themeRes.ok) {
          const themeData = await themeRes.json();
          // confirmationFields no longer used
          if (themeData.bookingWindowDays) setBookingWindowDays(themeData.bookingWindowDays);
          if (typeof themeData.showProviderAvatar === "boolean") setShowProviderAvatar(themeData.showProviderAvatar);
          if (themeData.colors) {
            document.documentElement.style.setProperty("--color-primary", themeData.colors.primary);
            document.documentElement.style.setProperty("--color-accent", themeData.colors.accent);
          }
        }
      } catch { /* use defaults */ }

      const newSkipped = new Set<number>();

      let servicesData: Service[] = [];
      try {
        const servicesRes = await fetch("/api/services");
        if (servicesRes.ok) servicesData = await servicesRes.json();
      } catch { /* use empty list, fall through to goToStep(1) */ }
      setServices(servicesData);

      // Fetch active promotions
      try {
        const promoRes = await fetch("/api/promotions");
        if (promoRes.ok) {
          const promoData = await promoRes.json();
          setPromotions(promoData);
        }
      } catch { /* ignore */ }

      // Check for ?service=xxx URL parameter to auto-select a service
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const presetServiceId = urlParams?.get("service");
      const presetService = presetServiceId
        ? servicesData.find((s) => s.id === presetServiceId)
        : null;

      if (presetService) {
        // Pre-selected service from URL — skip service selection step
        newSkipped.add(1);
        setSelectedService(presetService);
        if (presetService.bookingWindowDays != null) {
          setBookingWindowDays(presetService.bookingWindowDays);
        }
        if (!presetService.price || presetService.price === 0) {
          newSkipped.add(5);
        }
        await loadFormFieldsForService(presetService.id, newSkipped);
        setSkippedSteps(new Set(newSkipped));
        await loadProvidersInit(presetService.id, newSkipped, presetService);
      } else if (servicesData.length === 1) {
        newSkipped.add(1);
        setSelectedService(servicesData[0]);
        if (servicesData[0].bookingWindowDays != null) {
          setBookingWindowDays(servicesData[0].bookingWindowDays);
        }
        // Skip payment step if free
        if (!servicesData[0].price || servicesData[0].price === 0) {
          newSkipped.add(5);
        }
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
    let data: Provider[] = [];
    try {
      const res = await fetch(`/api/providers?serviceId=${serviceId}`);
      if (res.ok) data = await res.json();
    } catch { /* fall through */ }
    setProviders(data);

    const isRoundRobin = service?.assignmentMode === "round_robin";
    const hideProviders = !service?.showProviderSelection;

    if (isRoundRobin || hideProviders || data.length === 1) {
      currentSkipped.add(2);
      setSkippedSteps(new Set(currentSkipped));
      if (data.length > 0) {
        setSelectedProvider(data[0]);
      }
      goToStep(3, currentSkipped);
    } else {
      setSkippedSteps(new Set(currentSkipped));
      goToStep(2, currentSkipped);
    }
  }

  async function loadProvidersForService(serviceId: string, service?: Service) {
    let data: Provider[] = [];
    try {
      const res = await fetch(`/api/providers?serviceId=${serviceId}`);
      if (res.ok) data = await res.json();
    } catch { /* fall through */ }
    setProviders(data);

    const isRoundRobin = service?.assignmentMode === "round_robin";
    const hideProviders = !service?.showProviderSelection;

    if (isRoundRobin || hideProviders || data.length === 1) {
      setSkippedSteps((prev) => new Set([...prev, 2]));
      if (data.length > 0) {
        setSelectedProvider(data[0]);
      }
      goToStep(3);
    } else {
      goToStep(2);
    }
  }

  async function handleServiceSelect(service: Service) {
    setSelectedService(service);
    if (service.bookingWindowDays != null) {
      setBookingWindowDays(service.bookingWindowDays);
    }

    const proceed = async () => {
      const newSkipped = new Set(skippedSteps);
      // Skip payment step if free
      if (!service.price || service.price === 0) {
        newSkipped.add(5);
      } else {
        newSkipped.delete(5);
      }
      await loadFormFieldsForService(service.id, newSkipped);
      setSkippedSteps(newSkipped);
      loadProvidersForService(service.id, service);
    };

    // Show disclaimer if service has one
    if (service.hasDisclaimer && service.disclaimerText) {
      setDisclaimerAgreed(false);
      setPendingServiceAction(() => proceed);
      setShowDisclaimer(true);
    } else {
      await proceed();
    }
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
    goToStep(5); // payment step (auto-skipped to 6/confirm if free)
  }

  function handlePaymentSelect(payment: { method: string; ticketId?: string; pointsUsed?: number }) {
    setPaymentInfo(payment);
    goToStep(6); // confirm step
  }

  function handleBack() {
    let prev = step - 1;
    while (prev >= 1 && skippedSteps.has(prev)) prev--;
    if (prev < 1) return;
    setStep(prev);
  }

  async function handleConfirm() {
    if (!selectedService || !selectedProvider || !selectedSlot) return;
    // 生產環境下必須有真實的 LINE userId
    if (!lineUserId || (lineUserId === "dev-user" && typeof window !== "undefined" && window.location.hostname !== "localhost")) {
      setAuthError(true);
      return;
    }
    setSubmitting(true);

    const isRoundRobin = selectedService.assignmentMode === "round_robin";

    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: isRoundRobin ? undefined : selectedProvider.id,
        serviceId: selectedService.id,
        lineUserId,
        linePictureUrl,
        lineDisplayName,
        customerName: formData.name || "",
        customerPhone: formData.phone || "",
        customerEmail: formData.email || "",
        date: selectedDate,
        startTime: selectedSlot.startTime,
        notes: formData.notes || "",
        customFields: formData,
        paidWith: paymentInfo?.method || null,
        ticketId: paymentInfo?.ticketId || null,
        pointsUsed: paymentInfo?.pointsUsed || 0,
      }),
    });

    if (res.ok) {
      const result = await res.json();
      // If the API includes rewards, use them; otherwise derive from promotions client-side
      if (!result.rewards && selectedService) {
        const matchingRewards = promotions
          .filter((p) => p.serviceIds === null || p.serviceIds.includes(selectedService.id))
          .map((p) => ({ name: p.name, points: p.rewardPoints, tickets: p.rewardTickets }));
        if (matchingRewards.length > 0) {
          result.rewards = matchingRewards;
        }
      }
      setBookingResult(result);
      setStep(7);
      window.history.replaceState({ step: 7 }, "", "#success");
      window.scrollTo(0, 0);
    } else {
      const err = await res.json();
      alert(err.error || "預約失敗，請重試");
    }
    setSubmitting(false);
  }

  // 認證失敗畫面
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #FEE2E2, #FECACA)" }}
        >
          <svg className="w-8 h-8" style={{ color: "#DC2626" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--color-text)" }}>
            需要先登入 LINE
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            請先登入您的 LINE 帳號才能進行預約。<br />
            建議您直接從 LINE App 開啟本頁面，以獲得最佳體驗。
          </p>
        </div>
        <button
          onClick={() => {
            try {
              liff.login({ redirectUri: window.location.href });
            } catch {
              window.location.reload();
            }
          }}
          className="w-full max-w-xs py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
          style={{
            background: "#06C755",
            boxShadow: "0 4px 12px rgba(6,199,85,0.25)",
          }}
        >
          使用 LINE 登入
        </button>
        <button
          onClick={() => window.location.reload()}
          className="text-xs py-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          重新載入
        </button>
      </div>
    );
  }

  // Loading / hydration guard — use same skeleton as storefront so transition is seamless
  if (!mounted || step === 0) {
    return <BookingContentSkeleton />;
  }

  // Success state
  if (step === 7) {
    const isPendingApproval = selectedService?.requiresApproval === true;

    let calendarUrl = "";
    if (bookingResult) {
      const dateClean = bookingResult.date.replace(/-/g, "");
      const startClean = bookingResult.startTime.replace(":", "");
      const endClean = bookingResult.endTime.replace(":", "");
      const showProvider = selectedService?.showProviderSelection === true;
      const title = encodeURIComponent(
        showProvider ? `${bookingResult.service} - ${bookingResult.provider}` : bookingResult.service
      );
      const details = encodeURIComponent(
        bookingResult.googleMeetUrl ? `會議連結：${bookingResult.googleMeetUrl}` : isPendingApproval ? "預約待審核" : "預約已確認"
      );
      calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateClean}T${startClean}00/${dateClean}T${endClean}00&ctz=Asia/Taipei&details=${details}`;
    }

    return (
      <div className="px-4 pt-4 pb-4 max-w-md mx-auto">
        <div className="rounded-2xl p-6 text-center" style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-elevated)", border: "1px solid var(--color-border)" }}>
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
          <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
            {isPendingApproval
              ? "管理員審核通過後，您將收到確認通知"
              : bookingResult?.googleMeetUrl ? "會議連結已發送到您的 LINE" : "確認訊息已發送到您的 LINE"
            }
          </p>

          {/* 預約明細 */}
          {bookingResult && (
            <div className="rounded-xl p-4 mb-5 text-left" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>預約項目</span>
                  <span className="font-medium" style={{ color: "var(--color-text)" }}>{bookingResult.service}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>預約時間</span>
                  <span className="font-medium" style={{ color: "var(--color-text)" }}>{bookingResult.date} {bookingResult.startTime}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>時長</span>
                  <span className="font-medium" style={{ color: "var(--color-text)" }}>{selectedService?.duration || 0} 分鐘</span>
                </div>
              </div>
            </div>
          )}

          {/* 活動獎勵 */}
          {bookingResult?.rewards && bookingResult.rewards.length > 0 && (
            <div className="mb-5">
              {bookingResult.rewards.map((reward, idx) => {
                const rewardParts: string[] = [];
                if (reward.points > 0) rewardParts.push(`${reward.points} 點`);
                if (reward.tickets > 0) rewardParts.push(`${reward.tickets} 張票券`);
                return (
                  <div
                    key={idx}
                    className="rounded-xl p-4 mb-2 text-center mx-auto"
                    style={{ background: "linear-gradient(135deg, #FEF3C7, #FFEDD5)", border: "1px solid #FDE68A" }}
                  >
                    <p className="text-lg mb-1">🎉 活動獎勵</p>
                    <p className="font-bold text-base" style={{ color: "#B45309" }}>
                      您已獲得 {rewardParts.join(" + ")}！
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#92400E" }}>{reward.name}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* 按鈕區 */}
          <div className="space-y-3">
            {!isPendingApproval && calendarUrl && (
              <a
                href={calendarUrl}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))", boxShadow: "0 4px 12px rgba(37,99,235,0.25)" }}
                target="_blank" rel="noopener noreferrer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                加入行事曆
              </a>
            )}
            <button
              onClick={() => { window.location.href = "/member"; }}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
              style={{ color: "var(--color-primary)", border: "1.5px solid var(--color-primary)" }}
            >
              前往會員專區
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-8">
      {/* Back button */}
      {(() => {
        let prev = step - 1;
        while (prev >= 1 && skippedSteps.has(prev)) prev--;
        return prev >= 1 && step <= 6 ? (
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

      {step === 1 && <ServiceSelect services={services} onSelect={handleServiceSelect} promotions={promotions} />}
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
          <CalendarPicker providerId={selectedProvider.id} serviceId={selectedService.id} onSelect={handleDateSelect} maxDays={bookingWindowDays} minAdvanceDays={selectedService.minAdvanceDays} />
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
      {step === 5 && selectedService && (
        <PaymentSelect
          service={{ id: selectedService.id, name: selectedService.name, price: selectedService.price || 0, acceptTicket: selectedService.acceptTicket, acceptPoints: selectedService.acceptPoints, pointsPerUnit: selectedService.pointsPerUnit }}
          lineUserId={lineUserId}
          onSelect={handlePaymentSelect}
        />
      )}
      {step === 6 && selectedService && selectedProvider && selectedSlot && (
        <BookingConfirm
          data={{
            serviceName: selectedService.name, serviceDuration: selectedService.duration,
            providerName: selectedProvider.name, date: selectedDate,
            startTime: selectedSlot.startTime, endTime: selectedSlot.endTime,
            customerName: formData.name || "", customerPhone: formData.phone || "", notes: formData.notes || "",
          }}
          paymentSummary={paymentInfo && selectedService.price && selectedService.price > 0 ? {
            method: paymentInfo.method,
            pointsUsed: paymentInfo.pointsUsed,
            remaining: paymentInfo.method === "points" && paymentInfo.pointsUsed
              ? selectedService.price - Math.floor(paymentInfo.pointsUsed / (selectedService.pointsPerUnit || 1))
              : undefined,
            price: selectedService.price,
          } : null}
          onConfirm={handleConfirm} onBack={handleBack} submitting={submitting} showProvider={selectedService?.showProviderSelection}
        />
      )}

      {/* Disclaimer overlay */}
      {showDisclaimer && selectedService?.disclaimerText && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col" style={{ boxShadow: "var(--shadow-elevated)" }}>
            <div className="p-5 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>注意事項</h3>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>請詳閱以下內容</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--color-text)" }}>
                {selectedService.disclaimerText}
              </div>
            </div>
            <div className="p-5 border-t space-y-3" style={{ borderColor: "var(--color-border)" }}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disclaimerAgreed}
                  onChange={(e) => setDisclaimerAgreed(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded"
                />
                <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>我已閱讀並同意上述事項</span>
              </label>
              <button
                onClick={() => {
                  if (!disclaimerAgreed) return;
                  setShowDisclaimer(false);
                  if (pendingServiceAction) {
                    pendingServiceAction();
                    setPendingServiceAction(null);
                  }
                }}
                disabled={!disclaimerAgreed}
                className="w-full text-white py-3 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: disclaimerAgreed ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" : "var(--color-border)",
                  minHeight: "48px",
                }}
              >
                繼續預約
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
