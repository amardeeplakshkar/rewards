import { z } from 'zod'

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PAYLOAD_SECRET: z.string().min(16, 'PAYLOAD_SECRET must be at least 16 characters'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  REDIS_URL: z.string().optional(),
  DATA_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'DATA_ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
  CRON_SECRET: z.string().optional(),
  REQUIRE_EMAIL_VERIFICATION: bool,
  DB_PUSH: bool,
  PAYOUT_PROVIDER: z.string().default('manual'),
})

export type Env = z.infer<typeof schema>

let cached: Env | undefined

/** Validated server environment. Throws a readable error when something required is missing. */
export function env(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${msg}`)
  }
  if (parsed.data.NODE_ENV === 'production') {
    const problems: string[] = []
    if (!parsed.data.REDIS_URL) problems.push('REDIS_URL is required in production')
    if (/^0+$/.test(parsed.data.DATA_ENCRYPTION_KEY)) problems.push('DATA_ENCRYPTION_KEY must not be the example value')
    if (parsed.data.PAYLOAD_SECRET.startsWith('change-me')) problems.push('PAYLOAD_SECRET must not be the example value')
    if (!parsed.data.CRON_SECRET || parsed.data.CRON_SECRET.startsWith('change-me')) problems.push('CRON_SECRET must be set')
    if (problems.length) throw new Error(`Unsafe production configuration:\n  - ${problems.join('\n  - ')}`)
  }
  cached = parsed.data
  return cached
}

export const isProd = () => process.env.NODE_ENV === 'production'
