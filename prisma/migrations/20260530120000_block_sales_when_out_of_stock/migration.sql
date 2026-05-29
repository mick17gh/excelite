-- Block sales when branch ingredients are out of stock (org default + branch override)
ALTER TABLE "organization" ADD COLUMN "blockSalesWhenOutOfStock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "branch" ADD COLUMN "blockSalesWhenOutOfStock" BOOLEAN;
