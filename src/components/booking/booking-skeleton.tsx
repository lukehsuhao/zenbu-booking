"use client";

// Header skeleton — matches the real header in (liff)/page.tsx
export function BookingHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-white sticky top-0 z-20">
      <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
      <div className="h-9 w-24 rounded-full bg-gray-200 animate-pulse" />
    </div>
  );
}

// Content skeleton — placeholder service cards (matches the most common first step)
export function BookingContentSkeleton() {
  return (
    <div className="max-w-md mx-auto pb-8 px-4 pt-4">
      <div className="h-6 w-24 rounded bg-gray-200 animate-pulse mb-1" />
      <div className="h-4 w-40 rounded bg-gray-200 animate-pulse mb-4" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-4"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div className="flex gap-3 animate-pulse">
              <div className="w-16 h-16 rounded-xl bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
                <div className="h-3 w-1/3 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
