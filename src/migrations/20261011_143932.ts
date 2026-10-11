import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_admins_roles" AS ENUM('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT');
  CREATE TYPE "public"."enum_users_status" AS ENUM('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'BLOCKED', 'DELETED');
  CREATE TYPE "public"."enum_wallets_status" AS ENUM('ACTIVE', 'FROZEN');
  CREATE TYPE "public"."enum_wallet_transactions_type" AS ENUM('TASK_REWARD', 'GAME_REWARD', 'GAME_BET', 'CAMPAIGN_REWARD', 'REFERRAL_REWARD', 'BONUS', 'WITHDRAWAL', 'REFUND', 'ADMIN_CREDIT', 'ADMIN_DEBIT', 'REVERSAL');
  CREATE TYPE "public"."enum_wallet_transactions_status" AS ENUM('COMPLETED');
  CREATE TYPE "public"."enum_wallet_adjustments_type" AS ENUM('CREDIT', 'DEBIT', 'REVERSAL');
  CREATE TYPE "public"."enum_wallet_adjustments_status" AS ENUM('APPLIED');
  CREATE TYPE "public"."enum_tasks_reward_type" AS ENUM('CASH', 'BONUS');
  CREATE TYPE "public"."enum_tasks_status" AS ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'DISABLED');
  CREATE TYPE "public"."enum_tasks_startsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_tasks_endsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_tasks_verification_type" AS ENUM('NONE', 'TIMER', 'ANSWER_CODE', 'TEXT_SUBMISSION', 'MANUAL_REVIEW');
  CREATE TYPE "public"."enum_task_completions_status" AS ENUM('STARTED', 'SUBMITTED', 'COMPLETED', 'REJECTED', 'EXPIRED');
  CREATE TYPE "public"."enum_games_config_math_operations" AS ENUM('ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'PERCENTAGE', 'MIXED');
  CREATE TYPE "public"."enum_games_type" AS ENUM('QUIZ', 'SUDOKU', 'MEMORY', 'NUMBER_SEQUENCE', 'MATH', 'REACTION', 'SPIN_WHEEL', 'WINGO');
  CREATE TYPE "public"."enum_games_difficulty" AS ENUM('EASY', 'MEDIUM', 'HARD', 'EXPERT');
  CREATE TYPE "public"."enum_games_status" AS ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'DISABLED');
  CREATE TYPE "public"."enum_games_startsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_games_endsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_games_reward_mode" AS ENUM('FIXED', 'PER_SCORE', 'TIERED');
  CREATE TYPE "public"."enum_games_config_sudoku_source" AS ENUM('CMS_THEN_GENERATED', 'CMS_ONLY', 'GENERATED');
  CREATE TYPE "public"."enum_game_sessions_status" AS ENUM('STARTED', 'COMPLETED', 'EXPIRED', 'REJECTED');
  CREATE TYPE "public"."enum_game_sessions_result" AS ENUM('WIN', 'PARTIAL', 'LOSE');
  CREATE TYPE "public"."enum_quiz_questions_type" AS ENUM('MULTIPLE_CHOICE', 'TRUE_FALSE');
  CREATE TYPE "public"."enum_quiz_questions_difficulty" AS ENUM('EASY', 'MEDIUM', 'HARD');
  CREATE TYPE "public"."enum_sudoku_puzzles_difficulty" AS ENUM('EASY', 'MEDIUM', 'HARD', 'EXPERT');
  CREATE TYPE "public"."enum_campaigns_required_actions_type" AS ENUM('TASKS_COMPLETED', 'GAMES_PLAYED', 'GAMES_WON', 'REFERRALS_QUALIFIED', 'AMOUNT_EARNED', 'SPECIFIC_TASK', 'SPECIFIC_GAME');
  CREATE TYPE "public"."enum_campaigns_reward_type" AS ENUM('CASH', 'BONUS');
  CREATE TYPE "public"."enum_campaigns_status" AS ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'COMPLETED');
  CREATE TYPE "public"."enum_campaigns_startsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_campaigns_endsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_casino_rounds_game" AS ENUM('MINE', 'POKER', 'CRASH', 'SLIDE');
  CREATE TYPE "public"."enum_casino_rounds_status" AS ENUM('ACTIVE', 'WON', 'LOST', 'CASHED_OUT', 'REFUNDED');
  CREATE TYPE "public"."enum_referral_rules_startsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_referral_rules_endsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_referral_rules_qualification" AS ENUM('REGISTRATION', 'VERIFIED_ACCOUNT', 'FIRST_TASK', 'FIRST_GAME', 'AMOUNT_EARNED');
  CREATE TYPE "public"."enum_referrals_status" AS ENUM('PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED');
  CREATE TYPE "public"."enum_withdrawals_method" AS ENUM('UPI', 'BANK');
  CREATE TYPE "public"."enum_withdrawals_status" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED');
  CREATE TYPE "public"."enum_payout_methods_type" AS ENUM('UPI', 'BANK');
  CREATE TYPE "public"."enum_payout_methods_status" AS ENUM('ACTIVE', 'REMOVED');
  CREATE TYPE "public"."enum_banners_startsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_banners_endsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_announcements_severity" AS ENUM('INFO', 'SUCCESS', 'WARNING');
  CREATE TYPE "public"."enum_announcements_startsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_announcements_endsat_tz" AS ENUM('Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney');
  CREATE TYPE "public"."enum_notifications_type" AS ENUM('REWARD_CREDITED', 'TASK_COMPLETED', 'GAME_REWARD', 'CAMPAIGN_STARTED', 'CAMPAIGN_ENDING', 'WITHDRAWAL_REQUESTED', 'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED', 'WITHDRAWAL_COMPLETED', 'REFERRAL_REWARDED', 'SYSTEM');
  CREATE TYPE "public"."enum_audit_logs_action" AS ENUM('USER_SUSPENDED', 'USER_UNSUSPENDED', 'USER_BLOCKED', 'USER_STATUS_CHANGED', 'REWARD_CREDITED', 'REWARD_DEBITED', 'TRANSACTION_REVERSED', 'WITHDRAWAL_REQUESTED', 'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED', 'WITHDRAWAL_COMPLETED', 'WITHDRAWAL_FAILED', 'WITHDRAWAL_CANCELLED', 'WITHDRAWAL_STATUS_CHANGED', 'TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'TASK_COMPLETION_REVIEWED', 'GAME_CREATED', 'GAME_UPDATED', 'GAME_DELETED', 'CAMPAIGN_CREATED', 'CAMPAIGN_UPDATED', 'CAMPAIGN_DELETED', 'SETTINGS_UPDATED', 'CONTENT_UPDATED', 'ADMIN_CREATED', 'ADMIN_UPDATED', 'WALLET_RECONCILED', 'OTHER');
  CREATE TYPE "public"."enum_wingo_rounds_mode" AS ENUM('30s', '1m', '3m', '5m');
  CREATE TYPE "public"."enum_wingo_rounds_status" AS ENUM('OPEN', 'SETTLED');
  CREATE TYPE "public"."enum_wingo_bets_mode" AS ENUM('30s', '1m', '3m', '5m');
  CREATE TYPE "public"."enum_wingo_bets_type" AS ENUM('number', 'color', 'size');
  CREATE TYPE "public"."enum_wingo_bets_status" AS ENUM('PENDING', 'WON', 'LOST');
  CREATE TYPE "public"."enum_wingo_point_transactions_type" AS ENUM('STAKE', 'PAYOUT', 'GRANT', 'REFUND');
  CREATE TYPE "public"."enum_site_settings_currency" AS ENUM('INR');
  CREATE TYPE "public"."enum_reward_settings_default_referral_qualification" AS ENUM('REGISTRATION', 'VERIFIED_ACCOUNT', 'FIRST_TASK', 'FIRST_GAME', 'AMOUNT_EARNED');
  CREATE TABLE "admins_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_admins_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "admins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"last_login_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"status" "enum_users_status" DEFAULT 'ACTIVE' NOT NULL,
  	"status_reason" varchar,
  	"status_changed_at" timestamp(3) with time zone,
  	"referral_code" varchar,
  	"timezone" varchar DEFAULT 'Asia/Kolkata',
  	"phone_verified" boolean DEFAULT false,
  	"terms_accepted_at" timestamp(3) with time zone,
  	"registration_ip" varchar,
  	"last_login_at" timestamp(3) with time zone,
  	"last_login_ip" varchar,
  	"deleted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "wallets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"available_balance" numeric DEFAULT 0,
  	"pending_balance" numeric DEFAULT 0,
  	"lifetime_earned" numeric DEFAULT 0,
  	"lifetime_withdrawn" numeric DEFAULT 0,
  	"currency" varchar DEFAULT 'INR' NOT NULL,
  	"status" "enum_wallets_status" DEFAULT 'ACTIVE' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wallet_transactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"wallet_id" integer NOT NULL,
  	"type" "enum_wallet_transactions_type" NOT NULL,
  	"amount" numeric DEFAULT 0 NOT NULL,
  	"balance_before" numeric DEFAULT 0 NOT NULL,
  	"balance_after" numeric DEFAULT 0 NOT NULL,
  	"currency" varchar NOT NULL,
  	"reference_type" varchar,
  	"reference_id" varchar,
  	"description" varchar NOT NULL,
  	"status" "enum_wallet_transactions_status" DEFAULT 'COMPLETED' NOT NULL,
  	"idempotency_key" varchar NOT NULL,
  	"reversal_of_id" integer,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wallet_adjustments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_wallet_adjustments_type" NOT NULL,
  	"user_id" integer,
  	"amount" numeric DEFAULT 0,
  	"target_transaction_id" integer,
  	"reason" varchar NOT NULL,
  	"reference" varchar,
  	"admin_id" integer,
  	"status" "enum_wallet_adjustments_status" DEFAULT 'APPLIED',
  	"applied_at" timestamp(3) with time zone,
  	"resulting_transaction_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tasks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"instructions" varchar,
  	"icon_id" integer,
  	"reward_amount" numeric DEFAULT 100 NOT NULL,
  	"reward_type" "enum_tasks_reward_type" DEFAULT 'CASH',
  	"per_user_limit" numeric DEFAULT 1 NOT NULL,
  	"per_user_daily_limit" numeric DEFAULT 0,
  	"cooldown_minutes" numeric DEFAULT 0,
  	"daily_limit" numeric DEFAULT 0,
  	"total_limit" numeric DEFAULT 0,
  	"status" "enum_tasks_status" DEFAULT 'DRAFT' NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"starts_at" timestamp(3) with time zone,
  	"startsat_tz" "enum_tasks_startsat_tz" DEFAULT 'Asia/Kolkata',
  	"ends_at" timestamp(3) with time zone,
  	"endsat_tz" "enum_tasks_endsat_tz" DEFAULT 'Asia/Kolkata',
  	"published_at" timestamp(3) with time zone,
  	"eligibility_min_account_age_days" numeric DEFAULT 0,
  	"eligibility_require_verified_account" boolean DEFAULT false,
  	"eligibility_require_payout_method" boolean DEFAULT false,
  	"eligibility_min_lifetime_earned" numeric DEFAULT 0,
  	"verification_type" "enum_tasks_verification_type" DEFAULT 'NONE',
  	"verification_timer_seconds" numeric,
  	"verification_answer_code" varchar,
  	"verification_submission_prompt" varchar,
  	"featured" boolean DEFAULT false,
  	"priority" numeric DEFAULT 0,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "task_completions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"task_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"attempt_number" numeric DEFAULT 1 NOT NULL,
  	"status" "enum_task_completions_status" DEFAULT 'STARTED' NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"submitted_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"rejected_at" timestamp(3) with time zone,
  	"submission" varchar,
  	"reward_amount" numeric DEFAULT 0,
  	"transaction_id" integer,
  	"rejection_reason" varchar,
  	"reviewed_by_id" integer,
  	"reviewed_at" timestamp(3) with time zone,
  	"ip" varchar,
  	"device" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "games_reward_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"min_score_percent" numeric,
  	"amount" numeric DEFAULT 0
  );
  
  CREATE TABLE "games_config_math_operations" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_games_config_math_operations",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "games_config_segments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"amount" numeric DEFAULT 0,
  	"weight" numeric DEFAULT 1,
  	"color" varchar
  );
  
  CREATE TABLE "games" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"type" "enum_games_type" NOT NULL,
  	"difficulty" "enum_games_difficulty" DEFAULT 'EASY' NOT NULL,
  	"icon_id" integer,
  	"thumbnail_id" integer,
  	"featured" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 0,
  	"status" "enum_games_status" DEFAULT 'DRAFT' NOT NULL,
  	"starts_at" timestamp(3) with time zone,
  	"startsat_tz" "enum_games_startsat_tz" DEFAULT 'Asia/Kolkata',
  	"ends_at" timestamp(3) with time zone,
  	"endsat_tz" "enum_games_endsat_tz" DEFAULT 'Asia/Kolkata',
  	"reward_mode" "enum_games_reward_mode" DEFAULT 'FIXED',
  	"reward_amount" numeric DEFAULT 50,
  	"reward_min_score_percent" numeric DEFAULT 60,
  	"max_attempts_per_day" numeric DEFAULT 5,
  	"daily_rewarded_plays" numeric DEFAULT 3,
  	"cooldown_seconds" numeric DEFAULT 30,
  	"duration_seconds" numeric DEFAULT 180,
  	"config_question_count" numeric DEFAULT 5,
  	"config_seconds_per_question" numeric DEFAULT 20,
  	"config_category" varchar,
  	"config_sudoku_source" "enum_games_config_sudoku_source" DEFAULT 'CMS_THEN_GENERATED',
  	"config_min_solve_seconds" numeric DEFAULT 20,
  	"config_rows" numeric DEFAULT 4,
  	"config_cols" numeric DEFAULT 4,
  	"config_rounds" numeric DEFAULT 5,
  	"config_min_delay_ms" numeric DEFAULT 1200,
  	"config_max_delay_ms" numeric DEFAULT 4000,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "game_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"game_id" integer NOT NULL,
  	"status" "enum_game_sessions_status" DEFAULT 'STARTED' NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"ended_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"day_key" varchar,
  	"score" numeric,
  	"max_score" numeric,
  	"score_percent" numeric,
  	"result" "enum_game_sessions_result",
  	"attempts" numeric DEFAULT 0,
  	"reward_amount" numeric DEFAULT 0,
  	"transaction_id" integer,
  	"rounds" jsonb,
  	"rejection_reason" varchar,
  	"server_state" jsonb,
  	"ip" varchar,
  	"user_agent" varchar,
  	"device" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "quiz_questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"is_correct" boolean DEFAULT false
  );
  
  CREATE TABLE "quiz_questions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"type" "enum_quiz_questions_type" DEFAULT 'MULTIPLE_CHOICE' NOT NULL,
  	"explanation" varchar,
  	"difficulty" "enum_quiz_questions_difficulty" DEFAULT 'EASY' NOT NULL,
  	"category" varchar,
  	"time_limit_seconds" numeric,
  	"points" numeric DEFAULT 10 NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "quiz_questions_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "sudoku_puzzles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"difficulty" "enum_sudoku_puzzles_difficulty" NOT NULL,
  	"puzzle" varchar NOT NULL,
  	"solution" varchar NOT NULL,
  	"clue_count" numeric,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "campaigns_required_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_campaigns_required_actions_type" NOT NULL,
  	"target" numeric DEFAULT 1 NOT NULL,
  	"task_id" integer,
  	"game_id" integer,
  	"label" varchar
  );
  
  CREATE TABLE "campaigns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"banner_id" integer,
  	"terms" jsonb,
  	"reward_amount" numeric DEFAULT 500 NOT NULL,
  	"reward_type" "enum_campaigns_reward_type" DEFAULT 'CASH',
  	"eligibility_min_account_age_days" numeric DEFAULT 0,
  	"eligibility_require_verified_account" boolean DEFAULT false,
  	"eligibility_require_payout_method" boolean DEFAULT false,
  	"eligibility_min_lifetime_earned" numeric DEFAULT 0,
  	"per_user_limit" numeric DEFAULT 1 NOT NULL,
  	"user_limit" numeric DEFAULT 0,
  	"global_limit" numeric DEFAULT 0,
  	"status" "enum_campaigns_status" DEFAULT 'DRAFT' NOT NULL,
  	"starts_at" timestamp(3) with time zone,
  	"startsat_tz" "enum_campaigns_startsat_tz" DEFAULT 'Asia/Kolkata',
  	"ends_at" timestamp(3) with time zone,
  	"endsat_tz" "enum_campaigns_endsat_tz" DEFAULT 'Asia/Kolkata',
  	"featured" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 0,
  	"start_notified_at" timestamp(3) with time zone,
  	"ending_notified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "campaign_claims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"campaign_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"claim_number" numeric NOT NULL,
  	"reward_amount" numeric DEFAULT 0,
  	"transaction_id" integer,
  	"claimed_at" timestamp(3) with time zone NOT NULL,
  	"progress" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "casino_rounds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"game" "enum_casino_rounds_game" NOT NULL,
  	"user_id" integer NOT NULL,
  	"status" "enum_casino_rounds_status" NOT NULL,
  	"bet_amount" numeric NOT NULL,
  	"payout_amount" numeric DEFAULT 0,
  	"currency" varchar DEFAULT 'INR' NOT NULL,
  	"state" jsonb NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"settled_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "referral_rules" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"priority" numeric DEFAULT 0,
  	"campaign_id" integer,
  	"starts_at" timestamp(3) with time zone,
  	"startsat_tz" "enum_referral_rules_startsat_tz" DEFAULT 'Asia/Kolkata',
  	"ends_at" timestamp(3) with time zone,
  	"endsat_tz" "enum_referral_rules_endsat_tz" DEFAULT 'Asia/Kolkata',
  	"referrer_reward" numeric DEFAULT 1000 NOT NULL,
  	"referee_reward" numeric DEFAULT 0,
  	"qualification" "enum_referral_rules_qualification" DEFAULT 'FIRST_TASK' NOT NULL,
  	"qualification_amount" numeric DEFAULT 0,
  	"per_referrer_limit" numeric DEFAULT 50,
  	"global_limit" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "referrals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"referrer_id" integer NOT NULL,
  	"referred_user_id" integer NOT NULL,
  	"code" varchar NOT NULL,
  	"status" "enum_referrals_status" DEFAULT 'PENDING' NOT NULL,
  	"rule_id" integer,
  	"terms" jsonb,
  	"registered_at" timestamp(3) with time zone NOT NULL,
  	"qualified_at" timestamp(3) with time zone,
  	"rewarded_at" timestamp(3) with time zone,
  	"rejected_at" timestamp(3) with time zone,
  	"rejection_reason" varchar,
  	"referrer_reward" numeric DEFAULT 0,
  	"referee_reward" numeric DEFAULT 0,
  	"referrer_transaction_id" integer,
  	"referee_transaction_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "withdrawals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"wallet_id" integer NOT NULL,
  	"amount" numeric DEFAULT 0 NOT NULL,
  	"currency" varchar NOT NULL,
  	"method" "enum_withdrawals_method" NOT NULL,
  	"payout_method_id" integer,
  	"payout_summary" varchar,
  	"payout_details_encrypted" varchar,
  	"status" "enum_withdrawals_status" DEFAULT 'PENDING' NOT NULL,
  	"failure_reason" varchar,
  	"transaction_reference" varchar,
  	"admin_note" varchar,
  	"requested_at" timestamp(3) with time zone NOT NULL,
  	"reviewed_at" timestamp(3) with time zone,
  	"processed_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"rejected_at" timestamp(3) with time zone,
  	"failed_at" timestamp(3) with time zone,
  	"cancelled_at" timestamp(3) with time zone,
  	"reviewed_by_id" integer,
  	"debit_transaction_id" integer,
  	"refund_transaction_id" integer,
  	"idempotency_key" varchar NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payout_methods" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"type" "enum_payout_methods_type" NOT NULL,
  	"label" varchar NOT NULL,
  	"holder_name" varchar,
  	"masked_details" varchar NOT NULL,
  	"ifsc" varchar,
  	"bank_name" varchar,
  	"encrypted_details" varchar NOT NULL,
  	"fingerprint" varchar,
  	"is_default" boolean DEFAULT false,
  	"status" "enum_payout_methods_status" DEFAULT 'ACTIVE',
  	"removed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "banners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"image_id" integer NOT NULL,
  	"cta_label" varchar,
  	"cta_url" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"startsat_tz" "enum_banners_startsat_tz" DEFAULT 'Asia/Kolkata',
  	"ends_at" timestamp(3) with time zone,
  	"endsat_tz" "enum_banners_endsat_tz" DEFAULT 'Asia/Kolkata',
  	"is_active" boolean DEFAULT true,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "announcements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"severity" "enum_announcements_severity" DEFAULT 'INFO',
  	"image_id" integer,
  	"starts_at" timestamp(3) with time zone,
  	"startsat_tz" "enum_announcements_startsat_tz" DEFAULT 'Asia/Kolkata',
  	"ends_at" timestamp(3) with time zone,
  	"endsat_tz" "enum_announcements_endsat_tz" DEFAULT 'Asia/Kolkata',
  	"is_active" boolean DEFAULT true,
  	"is_pinned" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"type" "enum_notifications_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar,
  	"data" jsonb,
  	"read_at" timestamp(3) with time zone,
  	"dedupe_key" varchar,
  	"channels" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"is_active" boolean DEFAULT true,
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_banner_url" varchar,
  	"sizes_banner_width" numeric,
  	"sizes_banner_height" numeric,
  	"sizes_banner_mime_type" varchar,
  	"sizes_banner_filesize" numeric,
  	"sizes_banner_filename" varchar
  );
  
  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"admin_id" integer,
  	"actor_label" varchar,
  	"action" "enum_audit_logs_action" NOT NULL,
  	"collection_slug" varchar,
  	"document_id" varchar,
  	"before" jsonb,
  	"after" jsonb,
  	"metadata" jsonb,
  	"ip" varchar,
  	"user_agent" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wingo_rounds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"period_key" varchar NOT NULL,
  	"mode" "enum_wingo_rounds_mode" NOT NULL,
  	"status" "enum_wingo_rounds_status" DEFAULT 'OPEN' NOT NULL,
  	"start_at" timestamp(3) with time zone NOT NULL,
  	"betting_closes_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone NOT NULL,
  	"winning_number" numeric,
  	"settled_at" timestamp(3) with time zone,
  	"settlement_version" numeric DEFAULT 1,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wingo_bets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"round_id" integer NOT NULL,
  	"period_key" varchar NOT NULL,
  	"mode" "enum_wingo_bets_mode" NOT NULL,
  	"type" "enum_wingo_bets_type" NOT NULL,
  	"selection" varchar NOT NULL,
  	"stake" numeric NOT NULL,
  	"payout" numeric DEFAULT 0 NOT NULL,
  	"status" "enum_wingo_bets_status" DEFAULT 'PENDING' NOT NULL,
  	"winning_number" numeric,
  	"idempotency_key" varchar NOT NULL,
  	"settled_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wingo_point_wallets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"balance" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wingo_point_transactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"type" "enum_wingo_point_transactions_type" NOT NULL,
  	"amount" numeric NOT NULL,
  	"balance_before" numeric NOT NULL,
  	"balance_after" numeric NOT NULL,
  	"reference_type" varchar,
  	"reference_id" varchar,
  	"idempotency_key" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer,
  	"wallets_id" integer,
  	"wallet_transactions_id" integer,
  	"wallet_adjustments_id" integer,
  	"tasks_id" integer,
  	"task_completions_id" integer,
  	"games_id" integer,
  	"game_sessions_id" integer,
  	"quiz_questions_id" integer,
  	"sudoku_puzzles_id" integer,
  	"campaigns_id" integer,
  	"campaign_claims_id" integer,
  	"casino_rounds_id" integer,
  	"referral_rules_id" integer,
  	"referrals_id" integer,
  	"withdrawals_id" integer,
  	"payout_methods_id" integer,
  	"banners_id" integer,
  	"announcements_id" integer,
  	"notifications_id" integer,
  	"media_id" integer,
  	"audit_logs_id" integer,
  	"wingo_rounds_id" integer,
  	"wingo_bets_id" integer,
  	"wingo_point_wallets_id" integer,
  	"wingo_point_transactions_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"app_name" varchar DEFAULT 'Rewards' NOT NULL,
  	"tagline" varchar DEFAULT 'Play, complete tasks and earn.',
  	"logo_id" integer,
  	"favicon_id" integer,
  	"support_email" varchar,
  	"support_phone" varchar,
  	"support_url" varchar,
  	"default_timezone" varchar DEFAULT 'Asia/Kolkata' NOT NULL,
  	"currency" "enum_site_settings_currency" DEFAULT 'INR' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "reward_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"minimum_withdrawal" numeric DEFAULT 10000 NOT NULL,
  	"maximum_withdrawal" numeric DEFAULT 1000000 NOT NULL,
  	"daily_withdrawal_limit" numeric DEFAULT 2500000 NOT NULL,
  	"max_open_withdrawals" numeric DEFAULT 1 NOT NULL,
  	"default_referral_reward" numeric DEFAULT 1000,
  	"default_referral_qualification" "enum_reward_settings_default_referral_qualification" DEFAULT 'FIRST_TASK',
  	"default_referral_qualification_amount" numeric DEFAULT 0,
  	"default_referral_per_referrer_limit" numeric DEFAULT 50,
  	"default_game_reward" numeric DEFAULT 50,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "feature_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"games_enabled" boolean DEFAULT true,
  	"tasks_enabled" boolean DEFAULT true,
  	"campaigns_enabled" boolean DEFAULT true,
  	"referrals_enabled" boolean DEFAULT true,
  	"withdrawals_enabled" boolean DEFAULT true,
  	"registration_enabled" boolean DEFAULT true,
  	"maintenance_mode" boolean DEFAULT false,
  	"maintenance_message" varchar DEFAULT 'We are making improvements and will be back shortly.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "legal_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"terms" jsonb,
  	"privacy_policy" jsonb,
  	"refund_policy" jsonb,
  	"responsible_use" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "admins_roles" ADD CONSTRAINT "admins_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_reversal_of_id_wallet_transactions_id_fk" FOREIGN KEY ("reversal_of_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_target_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("target_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_resulting_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("resulting_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_reviewed_by_id_admins_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "games_reward_tiers" ADD CONSTRAINT "games_reward_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "games_config_math_operations" ADD CONSTRAINT "games_config_math_operations_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "games_config_segments" ADD CONSTRAINT "games_config_segments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "games" ADD CONSTRAINT "games_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "games" ADD CONSTRAINT "games_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quiz_questions_options" ADD CONSTRAINT "quiz_questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quiz_questions_texts" ADD CONSTRAINT "quiz_questions_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campaigns_required_actions" ADD CONSTRAINT "campaigns_required_actions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campaigns_required_actions" ADD CONSTRAINT "campaigns_required_actions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campaigns_required_actions" ADD CONSTRAINT "campaigns_required_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_banner_id_media_id_fk" FOREIGN KEY ("banner_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campaign_claims" ADD CONSTRAINT "campaign_claims_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campaign_claims" ADD CONSTRAINT "campaign_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campaign_claims" ADD CONSTRAINT "campaign_claims_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "casino_rounds" ADD CONSTRAINT "casino_rounds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referral_rules" ADD CONSTRAINT "referral_rules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_rule_id_referral_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."referral_rules"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("referrer_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("referee_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_payout_method_id_payout_methods_id_fk" FOREIGN KEY ("payout_method_id") REFERENCES "public"."payout_methods"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_reviewed_by_id_admins_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_debit_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("debit_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_refund_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("refund_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payout_methods" ADD CONSTRAINT "payout_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "banners" ADD CONSTRAINT "banners_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wingo_bets" ADD CONSTRAINT "wingo_bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wingo_bets" ADD CONSTRAINT "wingo_bets_round_id_wingo_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."wingo_rounds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wingo_point_wallets" ADD CONSTRAINT "wingo_point_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wingo_point_transactions" ADD CONSTRAINT "wingo_point_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wallets_fk" FOREIGN KEY ("wallets_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wallet_transactions_fk" FOREIGN KEY ("wallet_transactions_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wallet_adjustments_fk" FOREIGN KEY ("wallet_adjustments_id") REFERENCES "public"."wallet_adjustments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tasks_fk" FOREIGN KEY ("tasks_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_task_completions_fk" FOREIGN KEY ("task_completions_id") REFERENCES "public"."task_completions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_games_fk" FOREIGN KEY ("games_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_game_sessions_fk" FOREIGN KEY ("game_sessions_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quiz_questions_fk" FOREIGN KEY ("quiz_questions_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sudoku_puzzles_fk" FOREIGN KEY ("sudoku_puzzles_id") REFERENCES "public"."sudoku_puzzles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campaigns_fk" FOREIGN KEY ("campaigns_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campaign_claims_fk" FOREIGN KEY ("campaign_claims_id") REFERENCES "public"."campaign_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_casino_rounds_fk" FOREIGN KEY ("casino_rounds_id") REFERENCES "public"."casino_rounds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_referral_rules_fk" FOREIGN KEY ("referral_rules_id") REFERENCES "public"."referral_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_referrals_fk" FOREIGN KEY ("referrals_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_withdrawals_fk" FOREIGN KEY ("withdrawals_id") REFERENCES "public"."withdrawals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payout_methods_fk" FOREIGN KEY ("payout_methods_id") REFERENCES "public"."payout_methods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_banners_fk" FOREIGN KEY ("banners_id") REFERENCES "public"."banners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_announcements_fk" FOREIGN KEY ("announcements_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk" FOREIGN KEY ("notifications_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wingo_rounds_fk" FOREIGN KEY ("wingo_rounds_id") REFERENCES "public"."wingo_rounds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wingo_bets_fk" FOREIGN KEY ("wingo_bets_id") REFERENCES "public"."wingo_bets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wingo_point_wallets_fk" FOREIGN KEY ("wingo_point_wallets_id") REFERENCES "public"."wingo_point_wallets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wingo_point_transactions_fk" FOREIGN KEY ("wingo_point_transactions_id") REFERENCES "public"."wingo_point_transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "admins_roles_order_idx" ON "admins_roles" USING btree ("order");
  CREATE INDEX "admins_roles_parent_idx" ON "admins_roles" USING btree ("parent_id");
  CREATE INDEX "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "admins_updated_at_idx" ON "admins" USING btree ("updated_at");
  CREATE INDEX "admins_created_at_idx" ON "admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");
  CREATE INDEX "users_status_idx" ON "users" USING btree ("status");
  CREATE UNIQUE INDEX "users_referral_code_idx" ON "users" USING btree ("referral_code");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "wallets_user_idx" ON "wallets" USING btree ("user_id");
  CREATE INDEX "wallets_status_idx" ON "wallets" USING btree ("status");
  CREATE INDEX "wallets_updated_at_idx" ON "wallets" USING btree ("updated_at");
  CREATE INDEX "wallets_created_at_idx" ON "wallets" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_idx" ON "wallets" USING btree ("user_id");
  CREATE INDEX "wallet_transactions_user_idx" ON "wallet_transactions" USING btree ("user_id");
  CREATE INDEX "wallet_transactions_wallet_idx" ON "wallet_transactions" USING btree ("wallet_id");
  CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions" USING btree ("type");
  CREATE INDEX "wallet_transactions_reference_type_idx" ON "wallet_transactions" USING btree ("reference_type");
  CREATE INDEX "wallet_transactions_reference_id_idx" ON "wallet_transactions" USING btree ("reference_id");
  CREATE UNIQUE INDEX "wallet_transactions_idempotency_key_idx" ON "wallet_transactions" USING btree ("idempotency_key");
  CREATE UNIQUE INDEX "wallet_transactions_reversal_of_idx" ON "wallet_transactions" USING btree ("reversal_of_id");
  CREATE INDEX "wallet_transactions_updated_at_idx" ON "wallet_transactions" USING btree ("updated_at");
  CREATE INDEX "wallet_transactions_created_at_idx" ON "wallet_transactions" USING btree ("created_at");
  CREATE INDEX "user_createdAt_idx" ON "wallet_transactions" USING btree ("user_id","created_at");
  CREATE INDEX "type_createdAt_idx" ON "wallet_transactions" USING btree ("type","created_at");
  CREATE INDEX "referenceType_referenceId_idx" ON "wallet_transactions" USING btree ("reference_type","reference_id");
  CREATE INDEX "wallet_adjustments_user_idx" ON "wallet_adjustments" USING btree ("user_id");
  CREATE INDEX "wallet_adjustments_target_transaction_idx" ON "wallet_adjustments" USING btree ("target_transaction_id");
  CREATE INDEX "wallet_adjustments_admin_idx" ON "wallet_adjustments" USING btree ("admin_id");
  CREATE INDEX "wallet_adjustments_resulting_transaction_idx" ON "wallet_adjustments" USING btree ("resulting_transaction_id");
  CREATE INDEX "wallet_adjustments_updated_at_idx" ON "wallet_adjustments" USING btree ("updated_at");
  CREATE INDEX "wallet_adjustments_created_at_idx" ON "wallet_adjustments" USING btree ("created_at");
  CREATE UNIQUE INDEX "tasks_slug_idx" ON "tasks" USING btree ("slug");
  CREATE INDEX "tasks_icon_idx" ON "tasks" USING btree ("icon_id");
  CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");
  CREATE INDEX "tasks_starts_at_idx" ON "tasks" USING btree ("starts_at");
  CREATE INDEX "tasks_ends_at_idx" ON "tasks" USING btree ("ends_at");
  CREATE INDEX "tasks_featured_idx" ON "tasks" USING btree ("featured");
  CREATE INDEX "tasks_updated_at_idx" ON "tasks" USING btree ("updated_at");
  CREATE INDEX "tasks_created_at_idx" ON "tasks" USING btree ("created_at");
  CREATE INDEX "task_completions_task_idx" ON "task_completions" USING btree ("task_id");
  CREATE INDEX "task_completions_user_idx" ON "task_completions" USING btree ("user_id");
  CREATE INDEX "task_completions_status_idx" ON "task_completions" USING btree ("status");
  CREATE INDEX "task_completions_completed_at_idx" ON "task_completions" USING btree ("completed_at");
  CREATE INDEX "task_completions_transaction_idx" ON "task_completions" USING btree ("transaction_id");
  CREATE INDEX "task_completions_reviewed_by_idx" ON "task_completions" USING btree ("reviewed_by_id");
  CREATE INDEX "task_completions_updated_at_idx" ON "task_completions" USING btree ("updated_at");
  CREATE INDEX "task_completions_created_at_idx" ON "task_completions" USING btree ("created_at");
  CREATE INDEX "user_task_idx" ON "task_completions" USING btree ("user_id","task_id");
  CREATE INDEX "task_completedAt_idx" ON "task_completions" USING btree ("task_id","completed_at");
  CREATE UNIQUE INDEX "task_user_attemptNumber_idx" ON "task_completions" USING btree ("task_id","user_id","attempt_number");
  CREATE INDEX "games_reward_tiers_order_idx" ON "games_reward_tiers" USING btree ("_order");
  CREATE INDEX "games_reward_tiers_parent_id_idx" ON "games_reward_tiers" USING btree ("_parent_id");
  CREATE INDEX "games_config_math_operations_order_idx" ON "games_config_math_operations" USING btree ("order");
  CREATE INDEX "games_config_math_operations_parent_idx" ON "games_config_math_operations" USING btree ("parent_id");
  CREATE INDEX "games_config_segments_order_idx" ON "games_config_segments" USING btree ("_order");
  CREATE INDEX "games_config_segments_parent_id_idx" ON "games_config_segments" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "games_slug_idx" ON "games" USING btree ("slug");
  CREATE INDEX "games_type_idx" ON "games" USING btree ("type");
  CREATE INDEX "games_icon_idx" ON "games" USING btree ("icon_id");
  CREATE INDEX "games_thumbnail_idx" ON "games" USING btree ("thumbnail_id");
  CREATE INDEX "games_featured_idx" ON "games" USING btree ("featured");
  CREATE INDEX "games_status_idx" ON "games" USING btree ("status");
  CREATE INDEX "games_starts_at_idx" ON "games" USING btree ("starts_at");
  CREATE INDEX "games_ends_at_idx" ON "games" USING btree ("ends_at");
  CREATE INDEX "games_updated_at_idx" ON "games" USING btree ("updated_at");
  CREATE INDEX "games_created_at_idx" ON "games" USING btree ("created_at");
  CREATE UNIQUE INDEX "game_sessions_session_id_idx" ON "game_sessions" USING btree ("session_id");
  CREATE INDEX "game_sessions_user_idx" ON "game_sessions" USING btree ("user_id");
  CREATE INDEX "game_sessions_game_idx" ON "game_sessions" USING btree ("game_id");
  CREATE INDEX "game_sessions_status_idx" ON "game_sessions" USING btree ("status");
  CREATE INDEX "game_sessions_day_key_idx" ON "game_sessions" USING btree ("day_key");
  CREATE INDEX "game_sessions_transaction_idx" ON "game_sessions" USING btree ("transaction_id");
  CREATE INDEX "game_sessions_updated_at_idx" ON "game_sessions" USING btree ("updated_at");
  CREATE INDEX "game_sessions_created_at_idx" ON "game_sessions" USING btree ("created_at");
  CREATE INDEX "user_game_createdAt_idx" ON "game_sessions" USING btree ("user_id","game_id","created_at");
  CREATE INDEX "user_dayKey_idx" ON "game_sessions" USING btree ("user_id","day_key");
  CREATE INDEX "game_createdAt_idx" ON "game_sessions" USING btree ("game_id","created_at");
  CREATE INDEX "quiz_questions_options_order_idx" ON "quiz_questions_options" USING btree ("_order");
  CREATE INDEX "quiz_questions_options_parent_id_idx" ON "quiz_questions_options" USING btree ("_parent_id");
  CREATE INDEX "quiz_questions_difficulty_idx" ON "quiz_questions" USING btree ("difficulty");
  CREATE INDEX "quiz_questions_category_idx" ON "quiz_questions" USING btree ("category");
  CREATE INDEX "quiz_questions_is_active_idx" ON "quiz_questions" USING btree ("is_active");
  CREATE INDEX "quiz_questions_updated_at_idx" ON "quiz_questions" USING btree ("updated_at");
  CREATE INDEX "quiz_questions_created_at_idx" ON "quiz_questions" USING btree ("created_at");
  CREATE INDEX "quiz_questions_texts_order_parent" ON "quiz_questions_texts" USING btree ("order","parent_id");
  CREATE INDEX "sudoku_puzzles_difficulty_idx" ON "sudoku_puzzles" USING btree ("difficulty");
  CREATE INDEX "sudoku_puzzles_is_active_idx" ON "sudoku_puzzles" USING btree ("is_active");
  CREATE INDEX "sudoku_puzzles_updated_at_idx" ON "sudoku_puzzles" USING btree ("updated_at");
  CREATE INDEX "sudoku_puzzles_created_at_idx" ON "sudoku_puzzles" USING btree ("created_at");
  CREATE INDEX "campaigns_required_actions_order_idx" ON "campaigns_required_actions" USING btree ("_order");
  CREATE INDEX "campaigns_required_actions_parent_id_idx" ON "campaigns_required_actions" USING btree ("_parent_id");
  CREATE INDEX "campaigns_required_actions_task_idx" ON "campaigns_required_actions" USING btree ("task_id");
  CREATE INDEX "campaigns_required_actions_game_idx" ON "campaigns_required_actions" USING btree ("game_id");
  CREATE UNIQUE INDEX "campaigns_slug_idx" ON "campaigns" USING btree ("slug");
  CREATE INDEX "campaigns_banner_idx" ON "campaigns" USING btree ("banner_id");
  CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");
  CREATE INDEX "campaigns_starts_at_idx" ON "campaigns" USING btree ("starts_at");
  CREATE INDEX "campaigns_ends_at_idx" ON "campaigns" USING btree ("ends_at");
  CREATE INDEX "campaigns_featured_idx" ON "campaigns" USING btree ("featured");
  CREATE INDEX "campaigns_updated_at_idx" ON "campaigns" USING btree ("updated_at");
  CREATE INDEX "campaigns_created_at_idx" ON "campaigns" USING btree ("created_at");
  CREATE INDEX "campaign_claims_campaign_idx" ON "campaign_claims" USING btree ("campaign_id");
  CREATE INDEX "campaign_claims_user_idx" ON "campaign_claims" USING btree ("user_id");
  CREATE INDEX "campaign_claims_transaction_idx" ON "campaign_claims" USING btree ("transaction_id");
  CREATE INDEX "campaign_claims_claimed_at_idx" ON "campaign_claims" USING btree ("claimed_at");
  CREATE INDEX "campaign_claims_updated_at_idx" ON "campaign_claims" USING btree ("updated_at");
  CREATE INDEX "campaign_claims_created_at_idx" ON "campaign_claims" USING btree ("created_at");
  CREATE UNIQUE INDEX "campaign_user_claimNumber_idx" ON "campaign_claims" USING btree ("campaign_id","user_id","claim_number");
  CREATE INDEX "user_claimedAt_idx" ON "campaign_claims" USING btree ("user_id","claimed_at");
  CREATE INDEX "casino_rounds_game_idx" ON "casino_rounds" USING btree ("game");
  CREATE INDEX "casino_rounds_user_idx" ON "casino_rounds" USING btree ("user_id");
  CREATE INDEX "casino_rounds_status_idx" ON "casino_rounds" USING btree ("status");
  CREATE INDEX "casino_rounds_updated_at_idx" ON "casino_rounds" USING btree ("updated_at");
  CREATE INDEX "casino_rounds_created_at_idx" ON "casino_rounds" USING btree ("created_at");
  CREATE INDEX "referral_rules_is_active_idx" ON "referral_rules" USING btree ("is_active");
  CREATE INDEX "referral_rules_campaign_idx" ON "referral_rules" USING btree ("campaign_id");
  CREATE INDEX "referral_rules_starts_at_idx" ON "referral_rules" USING btree ("starts_at");
  CREATE INDEX "referral_rules_ends_at_idx" ON "referral_rules" USING btree ("ends_at");
  CREATE INDEX "referral_rules_updated_at_idx" ON "referral_rules" USING btree ("updated_at");
  CREATE INDEX "referral_rules_created_at_idx" ON "referral_rules" USING btree ("created_at");
  CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_id");
  CREATE UNIQUE INDEX "referrals_referred_user_idx" ON "referrals" USING btree ("referred_user_id");
  CREATE INDEX "referrals_status_idx" ON "referrals" USING btree ("status");
  CREATE INDEX "referrals_rule_idx" ON "referrals" USING btree ("rule_id");
  CREATE INDEX "referrals_referrer_transaction_idx" ON "referrals" USING btree ("referrer_transaction_id");
  CREATE INDEX "referrals_referee_transaction_idx" ON "referrals" USING btree ("referee_transaction_id");
  CREATE INDEX "referrals_updated_at_idx" ON "referrals" USING btree ("updated_at");
  CREATE INDEX "referrals_created_at_idx" ON "referrals" USING btree ("created_at");
  CREATE INDEX "referrer_status_idx" ON "referrals" USING btree ("referrer_id","status");
  CREATE INDEX "withdrawals_user_idx" ON "withdrawals" USING btree ("user_id");
  CREATE INDEX "withdrawals_wallet_idx" ON "withdrawals" USING btree ("wallet_id");
  CREATE INDEX "withdrawals_payout_method_idx" ON "withdrawals" USING btree ("payout_method_id");
  CREATE INDEX "withdrawals_status_idx" ON "withdrawals" USING btree ("status");
  CREATE INDEX "withdrawals_transaction_reference_idx" ON "withdrawals" USING btree ("transaction_reference");
  CREATE INDEX "withdrawals_requested_at_idx" ON "withdrawals" USING btree ("requested_at");
  CREATE INDEX "withdrawals_reviewed_by_idx" ON "withdrawals" USING btree ("reviewed_by_id");
  CREATE INDEX "withdrawals_debit_transaction_idx" ON "withdrawals" USING btree ("debit_transaction_id");
  CREATE INDEX "withdrawals_refund_transaction_idx" ON "withdrawals" USING btree ("refund_transaction_id");
  CREATE UNIQUE INDEX "withdrawals_idempotency_key_idx" ON "withdrawals" USING btree ("idempotency_key");
  CREATE INDEX "withdrawals_updated_at_idx" ON "withdrawals" USING btree ("updated_at");
  CREATE INDEX "withdrawals_created_at_idx" ON "withdrawals" USING btree ("created_at");
  CREATE INDEX "user_status_idx" ON "withdrawals" USING btree ("user_id","status");
  CREATE INDEX "status_createdAt_idx" ON "withdrawals" USING btree ("status","created_at");
  CREATE INDEX "user_requestedAt_idx" ON "withdrawals" USING btree ("user_id","requested_at");
  CREATE INDEX "payout_methods_user_idx" ON "payout_methods" USING btree ("user_id");
  CREATE INDEX "payout_methods_fingerprint_idx" ON "payout_methods" USING btree ("fingerprint");
  CREATE INDEX "payout_methods_status_idx" ON "payout_methods" USING btree ("status");
  CREATE INDEX "payout_methods_updated_at_idx" ON "payout_methods" USING btree ("updated_at");
  CREATE INDEX "payout_methods_created_at_idx" ON "payout_methods" USING btree ("created_at");
  CREATE INDEX "user_status_1_idx" ON "payout_methods" USING btree ("user_id","status");
  CREATE INDEX "banners_image_idx" ON "banners" USING btree ("image_id");
  CREATE INDEX "banners_starts_at_idx" ON "banners" USING btree ("starts_at");
  CREATE INDEX "banners_ends_at_idx" ON "banners" USING btree ("ends_at");
  CREATE INDEX "banners_is_active_idx" ON "banners" USING btree ("is_active");
  CREATE INDEX "banners_updated_at_idx" ON "banners" USING btree ("updated_at");
  CREATE INDEX "banners_created_at_idx" ON "banners" USING btree ("created_at");
  CREATE INDEX "announcements_image_idx" ON "announcements" USING btree ("image_id");
  CREATE INDEX "announcements_starts_at_idx" ON "announcements" USING btree ("starts_at");
  CREATE INDEX "announcements_ends_at_idx" ON "announcements" USING btree ("ends_at");
  CREATE INDEX "announcements_is_active_idx" ON "announcements" USING btree ("is_active");
  CREATE INDEX "announcements_updated_at_idx" ON "announcements" USING btree ("updated_at");
  CREATE INDEX "announcements_created_at_idx" ON "announcements" USING btree ("created_at");
  CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");
  CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");
  CREATE INDEX "notifications_read_at_idx" ON "notifications" USING btree ("read_at");
  CREATE UNIQUE INDEX "notifications_dedupe_key_idx" ON "notifications" USING btree ("dedupe_key");
  CREATE INDEX "notifications_updated_at_idx" ON "notifications" USING btree ("updated_at");
  CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
  CREATE INDEX "user_readAt_createdAt_idx" ON "notifications" USING btree ("user_id","read_at","created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_banner_sizes_banner_filename_idx" ON "media" USING btree ("sizes_banner_filename");
  CREATE INDEX "audit_logs_admin_idx" ON "audit_logs" USING btree ("admin_id");
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_collection_slug_idx" ON "audit_logs" USING btree ("collection_slug");
  CREATE INDEX "audit_logs_document_id_idx" ON "audit_logs" USING btree ("document_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  CREATE INDEX "collectionSlug_documentId_idx" ON "audit_logs" USING btree ("collection_slug","document_id");
  CREATE INDEX "action_createdAt_idx" ON "audit_logs" USING btree ("action","created_at");
  CREATE UNIQUE INDEX "wingo_rounds_period_key_idx" ON "wingo_rounds" USING btree ("period_key");
  CREATE INDEX "wingo_rounds_mode_idx" ON "wingo_rounds" USING btree ("mode");
  CREATE INDEX "wingo_rounds_status_idx" ON "wingo_rounds" USING btree ("status");
  CREATE INDEX "wingo_rounds_start_at_idx" ON "wingo_rounds" USING btree ("start_at");
  CREATE INDEX "wingo_rounds_betting_closes_at_idx" ON "wingo_rounds" USING btree ("betting_closes_at");
  CREATE INDEX "wingo_rounds_ends_at_idx" ON "wingo_rounds" USING btree ("ends_at");
  CREATE INDEX "wingo_rounds_updated_at_idx" ON "wingo_rounds" USING btree ("updated_at");
  CREATE INDEX "wingo_rounds_created_at_idx" ON "wingo_rounds" USING btree ("created_at");
  CREATE UNIQUE INDEX "periodKey_idx" ON "wingo_rounds" USING btree ("period_key");
  CREATE INDEX "mode_status_endsAt_idx" ON "wingo_rounds" USING btree ("mode","status","ends_at");
  CREATE INDEX "wingo_bets_user_idx" ON "wingo_bets" USING btree ("user_id");
  CREATE INDEX "wingo_bets_round_idx" ON "wingo_bets" USING btree ("round_id");
  CREATE INDEX "wingo_bets_period_key_idx" ON "wingo_bets" USING btree ("period_key");
  CREATE INDEX "wingo_bets_mode_idx" ON "wingo_bets" USING btree ("mode");
  CREATE INDEX "wingo_bets_status_idx" ON "wingo_bets" USING btree ("status");
  CREATE UNIQUE INDEX "wingo_bets_idempotency_key_idx" ON "wingo_bets" USING btree ("idempotency_key");
  CREATE INDEX "wingo_bets_updated_at_idx" ON "wingo_bets" USING btree ("updated_at");
  CREATE INDEX "wingo_bets_created_at_idx" ON "wingo_bets" USING btree ("created_at");
  CREATE INDEX "user_createdAt_1_idx" ON "wingo_bets" USING btree ("user_id","created_at");
  CREATE INDEX "round_status_idx" ON "wingo_bets" USING btree ("round_id","status");
  CREATE INDEX "user_periodKey_idx" ON "wingo_bets" USING btree ("user_id","period_key");
  CREATE UNIQUE INDEX "idempotencyKey_idx" ON "wingo_bets" USING btree ("idempotency_key");
  CREATE UNIQUE INDEX "wingo_point_wallets_user_idx" ON "wingo_point_wallets" USING btree ("user_id");
  CREATE INDEX "wingo_point_wallets_updated_at_idx" ON "wingo_point_wallets" USING btree ("updated_at");
  CREATE INDEX "wingo_point_wallets_created_at_idx" ON "wingo_point_wallets" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_1_idx" ON "wingo_point_wallets" USING btree ("user_id");
  CREATE INDEX "wingo_point_transactions_user_idx" ON "wingo_point_transactions" USING btree ("user_id");
  CREATE INDEX "wingo_point_transactions_type_idx" ON "wingo_point_transactions" USING btree ("type");
  CREATE INDEX "wingo_point_transactions_reference_type_idx" ON "wingo_point_transactions" USING btree ("reference_type");
  CREATE INDEX "wingo_point_transactions_reference_id_idx" ON "wingo_point_transactions" USING btree ("reference_id");
  CREATE UNIQUE INDEX "wingo_point_transactions_idempotency_key_idx" ON "wingo_point_transactions" USING btree ("idempotency_key");
  CREATE INDEX "wingo_point_transactions_updated_at_idx" ON "wingo_point_transactions" USING btree ("updated_at");
  CREATE INDEX "wingo_point_transactions_created_at_idx" ON "wingo_point_transactions" USING btree ("created_at");
  CREATE INDEX "user_createdAt_2_idx" ON "wingo_point_transactions" USING btree ("user_id","created_at");
  CREATE UNIQUE INDEX "idempotencyKey_1_idx" ON "wingo_point_transactions" USING btree ("idempotency_key");
  CREATE INDEX "referenceType_referenceId_1_idx" ON "wingo_point_transactions" USING btree ("reference_type","reference_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("admins_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_wallets_id_idx" ON "payload_locked_documents_rels" USING btree ("wallets_id");
  CREATE INDEX "payload_locked_documents_rels_wallet_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("wallet_transactions_id");
  CREATE INDEX "payload_locked_documents_rels_wallet_adjustments_id_idx" ON "payload_locked_documents_rels" USING btree ("wallet_adjustments_id");
  CREATE INDEX "payload_locked_documents_rels_tasks_id_idx" ON "payload_locked_documents_rels" USING btree ("tasks_id");
  CREATE INDEX "payload_locked_documents_rels_task_completions_id_idx" ON "payload_locked_documents_rels" USING btree ("task_completions_id");
  CREATE INDEX "payload_locked_documents_rels_games_id_idx" ON "payload_locked_documents_rels" USING btree ("games_id");
  CREATE INDEX "payload_locked_documents_rels_game_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("game_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_quiz_questions_id_idx" ON "payload_locked_documents_rels" USING btree ("quiz_questions_id");
  CREATE INDEX "payload_locked_documents_rels_sudoku_puzzles_id_idx" ON "payload_locked_documents_rels" USING btree ("sudoku_puzzles_id");
  CREATE INDEX "payload_locked_documents_rels_campaigns_id_idx" ON "payload_locked_documents_rels" USING btree ("campaigns_id");
  CREATE INDEX "payload_locked_documents_rels_campaign_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("campaign_claims_id");
  CREATE INDEX "payload_locked_documents_rels_casino_rounds_id_idx" ON "payload_locked_documents_rels" USING btree ("casino_rounds_id");
  CREATE INDEX "payload_locked_documents_rels_referral_rules_id_idx" ON "payload_locked_documents_rels" USING btree ("referral_rules_id");
  CREATE INDEX "payload_locked_documents_rels_referrals_id_idx" ON "payload_locked_documents_rels" USING btree ("referrals_id");
  CREATE INDEX "payload_locked_documents_rels_withdrawals_id_idx" ON "payload_locked_documents_rels" USING btree ("withdrawals_id");
  CREATE INDEX "payload_locked_documents_rels_payout_methods_id_idx" ON "payload_locked_documents_rels" USING btree ("payout_methods_id");
  CREATE INDEX "payload_locked_documents_rels_banners_id_idx" ON "payload_locked_documents_rels" USING btree ("banners_id");
  CREATE INDEX "payload_locked_documents_rels_announcements_id_idx" ON "payload_locked_documents_rels" USING btree ("announcements_id");
  CREATE INDEX "payload_locked_documents_rels_notifications_id_idx" ON "payload_locked_documents_rels" USING btree ("notifications_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  CREATE INDEX "payload_locked_documents_rels_wingo_rounds_id_idx" ON "payload_locked_documents_rels" USING btree ("wingo_rounds_id");
  CREATE INDEX "payload_locked_documents_rels_wingo_bets_id_idx" ON "payload_locked_documents_rels" USING btree ("wingo_bets_id");
  CREATE INDEX "payload_locked_documents_rels_wingo_point_wallets_id_idx" ON "payload_locked_documents_rels" USING btree ("wingo_point_wallets_id");
  CREATE INDEX "payload_locked_documents_rels_wingo_point_transactions_i_idx" ON "payload_locked_documents_rels" USING btree ("wingo_point_transactions_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree ("admins_id");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_favicon_idx" ON "site_settings" USING btree ("favicon_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "admins_roles" CASCADE;
  DROP TABLE "admins_sessions" CASCADE;
  DROP TABLE "admins" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "wallets" CASCADE;
  DROP TABLE "wallet_transactions" CASCADE;
  DROP TABLE "wallet_adjustments" CASCADE;
  DROP TABLE "tasks" CASCADE;
  DROP TABLE "task_completions" CASCADE;
  DROP TABLE "games_reward_tiers" CASCADE;
  DROP TABLE "games_config_math_operations" CASCADE;
  DROP TABLE "games_config_segments" CASCADE;
  DROP TABLE "games" CASCADE;
  DROP TABLE "game_sessions" CASCADE;
  DROP TABLE "quiz_questions_options" CASCADE;
  DROP TABLE "quiz_questions" CASCADE;
  DROP TABLE "quiz_questions_texts" CASCADE;
  DROP TABLE "sudoku_puzzles" CASCADE;
  DROP TABLE "campaigns_required_actions" CASCADE;
  DROP TABLE "campaigns" CASCADE;
  DROP TABLE "campaign_claims" CASCADE;
  DROP TABLE "casino_rounds" CASCADE;
  DROP TABLE "referral_rules" CASCADE;
  DROP TABLE "referrals" CASCADE;
  DROP TABLE "withdrawals" CASCADE;
  DROP TABLE "payout_methods" CASCADE;
  DROP TABLE "banners" CASCADE;
  DROP TABLE "announcements" CASCADE;
  DROP TABLE "notifications" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  DROP TABLE "wingo_rounds" CASCADE;
  DROP TABLE "wingo_bets" CASCADE;
  DROP TABLE "wingo_point_wallets" CASCADE;
  DROP TABLE "wingo_point_transactions" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "reward_settings" CASCADE;
  DROP TABLE "feature_settings" CASCADE;
  DROP TABLE "legal_settings" CASCADE;
  DROP TYPE "public"."enum_admins_roles";
  DROP TYPE "public"."enum_users_status";
  DROP TYPE "public"."enum_wallets_status";
  DROP TYPE "public"."enum_wallet_transactions_type";
  DROP TYPE "public"."enum_wallet_transactions_status";
  DROP TYPE "public"."enum_wallet_adjustments_type";
  DROP TYPE "public"."enum_wallet_adjustments_status";
  DROP TYPE "public"."enum_tasks_reward_type";
  DROP TYPE "public"."enum_tasks_status";
  DROP TYPE "public"."enum_tasks_startsat_tz";
  DROP TYPE "public"."enum_tasks_endsat_tz";
  DROP TYPE "public"."enum_tasks_verification_type";
  DROP TYPE "public"."enum_task_completions_status";
  DROP TYPE "public"."enum_games_config_math_operations";
  DROP TYPE "public"."enum_games_type";
  DROP TYPE "public"."enum_games_difficulty";
  DROP TYPE "public"."enum_games_status";
  DROP TYPE "public"."enum_games_startsat_tz";
  DROP TYPE "public"."enum_games_endsat_tz";
  DROP TYPE "public"."enum_games_reward_mode";
  DROP TYPE "public"."enum_games_config_sudoku_source";
  DROP TYPE "public"."enum_game_sessions_status";
  DROP TYPE "public"."enum_game_sessions_result";
  DROP TYPE "public"."enum_quiz_questions_type";
  DROP TYPE "public"."enum_quiz_questions_difficulty";
  DROP TYPE "public"."enum_sudoku_puzzles_difficulty";
  DROP TYPE "public"."enum_campaigns_required_actions_type";
  DROP TYPE "public"."enum_campaigns_reward_type";
  DROP TYPE "public"."enum_campaigns_status";
  DROP TYPE "public"."enum_campaigns_startsat_tz";
  DROP TYPE "public"."enum_campaigns_endsat_tz";
  DROP TYPE "public"."enum_casino_rounds_game";
  DROP TYPE "public"."enum_casino_rounds_status";
  DROP TYPE "public"."enum_referral_rules_startsat_tz";
  DROP TYPE "public"."enum_referral_rules_endsat_tz";
  DROP TYPE "public"."enum_referral_rules_qualification";
  DROP TYPE "public"."enum_referrals_status";
  DROP TYPE "public"."enum_withdrawals_method";
  DROP TYPE "public"."enum_withdrawals_status";
  DROP TYPE "public"."enum_payout_methods_type";
  DROP TYPE "public"."enum_payout_methods_status";
  DROP TYPE "public"."enum_banners_startsat_tz";
  DROP TYPE "public"."enum_banners_endsat_tz";
  DROP TYPE "public"."enum_announcements_severity";
  DROP TYPE "public"."enum_announcements_startsat_tz";
  DROP TYPE "public"."enum_announcements_endsat_tz";
  DROP TYPE "public"."enum_notifications_type";
  DROP TYPE "public"."enum_audit_logs_action";
  DROP TYPE "public"."enum_wingo_rounds_mode";
  DROP TYPE "public"."enum_wingo_rounds_status";
  DROP TYPE "public"."enum_wingo_bets_mode";
  DROP TYPE "public"."enum_wingo_bets_type";
  DROP TYPE "public"."enum_wingo_bets_status";
  DROP TYPE "public"."enum_wingo_point_transactions_type";
  DROP TYPE "public"."enum_site_settings_currency";
  DROP TYPE "public"."enum_reward_settings_default_referral_qualification";`)
}
