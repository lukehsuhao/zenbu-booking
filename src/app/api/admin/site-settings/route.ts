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
    showStoreFront: settings.showStoreFront,
    storeName: settings.storeName,
    storeDescription: settings.storeDescription,
    storeImageUrl: settings.storeImageUrl,
    storeMediaType: settings.storeMediaType,
    storeYoutubeUrl: settings.storeYoutubeUrl,
    rewardPointsOnComplete: settings.rewardPointsOnComplete,
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
  if (typeof body.showStoreFront === "boolean") {
    data.showStoreFront = body.showStoreFront;
  }
  if (typeof body.storeName === "string") {
    data.storeName = body.storeName;
  }
  if (typeof body.storeDescription === "string") {
    data.storeDescription = body.storeDescription;
  }
  if (typeof body.storeImageUrl === "string" || body.storeImageUrl === null) {
    data.storeImageUrl = body.storeImageUrl;
  }
  if (typeof body.storeMediaType === "string") {
    data.storeMediaType = body.storeMediaType;
  }
  if (typeof body.storeYoutubeUrl === "string" || body.storeYoutubeUrl === null) {
    data.storeYoutubeUrl = body.storeYoutubeUrl;
  }
  if (typeof body.rewardPointsOnComplete === "number") {
    data.rewardPointsOnComplete = body.rewardPointsOnComplete;
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
    showStoreFront: settings.showStoreFront,
    storeName: settings.storeName,
    storeDescription: settings.storeDescription,
    storeImageUrl: settings.storeImageUrl,
    storeMediaType: settings.storeMediaType,
    storeYoutubeUrl: settings.storeYoutubeUrl,
    rewardPointsOnComplete: settings.rewardPointsOnComplete,
  });
}
