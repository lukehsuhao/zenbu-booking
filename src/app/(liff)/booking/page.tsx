"use client";

import { useEffect, useState } from "react";
import { initLiff, liff } from "@/lib/liff";
import { ServiceSelect } from "@/components/booking/service-select";
import { ProviderSelect } from "@/components/booking/provider-select";
import { CalendarPicker } from "@/components/booking/calendar-picker";
import { TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { CustomerForm } from "@/components/booking/customer-form";
import { BookingConfirm } from "@/components/booking/booking-confirm";

type Service = { id: string; name: string; description: string | null; duration: number };
type Provider = { id: string; name: string };
type TimeSlot = { startTime: string; endTime: string };

export default function BookingPage() {
  const [step, setStep] = useState(0);
  const [lineUserId, setLineUserId] = useState("");
  const [lineDisplayName, setLineDisplayName] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerData, setCustomerData] = useState({ name: "", phone: "", notes: "" });

  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ googleMeetUrl: string | null } | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await initLiff();
        const profile = await liff.getProfile();
        setLineUserId(profile.userId);
        setLineDisplayName(profile.displayName);
      } catch {
        setLineUserId("dev-user");
        setLineDisplayName("開發用戶");
      }

      const servicesRes = await fetch("/api/services");
      const servicesData = await servicesRes.json();
      setServices(servicesData);

      if (servicesData.length === 1) {
        setSelectedService(servicesData[0]);
        await loadProviders(servicesData[0].id);
      } else {
        setStep(1);
      }
    }
    init();
  }, []);

  async function loadProviders(serviceId: string) {
    const res = await fetch(`/api/providers?serviceId=${serviceId}`);
    const data = await res.json();
    setProviders(data);

    if (data.length === 1) {
      setSelectedProvider(data[0]);
      setStep(3);
    } else {
      setStep(2);
    }
  }

  function handleServiceSelect(service: Service) {
    setSelectedService(service);
    loadProviders(service.id);
  }

  function handleProviderSelect(provider: Provider | null) {
    if (provider === null) {
      setSelectedProvider(providers[0]);
    } else {
      setSelectedProvider(provider);
    }
    setStep(3);
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);
  }

  function handleSlotSelect(slot: TimeSlot) {
    setSelectedSlot(slot);
    setStep(4);
  }

  function handleCustomerSubmit(data: { name: string; phone: string; notes: string }) {
    setCustomerData(data);
    setStep(5);
  }

  async function handleConfirm() {
    if (!selectedService || !selectedProvider || !selectedSlot) return;
    setSubmitting(true);

    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: selectedProvider.id,
        serviceId: selectedService.id,
        lineUserId,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        notes: customerData.notes,
      }),
    });

    if (res.ok) {
      const result = await res.json();
      setBookingResult(result);
      setStep(6);
    } else {
      const err = await res.json();
      alert(err.error || "預約失敗，請重試");
    }
    setSubmitting(false);
  }

  if (step === 0) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">載入中...</p></div>;
  }

  if (step === 6) {
    return (
      <div className="p-4 text-center">
        <div className="bg-white rounded-lg shadow p-8 mt-8">
          <div className="text-5xl mb-4">&#x2705;</div>
          <h2 className="text-xl font-bold mb-2">預約成功！</h2>
          <p className="text-gray-500 mb-4">確認訊息已發送到您的 LINE</p>
          {bookingResult?.googleMeetUrl && (
            <a href={bookingResult.googleMeetUrl} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Meet 連結</a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-8">
      <div className="flex gap-1 p-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded ${step >= s ? "bg-blue-600" : "bg-gray-200"}`} />
        ))}
      </div>

      {step === 1 && <ServiceSelect services={services} onSelect={handleServiceSelect} />}
      {step === 2 && <ProviderSelect providers={providers} onSelect={handleProviderSelect} />}
      {step === 3 && selectedProvider && selectedService && (
        <div>
          <CalendarPicker providerId={selectedProvider.id} serviceId={selectedService.id} onSelect={handleDateSelect} />
          {selectedDate && (
            <TimeSlotPicker providerId={selectedProvider.id} serviceId={selectedService.id} date={selectedDate} onSelect={handleSlotSelect} />
          )}
        </div>
      )}
      {step === 4 && <CustomerForm defaultName={lineDisplayName} onSubmit={handleCustomerSubmit} />}
      {step === 5 && selectedService && selectedProvider && selectedSlot && (
        <BookingConfirm
          data={{
            serviceName: selectedService.name, serviceDuration: selectedService.duration,
            providerName: selectedProvider.name, date: selectedDate,
            startTime: selectedSlot.startTime, endTime: selectedSlot.endTime,
            customerName: customerData.name, customerPhone: customerData.phone, notes: customerData.notes,
          }}
          onConfirm={handleConfirm} onBack={() => setStep(4)} submitting={submitting}
        />
      )}
    </div>
  );
}
