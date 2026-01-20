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

  console.log("📦 Creating branches...");

  // Create branches (Ghana-based)
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        name: "Accra Central",
        code: "AC-001",
        address: "15 Oxford Street, Osu",
        city: "Accra",
        state: "Greater Accra",
        country: "GH",
        currency: "GHS",
        phone: "+233 30 277 0001",
        email: "accra@dinelytix.com",
        timezone: "Africa/Accra",
        isActive: true,
        openingDate: new Date("2023-01-15"),
      },
    }),
    prisma.branch.create({
      data: {
        name: "East Legon",
        code: "EL-002",
        address: "A&C Mall, East Legon",
        city: "Accra",
        state: "Greater Accra",
        country: "GH",
        currency: "GHS",
        phone: "+233 30 277 0002",
        email: "eastlegon@dinelytix.com",
        timezone: "Africa/Accra",
        isActive: true,
        openingDate: new Date("2023-03-20"),
      },
    }),
    prisma.branch.create({
      data: {
        name: "Kumasi City Mall",
        code: "KM-003",
        address: "Kumasi City Mall, Asokwa",
        city: "Kumasi",
        state: "Ashanti",
        country: "GH",
        currency: "GHS",
        phone: "+233 32 202 0003",
        email: "kumasi@dinelytix.com",
        timezone: "Africa/Accra",
        isActive: true,
        openingDate: new Date("2023-06-01"),
      },
    }),
    prisma.branch.create({
      data: {
        name: "Tema Harbour",
        code: "TH-004",
        address: "Community 1, Tema",
        city: "Tema",
        state: "Greater Accra",
        country: "GH",
        currency: "GHS",
        phone: "+233 30 320 0004",
        email: "tema@dinelytix.com",
        timezone: "Africa/Accra",
        isActive: true,
        openingDate: new Date("2023-09-15"),
      },
    }),
    prisma.branch.create({
      data: {
        name: "Takoradi Beach",
        code: "TB-005",
        address: "Beach Road, Takoradi",
        city: "Takoradi",
        state: "Western",
        country: "GH",
        currency: "GHS",
        phone: "+233 31 202 0005",
        email: "takoradi@dinelytix.com",
        timezone: "Africa/Accra",
        isActive: true,
        openingDate: new Date("2024-01-10"),
      },
    }),
  ]);

  console.log("👤 Creating users...");

  // Create users with hashed passwords
  const hashedPassword = await bcrypt.hash("password123", 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alex Johnson",
        email: "alex@dinelytix.com",
        emailVerified: true,
        role: "CEO",
        isActive: true,
        accounts: {
          create: {
            accountId: "alex-account",
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Sarah Miller",
        email: "sarah@dinelytix.com",
        emailVerified: true,
        role: "SENIOR_MANAGEMENT",
        isActive: true,
        accounts: {
          create: {
            accountId: "sarah-account",
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Mike Wilson",
        email: "mike@dinelytix.com",
        emailVerified: true,
        role: "BRANCH_MANAGER",
        branchId: branches[0].id,
        isActive: true,
        accounts: {
          create: {
            accountId: "mike-account",
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Emily Davis",
        email: "emily@dinelytix.com",
        emailVerified: true,
        role: "FINANCE_OPS",
        isActive: true,
        accounts: {
          create: {
            accountId: "emily-account",
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    }),
  ]);

  console.log("🍽️ Creating menu items...");

  // Create menu items
  const menuItems = await Promise.all([
    prisma.menuItem.create({
      data: {
        name: "Grilled Salmon",
        sku: "MENU-001",
        category: "Main Course",
        price: 25.0,
        cost: 12.0,
        description: "Fresh Atlantic salmon with herbs",
        isActive: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: "Classic Burger",
        sku: "MENU-002",
        category: "Main Course",
        price: 15.0,
        cost: 6.0,
        description: "Angus beef burger with all the fixings",
        isActive: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: "Caesar Salad",
        sku: "MENU-003",
        category: "Salads",
        price: 14.0,
        cost: 4.0,
        description: "Fresh romaine with house-made dressing",
        isActive: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: "Margherita Pizza",
        sku: "MENU-004",
        category: "Pizza",
        price: 18.0,
        cost: 5.5,
        description: "Classic Italian pizza with fresh mozzarella",
        isActive: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: "Pasta Carbonara",
        sku: "MENU-005",
        category: "Pasta",
        price: 18.0,
        cost: 5.0,
        description: "Creamy pasta with pancetta and parmesan",
        isActive: true,
      },
    }),
  ]);

  console.log("👨‍🍳 Creating staff...");

  // Create staff for each branch
  for (const branch of branches) {
    await prisma.staff.createMany({
      data: [
        {
          employeeId: `EMP-${branch.code}-001`,
          firstName: "John",
          lastName: "Smith",
          email: `john.smith.${branch.code}@dinelytix.com`,
          role: "MANAGER",
          hourlyRate: 25.0,
          hireDate: new Date("2023-01-15"),
          branchId: branch.id,
          isActive: true,
          dutyStatus: "ON_DUTY",
        },
        {
          employeeId: `EMP-${branch.code}-002`,
          firstName: "Jane",
          lastName: "Doe",
          email: `jane.doe.${branch.code}@dinelytix.com`,
          role: "KITCHEN",
          hourlyRate: 18.0,
          hireDate: new Date("2023-02-01"),
          branchId: branch.id,
          isActive: true,
          dutyStatus: "ON_DUTY",
        },
        {
          employeeId: `EMP-${branch.code}-003`,
          firstName: "Bob",
          lastName: "Johnson",
          email: `bob.johnson.${branch.code}@dinelytix.com`,
          role: "SERVICE",
          hourlyRate: 15.0,
          hireDate: new Date("2023-03-01"),
          branchId: branch.id,
          isActive: true,
          dutyStatus: "ON_DUTY",
        },
        {
          employeeId: `EMP-${branch.code}-004`,
          firstName: "Alice",
          lastName: "Brown",
          email: `alice.brown.${branch.code}@dinelytix.com`,
          role: "CASHIER",
          hourlyRate: 14.0,
          hireDate: new Date("2023-04-01"),
          branchId: branch.id,
          isActive: true,
          dutyStatus: "OFF_DUTY",
        },
      ],
    });
  }

  console.log("📦 Creating suppliers...");

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "Fresh Foods Inc",
        code: "SUP-001",
        contactName: "Tom Wilson",
        email: "orders@freshfoods.com",
        phone: "+1 (555) 200-0001",
        address: "100 Supplier Lane, NY",
        isActive: true,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Premium Meats Co",
        code: "SUP-002",
        contactName: "Lisa Anderson",
        email: "orders@premiummeats.com",
        phone: "+1 (555) 200-0002",
        address: "200 Meat Street, NJ",
        isActive: true,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Beverage Distributors",
        code: "SUP-003",
        contactName: "Mark Taylor",
        email: "orders@bevdist.com",
        phone: "+1 (555) 200-0003",
        address: "300 Drink Avenue, NY",
        isActive: true,
      },
    }),
  ]);

  console.log("📊 Creating inventory items...");

  // Create inventory items for each branch
  for (const branch of branches) {
    await prisma.inventoryItem.createMany({
      data: [
        {
          name: "Chicken Breast",
          sku: `INV-CHKN-${branch.code}`,
          category: "FOOD",
          unit: "KG",
          unitCost: 12.5,
          currentStock: Math.random() * 50 + 5,
          minStock: 20,
          maxStock: 100,
          reorderPoint: 25,
          branchId: branch.id,
          isActive: true,
        },
        {
          name: "Olive Oil",
          sku: `INV-OIL-${branch.code}`,
          category: "FOOD",
          unit: "LITER",
          unitCost: 18.0,
          currentStock: Math.random() * 30 + 5,
          minStock: 10,
          maxStock: 50,
          reorderPoint: 15,
          branchId: branch.id,
          isActive: true,
        },
        {
          name: "Coffee Beans",
          sku: `INV-COF-${branch.code}`,
          category: "BEVERAGE",
          unit: "KG",
          unitCost: 28.0,
          currentStock: Math.random() * 30 + 10,
          minStock: 15,
          maxStock: 40,
          reorderPoint: 20,
          branchId: branch.id,
          isActive: true,
        },
        {
          name: "Salmon Fillet",
          sku: `INV-SAL-${branch.code}`,
          category: "FOOD",
          unit: "KG",
          unitCost: 32.0,
          currentStock: Math.random() * 30 + 10,
          minStock: 10,
          maxStock: 50,
          reorderPoint: 15,
          branchId: branch.id,
          isActive: true,
        },
      ],
    });
  }

  console.log("🎯 Creating targets...");

  // Create targets for each branch
  const currentMonth = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  for (const branch of branches) {
    await prisma.target.create({
      data: {
        branchId: branch.id,
        targetType: "REVENUE",
        period: "MONTHLY",
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
        targetValue: 100000 + Math.random() * 50000,
        currentValue: 80000 + Math.random() * 40000,
        isActive: true,
      },
    });
  }

  console.log("🚨 Creating sample alerts...");

  // Create sample alerts
  await prisma.alert.createMany({
    data: [
      {
        branchId: branches[0].id,
        type: "LOW_STOCK",
        severity: "CRITICAL",
        status: "ACTIVE",
        title: "Low Stock Alert",
        message: "Chicken breast is below minimum threshold. Only 5kg remaining.",
        triggeredAt: new Date(),
      },
      {
        branchId: branches[3].id,
        type: "SALES_DROP",
        severity: "HIGH",
        status: "ACTIVE",
        title: "Sales Drop Detected",
        message: "Airport branch revenue is down 18% compared to last week average.",
        triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
      {
        branchId: branches[3].id,
        type: "WASTE_SPIKE",
        severity: "MEDIUM",
        status: "ACTIVE",
        title: "Waste Spike",
        message: "Waste at Airport branch is 45% higher than average.",
        triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      },
      {
        branchId: branches[2].id,
        type: "EXCEPTIONAL_GROWTH",
        severity: "LOW",
        status: "ACTIVE",
        title: "Exceptional Performance",
        message: "Mall Branch exceeded monthly target by 12%!",
        triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
      },
    ],
  });

  console.log("✅ Seed completed successfully!");
  console.log("\n📋 Test Accounts:");
  console.log("   CEO: alex@dinelytix.com / password123");
  console.log("   Senior Management: sarah@dinelytix.com / password123");
  console.log("   Branch Manager: mike@dinelytix.com / password123");
  console.log("   Finance/Ops: emily@dinelytix.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
