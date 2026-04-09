import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COLOR_PRESETS: Record<string, { primary: string; accent: string }> = {
  blue: { primary: "#2563EB", accent: "#06B6D4" },
  teal: { primary: "#0D9488", accent: "#6366F1" },
  purple: { primary: "#7C3AED", accent: "#EC4899" },
};

export async function GET() {
  let settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: { id: "default" } });
  }

  const colors = settings.colorTheme === "custom"
    ? { primary: settings.customPrimary, accent: settings.customAccent }
    : COLOR_PRESETS[settings.colorTheme] || COLOR_PRESETS.blue;

  return NextResponse.json({
    confirmationFields: JSON.parse(settings.confirmationFields),
    colors,
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
