import { Role } from '@/lib/generated/prisma/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import type { QueryTemplate, QueryParams, PrismaQueryConfig } from '../types';

function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) };
    case 'this_week':
      return { startDate: startOfWeek(now, { weekStartsOn: 1 }), endDate: endOfDay(now) };
    case 'last_week':
      const lastWeek = subWeeks(now, 1);
      return { startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }), endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    case 'this_month':
      return { startDate: startOfMonth(now), endDate: endOfDay(now) };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    case 'last_7_days':
      return { startDate: startOfDay(subDays(now, 7)), endDate: endOfDay(now) };
    case 'last_30_days':
      return { startDate: startOfDay(subDays(now, 30)), endDate: endOfDay(now) };
    default:
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
  }
}

export const QUERY_TEMPLATES: QueryTemplate[] = [
  // ============================================
  // SALES QUERIES
  // ============================================
  {
    id: 'sales_summary_period',
    intent: 'informational',
    entity: 'sales',
    patterns: [
      'sales {period}',
      'total sales {period}',
      'revenue {period}',
      'how much did we make {period}',
      'sales summary {period}',
    ],
    description: 'Get total sales summary for a time period',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const { startDate, endDate } = params.startDate && params.endDate 
        ? { startDate: params.startDate, endDate: params.endDate }
        : getDateRange((params as { period?: string }).period || 'today');
      
      return {
        model: 'sale',
        operation: 'aggregate',
        where: {
          saleDate: { gte: startDate, lte: endDate },
          ...(params.branchId && { branchId: params.branchId }),
          ...(params.branchIds && { branchId: { in: params.branchIds } }),
        },
        _sum: { total: true, tax: true, discount: true },
        _count: { id: true },
        _avg: { total: true },
      };
    },
    maxResults: 1,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER, Role.AUDITOR],
    cacheTTL: 300,
  },
  {
    id: 'sales_by_branch',
    intent: 'comparative',
    entity: 'sales',
    patterns: [
      'sales by branch {period}',
      'branch comparison {period}',
      'compare branches {period}',
      'branch performance {period}',
      'how did each branch do {period}',
    ],
    description: 'Compare sales across branches for a time period',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const { startDate, endDate } = params.startDate && params.endDate 
        ? { startDate: params.startDate, endDate: params.endDate }
        : getDateRange((params as { period?: string }).period || 'this_week');
      
      return {
        model: 'sale',
        operation: 'groupBy',
        by: ['branchId'],
        where: {
          saleDate: { gte: startDate, lte: endDate },
          ...(params.branchIds && { branchId: { in: params.branchIds } }),
        },
        _sum: { total: true },
        _count: { id: true },
        _avg: { total: true },
      };
    },
    maxResults: 50,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.AUDITOR],
    cacheTTL: 300,
  },
  {
    id: 'sales_by_channel',
    intent: 'analytical',
    entity: 'sales',
    patterns: [
      'sales by channel {period}',
      'channel breakdown {period}',
      'dine in vs takeout vs delivery {period}',
      'sales channels {period}',
    ],
    description: 'Breakdown of sales by channel',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const { startDate, endDate } = params.startDate && params.endDate 
        ? { startDate: params.startDate, endDate: params.endDate }
        : getDateRange((params as { period?: string }).period || 'this_week');
      
      return {
        model: 'sale',
        operation: 'groupBy',
        by: ['channel'],
        where: {
          saleDate: { gte: startDate, lte: endDate },
          ...(params.branchId && { branchId: params.branchId }),
        },
        _sum: { total: true },
        _count: { id: true },
      };
    },
    maxResults: 10,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER],
    cacheTTL: 300,
  },
  {
    id: 'sales_by_day_part',
    intent: 'analytical',
    entity: 'sales',
    patterns: [
      'sales by time of day {period}',
      'breakfast vs lunch vs dinner {period}',
      'day part breakdown {period}',
      'peak hours {period}',
    ],
    description: 'Sales breakdown by day part',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const { startDate, endDate } = params.startDate && params.endDate 
        ? { startDate: params.startDate, endDate: params.endDate }
        : getDateRange((params as { period?: string }).period || 'this_week');
      
      return {
        model: 'sale',
        operation: 'groupBy',
        by: ['dayPart'],
        where: {
          saleDate: { gte: startDate, lte: endDate },
          ...(params.branchId && { branchId: params.branchId }),
        },
        _sum: { total: true },
        _count: { id: true },
      };
    },
    maxResults: 10,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER],
    cacheTTL: 300,
  },
  {
    id: 'top_selling_items',
    intent: 'informational',
    entity: 'sales',
    patterns: [
      'top selling items {period}',
      'best sellers {period}',
      'most popular items {period}',
      'what sold the most {period}',
    ],
    description: 'Top selling menu items by quantity',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const { startDate, endDate } = params.startDate && params.endDate 
        ? { startDate: params.startDate, endDate: params.endDate }
        : getDateRange((params as { period?: string }).period || 'this_week');
      
      return {
        model: 'saleItem',
        operation: 'groupBy',
        by: ['menuItemId', 'configurationKey'],
        where: {
          sale: {
            saleDate: { gte: startDate, lte: endDate },
            ...(params.branchId && { branchId: params.branchId }),
          },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: params.limit || 10,
      };
    },
    maxResults: 20,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER],
    cacheTTL: 600,
  },

  // ============================================
  // INVENTORY QUERIES
  // ============================================
  {
    id: 'low_stock_items',
    intent: 'operational',
    entity: 'inventory',
    patterns: [
      'low stock items',
      'what needs reordering',
      'inventory alerts',
      'items running low',
      'stock alerts',
    ],
    description: 'Items below reorder level',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      return {
        model: 'inventoryItem',
        operation: 'findMany',
        where: {
          isActive: true,
          ...(params.branchId && { branchId: params.branchId }),
        },
        select: {
          id: true,
          name: true,
          sku: true,
          currentStock: true,
          reorderPoint: true,
          minStock: true,
          unit: true,
          category: true,
          branch: { select: { name: true, code: true } },
        },
        orderBy: { currentStock: 'asc' },
        take: params.limit || 20,
      };
    },
    maxResults: 50,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER, Role.AUDITOR, Role.WAREHOUSE_STAFF],
    cacheTTL: 120,
  },
  {
    id: 'inventory_summary',
    intent: 'informational',
    entity: 'inventory',
    patterns: [
      'inventory summary',
      'stock levels',
      'current inventory',
      'inventory status',
    ],
    description: 'Current inventory summary by category',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      return {
        model: 'inventoryItem',
        operation: 'groupBy',
        by: ['category'],
        where: {
          isActive: true,
          ...(params.branchId && { branchId: params.branchId }),
        },
        _count: { id: true },
        _sum: { currentStock: true },
      };
    },
    maxResults: 20,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER, Role.AUDITOR, Role.WAREHOUSE_STAFF],
    cacheTTL: 300,
  },
  {
    id: 'inventory_value',
    intent: 'informational',
    entity: 'inventory',
    patterns: [
      'inventory value',
      'stock value',
      'total inventory cost',
      'what is our inventory worth',
    ],
    description: 'Total value of current inventory',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      return {
        model: 'inventoryItem',
        operation: 'findMany',
        where: {
          isActive: true,
          ...(params.branchId && { branchId: params.branchId }),
        },
        select: {
          name: true,
          currentStock: true,
          unitCost: true,
          category: true,
          branch: { select: { name: true } },
        },
      };
    },
    maxResults: 500,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.AUDITOR],
    cacheTTL: 300,
  },

  // ============================================
  // STAFF QUERIES
  // ============================================
  {
    id: 'staff_on_duty',
    intent: 'operational',
    entity: 'staff',
    patterns: [
      'who is on duty',
      'staff on duty',
      'current staff',
      'who is working today',
      'staff today',
    ],
    description: 'Staff currently on duty',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      return {
        model: 'staff',
        operation: 'findMany',
        where: {
          dutyStatus: 'ON_DUTY',
          isActive: true,
          ...(params.branchId && { branchId: params.branchId }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          dutyStatus: true,
          branch: { select: { name: true, code: true } },
        },
        orderBy: [{ branch: { name: 'asc' } }, { role: 'asc' }],
      };
    },
    maxResults: 100,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER],
    cacheTTL: 60,
  },
  {
    id: 'staff_by_role',
    intent: 'informational',
    entity: 'staff',
    patterns: [
      'staff by role',
      'staff count by role',
      'how many staff per role',
      'staff breakdown',
    ],
    description: 'Staff count by role',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      return {
        model: 'staff',
        operation: 'groupBy',
        by: ['role'],
        where: {
          isActive: true,
          ...(params.branchId && { branchId: params.branchId }),
        },
        _count: { id: true },
      };
    },
    maxResults: 10,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER],
    cacheTTL: 300,
  },
  {
    id: 'staff_schedule_today',
    intent: 'operational',
    entity: 'staffSchedule',
    patterns: [
      'schedule today',
      'who is scheduled today',
      'today schedule',
      'shifts today',
    ],
    description: 'Staff schedule for today',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const today = startOfDay(new Date());
      const endToday = endOfDay(new Date());
      
      return {
        model: 'staffSchedule',
        operation: 'findMany',
        where: {
          scheduledDate: { gte: today, lte: endToday },
          ...(params.branchId && { branchId: params.branchId }),
        },
        select: {
          staff: { select: { firstName: true, lastName: true, role: true } },
          shiftStart: true,
          shiftEnd: true,
          status: true,
          branch: { select: { name: true } },
        },
        orderBy: { shiftStart: 'asc' },
      };
    },
    maxResults: 100,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER],
    cacheTTL: 120,
  },

  // ============================================
  // WASTE QUERIES
  // ============================================
  {
    id: 'waste_summary',
    intent: 'informational',
    entity: 'waste',
    patterns: [
      'waste {period}',
      'waste summary {period}',
      'how much waste {period}',
      'waste cost {period}',
    ],
    description: 'Waste summary for a period',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const { startDate, endDate } = params.startDate && params.endDate 
        ? { startDate: params.startDate, endDate: params.endDate }
        : getDateRange((params as { period?: string }).period || 'this_week');
      
      return {
        model: 'wasteLog',
        operation: 'aggregate',
        where: {
          wasteDate: { gte: startDate, lte: endDate },
          ...(params.branchId && { branchId: params.branchId }),
        },
        _sum: { totalCost: true, quantity: true },
        _count: { id: true },
      };
    },
    maxResults: 1,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER, Role.AUDITOR],
    cacheTTL: 300,
  },
  {
    id: 'waste_by_reason',
    intent: 'analytical',
    entity: 'waste',
    patterns: [
      'waste by reason {period}',
      'why are we wasting {period}',
      'waste causes {period}',
    ],
    description: 'Waste breakdown by reason',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const { startDate, endDate } = params.startDate && params.endDate 
        ? { startDate: params.startDate, endDate: params.endDate }
        : getDateRange((params as { period?: string }).period || 'this_month');
      
      return {
        model: 'wasteLog',
        operation: 'groupBy',
        by: ['reason'],
        where: {
          wasteDate: { gte: startDate, lte: endDate },
          ...(params.branchId && { branchId: params.branchId }),
        },
        _sum: { totalCost: true },
        _count: { id: true },
      };
    },
    maxResults: 20,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER],
    cacheTTL: 300,
  },

  // ============================================
  // TARGETS & ALERTS
  // ============================================
  {
    id: 'active_alerts',
    intent: 'operational',
    entity: 'alerts',
    patterns: [
      'active alerts',
      'current alerts',
      'alerts',
      'what needs attention',
      'issues',
    ],
    description: 'Active alerts and issues',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      return {
        model: 'alert',
        operation: 'findMany',
        where: {
          status: 'ACTIVE',
          ...(params.branchId && { branchId: params.branchId }),
        },
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          message: true,
          triggeredAt: true,
          branch: { select: { name: true } },
        },
        orderBy: [{ severity: 'desc' }, { triggeredAt: 'desc' }],
        take: params.limit || 20,
      };
    },
    maxResults: 50,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER],
    cacheTTL: 60,
  },
  {
    id: 'target_progress',
    intent: 'informational',
    entity: 'targets',
    patterns: [
      'target progress',
      'how are we doing on targets',
      'are we hitting targets',
      'target status',
    ],
    description: 'Current target progress',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const now = new Date();
      
      return {
        model: 'target',
        operation: 'findMany',
        where: {
          isActive: true,
          periodStart: { lte: now },
          periodEnd: { gte: now },
          ...(params.branchId && { branchId: params.branchId }),
        },
        select: {
          targetType: true,
          period: true,
          targetValue: true,
          currentValue: true,
          periodStart: true,
          periodEnd: true,
          branch: { select: { name: true } },
        },
        orderBy: { periodEnd: 'asc' },
      };
    },
    maxResults: 50,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER],
    cacheTTL: 300,
  },

  // ============================================
  // WAREHOUSE HUB & UNIFIED ORDERS
  // ============================================
  {
    id: 'warehouse_hub_stock_levels',
    intent: 'informational',
    entity: 'warehouseHub',
    patterns: [
      'warehouse stock',
      'hub inventory',
      'central warehouse',
      'warehouse sku',
      'warehouse low stock',
      'what is in the warehouse',
    ],
    description: 'Central warehouse inventory lines with quantities',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      return {
        model: 'warehouseInventoryItem',
        operation: 'findMany',
        where: { isActive: true },
        select: {
          name: true,
          sku: true,
          category: true,
          unit: true,
          currentStock: true,
          reorderPoint: true,
          unitCost: true,
          warehouse: { select: { name: true, code: true } },
        },
        orderBy: { currentStock: 'asc' },
        take: params.limit || 35,
      };
    },
    maxResults: 50,
    requiredRoles: [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.EXECUTIVE,
      Role.OPERATIONS_MANAGER,
      Role.BRANCH_MANAGER,
      Role.WAREHOUSE_STAFF,
      Role.AUDITOR,
    ],
    cacheTTL: 120,
  },
  {
    id: 'warehouse_transfers_period',
    intent: 'informational',
    entity: 'warehouseHub',
    patterns: [
      'warehouse transfers',
      'transfers to branches',
      'stock sent to branches',
      'hub transfers',
      'warehouse to branch',
    ],
    description: 'Warehouse to branch transfers in a period',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const { startDate, endDate } =
        params.startDate && params.endDate
          ? { startDate: params.startDate, endDate: params.endDate }
          : getDateRange((params as { period?: string }).period || 'last_30_days');
      return {
        model: 'warehouseBranchTransfer',
        operation: 'findMany',
        where: {
          transferDate: { gte: startDate, lte: endDate },
          ...(params.branchId && { toBranchId: params.branchId }),
        },
        select: {
          transferDate: true,
          status: true,
          quantity: true,
          totalCost: true,
          notes: true,
          warehouse: { select: { name: true, code: true } },
          warehouseItem: { select: { name: true, sku: true, unit: true } },
          toBranch: { select: { name: true, code: true } },
        },
        orderBy: { transferDate: 'desc' },
        take: params.limit || 25,
      };
    },
    maxResults: 50,
    requiredRoles: [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.EXECUTIVE,
      Role.OPERATIONS_MANAGER,
      Role.BRANCH_MANAGER,
      Role.WAREHOUSE_STAFF,
      Role.AUDITOR,
    ],
    cacheTTL: 180,
  },
  {
    id: 'warehouse_outbound_period',
    intent: 'informational',
    entity: 'warehouseHub',
    patterns: [
      'warehouse outbound',
      'hub stock usage',
      'warehouse adjustment',
      'warehouse stock removal',
      'outbound from warehouse',
    ],
    description: 'Warehouse outbound usage and adjustments in a period',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const { startDate, endDate } =
        params.startDate && params.endDate
          ? { startDate: params.startDate, endDate: params.endDate }
          : getDateRange((params as { period?: string }).period || 'last_30_days');
      return {
        model: 'warehouseOutboundLog',
        operation: 'findMany',
        where: {
          outboundDate: { gte: startDate, lte: endDate },
        },
        select: {
          outboundDate: true,
          quantity: true,
          unitCost: true,
          totalCost: true,
          reason: true,
          notes: true,
          warehouse: { select: { name: true, code: true } },
          warehouseItem: { select: { name: true, sku: true, unit: true } },
        },
        orderBy: { outboundDate: 'desc' },
        take: params.limit || 25,
      };
    },
    maxResults: 50,
    requiredRoles: [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.EXECUTIVE,
      Role.OPERATIONS_MANAGER,
      Role.BRANCH_MANAGER,
      Role.WAREHOUSE_STAFF,
      Role.AUDITOR,
    ],
    cacheTTL: 180,
  },
  {
    id: 'unified_orders_by_status',
    intent: 'comparative',
    entity: 'unifiedOrders',
    patterns: [
      'orders by status',
      'order pipeline',
      'how many orders pending',
      'unified orders',
      'order breakdown',
      'pending orders count',
    ],
    description: 'Unified orders grouped by status',
    buildQuery: (params: QueryParams): PrismaQueryConfig => {
      const { startDate, endDate } =
        params.startDate && params.endDate
          ? { startDate: params.startDate, endDate: params.endDate }
          : getDateRange((params as { period?: string }).period || 'last_30_days');
      return {
        model: 'order',
        operation: 'groupBy',
        by: ['status'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ...(params.branchId && { branchId: params.branchId }),
        },
        _count: { id: true },
        _sum: { total: true },
      };
    },
    maxResults: 20,
    requiredRoles: [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.EXECUTIVE,
      Role.OPERATIONS_MANAGER,
      Role.BRANCH_MANAGER,
      Role.SUPERVISOR,
      Role.CALL_CENTER,
      Role.AUDITOR,
    ],
    cacheTTL: 120,
  },

  // ============================================
  // BRANCH QUERIES
  // ============================================
  {
    id: 'branch_list',
    intent: 'informational',
    entity: 'branches',
    patterns: [
      'list branches',
      'all branches',
      'branch locations',
      'our branches',
    ],
    description: 'List of all branches',
    buildQuery: (): PrismaQueryConfig => {
      return {
        model: 'branch',
        operation: 'findMany',
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          requiredStaff: true,
        },
        orderBy: { name: 'asc' },
      };
    },
    maxResults: 50,
    requiredRoles: [Role.SUPER_ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.BRANCH_MANAGER, Role.SUPERVISOR, Role.STAFF, Role.AUDITOR, Role.CALL_CENTER],
    cacheTTL: 3600,
  },
];

export function findMatchingTemplates(query: string): QueryTemplate[] {
  const normalizedQuery = query.toLowerCase();
  
  return QUERY_TEMPLATES.filter((template) => {
    return template.patterns.some((pattern) => {
      const regexPattern = pattern
        .replace(/\{period\}/g, '.*')
        .replace(/\{.*?\}/g, '.*');
      const regex = new RegExp(regexPattern, 'i');
      return regex.test(normalizedQuery);
    });
  });
}

export function getTemplateById(id: string): QueryTemplate | undefined {
  return QUERY_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesForRole(role: Role): QueryTemplate[] {
  return QUERY_TEMPLATES.filter((t) => t.requiredRoles.includes(role));
}

export { getDateRange };
