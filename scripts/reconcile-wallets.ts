/**
 * Recomputes every wallet balance from its source of truth (the ledger + withdrawals) and reports any
 * mismatch. Run on a schedule (e.g. nightly) as a correctness safety net:  npm run reconcile
 */
import 'dotenv/config'
import { getPayloadClient } from '../src/lib/payload'
import { reconcileWallets } from '../src/services/wallet'
import { logAudit } from '../src/services/audit'

async function main() {
  const payload = await getPayloadClient()
  const { checked, mismatches } = await reconcileWallets(payload)
  console.log(`Checked ${checked} wallets.`)
  if (mismatches.length === 0) {
    console.log('No mismatches found. ✅')
  } else {
    console.error(`Found ${mismatches.length} mismatch(es):`)
    for (const m of mismatches) console.error(`  wallet #${m.walletId} (user #${m.userId}) ${m.field}: stored=${m.stored} expected=${m.expected}`)
    await logAudit({ payload, action: 'WALLET_RECONCILED', actorLabel: 'system:reconcile-script', metadata: { checked, mismatches } })
  }
  process.exit(mismatches.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
