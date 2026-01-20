import { subDays, format, startOfMonth, endOfMonth } from "date-fns";

export const branches = [
  { id: "br-001", name: "Accra Central", code: "AC-001", city: "Accra", currency: "GHS", isActive: true },
  { id: "br-002", name: "East Legon", code: "EL-002", city: "Accra", currency: "GHS", isActive: true },
  { id: "br-003", name: "Kumasi City Mall", code: "KM-003", city: "Kumasi", currency: "GHS", isActive: true },
  { id: "br-004", name: "Tema Harbour", code: "TH-004", city: "Tema", currency: "GHS", isActive: true },
  { id: "br-005", name: "Takoradi Beach", code: "TB-005", city: "Takoradi", currency: "GHS", isActive: true },
];

export const generateRevenueData = (days: number = 30) => {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const baseRevenue = 45000 + Math.random() * 20000;
    const weekendMultiplier = [0, 6].includes(date.getDay()) ? 1.3 : 1;
    data.push({
      date: format(date, "MMM dd"),
      revenue: Math.round(baseRevenue * weekendMultiplier),
      target: 50000,
    });
  }
  return data;
};

export const salesByChannel = [
  { channel: "Dine-in", revenue: 245000, percentage: 42 },
  { channel: "Delivery", revenue: 165000, percentage: 28 },
  { channel: "Takeout", revenue: 105000, percentage: 18 },
  { channel: "App", revenue: 70000, percentage: 12 },
];

export const salesByDaypart = [
  { daypart: "Breakfast", revenue: 85000, transactions: 1250 },
  { daypart: "Lunch", revenue: 195000, transactions: 2800 },
  { daypart: "Dinner", revenue: 225000, transactions: 2100 },
  { daypart: "Late Night", revenue: 80000, transactions: 850 },
];

export const branchPerformance = [
  {
    id: "br-001",
    name: "Accra Central",
    code: "AC-001",
    revenue: 125000,
    target: 120000,
    performance: 104.2,
    transactions: 1850,
    waste: 2100,
    status: "good" as const,
  },
  {
    id: "br-002",
    name: "East Legon",
    code: "EL-002",
    revenue: 98000,
    target: 100000,
    performance: 98.0,
    transactions: 1420,
    waste: 1850,
    status: "good" as const,
  },
  {
    id: "br-003",
    name: "Kumasi City Mall",
    code: "KM-003",
    revenue: 145000,
    target: 130000,
    performance: 111.5,
    transactions: 2100,
    waste: 2400,
    status: "good" as const,
  },
  {
    id: "br-004",
    name: "Tema Harbour",
    code: "TH-004",
    revenue: 72000,
    target: 90000,
    performance: 80.0,
    transactions: 980,
    waste: 3200,
    status: "critical" as const,
  },
  {
    id: "br-005",
    name: "Takoradi Beach",
    code: "TB-005",
    revenue: 88000,
    target: 95000,
    performance: 92.6,
    transactions: 1280,
    waste: 1650,
    status: "warning" as const,
  },
];

export const topMenuItems = [
  { name: "Grilled Salmon", quantity: 1250, revenue: 31250 },
  { name: "Classic Burger", quantity: 1820, revenue: 27300 },
  { name: "Caesar Salad", quantity: 1450, revenue: 20300 },
  { name: "Margherita Pizza", quantity: 980, revenue: 17640 },
  { name: "Pasta Carbonara", quantity: 850, revenue: 15300 },
];

export const worstMenuItems = [
  { name: "Vegan Wrap", quantity: 125, revenue: 1500 },
  { name: "Fruit Bowl", quantity: 180, revenue: 1440 },
  { name: "Soup of Day", quantity: 220, revenue: 1760 },
  { name: "Garden Salad", quantity: 280, revenue: 2240 },
  { name: "Quinoa Bowl", quantity: 310, revenue: 3100 },
];

export const activeAlerts = [
  {
    id: "alert-001",
    type: "LOW_STOCK",
    severity: "critical" as const,
    title: "Low Stock Alert",
    message: "Chicken breast is below minimum threshold at Accra Central branch. Only 5kg remaining.",
    branchName: "Accra Central",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "alert-002",
    type: "SALES_DROP",
    severity: "high" as const,
    title: "Sales Drop Detected",
    message: "Tema Harbour branch revenue is down 18% compared to last week average.",
    branchName: "Tema Harbour",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "alert-003",
    type: "WASTE_SPIKE",
    severity: "medium" as const,
    title: "Waste Spike",
    message: "Waste at Tema Harbour branch is 45% higher than average. Please investigate.",
    branchName: "Tema Harbour",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
  },
  {
    id: "alert-004",
    type: "EXCEPTIONAL_GROWTH",
    severity: "low" as const,
    title: "Exceptional Performance",
    message: "Kumasi City Mall exceeded monthly target by 12%!",
    branchName: "Kumasi City Mall",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
];

export const staffSummary = [
  {
    branchId: "br-001",
    branchName: "Accra Central",
    totalStaff: 25,
    onDuty: 12,
    required: 12,
    status: "adequate" as const,
  },
  {
    branchId: "br-002",
    branchName: "East Legon",
    totalStaff: 20,
    onDuty: 8,
    required: 10,
    status: "understaffed" as const,
  },
  {
    branchId: "br-003",
    branchName: "Kumasi City Mall",
    totalStaff: 30,
    onDuty: 18,
    required: 15,
    status: "overstaffed" as const,
  },
  {
    branchId: "br-004",
    branchName: "Tema Harbour",
    totalStaff: 22,
    onDuty: 10,
    required: 10,
    status: "adequate" as const,
  },
  {
    branchId: "br-005",
    branchName: "Takoradi Beach",
    totalStaff: 18,
    onDuty: 7,
    required: 9,
    status: "understaffed" as const,
  },
];

export const kpiData = {
  totalRevenue: 528000,
  revenueGrowth: 8.5,
  cogsPercentage: 32.4,
  profitMargin: 18.2,
  transactionCount: 7630,
  averageTicket: 69.2,
  wasteTotal: 11200,
  wasteChange: -5.2,
};

export const inventoryItems = [
  {
    id: "inv-001",
    name: "Chicken Breast",
    sku: "CHKN-001",
    category: "FOOD",
    unit: "KG",
    currentStock: 5,
    minStock: 20,
    maxStock: 100,
    unitCost: 12.5,
    branchId: "br-001",
    branchName: "Downtown",
    status: "critical" as const,
  },
  {
    id: "inv-002",
    name: "Olive Oil",
    sku: "OIL-001",
    category: "FOOD",
    unit: "LITER",
    currentStock: 8,
    minStock: 10,
    maxStock: 50,
    unitCost: 18.0,
    branchId: "br-002",
    branchName: "Uptown",
    status: "low" as const,
  },
  {
    id: "inv-003",
    name: "Coffee Beans",
    sku: "COF-001",
    category: "BEVERAGE",
    unit: "KG",
    currentStock: 45,
    minStock: 15,
    maxStock: 40,
    unitCost: 28.0,
    branchId: "br-003",
    branchName: "Mall Branch",
    status: "overstock" as const,
  },
  {
    id: "inv-004",
    name: "Salmon Fillet",
    sku: "SAL-001",
    category: "FOOD",
    unit: "KG",
    currentStock: 25,
    minStock: 10,
    maxStock: 50,
    unitCost: 32.0,
    branchId: "br-001",
    branchName: "Downtown",
    status: "normal" as const,
  },
];

export const generateHourlyData = () => {
  const hours = [];
  for (let i = 6; i <= 23; i++) {
    const hour = i < 12 ? `${i}AM` : i === 12 ? "12PM" : `${i - 12}PM`;
    const isPeak = (i >= 11 && i <= 14) || (i >= 18 && i <= 21);
    const baseTransactions = isPeak ? 80 : 30;
    hours.push({
      hour,
      transactions: Math.round(baseTransactions + Math.random() * 20),
      revenue: Math.round((baseTransactions + Math.random() * 20) * 45),
    });
  }
  return hours;
};

export const staffSchedule = [
  {
    id: "staff-001",
    employeeId: "EMP-001",
    name: "John Smith",
    role: "KITCHEN",
    branchName: "Downtown",
    shiftStart: "06:00",
    shiftEnd: "14:00",
    status: "ON_DUTY",
  },
  {
    id: "staff-002",
    employeeId: "EMP-002",
    name: "Sarah Johnson",
    role: "SERVICE",
    branchName: "Downtown",
    shiftStart: "10:00",
    shiftEnd: "18:00",
    status: "ON_DUTY",
  },
  {
    id: "staff-003",
    employeeId: "EMP-003",
    name: "Mike Wilson",
    role: "MANAGER",
    branchName: "Downtown",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    status: "ON_DUTY",
  },
  {
    id: "staff-004",
    employeeId: "EMP-004",
    name: "Emily Davis",
    role: "CASHIER",
    branchName: "Downtown",
    shiftStart: "14:00",
    shiftEnd: "22:00",
    status: "OFF_DUTY",
  },
  {
    id: "staff-005",
    employeeId: "EMP-005",
    name: "David Brown",
    role: "KITCHEN",
    branchName: "Downtown",
    shiftStart: "14:00",
    shiftEnd: "22:00",
    status: "OFF_DUTY",
  },
];
