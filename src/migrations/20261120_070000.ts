import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Gift codes, gift code redemptions, daily check-ins, and the check-in reward schedule on reward-settings. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "gift_codes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"amount" numeric DEFAULT 0 NOT NULL,
  	"max_redemptions" numeric DEFAULT 0,
  	"redemption_count" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT true,
  	"starts_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "gift_code_redemptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"gift_code_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"code" varchar NOT NULL,
  	"amount" numeric DEFAULT 0,
  	"transaction_id" integer,
  	"redeemed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "attendance_claims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"day_key" varchar NOT NULL,
  	"streak_day" numeric NOT NULL,
  	"amount" numeric DEFAULT 0,
  	"transaction_id" integer,
  	"claimed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "reward_settings_attendance_rewards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"amount" numeric DEFAULT 0 NOT NULL
  );

  ALTER TABLE "reward_settings" ADD COLUMN IF NOT EXISTS "attendance_enabled" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "gift_codes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "gift_code_redemptions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "attendance_claims_id" integer;

  ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_gift_code_id_gift_codes_id_fk" FOREIGN KEY ("gift_code_id") REFERENCES "public"."gift_codes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance_claims" ADD CONSTRAINT "attendance_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance_claims" ADD CONSTRAINT "attendance_claims_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reward_settings_attendance_rewards" ADD CONSTRAINT "reward_settings_attendance_rewards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."reward_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gift_codes_fk" FOREIGN KEY ("gift_codes_id") REFERENCES "public"."gift_codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gift_code_redemptions_fk" FOREIGN KEY ("gift_code_redemptions_id") REFERENCES "public"."gift_code_redemptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attendance_claims_fk" FOREIGN KEY ("attendance_claims_id") REFERENCES "public"."attendance_claims"("id") ON DELETE cascade ON UPDATE no action;

  CREATE UNIQUE INDEX IF NOT EXISTS "gift_codes_code_idx" ON "gift_codes" USING btree ("code");
  CREATE INDEX IF NOT EXISTS "gift_codes_is_active_idx" ON "gift_codes" USING btree ("is_active");
  CREATE INDEX IF NOT EXISTS "gift_codes_updated_at_idx" ON "gift_codes" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "gift_codes_created_at_idx" ON "gift_codes" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "gift_code_redemptions_gift_code_idx" ON "gift_code_redemptions" USING btree ("gift_code_id");
  CREATE INDEX IF NOT EXISTS "gift_code_redemptions_user_idx" ON "gift_code_redemptions" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "gift_code_redemptions_transaction_idx" ON "gift_code_redemptions" USING btree ("transaction_id");
  CREATE INDEX IF NOT EXISTS "gift_code_redemptions_redeemed_at_idx" ON "gift_code_redemptions" USING btree ("redeemed_at");
  CREATE INDEX IF NOT EXISTS "gift_code_redemptions_updated_at_idx" ON "gift_code_redemptions" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "gift_code_redemptions_created_at_idx" ON "gift_code_redemptions" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "giftCode_user_idx" ON "gift_code_redemptions" USING btree ("gift_code_id","user_id");
  CREATE INDEX IF NOT EXISTS "attendance_claims_user_idx" ON "attendance_claims" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "attendance_claims_day_key_idx" ON "attendance_claims" USING btree ("day_key");
  CREATE INDEX IF NOT EXISTS "attendance_claims_transaction_idx" ON "attendance_claims" USING btree ("transaction_id");
  CREATE INDEX IF NOT EXISTS "attendance_claims_claimed_at_idx" ON "attendance_claims" USING btree ("claimed_at");
  CREATE INDEX IF NOT EXISTS "attendance_claims_updated_at_idx" ON "attendance_claims" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "attendance_claims_created_at_idx" ON "attendance_claims" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "user_dayKey_idx" ON "attendance_claims" USING btree ("user_id","day_key");
  CREATE INDEX IF NOT EXISTS "reward_settings_attendance_rewards_order_idx" ON "reward_settings_attendance_rewards" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "reward_settings_attendance_rewards_parent_id_idx" ON "reward_settings_attendance_rewards" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_gift_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("gift_codes_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_gift_code_redemptions_id_idx" ON "payload_locked_documents_rels" USING btree ("gift_code_redemptions_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_attendance_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("attendance_claims_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "gift_codes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "gift_code_redemptions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "attendance_claims_id";
  ALTER TABLE "reward_settings" DROP COLUMN IF EXISTS "attendance_enabled";
  DROP TABLE IF EXISTS "reward_settings_attendance_rewards" CASCADE;
  DROP TABLE IF EXISTS "gift_code_redemptions" CASCADE;
  DROP TABLE IF EXISTS "attendance_claims" CASCADE;
  DROP TABLE IF EXISTS "gift_codes" CASCADE;
  `)
}
