"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("../lib/generated/prisma/client");
var bcryptjs_1 = require("bcryptjs");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var branches, hashedPassword, users, menuItems, _i, branches_1, branch, suppliers, _a, branches_2, branch, currentMonth, startOfMonth, endOfMonth, _b, branches_3, branch;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("🌱 Starting seed...");
                    // Clear existing data
                    return [4 /*yield*/, prisma.auditLog.deleteMany()];
                case 1:
                    // Clear existing data
                    _c.sent();
                    return [4 /*yield*/, prisma.alert.deleteMany()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, prisma.target.deleteMany()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, prisma.transferLog.deleteMany()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, prisma.wasteLog.deleteMany()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, prisma.outboundStock.deleteMany()];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, prisma.inboundStock.deleteMany()];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, prisma.inventoryItem.deleteMany()];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, prisma.supplier.deleteMany()];
                case 9:
                    _c.sent();
                    return [4 /*yield*/, prisma.saleItem.deleteMany()];
                case 10:
                    _c.sent();
                    return [4 /*yield*/, prisma.sale.deleteMany()];
                case 11:
                    _c.sent();
                    return [4 /*yield*/, prisma.transaction.deleteMany()];
                case 12:
                    _c.sent();
                    return [4 /*yield*/, prisma.staffSchedule.deleteMany()];
                case 13:
                    _c.sent();
                    return [4 /*yield*/, prisma.staff.deleteMany()];
                case 14:
                    _c.sent();
                    return [4 /*yield*/, prisma.menuItem.deleteMany()];
                case 15:
                    _c.sent();
                    return [4 /*yield*/, prisma.session.deleteMany()];
                case 16:
                    _c.sent();
                    return [4 /*yield*/, prisma.account.deleteMany()];
                case 17:
                    _c.sent();
                    return [4 /*yield*/, prisma.user.deleteMany()];
                case 18:
                    _c.sent();
                    return [4 /*yield*/, prisma.branch.deleteMany()];
                case 19:
                    _c.sent();
                    console.log("📦 Creating branches...");
                    return [4 /*yield*/, Promise.all([
                            prisma.branch.create({
                                data: {
                                    name: "Downtown",
                                    code: "DT-001",
                                    address: "123 Main Street",
                                    city: "New York",
                                    state: "NY",
                                    country: "US",
                                    phone: "+1 (555) 100-0001",
                                    email: "downtown@dinelytix.com",
                                    timezone: "America/New_York",
                                    isActive: true,
                                    openingDate: new Date("2023-01-15"),
                                },
                            }),
                            prisma.branch.create({
                                data: {
                                    name: "Uptown",
                                    code: "UT-002",
                                    address: "456 Park Avenue",
                                    city: "New York",
                                    state: "NY",
                                    country: "US",
                                    phone: "+1 (555) 100-0002",
                                    email: "uptown@dinelytix.com",
                                    timezone: "America/New_York",
                                    isActive: true,
                                    openingDate: new Date("2023-03-20"),
                                },
                            }),
                            prisma.branch.create({
                                data: {
                                    name: "Mall Branch",
                                    code: "ML-003",
                                    address: "789 Shopping Center",
                                    city: "New York",
                                    state: "NY",
                                    country: "US",
                                    phone: "+1 (555) 100-0003",
                                    email: "mall@dinelytix.com",
                                    timezone: "America/New_York",
                                    isActive: true,
                                    openingDate: new Date("2023-06-01"),
                                },
                            }),
                            prisma.branch.create({
                                data: {
                                    name: "Airport",
                                    code: "AP-004",
                                    address: "Terminal 4, JFK Airport",
                                    city: "New York",
                                    state: "NY",
                                    country: "US",
                                    phone: "+1 (555) 100-0004",
                                    email: "airport@dinelytix.com",
                                    timezone: "America/New_York",
                                    isActive: true,
                                    openingDate: new Date("2023-09-15"),
                                },
                            }),
                            prisma.branch.create({
                                data: {
                                    name: "Harbor View",
                                    code: "HV-005",
                                    address: "321 Waterfront Drive",
                                    city: "New York",
                                    state: "NY",
                                    country: "US",
                                    phone: "+1 (555) 100-0005",
                                    email: "harbor@dinelytix.com",
                                    timezone: "America/New_York",
                                    isActive: true,
                                    openingDate: new Date("2024-01-10"),
                                },
                            }),
                        ])];
                case 20:
                    branches = _c.sent();
                    console.log("👤 Creating users...");
                    return [4 /*yield*/, bcryptjs_1.default.hash("password123", 10)];
                case 21:
                    hashedPassword = _c.sent();
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 22:
                    users = _c.sent();
                    console.log("🍽️ Creating menu items...");
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 23:
                    menuItems = _c.sent();
                    console.log("👨‍🍳 Creating staff...");
                    _i = 0, branches_1 = branches;
                    _c.label = 24;
                case 24:
                    if (!(_i < branches_1.length)) return [3 /*break*/, 27];
                    branch = branches_1[_i];
                    return [4 /*yield*/, prisma.staff.createMany({
                            data: [
                                {
                                    employeeId: "EMP-".concat(branch.code, "-001"),
                                    firstName: "John",
                                    lastName: "Smith",
                                    email: "john.smith.".concat(branch.code, "@dinelytix.com"),
                                    role: "MANAGER",
                                    hourlyRate: 25.0,
                                    hireDate: new Date("2023-01-15"),
                                    branchId: branch.id,
                                    isActive: true,
                                    dutyStatus: "ON_DUTY",
                                },
                                {
                                    employeeId: "EMP-".concat(branch.code, "-002"),
                                    firstName: "Jane",
                                    lastName: "Doe",
                                    email: "jane.doe.".concat(branch.code, "@dinelytix.com"),
                                    role: "KITCHEN",
                                    hourlyRate: 18.0,
                                    hireDate: new Date("2023-02-01"),
                                    branchId: branch.id,
                                    isActive: true,
                                    dutyStatus: "ON_DUTY",
                                },
                                {
                                    employeeId: "EMP-".concat(branch.code, "-003"),
                                    firstName: "Bob",
                                    lastName: "Johnson",
                                    email: "bob.johnson.".concat(branch.code, "@dinelytix.com"),
                                    role: "SERVICE",
                                    hourlyRate: 15.0,
                                    hireDate: new Date("2023-03-01"),
                                    branchId: branch.id,
                                    isActive: true,
                                    dutyStatus: "ON_DUTY",
                                },
                                {
                                    employeeId: "EMP-".concat(branch.code, "-004"),
                                    firstName: "Alice",
                                    lastName: "Brown",
                                    email: "alice.brown.".concat(branch.code, "@dinelytix.com"),
                                    role: "CASHIER",
                                    hourlyRate: 14.0,
                                    hireDate: new Date("2023-04-01"),
                                    branchId: branch.id,
                                    isActive: true,
                                    dutyStatus: "OFF_DUTY",
                                },
                            ],
                        })];
                case 25:
                    _c.sent();
                    _c.label = 26;
                case 26:
                    _i++;
                    return [3 /*break*/, 24];
                case 27:
                    console.log("📦 Creating suppliers...");
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 28:
                    suppliers = _c.sent();
                    console.log("📊 Creating inventory items...");
                    _a = 0, branches_2 = branches;
                    _c.label = 29;
                case 29:
                    if (!(_a < branches_2.length)) return [3 /*break*/, 32];
                    branch = branches_2[_a];
                    return [4 /*yield*/, prisma.inventoryItem.createMany({
                            data: [
                                {
                                    name: "Chicken Breast",
                                    sku: "INV-CHKN-".concat(branch.code),
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
                                    sku: "INV-OIL-".concat(branch.code),
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
                                    sku: "INV-COF-".concat(branch.code),
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
                                    sku: "INV-SAL-".concat(branch.code),
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
                        })];
                case 30:
                    _c.sent();
                    _c.label = 31;
                case 31:
                    _a++;
                    return [3 /*break*/, 29];
                case 32:
                    console.log("🎯 Creating targets...");
                    currentMonth = new Date();
                    startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                    endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                    _b = 0, branches_3 = branches;
                    _c.label = 33;
                case 33:
                    if (!(_b < branches_3.length)) return [3 /*break*/, 36];
                    branch = branches_3[_b];
                    return [4 /*yield*/, prisma.target.create({
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
                        })];
                case 34:
                    _c.sent();
                    _c.label = 35;
                case 35:
                    _b++;
                    return [3 /*break*/, 33];
                case 36:
                    console.log("🚨 Creating sample alerts...");
                    // Create sample alerts
                    return [4 /*yield*/, prisma.alert.createMany({
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
                        })];
                case 37:
                    // Create sample alerts
                    _c.sent();
                    console.log("✅ Seed completed successfully!");
                    console.log("\n📋 Test Accounts:");
                    console.log("   CEO: alex@dinelytix.com / password123");
                    console.log("   Senior Management: sarah@dinelytix.com / password123");
                    console.log("   Branch Manager: mike@dinelytix.com / password123");
                    console.log("   Finance/Ops: emily@dinelytix.com / password123");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error("❌ Seed failed:", e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
