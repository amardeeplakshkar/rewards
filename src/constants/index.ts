/**
 * Centralised constants. Every enum used by Payload select fields, Zod schemas and
 * services is defined here exactly once.
 */

export const DEFAULT_CURRENCY = 'INR'
export const DEFAULT_TIMEZONE = 'Asia/Kolkata'
export const MINOR_UNITS_PER_MAJOR = 100

export const USER_STATUSES = ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'BLOCKED', 'DELETED'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const SCHEDULABLE_STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'DISABLED'] as const
export const TASK_STATUSES = SCHEDULABLE_STATUSES
export type TaskStatus = (typeof TASK_STATUSES)[number]
export const GAME_STATUSES = SCHEDULABLE_STATUSES
export type GameStatus = (typeof GAME_STATUSES)[number]

export const CAMPAIGN_STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'COMPLETED'] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const REWARD_SOURCES = ['TASK', 'GAME', 'CAMPAIGN', 'REFERRAL', 'BONUS', 'ADMIN_ADJUSTMENT'] as const
export type RewardSource = (typeof REWARD_SOURCES)[number]

export const TRANSACTION_TYPES = [
  'TASK_REWARD',
  'GAME_REWARD',
  'GAME_BET',
  'CAMPAIGN_REWARD',
  'REFERRAL_REWARD',
  'BONUS',
  'WITHDRAWAL',
  'REFUND',
  'ADMIN_CREDIT',
  'ADMIN_DEBIT',
  'REVERSAL',
] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

/** Ledger types that add to the available balance and count as "earned". */
export const CREDIT_EARNING_TYPES: readonly TransactionType[] = [
  'TASK_REWARD',
  'GAME_REWARD',
  'CAMPAIGN_REWARD',
  'REFERRAL_REWARD',
  'BONUS',
  'ADMIN_CREDIT',
]
/** Ledger types that count as earning for stats/dashboards (excludes admin credits). */
export const EARNING_TYPES_FOR_STATS: readonly TransactionType[] = [
  'TASK_REWARD',
  'GAME_REWARD',
  'CAMPAIGN_REWARD',
  'REFERRAL_REWARD',
  'BONUS',
]

export const REWARD_SOURCE_TO_TX_TYPE: Record<RewardSource, TransactionType> = {
  TASK: 'TASK_REWARD',
  GAME: 'GAME_REWARD',
  CAMPAIGN: 'CAMPAIGN_REWARD',
  REFERRAL: 'REFERRAL_REWARD',
  BONUS: 'BONUS',
  ADMIN_ADJUSTMENT: 'ADMIN_CREDIT',
}

export const WALLET_STATUSES = ['ACTIVE', 'FROZEN'] as const
export const TRANSACTION_STATUSES = ['COMPLETED'] as const

export const TASK_COMPLETION_STATUSES = ['STARTED', 'SUBMITTED', 'COMPLETED', 'REJECTED', 'EXPIRED'] as const
export type TaskCompletionStatus = (typeof TASK_COMPLETION_STATUSES)[number]

export const TASK_VERIFICATION_TYPES = ['NONE', 'TIMER', 'ANSWER_CODE', 'TEXT_SUBMISSION', 'MANUAL_REVIEW'] as const
export type TaskVerificationType = (typeof TASK_VERIFICATION_TYPES)[number]

export const GAME_TYPES = ['QUIZ', 'SUDOKU', 'MEMORY', 'NUMBER_SEQUENCE', 'MATH', 'REACTION', 'SPIN_WHEEL', 'WINGO'] as const
export type GameType = (typeof GAME_TYPES)[number]

export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const GAME_SESSION_STATUSES = ['STARTED', 'COMPLETED', 'EXPIRED', 'REJECTED'] as const
export type GameSessionStatus = (typeof GAME_SESSION_STATUSES)[number]
export const GAME_RESULTS = ['WIN', 'PARTIAL', 'LOSE'] as const
export type GameResult = (typeof GAME_RESULTS)[number]

export const REWARD_MODES = ['FIXED', 'PER_SCORE', 'TIERED'] as const
export type RewardMode = (typeof REWARD_MODES)[number]

export const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE'] as const
export const MATH_OPERATIONS = ['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'PERCENTAGE', 'MIXED'] as const
export type MathOperation = (typeof MATH_OPERATIONS)[number]

export const CAMPAIGN_ACTION_TYPES = [
  'TASKS_COMPLETED',
  'GAMES_PLAYED',
  'GAMES_WON',
  'REFERRALS_QUALIFIED',
  'AMOUNT_EARNED',
  'SPECIFIC_TASK',
  'SPECIFIC_GAME',
] as const
export type CampaignActionType = (typeof CAMPAIGN_ACTION_TYPES)[number]

export const REFERRAL_STATUSES = ['PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED'] as const
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number]
export const REFERRAL_QUALIFICATIONS = ['REGISTRATION', 'VERIFIED_ACCOUNT', 'FIRST_TASK', 'FIRST_GAME', 'AMOUNT_EARNED'] as const
export type ReferralQualification = (typeof REFERRAL_QUALIFICATIONS)[number]

export const WITHDRAWAL_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
  'FAILED',
  'CANCELLED',
] as const
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number]
/** Withdrawal states in which funds are still held (debited from available, not yet settled). */
export const OPEN_WITHDRAWAL_STATUSES: readonly WithdrawalStatus[] = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING']

export const PAYOUT_METHOD_TYPES = ['UPI', 'BANK'] as const
export type PayoutMethodType = (typeof PAYOUT_METHOD_TYPES)[number]

export const NOTIFICATION_TYPES = [
  'REWARD_CREDITED',
  'TASK_COMPLETED',
  'GAME_REWARD',
  'CAMPAIGN_STARTED',
  'CAMPAIGN_ENDING',
  'WITHDRAWAL_REQUESTED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REJECTED',
  'WITHDRAWAL_COMPLETED',
  'REFERRAL_REWARDED',
  'SYSTEM',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const AUDIT_ACTIONS = [
  'USER_SUSPENDED',
  'USER_UNSUSPENDED',
  'USER_BLOCKED',
  'USER_STATUS_CHANGED',
  'REWARD_CREDITED',
  'REWARD_DEBITED',
  'TRANSACTION_REVERSED',
  'WITHDRAWAL_REQUESTED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REJECTED',
  'WITHDRAWAL_COMPLETED',
  'WITHDRAWAL_FAILED',
  'WITHDRAWAL_CANCELLED',
  'WITHDRAWAL_STATUS_CHANGED',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_DELETED',
  'TASK_COMPLETION_REVIEWED',
  'GAME_CREATED',
  'GAME_UPDATED',
  'GAME_DELETED',
  'CAMPAIGN_CREATED',
  'CAMPAIGN_UPDATED',
  'CAMPAIGN_DELETED',
  'SETTINGS_UPDATED',
  'CONTENT_UPDATED',
  'ADMIN_CREATED',
  'ADMIN_UPDATED',
  'WALLET_RECONCILED',
  'OTHER',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const REDIS_PREFIX = 'rw:'
export const SESSION_COOKIE = 'rw_session'
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  FINANCE_ADMIN: 'Finance admin',
  CONTENT_MANAGER: 'Content manager',
  SUPPORT_AGENT: 'Support agent',
}

export const toOptions = <T extends readonly string[]>(values: T, labels?: Partial<Record<T[number], string>>) =>
  values.map((value) => ({
    value,
    label: labels?.[value as T[number]] ?? value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
  }))