import type { PayoutProvider } from './types'

/** Default provider: the finance team pays out externally and records the reference in the admin panel. */
export const manualProvider: PayoutProvider = {
  name: 'manual',
  async payout(req) {
    return { status: 'INITIATED', message: `Awaiting manual payout of ${req.amount} ${req.currency} by the finance team.` }
  },
}
