/*
  Warnings:

  - You are about to drop the column `current_amount` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `target_amount` on the `campaigns` table. All the data in the column will be lost.
  - Added the required column `target_amount_wei` to the `campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "campaigns" DROP COLUMN "current_amount",
DROP COLUMN "target_amount",
ADD COLUMN     "current_amount_wei" DECIMAL(78,0) NOT NULL DEFAULT 0,
ADD COLUMN     "target_amount_wei" DECIMAL(78,0) NOT NULL;
