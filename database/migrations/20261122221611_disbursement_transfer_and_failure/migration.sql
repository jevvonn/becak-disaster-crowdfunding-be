-- AlterEnum
ALTER TYPE "disbursement_status" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "disbursements" ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "transfer_tx_hash" VARCHAR(66);

-- CreateIndex
CREATE UNIQUE INDEX "disbursements_transfer_tx_hash_key" ON "disbursements"("transfer_tx_hash");

