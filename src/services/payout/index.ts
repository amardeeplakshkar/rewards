import { manualProvider } from './manual'
import type { PayoutProvider } from './types'

const providers: Record<string, PayoutProvider> = { manual: manualProvider }

export function getPayoutProvider(): PayoutProvider {
  return providers[process.env.PAYOUT_PROVIDER || 'manual'] ?? manualProvider
}

export * from './types'
