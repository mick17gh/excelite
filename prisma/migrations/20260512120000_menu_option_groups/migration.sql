-- Menu multi-group: option groups, options, per-option ingredients, order/sale selections

CREATE TABLE "menu_item_option_group" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "minSelections" INTEGER NOT NULL DEFAULT 1,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "menu_item_option_group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_item_option" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costDelta" DECIMAL(10,2),
    "sku" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "menu_item_option_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "menu_item_option_sku_key" ON "menu_item_option"("sku");

CREATE TABLE "menu_item_option_ingredient" (
    "id" TEXT NOT NULL,
    "menuItemOptionId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" "UnitType" NOT NULL,
    CONSTRAINT "menu_item_option_ingredient_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "menu_item_option_group" ADD CONSTRAINT "menu_item_option_group_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_item_option" ADD CONSTRAINT "menu_item_option_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "menu_item_option_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_item_option_ingredient" ADD CONSTRAINT "menu_item_option_ingredient_menuItemOptionId_fkey" FOREIGN KEY ("menuItemOptionId") REFERENCES "menu_item_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "menu_item_option_ingredient" ADD CONSTRAINT "menu_item_option_ingredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "menu_item_option_group_menuItemId_idx" ON "menu_item_option_group"("menuItemId");
CREATE INDEX "menu_item_option_groupId_idx" ON "menu_item_option"("groupId");
CREATE INDEX "menu_item_option_ingredient_menuItemOptionId_idx" ON "menu_item_option_ingredient"("menuItemOptionId");
CREATE INDEX "menu_item_option_ingredient_inventoryItemId_idx" ON "menu_item_option_ingredient"("inventoryItemId");

CREATE TABLE "order_item_selection" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "menuItemOptionId" TEXT NOT NULL,
    CONSTRAINT "order_item_selection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "order_item_selection" ADD CONSTRAINT "order_item_selection_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_item_selection" ADD CONSTRAINT "order_item_selection_menuItemOptionId_fkey" FOREIGN KEY ("menuItemOptionId") REFERENCES "menu_item_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "order_item_selection_orderItemId_menuItemOptionId_key" ON "order_item_selection"("orderItemId", "menuItemOptionId");
CREATE INDEX "order_item_selection_orderItemId_idx" ON "order_item_selection"("orderItemId");
CREATE INDEX "order_item_selection_menuItemOptionId_idx" ON "order_item_selection"("menuItemOptionId");

ALTER TABLE "order_item" ADD COLUMN "configurationLabel" TEXT;
ALTER TABLE "order_item" ADD COLUMN "configurationKey" TEXT;
CREATE INDEX "order_item_configurationKey_idx" ON "order_item"("configurationKey");

CREATE TABLE "sale_item_selection" (
    "id" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "menuItemOptionId" TEXT NOT NULL,
    CONSTRAINT "sale_item_selection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "sale_item_selection" ADD CONSTRAINT "sale_item_selection_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_item_selection" ADD CONSTRAINT "sale_item_selection_menuItemOptionId_fkey" FOREIGN KEY ("menuItemOptionId") REFERENCES "menu_item_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "sale_item_selection_saleItemId_menuItemOptionId_key" ON "sale_item_selection"("saleItemId", "menuItemOptionId");
CREATE INDEX "sale_item_selection_saleItemId_idx" ON "sale_item_selection"("saleItemId");
CREATE INDEX "sale_item_selection_menuItemOptionId_idx" ON "sale_item_selection"("menuItemOptionId");

ALTER TABLE "sale_item" ADD COLUMN "configurationLabel" TEXT;
ALTER TABLE "sale_item" ADD COLUMN "configurationKey" TEXT;
CREATE INDEX "sale_item_configurationKey_idx" ON "sale_item"("configurationKey");

ALTER TABLE "manual_entry_line" ADD COLUMN "configurationLabel" TEXT;
ALTER TABLE "manual_entry_line" ADD COLUMN "configurationKey" TEXT;
