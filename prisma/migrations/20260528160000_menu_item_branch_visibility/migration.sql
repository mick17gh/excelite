-- Menu item branch visibility (not per-branch menus)
ALTER TABLE "menu_item" ADD COLUMN "availableAtAllBranches" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "menu_item_branch" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_branch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "menu_item_branch_menuItemId_branchId_key" ON "menu_item_branch"("menuItemId", "branchId");
CREATE INDEX "menu_item_branch_branchId_idx" ON "menu_item_branch"("branchId");
CREATE INDEX "menu_item_availableAtAllBranches_idx" ON "menu_item"("availableAtAllBranches");

ALTER TABLE "menu_item_branch" ADD CONSTRAINT "menu_item_branch_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "menu_item_branch" ADD CONSTRAINT "menu_item_branch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
