import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOrCreateSettings() {
  let settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: { id: "default" } });
  }
  return settings;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await getOrCreateSettings();
  return NextResponse.json({
    confirmationFields: JSON.parse(settings.confirmationFields),
    colorTheme: settings.colorTheme,
    customPrimary: settings.customPrimary,
    customAccent: settings.customAccent,
    bookingWindowDays: settings.bookingWindowDays,
    showProviderAvatar: settings.showProviderAvatar,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.confirmationFields) {
    data.confirmationFields = JSON.stringify(body.confirmationFields);
  }
  if (body.colorTheme) {
    data.colorTheme = body.colorTheme;
  }
  if (body.customPrimary) {
    data.customPrimary = body.customPrimary;
  }
  if (body.customAccent) {
    data.customAccent = body.customAccent;
  }
  if (typeof body.bookingWindowDays === "number") {
    data.bookingWindowDays = body.bookingWindowDays;
  }
  if (typeof body.showProviderAvatar === "boolean") {
    data.showProviderAvatar = body.showProviderAvatar;
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  return NextResponse.json({
    confirmationFields: JSON.parse(settings.confirmationFields),
    colorTheme: settings.colorTheme,
    customPrimary: settings.customPrimary,
    customAccent: settings.customAccent,
    bookingWindowDays: settings.bookingWindowDays,
    showProviderAvatar: settings.showProviderAvatar,
  });
}
