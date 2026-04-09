# 會員專區 + 點數票券系統 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete points/ticket system with member self-service, admin management, and booking payment integration.

**Architecture:** 6 tasks executed sequentially — schema first, then APIs, then admin UI, then LIFF member UI, then booking payment flow, finally auto-reward logic. Each task produces working, testable code.

**Tech Stack:** Next.js 16, Prisma 7, PostgreSQL (Neon), React 19, Tailwind CSS

---

### Task 1: Schema + Seed + API — Points & Tickets Management

**Files:**
- Modify: `prisma/schema.prisma` (add `rewardPointsOnComplete` to SiteSettings)
- Create: `src/app/api/admin/customers/[id]/points/route.ts`
- Create: `src/app/api/admin/customers/[id]/tickets/route.ts`
- Create: `src/app/api/member/points/route.ts`
- Create: `src/app/api/member/tickets/route.ts`
- Create: `src/app/api/member/profile/route.ts`
- Modify: `src/app/api/admin/site-settings/route.ts`
- Modify: `src/app/api/theme/route.ts`

- [ ] **Step 1: Add rewardPointsOnComplete to SiteSettings**

In `prisma/schema.prisma`, add before `@@map("site_settings")`:
```prisma
  rewardPointsOnComplete Int @default(0)
```

Run:
```bash
cd /Users/luke/playwright/line-booking && npx prisma db push --accept-data-loss && npx prisma generate
```

- [ ] **Step 2: Create admin points API**

Create `src/app/api/admin/customers/[id]/points/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id }, select: { points: true } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const transactions = await prisma.pointTransaction.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ balance: customer.points, transactions });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { amount, reason, notes } = body;

  if (!amount || typeof amount !== "number") {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (customer.points + amount < 0) {
    return NextResponse.json({ error: "點數不足" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.customer.update({ where: { id }, data: { points: { increment: amount } } }),
    prisma.pointTransaction.create({
      data: { customerId: id, amount, reason: reason || "admin_adjust", notes: notes || null },
    }),
  ]);

  const updated = await prisma.customer.findUnique({ where: { id }, select: { points: true } });
  return NextResponse.json({ balance: updated!.points });
}
```

- [ ] **Step 3: Create admin tickets API**

Create `src/app/api/admin/customers/[id]/tickets/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const tickets = await prisma.customerTicket.findMany({
    where: { customerId: id },
    include: { service: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { serviceId, total, expiresAt, notes } = body;

  if (!serviceId || !total || total < 1) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const ticket = await prisma.customerTicket.create({
    data: {
      customerId: id,
      serviceId,
      total,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes || null,
    },
    include: { service: { select: { id: true, name: true } } },
  });
  return NextResponse.json(ticket, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ticketId = req.nextUrl.searchParams.get("ticketId");
  if (!ticketId) return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });

  await prisma.customerTicket.delete({ where: { id: ticketId } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Create member points API**

Create `src/app/api/member/points/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) return NextResponse.json({ error: "Missing lineUserId" }, { status: 400 });

  const customer = await prisma.customer.findUnique({
    where: { lineUserId },
    select: { id: true, points: true },
  });
  if (!customer) return NextResponse.json({ balance: 0, transactions: [] });

  const transactions = await prisma.pointTransaction.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ balance: customer.points, transactions });
}
```

- [ ] **Step 5: Create member tickets API**

Create `src/app/api/member/tickets/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) return NextResponse.json({ error: "Missing lineUserId" }, { status: 400 });

  const customer = await prisma.customer.findUnique({
    where: { lineUserId },
    select: { id: true },
  });
  if (!customer) return NextResponse.json([]);

  const tickets = await prisma.customerTicket.findMany({
    where: { customerId: customer.id },
    include: { service: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tickets);
}
```

- [ ] **Step 6: Create member profile API**

Create `src/app/api/member/profile/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) return NextResponse.json({ error: "Missing lineUserId" }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { lineUserId } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    displayName: customer.displayName,
    email: customer.email,
    phone: customer.phone,
    pictureUrl: customer.pictureUrl,
    points: customer.points,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { lineUserId, displayName, email, phone } = body;
  if (!lineUserId) return NextResponse.json({ error: "Missing lineUserId" }, { status: 400 });

  const updated = await prisma.customer.update({
    where: { lineUserId },
    data: {
      displayName: displayName ?? undefined,
      email: email ?? undefined,
      phone: phone ?? undefined,
    },
  });
  return NextResponse.json(updated);
}
```

- [ ] **Step 7: Update site-settings API for rewardPointsOnComplete**

In `src/app/api/admin/site-settings/route.ts`, add to both GET response and PUT handler:
- GET: add `rewardPointsOnComplete: settings.rewardPointsOnComplete`
- PUT: add `if (typeof body.rewardPointsOnComplete === "number") data.rewardPointsOnComplete = body.rewardPointsOnComplete;`

In `src/app/api/theme/route.ts`, add `rewardPointsOnComplete: settings.rewardPointsOnComplete` to response.

- [ ] **Step 8: Build and commit**

```bash
npx next build 2>&1 | tail -5
git add -A && git commit -m "feat: add points/tickets APIs + reward settings"
```

---

### Task 2: Admin UI — Service Pricing + Customer Points/Tickets Management

**Files:**
- Modify: `src/components/admin/service-form.tsx` (add pricing fields)
- Modify: `src/app/api/admin/services/route.ts` (include pricing in POST/PUT)
- Modify: `src/app/(admin)/customers/page.tsx` (add points/tickets to edit modal)
- Modify: `src/app/(admin)/system/page.tsx` (add reward points setting)

- [ ] **Step 1: Add pricing UI to service form**

In `src/components/admin/service-form.tsx`:
- Add state: `price`, `acceptTicket`, `acceptPoints`, `pointsPerUnit`
- Add to submit body
- Add a "定價與支付" grouped section (border + rounded-xl, same pattern as "人員指派" section) after the admin booking notification section, containing:
  - Price number input (label: "服務定價（元）", 0=免費)
  - When price > 0: show toggles for acceptTicket and acceptPoints
  - When acceptPoints: show pointsPerUnit input

- [ ] **Step 2: Update services API for pricing fields**

In `src/app/api/admin/services/route.ts`, add to both POST and PUT:
```typescript
price: body.price ?? 0,
acceptTicket: body.acceptTicket ?? false,
acceptPoints: body.acceptPoints ?? false,
pointsPerUnit: body.pointsPerUnit ?? 1,
```

- [ ] **Step 3: Add points/tickets management to customer edit modal**

In `src/app/(admin)/customers/page.tsx`, expand the edit modal to add 3 new sections after the existing notes field:

**Points section:**
- Show current balance
- Number input + reason select (購買儲值/手動調整/活動獎勵) + notes input
- "加點" / "扣點" buttons
- Transaction history list (last 20, scrollable)

**Tickets section:**
- Current tickets list with service name, remaining/total, expiry
- "新增票券" form: service dropdown, quantity, expiry date (optional)
- Delete button for each ticket

Load points and tickets data when edit modal opens via the new APIs.

- [ ] **Step 4: Add points balance to customer list table**

In customer list table, add a "點數" column showing `customer.points` (the API already returns this from the Customer model).

- [ ] **Step 5: Add reward points setting to system page**

In `src/app/(admin)/system/page.tsx`, add a new section "點數回饋" after the provider avatar section:
- Number input: "預約完成回饋點數" (default 0, 0=不回饋)
- Include in save body as `rewardPointsOnComplete`

- [ ] **Step 6: Build and commit**

```bash
npx next build 2>&1 | tail -5
git add -A && git commit -m "feat: admin UI for pricing, points, and tickets management"
```

---

### Task 3: LIFF Member Area — Tabs with Points, Tickets, Profile

**Files:**
- Modify: `src/app/(liff)/member/page.tsx` (rewrite with tabs)

- [ ] **Step 1: Rewrite member page with 4 tabs**

Rewrite `src/app/(liff)/member/page.tsx` to have:

**Top card:** User avatar, name, points balance (large), ticket count badge

**Tab bar:** 我的預約 | 點數 | 票券 | 個人資料

**Tab 1 — 我的預約:** Keep existing booking list (upcoming + past, cancel + reschedule)

**Tab 2 — 點數:**
- Balance display (large number)
- Transaction list: each row shows date, reason label (購買/預約扣點/退點/獎勵), amount (+/- colored), running context in notes

**Tab 3 — 票券:**
- Ticket cards: service name, remaining/total as progress bar, expiry date
- Active tickets on top, expired/used-up tickets grayed out below

**Tab 4 — 個人資料:**
- Editable fields: displayName, email, phone
- Save button → PUT `/api/member/profile`

Use CSS variable styling consistent with existing LIFF pages. Tab bar: horizontal scroll on mobile, active tab has blue underline.

- [ ] **Step 2: Build and commit**

```bash
npx next build 2>&1 | tail -5
git add -A && git commit -m "feat: LIFF member area with points, tickets, and profile tabs"
```

---

### Task 4: Booking Payment Flow

**Files:**
- Modify: `src/app/(liff)/booking/page.tsx` (add payment step)
- Create: `src/components/booking/payment-select.tsx`
- Modify: `src/app/api/booking/route.ts` (handle payment logic)
- Modify: `src/app/api/services/route.ts` (include pricing fields)

- [ ] **Step 1: Update public services API**

In `src/app/api/services/route.ts`, add to select:
```typescript
price: true, acceptTicket: true, acceptPoints: true, pointsPerUnit: true,
```

- [ ] **Step 2: Create PaymentSelect component**

Create `src/components/booking/payment-select.tsx`:

Props: `{ service, lineUserId, onSelect }` where onSelect returns `{ method: "free"|"ticket"|"points"|"cash", ticketId?, pointsUsed? }`

Logic:
- If `service.price === 0`: auto-select "free", skip UI
- Fetch user's tickets (`/api/member/tickets?lineUserId=xxx`) and points (`/api/member/points?lineUserId=xxx`)
- Show available options:
  - Ticket card (if acceptTicket && has valid ticket for this service)
  - Points slider/input (if acceptPoints && has points) — shows "使用 X 點抵扣 Y 元，剩餘 Z 元線下付款"
  - Cash card (always) — "全額線下付款 {price} 元"
- "下一步" button

- [ ] **Step 3: Integrate payment step into booking flow**

In `src/app/(liff)/booking/page.tsx`:
- Add Service type fields: `price`, `acceptTicket`, `acceptPoints`, `pointsPerUnit`
- Add state: `paymentMethod`, `paymentTicketId`, `paymentPointsUsed`
- After step 4 (form) and before step 5 (confirm):
  - If `selectedService.price > 0`: show PaymentSelect as a new step
  - If `selectedService.price === 0`: skip, auto-set method="free"
- Update step indicator to include "付款" when applicable (add to skippedSteps when free)
- Pass payment info to confirm page and to the booking API

- [ ] **Step 4: Update booking API for payment processing**

In `src/app/api/booking/route.ts`, after creating the booking:

```typescript
// Process payment
const paidWith = body.paidWith || null;
const ticketId = body.ticketId || null;
const pointsUsed = body.pointsUsed || 0;

if (paidWith === "ticket" && ticketId) {
  await prisma.customerTicket.update({
    where: { id: ticketId },
    data: { used: { increment: 1 } },
  });
}

if (paidWith === "points" && pointsUsed > 0) {
  const customer = await prisma.customer.findUnique({ where: { lineUserId } });
  if (!customer || customer.points < pointsUsed) {
    return NextResponse.json({ error: "點數不足" }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.customer.update({ where: { lineUserId }, data: { points: { decrement: pointsUsed } } }),
    prisma.pointTransaction.create({
      data: { customerId: customer.id, amount: -pointsUsed, reason: "booking", bookingId: booking.id },
    }),
  ]);
}

// Update booking with payment info
await prisma.booking.update({
  where: { id: booking.id },
  data: { paidWith, ticketId, pointsUsed },
});
```

- [ ] **Step 5: Build and commit**

```bash
npx next build 2>&1 | tail -5
git add -A && git commit -m "feat: booking payment flow with tickets and points"
```

---

### Task 5: Cancel Refund + Complete Reward

**Files:**
- Modify: `src/app/api/admin/bookings/[id]/route.ts` (refund on cancel, reward on complete)
- Modify: `src/app/api/member/bookings/[id]/route.ts` (refund on member cancel)

- [ ] **Step 1: Add refund logic to admin booking cancel (DELETE handler)**

In `src/app/api/admin/bookings/[id]/route.ts` DELETE handler, after updating status to "cancelled":

```typescript
// Refund payment
if (booking.paidWith === "ticket" && booking.ticketId) {
  await prisma.customerTicket.update({
    where: { id: booking.ticketId },
    data: { used: { decrement: 1 } },
  });
}
if (booking.paidWith === "points" && booking.pointsUsed > 0) {
  const customer = await prisma.customer.findUnique({ where: { lineUserId: booking.lineUserId } });
  if (customer) {
    await prisma.$transaction([
      prisma.customer.update({ where: { id: customer.id }, data: { points: { increment: booking.pointsUsed } } }),
      prisma.pointTransaction.create({
        data: { customerId: customer.id, amount: booking.pointsUsed, reason: "refund", bookingId: booking.id, notes: "預約取消退點" },
      }),
    ]);
  }
}
```

- [ ] **Step 2: Add refund logic to member booking cancel**

Same refund logic in `src/app/api/member/bookings/[id]/route.ts` DELETE handler.

- [ ] **Step 3: Add reward logic on booking complete**

In `src/app/api/admin/bookings/[id]/route.ts` PUT handler, when status changes to "completed":

```typescript
if (body.status === "completed" && booking.status !== "completed") {
  // Check reward points setting
  let settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  const rewardPoints = settings?.rewardPointsOnComplete || 0;
  if (rewardPoints > 0) {
    const customer = await prisma.customer.findUnique({ where: { lineUserId: booking.lineUserId } });
    if (customer) {
      await prisma.$transaction([
        prisma.customer.update({ where: { id: customer.id }, data: { points: { increment: rewardPoints } } }),
        prisma.pointTransaction.create({
          data: { customerId: customer.id, amount: rewardPoints, reason: "reward", bookingId: booking.id, notes: "預約完成回饋" },
        }),
      ]);
    }
  }
}
```

- [ ] **Step 4: Build and commit**

```bash
npx next build 2>&1 | tail -5
git add -A && git commit -m "feat: cancel refund + completion reward points"
```

---

### Task 6: Final Integration + Display Payment Info

**Files:**
- Modify: `src/app/(admin)/bookings/page.tsx` (show payment info in table)
- Modify: `src/components/booking/booking-confirm.tsx` (show payment summary)

- [ ] **Step 1: Show payment info in admin bookings table**

In `src/app/(admin)/bookings/page.tsx`:
- Add Booking type fields: `paidWith`, `pointsUsed`
- In the table, add payment info to the notes/status area or a new column:
  - paidWith="ticket" → show "票券" badge
  - paidWith="points" → show "點數 {pointsUsed}" badge
  - null → show "線下" or "-"

- [ ] **Step 2: Show payment summary in LIFF confirm page**

In `src/components/booking/booking-confirm.tsx`:
- Accept optional `paymentSummary` prop: `{ method, pointsUsed?, remaining?, serviceName? }`
- Display a payment summary row below the existing info rows when present

- [ ] **Step 3: Build, test end-to-end, and commit**

```bash
npx next build 2>&1 | tail -5
git add -A && git commit -m "feat: display payment info in admin and confirm page"
```

Push everything:
```bash
git push origin main
```
