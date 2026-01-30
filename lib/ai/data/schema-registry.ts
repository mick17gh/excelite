import { Role } from '@prisma/client';
import type { SchemaEntity } from '../types';

export const SCHEMA_REGISTRY: SchemaEntity[] = [
  {
    entity: 'sales',
    description: 'Daily sales transactions including revenue, items sold, and customer counts by branch and channel',
    fields: [
      { name: 'date', type: 'date', description: 'Transaction date' },
      { name: 'branch', type: 'reference', description: 'Branch location', referenceTo: 'branch' },
      { name: 'channel', type: 'enum', description: 'Sales channel', enumValues: ['DINE_IN', 'TAKEOUT', 'DELIVERY', 'APP'] },
      { name: 'dayPart', type: 'enum', description: 'Time of day', enumValues: ['BREAKFAST', 'LUNCH', 'DINNER', 'LATE_NIGHT'] },
      { name: 'revenue', type: 'currency', description: 'Total revenue in GHS' },
      { name: 'subtotal', type: 'currency', description: 'Subtotal before tax' },
      { name: 'tax', type: 'currency', description: 'Tax amount' },
      { name: 'discount', type: 'currency', description: 'Discount applied' },
      { name: 'transactions', type: 'count', description: 'Number of transactions' },
      { name: 'customerCount', type: 'count', description: 'Number of customers served' },
    ],
    allowedAggregations: ['sum', 'avg', 'count', 'min', 'max'],
    allowedGroupings: ['date', 'branch', 'channel', 'dayPart'],
    timeRanges: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_year', 'ytd'],
    requiredRole: [Role.CEO, Role.SENIOR_MANAGEMENT, Role.BRANCH_MANAGER, Role.FINANCE_OPS],
  },
  {
    entity: 'inventory',
    description: 'Current stock levels, reorder points, and inventory categories by branch',
    fields: [
      { name: 'item', type: 'string', description: 'Inventory item name' },
      { name: 'sku', type: 'string', description: 'Stock keeping unit code' },
      { name: 'category', type: 'enum', description: 'Item category', enumValues: ['FOOD', 'BEVERAGE', 'PACKAGING', 'CLEANING', 'EQUIPMENT', 'OTHER'] },
      { name: 'quantity', type: 'decimal', description: 'Current stock quantity' },
      { name: 'unit', type: 'enum', description: 'Unit of measurement', enumValues: ['KG', 'GRAM', 'LITER', 'ML', 'PIECE', 'BOX', 'CASE', 'PACK'] },
      { name: 'unitCost', type: 'currency', description: 'Cost per unit' },
      { name: 'reorderPoint', type: 'decimal', description: 'Minimum stock threshold for reorder' },
      { name: 'minStock', type: 'decimal', description: 'Minimum stock level' },
      { name: 'maxStock', type: 'decimal', description: 'Maximum stock capacity' },
      { name: 'branch', type: 'reference', description: 'Branch location', referenceTo: 'branch' },
    ],
    allowedAggregations: ['sum', 'avg', 'count', 'min', 'max'],
    allowedGroupings: ['category', 'branch', 'unit'],
    requiredRole: [Role.CEO, Role.SENIOR_MANAGEMENT, Role.BRANCH_MANAGER, Role.FINANCE_OPS],
  },
  {
    entity: 'menuItems',
    description: 'Menu items with pricing, categories, and availability',
    fields: [
      { name: 'name', type: 'string', description: 'Menu item name' },
      { name: 'sku', type: 'string', description: 'Item SKU' },
      { name: 'category', type: 'reference', description: 'Menu category', referenceTo: 'category' },
      { name: 'price', type: 'currency', description: 'Selling price' },
      { name: 'cost', type: 'currency', description: 'Cost price', sensitive: true },
      { name: 'isActive', type: 'boolean', description: 'Whether item is currently available' },
    ],
    allowedAggregations: ['count', 'avg', 'min', 'max'],
    allowedGroupings: ['category', 'isActive'],
    requiredRole: [Role.CEO, Role.SENIOR_MANAGEMENT, Role.BRANCH_MANAGER],
  },
  {
    entity: 'staff',
    description: 'Staff members, roles, and duty status by branch',
    fields: [
      { name: 'name', type: 'string', description: 'Staff member name (first + last)' },
      { name: 'role', type: 'enum', description: 'Staff role', enumValues: ['MANAGER', 'KITCHEN', 'SERVICE', 'CASHIER', 'DELIVERY'] },
      { name: 'dutyStatus', type: 'enum', description: 'Current duty status', enumValues: ['ON_DUTY', 'OFF_DUTY', 'ON_LEAVE', 'SICK'] },
      { name: 'branch', type: 'reference', description: 'Assigned branch', referenceTo: 'branch' },
      { name: 'hireDate', type: 'date', description: 'Employment start date' },
      { name: 'isActive', type: 'boolean', description: 'Whether staff is currently employed' },
    ],
    allowedAggregations: ['count'],
    allowedGroupings: ['role', 'dutyStatus', 'branch'],
    requiredRole: [Role.CEO, Role.SENIOR_MANAGEMENT, Role.BRANCH_MANAGER],
  },
  {
    entity: 'staffSchedule',
    description: 'Staff work schedules and shift information',
    fields: [
      { name: 'staff', type: 'reference', description: 'Staff member', referenceTo: 'staff' },
      { name: 'date', type: 'date', description: 'Scheduled date' },
      { name: 'shiftStart', type: 'datetime', description: 'Shift start time' },
      { name: 'shiftEnd', type: 'datetime', description: 'Shift end time' },
      { name: 'status', type: 'enum', description: 'Schedule status', enumValues: ['ON_DUTY', 'OFF_DUTY', 'ON_LEAVE', 'SICK'] },
      { name: 'branch', type: 'reference', description: 'Branch location', referenceTo: 'branch' },
    ],
    allowedAggregations: ['count'],
    allowedGroupings: ['date', 'status', 'branch'],
    requiredRole: [Role.CEO, Role.SENIOR_MANAGEMENT, Role.BRANCH_MANAGER],
  },
  {
    entity: 'waste',
    description: 'Waste logs tracking discarded inventory and reasons',
    fields: [
      { name: 'item', type: 'reference', description: 'Inventory item wasted', referenceTo: 'inventory' },
      { name: 'quantity', type: 'decimal', description: 'Quantity wasted' },
      { name: 'cost', type: 'currency', description: 'Cost of waste' },
      { name: 'reason', type: 'string', description: 'Reason for waste' },
      { name: 'date', type: 'date', description: 'Date of waste' },
      { name: 'branch', type: 'reference', description: 'Branch location', referenceTo: 'branch' },
    ],
    allowedAggregations: ['sum', 'avg', 'count'],
    allowedGroupings: ['item', 'reason', 'date', 'branch'],
    timeRanges: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
    requiredRole: [Role.CEO, Role.SENIOR_MANAGEMENT, Role.BRANCH_MANAGER, Role.FINANCE_OPS],
  },
  {
    entity: 'targets',
    description: 'Performance targets and goals by branch',
    fields: [
      { name: 'type', type: 'string', description: 'Target type (sales, transactions, etc.)' },
      { name: 'period', type: 'string', description: 'Target period (daily, weekly, monthly)' },
      { name: 'targetValue', type: 'currency', description: 'Target value' },
      { name: 'currentValue', type: 'currency', description: 'Current achieved value' },
      { name: 'startDate', type: 'date', description: 'Period start date' },
      { name: 'endDate', type: 'date', description: 'Period end date' },
      { name: 'branch', type: 'reference', description: 'Branch location', referenceTo: 'branch' },
    ],
    allowedAggregations: ['sum', 'avg'],
    allowedGroupings: ['type', 'period', 'branch'],
    requiredRole: [Role.CEO, Role.SENIOR_MANAGEMENT, Role.BRANCH_MANAGER],
  },
  {
    entity: 'alerts',
    description: 'System alerts and notifications',
    fields: [
      { name: 'type', type: 'enum', description: 'Alert type', enumValues: ['SALES_DROP', 'WASTE_SPIKE', 'LOW_STOCK', 'OVERSTOCK', 'STAFF_SHORTAGE', 'EXCEPTIONAL_GROWTH', 'UNDERPERFORMING_BRANCH', 'TARGET_MISSED', 'TARGET_ACHIEVED'] },
      { name: 'severity', type: 'enum', description: 'Alert severity', enumValues: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      { name: 'status', type: 'enum', description: 'Alert status', enumValues: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'] },
      { name: 'title', type: 'string', description: 'Alert title' },
      { name: 'message', type: 'string', description: 'Alert message' },
      { name: 'triggeredAt', type: 'datetime', description: 'When alert was triggered' },
      { name: 'branch', type: 'reference', description: 'Related branch', referenceTo: 'branch' },
    ],
    allowedAggregations: ['count'],
    allowedGroupings: ['type', 'severity', 'status', 'branch'],
    requiredRole: [Role.CEO, Role.SENIOR_MANAGEMENT, Role.BRANCH_MANAGER],
  },
  {
    entity: 'branches',
    description: 'Restaurant branch locations and details',
    fields: [
      { name: 'name', type: 'string', description: 'Branch name' },
      { name: 'code', type: 'string', description: 'Branch code' },
      { name: 'city', type: 'string', description: 'City location' },
      { name: 'isActive', type: 'boolean', description: 'Whether branch is operational' },
      { name: 'requiredStaff', type: 'count', description: 'Required staff count' },
    ],
    allowedAggregations: ['count'],
    allowedGroupings: ['city', 'isActive'],
    requiredRole: [Role.CEO, Role.SENIOR_MANAGEMENT, Role.BRANCH_MANAGER, Role.FINANCE_OPS, Role.CASHIER],
  },
  {
    entity: 'transactions',
    description: 'Payment transactions and methods',
    fields: [
      { name: 'date', type: 'datetime', description: 'Transaction date and time' },
      { name: 'amount', type: 'currency', description: 'Transaction amount' },
      { name: 'paymentMethod', type: 'string', description: 'Payment method used' },
      { name: 'isVoided', type: 'boolean', description: 'Whether transaction was voided' },
      { name: 'branch', type: 'reference', description: 'Branch location', referenceTo: 'branch' },
    ],
    allowedAggregations: ['sum', 'avg', 'count'],
    allowedGroupings: ['date', 'paymentMethod', 'branch', 'isVoided'],
    timeRanges: ['today', 'yesterday', 'this_week', 'last_week', 'this_month'],
    requiredRole: [Role.CEO, Role.SENIOR_MANAGEMENT, Role.BRANCH_MANAGER, Role.FINANCE_OPS],
  },
];

export function getSchemaForEntities(entityNames: string[]): SchemaEntity[] {
  return SCHEMA_REGISTRY.filter((e) => entityNames.includes(e.entity));
}

export function getSchemaForRole(role: Role): SchemaEntity[] {
  return SCHEMA_REGISTRY.filter((e) => e.requiredRole.includes(role));
}

export function compressSchemaForPrompt(entities: SchemaEntity[]): string {
  return entities
    .map((e) => {
      const fieldNames = e.fields
        .filter((f) => !f.sensitive)
        .map((f) => f.name)
        .join(',');
      return `${e.entity}(${fieldNames})`;
    })
    .join('; ');
}

export function getEntityDescription(entityName: string): string | null {
  const entity = SCHEMA_REGISTRY.find((e) => e.entity === entityName);
  return entity?.description || null;
}

export function getAllEntityNames(): string[] {
  return SCHEMA_REGISTRY.map((e) => e.entity);
}
