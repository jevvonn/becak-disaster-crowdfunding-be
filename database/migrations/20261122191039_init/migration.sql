-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('DONOR', 'INITIATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('TOPUP', 'DONATION');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('PENDING', 'SETTLEMENT', 'COMPLETED', 'EXPIRE', 'FAILED', 'ONCHAIN_FAILED');

-- CreateEnum
CREATE TYPE "disbursement_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'ONCHAIN_FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'DONOR',
    "wallet_address" VARCHAR(42) NOT NULL,
    "private_key_encrypted" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "onchain_id" BIGSERIAL NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "target_amount_wei" DECIMAL(78,0) NOT NULL,
    "current_amount_wei" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "campaign_wallet" VARCHAR(42) NOT NULL,
    "campaign_wallet_key_encrypted" TEXT NOT NULL,
    "initiator_id" TEXT NOT NULL,
    "status" "campaign_status" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "tx_hash_create" VARCHAR(66),
    "tx_hash_close" VARCHAR(66),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "order_id" VARCHAR(50) NOT NULL,
    "type" "transaction_type" NOT NULL,
    "user_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "amount_wei" DECIMAL(78,0),
    "payment_type" VARCHAR(30),
    "status" "transaction_status" NOT NULL DEFAULT 'PENDING',
    "tx_hash_sepolia" VARCHAR(66),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursements" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "amount_wei" DECIMAL(78,0),
    "description" TEXT,
    "proof_url" TEXT NOT NULL,
    "status" "disbursement_status" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "tx_hash_sepolia" VARCHAR(66),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_onchain_id_key" ON "campaigns"("onchain_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_campaign_wallet_key" ON "campaigns"("campaign_wallet");

-- CreateIndex
CREATE INDEX "campaigns_initiator_id_idx" ON "campaigns"("initiator_id");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_order_id_key" ON "transactions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tx_hash_sepolia_key" ON "transactions"("tx_hash_sepolia");

-- CreateIndex
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_campaign_id_created_at_idx" ON "transactions"("campaign_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "disbursements_tx_hash_sepolia_key" ON "disbursements"("tx_hash_sepolia");

-- CreateIndex
CREATE INDEX "disbursements_campaign_id_created_at_idx" ON "disbursements"("campaign_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "disbursements_status_idx" ON "disbursements"("status");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
