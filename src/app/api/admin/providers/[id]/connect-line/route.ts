import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { lineUserId } = await req.json();

  if (!lineUserId || typeof lineUserId !== "string") {
    return NextResponse.json({ error: "lineUserId is required" }, { status: 400 });
  }

  // Verify the provider exists
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  // Update the provider's lineUserId
  await prisma.provider.update({
    where: { id },
    data: { lineUserId },
  });

  return NextResponse.json({ success: true });
}
