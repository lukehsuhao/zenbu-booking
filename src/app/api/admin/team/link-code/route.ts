import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id?: string; role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Find the TeamMember for the current session user
  const member = await prisma.teamMember.findUnique({ where: { id: user.id! } });
  if (!member) return NextResponse.json({ error: "TeamMember not found" }, { status: 404 });

  // Generate a unique 6-char link code
  const code = `LINK-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  await prisma.teamMember.update({
    where: { id: member.id },
    data: { lineLinkCode: code },
  });

  return NextResponse.json({ code });
}
