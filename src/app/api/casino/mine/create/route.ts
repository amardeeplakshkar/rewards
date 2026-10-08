import { withApi, ok } from '@/lib/api/handler'; import { startMine } from '@/services/casino-games';
export const POST=withApi(async ({payload,req,user},request)=>{const b=await request.json();return ok(await startMine(payload,req,user!.id,Number(b.betAmount),Number(b.mines)),201)})
