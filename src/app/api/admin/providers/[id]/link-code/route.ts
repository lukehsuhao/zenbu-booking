import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as { role?: string; providerId?: string };

  // Provider can only generate for themselves, admin for anyone
  if (user.role !== "admin" && user.providerId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate a unique 6-char link code
  const code = `LINK-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  await prisma.provider.update({
    where: { id },
    data: { lineLinkCode: code },
  });

  return NextResponse.json({ code });
}
