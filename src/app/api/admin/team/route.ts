import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.teamMember.findMany({
    select: { id: true, name: true, email: true, lineUserId: true, lineLinkCode: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, email, password } = body;
  if (!name || !email || !password) return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });

  const existing = await prisma.teamMember.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "此 Email 已被使用" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const member = await prisma.teamMember.create({
    data: { name, email, password: hashed },
    select: { id: true, name: true, email: true, lineUserId: true, lineLinkCode: true },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Disconnect LINE
  if (body.action === "disconnect" && body.id) {
    await prisma.teamMember.update({
      where: { id: body.id },
      data: { lineUserId: null, lineLinkCode: null },
    });
    return NextResponse.json({ success: true });
  }

  // Generate link code for a specific member
  if (body.action === "generateLinkCode" && body.id) {
    // Strong password-like code: 5 groups of 4 uppercase alphanumerics
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // skip confusing chars I, O, 0, 1
    const bytes = crypto.randomBytes(20);
    const parts: string[] = [];
    for (let g = 0; g < 5; g++) {
      let part = "";
      for (let i = 0; i < 4; i++) part += chars[bytes[g * 4 + i] % chars.length];
      parts.push(part);
    }
    const code = `LINK-${parts.join("-")}`;
    await prisma.teamMember.update({
      where: { id: body.id },
      data: { lineLinkCode: code },
    });
    return NextResponse.json({ code });
  }

  // Update member profile (name, email, password)
  if (body.action === "update" && body.id) {
    const { name, email, password } = body;
    if (!name || !email) {
      return NextResponse.json({ error: "姓名和 Email 為必填" }, { status: 400 });
    }
    // Check email uniqueness if changed
    const existing = await prisma.teamMember.findUnique({ where: { email } });
    if (existing && existing.id !== body.id) {
      return NextResponse.json({ error: "此 Email 已被使用" }, { status: 409 });
    }
    const updateData: Record<string, unknown> = { name, email };
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    await prisma.teamMember.update({
      where: { id: body.id },
      data: updateData,
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id?: string; role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  if (id === user.id) return NextResponse.json({ error: "不能刪除自己" }, { status: 400 });

  await prisma.teamMember.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
