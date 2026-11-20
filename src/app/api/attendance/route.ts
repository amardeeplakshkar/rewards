import { withApi, ok } from '@/lib/api/handler'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { claimAttendance, getAttendanceStatus } from '@/services/attendance'

export const GET = withApi(async ({ payload, req, user }) => ok(await getAttendanceStatus(payload, user!.id, req)))

export const POST = withApi(async ({ payload, user }) => {
  await enforceRateLimit(LIMITS.attendanceClaim, String(user!.id))
  const result = await claimAttendance(payload, undefined, user!.id)
  return ok({ ...result, status: await getAttendanceStatus(payload, user!.id) })
})
