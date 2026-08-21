ALTER TABLE "SalesOrder"
ADD COLUMN "warehouseId" TEXT;

UPDATE "SalesOrder"
SET "warehouseId" = 'cmt3bjkte0000wk8oftpfrqqf'
WHERE "warehouseId" IS NULL;

ALTER TABLE "SalesOrder"
ALTER COLUMN "warehouseId" SET NOT NULL;

CREATE INDEX "SalesOrder_warehouseId_idx"
ON "SalesOrder"("warehouseId");

ALTER TABLE "SalesOrder"
ADD CONSTRAINT "SalesOrder_warehouseId_fkey"
FOREIGN KEY ("warehouseId")
REFERENCES "Warehouse"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
