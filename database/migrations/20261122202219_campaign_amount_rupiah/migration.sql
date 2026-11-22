/*
  Warnings:

  - You are about to drop the column `current_amount_wei` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `target_amount_wei` on the `campaigns` table. All the data in the column will be lost.
  - Added the required column `target_amount` to the `campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "campaigns" DROP COLUMN "current_amount_wei",
DROP COLUMN "target_amount_wei",
ADD COLUMN     "current_amount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "target_amount" BIGINT NOT NULL;
