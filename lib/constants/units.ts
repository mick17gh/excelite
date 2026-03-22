/**
 * Unit Type Constants
 * 
 * This file provides the UnitType enum values and labels.
 * The values come from the Prisma schema enum.
 */

import { UnitType } from "@/lib/generated/prisma/client";

// Get all unit type values from the Prisma enum
export const UNIT_TYPES = Object.values(UnitType);

// Human-readable labels for each unit type
export const UNIT_LABELS: Record<UnitType, string> = {
  KG: "Kilogram (kg)",
  GRAM: "Gram (g)",
  MG: "Milligram (mg)",
  TON: "Ton",
  LITER: "Liter (L)",
  ML: "Milliliter (ml)",
  CL: "Centiliter (cl)",
  GALLON: "Gallon",
  PIECE: "Piece",
  UNIT: "Unit",
  ITEM: "Item",
  BOX: "Box",
  CARTON: "Carton",
  CASE: "Case",
  PACK: "Pack",
  BAG: "Bag",
  SACK: "Sack",
  CRATE: "Crate",
  TRAY: "Tray",
  BOTTLE: "Bottle",
  CAN: "Can",
  JAR: "Jar",
  CUP: "Cup",
  TABLESPOON: "Tablespoon",
  TEASPOON: "Teaspoon",
  SLICE: "Slice",
  PORTION: "Portion",
  SERVING: "Serving",
  PLATE: "Plate",
  DOZEN: "Dozen",
  HALF_DOZEN:"Half Dozen",
  BUNCH:"Bunch",
  BLOCK:"Block"
};

// Helper function to get label for a unit type
export function getUnitLabel(unit: UnitType): string {
  return UNIT_LABELS[unit] || unit;
}
