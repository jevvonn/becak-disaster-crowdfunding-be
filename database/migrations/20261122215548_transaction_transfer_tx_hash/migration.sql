-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "transfer_tx_hash" VARCHAR(66);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transfer_tx_hash_key" ON "transactions"("transfer_tx_hash");
