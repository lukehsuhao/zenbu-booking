import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) {
    return NextResponse.json({ error: "lineUserId is required" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { lineUserId },
    select: {
      displayName: true,
      email: true,
      phone: true,
      pictureUrl: true,
      points: true,
      isBlocked: true,
    },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json(customer);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { lineUserId, displayName, email, phone } = body;

  if (!lineUserId) {
    return NextResponse.json({ error: "lineUserId is required" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (typeof displayName === "string") data.displayName = displayName;
  if (typeof email === "string") data.email = email;
  if (typeof phone === "string") data.phone = phone;

  const updated = await prisma.customer.update({
    where: { lineUserId },
    data,
    select: {
      displayName: true,
      email: true,
      phone: true,
      pictureUrl: true,
      points: true,
    },
  });

  return NextResponse.json(updated);
}
