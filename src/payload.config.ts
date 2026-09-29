import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { s3Storage } from '@payloadcms/storage-s3'
import sharp from 'sharp'

import { Admins } from './collections/Admins'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Wallets } from './collections/Wallets'
import { WalletTransactions } from './collections/WalletTransactions'
import { WalletAdjustments } from './collections/WalletAdjustments'
import { Tasks } from './collections/Tasks'
import { TaskCompletions } from './collections/TaskCompletions'
import { Games } from './collections/Games'
import { GameSessions } from './collections/GameSessions'
import { QuizQuestions } from './collections/QuizQuestions'
import { SudokuPuzzles } from './collections/SudokuPuzzles'
import { Campaigns } from './collections/Campaigns'
import { CampaignClaims } from './collections/CampaignClaims'
import { ReferralRules } from './collections/ReferralRules'
import { Referrals } from './collections/Referrals'
import { Withdrawals } from './collections/Withdrawals'
import { PayoutMethods } from './collections/PayoutMethods'
import { Banners } from './collections/Banners'
import { Announcements } from './collections/Announcements'
import { Notifications } from './collections/Notifications'
import { AuditLogs } from './collections/AuditLogs'
import { FeatureSettings, LegalSettings, RewardSettings, SiteSettings } from './globals'
import { DEFAULT_TIMEZONE } from './constants'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const s3Enabled = Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)
const smtpEnabled = Boolean(process.env.SMTP_HOST)

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: appUrl,
  cookiePrefix: 'rw',
  cors: [appUrl],
  csrf: [appUrl],
  graphQL: { disable: true },
  admin: {
    user: Admins.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Rewards Admin' },
    components: {
      views: { dashboard: { Component: '/components/admin/Dashboard#Dashboard' } },
    },
    timezones: {
      defaultTimezone: DEFAULT_TIMEZONE,
      supportedTimezones: [
        { label: 'India (IST)', value: 'Asia/Kolkata' },
        { label: 'UTC', value: 'UTC' },
        { label: 'Dubai', value: 'Asia/Dubai' },
        { label: 'Singapore', value: 'Asia/Singapore' },
        { label: 'London', value: 'Europe/London' },
        { label: 'New York', value: 'America/New_York' },
        { label: 'Los Angeles', value: 'America/Los_Angeles' },
        { label: 'Sydney', value: 'Australia/Sydney' },
      ],
    },
  },
  collections: [
    Admins,
    Users,
    Wallets,
    WalletTransactions,
    WalletAdjustments,
    Tasks,
    TaskCompletions,
    Games,
    GameSessions,
    QuizQuestions,
    SudokuPuzzles,
    Campaigns,
    CampaignClaims,
    ReferralRules,
    Referrals,
    Withdrawals,
    PayoutMethods,
    Banners,
    Announcements,
    Notifications,
    Media,
    AuditLogs,
  ],
  globals: [SiteSettings, RewardSettings, FeatureSettings, LegalSettings],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '', max: 20, idleTimeoutMillis: 30_000 },
    // Dev: auto-sync the schema. Production: keep false and run `npm run migrate`.
    push: process.env.DB_PUSH === 'true',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  email: smtpEnabled
    ? nodemailerAdapter({
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'no-reply@example.com',
        defaultFromName: process.env.EMAIL_FROM_NAME || 'Rewards',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        },
      })
    : undefined,
  plugins: [
    ...(s3Enabled
      ? [
          s3Storage({
            collections: { media: true },
            bucket: process.env.S3_BUCKET!,
            config: {
              region: process.env.S3_REGION || 'auto',
              endpoint: process.env.S3_ENDPOINT || undefined,
              forcePathStyle: true,
              credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID!,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
              },
            },
          }),
        ]
      : []),
  ],
  upload: { limits: { fileSize: 5_000_000 } },
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
