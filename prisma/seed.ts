import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.teamMember.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin",
      password: hashedPassword,
    },
  });
  console.log("Seed complete: admin@example.com / admin123");

  await prisma.reminderRule.createMany({
    data: [
      { type: "line", minutesBefore: 1440 },
      { type: "line", minutesBefore: 60 },
      { type: "email", minutesBefore: 1440 },
      { type: "email", minutesBefore: 60 },
    ],
    skipDuplicates: true,
  });
  console.log("Seed complete: default reminder rules");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
