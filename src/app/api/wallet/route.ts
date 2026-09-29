import { withApi, ok } from '@/lib/api/handler'
import { getWallet } from '@/services/wallet'

export const GET = withApi(async ({ payload, user }) => {
  const wallet = await getWallet(payload, user!.id)
  const txRes = await payload.find({ collection: 'wallet-transactions', where: { user: { equals: user!.id } }, sort: '-createdAt', limit: 30, depth: 0, overrideAccess: true })
  return ok({
    wallet: { availableBalance: wallet.availableBalance, pendingBalance: wallet.pendingBalance, lifetimeEarned: wallet.lifetimeEarned, lifetimeWithdrawn: wallet.lifetimeWithdrawn, currency: wallet.currency },
    transactions: txRes.docs.map((t) => ({ id: t.id, type: t.type, amount: t.amount, description: t.description, createdAt: t.createdAt })),
  })
})
