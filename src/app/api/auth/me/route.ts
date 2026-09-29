import { withApi, ok } from '@/lib/api/handler'

export const GET = withApi(async ({ user }) => ok({ user }), { requireAuth: true })
