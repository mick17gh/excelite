import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.target.deleteMany();
  await prisma.transferLog.deleteMany();
  await prisma.wasteLog.deleteMany();
  await prisma.outboundStock.deleteMany();
  await prisma.inboundStock.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.staffSchedule.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  console.log("� Creating user...");

  // Create single user with specified credentials
  const hashedPassword = await bcrypt.hash("pass1234", 10);

  await prisma.user.create({
    data: {
      name: "Mike",
      email: "mike17gh@gmail.com",
      emailVerified: true,
      role: "CEO",
      isActive: true,
      accounts: {
        create: {
          accountId: "mike-account",
          providerId: "credential",
          password: hashedPassword,
        },
      },
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log("\n📋 Test Account:");
  console.log("   Email: mike17gh@gmail.com");
  console.log("   Password: pass1234");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
