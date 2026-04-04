import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("avatar") as File;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(process.cwd(), "public", "avatars", filename);

  await writeFile(filePath, buffer);
  const avatarUrl = `/avatars/${filename}`;

  await prisma.provider.update({
    where: { id },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}
