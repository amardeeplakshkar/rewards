'use client'

import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { money } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Bomb, ChevronDown, CircleDollarSign, Gem, Lock, Rocket, ShieldCheck, Spade, Star, TrendingUp, Trophy, Zap } from 'lucide-react'
import MineGame from './Mine'

type CardData = { rank: string; suit: string; held?: boolean }

type Round = any

const rupees = (n: number) => Math.max(100, Math.round(n * 100))
const inr = (minor: number) => money(Math.max(0, Number(minor) || 0))
const suitIcon = (s: string) => s === 'Hearts' ? '♥' : s === 'Diamonds' ? '♦' : s === 'Clubs' ? '♣' : '♠'
const suitColor = (s: string) => s === 'Hearts' || s === 'Diamonds' ? 'text-red-500' : 'text-slate-900'

export function CasinoGamesPlay({ slug }: { slug: string }) {
  if (slug === 'mine') return <Mine />
  if (slug === 'mines') return <MineGame />
  if (slug === 'videopoker' || slug === 'video-poker') return <Poker />
  if (slug === 'crash') return <MultiplierGame game="crash" />
  if (slug === 'slide' || slug === 'jackpot') return <MultiplierGame game="slide" />
  return null
}

function CasinoShell({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-120px)] rounded-2xl bg-[#071018] p-3 text-white shadow-2xl sm:p-5">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-[#0c1720] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e701]/10 text-[#00e701]">{icon}</div>
          <div><h2 className="font-bold tracking-wide">{title}</h2><p className="text-xs text-slate-400">{subtitle}</p></div>
        </div>
      </div>
      {children}
    </div>
  )
}

function BetControls({ bet, setBet, disabled, action, actionLabel = 'BET' }: { bet: number; setBet: (n: number) => void; disabled?: boolean; action: () => void; actionLabel?: string }) {
  return <div className="rounded-xl border border-white/10 bg-[#0c1720] p-3">
    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Bet Amount</label>
    <div className="flex gap-2"><div className="relative flex-1"><CircleDollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00e701]" /><Input className="h-11 border-white/10 bg-[#071018] pl-9 text-white" type="number" min="1" step="1" value={bet} disabled={disabled} onChange={e => setBet(Number(e.target.value) || 1)} /></div><Button onClick={action} disabled={disabled} className="h-11 min-w-24 bg-[#00e701] font-black text-black hover:bg-[#16ff16]">{actionLabel}</Button></div>
    <div className="mt-2 flex gap-1.5">{[1, 5, 10, 50].map(v => <button key={v} disabled={disabled} onClick={() => setBet(v)} className="flex-1 rounded-md bg-white/5 py-1 text-[10px] font-bold text-slate-400 hover:bg-white/10">₹{v}</button>)}</div>
  </div>
}

function Mine() {
  const [bet, setBet] = useState(10), [mines, setMines] = useState(3), [round, setRound] = useState<Round>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('Choose your risk and reveal safe gems.')
  const points = round?.points ?? []
  const start = async () => { try { setBusy(true); const r = await api.post<any>('/casino/mine/create', { betAmount: rupees(bet), mines }); setRound({ ...r, points: [] }); setMessage('Reveal tiles. Cash out before you hit a mine.'); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Could not start Mine.') } finally { setBusy(false) } }
  const pick = async (point: number) => { if (!round || busy || points.includes(point)) return; try { setBusy(true); const r = await api.post<any>('/casino/mine/pick', { roundId: round.id, point }); setRound({ ...round, ...r, points: [...points, point] }); if (r.status !== 'BET') { setMessage(r.status === 'WON' ? `You won ${inr(r.payout)}` : 'Mine hit — better luck next round.'); setRound(null) } } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Pick failed.') } finally { setBusy(false) } }
  const cash = async () => { if (!round || busy) return; try { setBusy(true); const r = await api.post<any>('/casino/mine/cashout', { roundId: round.id }); setMessage(`Cashed out ${inr(r.payout)}`); setRound(null) } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Cashout failed.') } finally { setBusy(false) } }
  return <CasinoShell title="Mine" subtitle="Find gems. Avoid the mines. Multiply your stake." icon={<Bomb className="h-5 w-5" />}>
    <div className=" gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3"><BetControls bet={bet} setBet={setBet} disabled={!!round || busy} action={start} actionLabel="PLAY" />
        <div className="rounded-xl border border-white/10 bg-[#0c1720] p-3"><label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Mines</label><div className="grid grid-cols-4 gap-1.5">{[1,3,5,7,10,12,15,20].map(n => <button key={n} disabled={!!round || busy} onClick={() => setMines(n)} className={`rounded-md py-2 text-xs font-bold ${mines === n ? 'bg-[#00e701] text-black' : 'bg-white/5 text-slate-400'}`}>{n}</button>)}</div></div>
        {round && <Button onClick={cash} disabled={busy} className="h-12 w-full bg-[#00e701] font-black text-black hover:bg-[#16ff16]">CASH OUT · {inr(round.payout ?? 0)}</Button>}
        <div className="rounded-xl border border-white/10 bg-[#0c1720] p-4 text-sm text-slate-400">{message}</div>
      </div>
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,#14232c_0%,#081118_65%)] p-5"><div className="grid w-full max-w-[480px] grid-cols-5 gap-2">{Array.from({ length: 25 }, (_, i) => { const open = points.includes(i); return <button key={i} onClick={() => pick(i)} disabled={!round || busy || open} className={`aspect-square rounded-xl border text-xl shadow-inner transition hover:-translate-y-0.5 ${open ? 'border-[#00e701]/50 bg-[#00e701]/15 text-[#00e701]' : 'border-white/10 bg-[#10202a] text-slate-600 hover:border-[#00e701]/40 hover:bg-[#152b36]'}`}><span>{open ? <Gem className="mx-auto h-6 w-6" /> : '?'}</span></button> })}</div></div>
    </div>
  </CasinoShell>
}

function Poker() {
  const [bet, setBet] = useState(10), [cards, setCards] = useState<CardData[]>([]), [held, setHeld] = useState<number[]>([]), [roundId, setRoundId] = useState<string | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('Deal five cards and hold the cards you want to keep.')
  const deal = async () => {
    try {
      setBusy(true)
      const r = await api.post<any>('/casino/poker/init', { betAmount: rupees(bet) })
      setRoundId(String(r.id))
      setCards((r.hand || []).map((card: any) => ({ rank: card.rank, suit: card.suit })))
      setHeld([])
      setMessage('Choose cards to hold, then draw.')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not deal.')
    } finally {
      setBusy(false)
    }
  }
  const draw = async () => { if (!roundId) return; try { setBusy(true); const r = await api.post<any>('/casino/poker/draw', { roundId, holds: held }); const nextCards = (r.hand || []).map((card: any) => ({ rank: card.rank, suit: card.suit })); setCards(nextCards); const handName = r.result ? r.result.replace(/_/g, ' ') : '' ; setMessage(handName ? `${handName} · Won ${inr(r.payout)} at ${r.multiplier}x` : `Result: ${inr(r.payout)}`); setRoundId(null); setHeld([]) } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Draw failed.') } finally { setBusy(false) } }
  return <CasinoShell title="Video Poker" subtitle="Hold your best cards and draw for a winning hand." icon={<Spade className="h-5 w-5" />}>
    <div className=" gap-4 lg:grid-cols-[1fr_280px]">
      <div className="rounded-2xl border border-emerald-900/50 bg-[radial-gradient(circle,#12633f_0%,#063323_65%,#031c13_100%)] p-5 sm:p-8"><div className="mb-6 text-center"><div className="text-xs font-bold uppercase tracking-[.3em] text-emerald-200/60">{message}</div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{cards.map((c, i) => <button key={i} disabled={!roundId || busy} onClick={() => setHeld(h => h.includes(i) ? h.filter(x => x !== i) : [...h, i])} className={`relative aspect-[2/3] rounded-xl bg-white p-2 shadow-xl transition sm:aspect-[5/7] ${held.includes(i) ? '-translate-y-3 ring-4 ring-[#00e701]' : ''}`}><div className={`flex h-full flex-col justify-between text-left ${suitColor(c.suit)}`}><span className="text-xl font-black">{c.rank}</span><span className="self-center text-4xl">{suitIcon(c.suit)}</span><span className="rotate-180 text-xl font-black">{c.rank}</span></div>{held.includes(i) && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded bg-[#00e701] px-2 py-0.5 text-[9px] font-black text-black">HELD</span>}</button>)}{!cards.length && <div className="col-span-full flex min-h-64 items-center justify-center text-emerald-200/40"><Spade className="mr-3 h-8 w-8" /> DEAL TO START</div>}</div><div className="mt-8 flex justify-center">{roundId ? <Button onClick={draw} disabled={busy} className="h-12 min-w-48 bg-[#00e701] font-black text-black">DRAW</Button> : <Button onClick={deal} disabled={busy} className="h-12 min-w-48 bg-[#00e701] font-black text-black">DEAL · ₹{bet}</Button>}</div></div>
      <div className="rounded-xl border border-white/10 bg-[#0c1720] p-3"><BetControls bet={bet} setBet={setBet} disabled={!!roundId || busy} action={deal} actionLabel="DEAL" /><div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-300"><Trophy className="h-4 w-4 text-yellow-400" /> PAYTABLE</div>{[['Royal Flush','800x'],['Straight Flush','60x'],['4 of a Kind','22x'],['Full House','9x'],['Flush','6x'],['Straight','4x'],['3 of a Kind','3x'],['2 Pair','2x'],['Jacks or Better','1x']].map(([a,b]) => <div key={a} className="flex justify-between border-b border-white/5 py-1.5 text-[11px] text-slate-400"><span>{a}</span><b className="text-white">{b}</b></div>)}</div></div>
    </div>
  </CasinoShell>
}

function MultiplierGame({ game }: { game: 'crash' | 'slide' }) {
  const [bet, setBet] = useState(10), [round, setRound] = useState<Round>(null), [multiplier, setMultiplier] = useState(1), [busy, setBusy] = useState(false), [history, setHistory] = useState<number[]>([]), [target, setTarget] = useState(game === 'crash' ? 2 : 1.5)
  const title = game === 'crash' ? 'Crash' : 'Slide'; const accent = game === 'crash' ? '#a855f7' : '#f97316'; const Icon = game === 'crash' ? Rocket : TrendingUp
  useEffect(() => { if (!round) return; const tick = async () => { try { const state = await api.get<any>(`/casino/${game}/state?roundId=${round.id}`); if (state?.status === 'ACTIVE') { setMultiplier(Number(state.multiplier || 1)); return } if (state?.status === 'LOST') { setHistory(h => [Number(state.multiplier || multiplier), ...h].slice(0, 12)); setRound(null); setMultiplier(Number(state.multiplier || 1)); toast.error('Round crashed.') } else if (state?.status === 'CASHED_OUT') { setHistory(h => [Number(state.multiplier || multiplier), ...h].slice(0, 12)); setRound(null); toast.success(`Cashed out ${inr(state.payout ?? 0)}`) } } catch { setRound(null) } }; const timer = setInterval(tick, 200); return () => clearInterval(timer) }, [round, game, multiplier])
  const start = async () => { try { setBusy(true); const r = await api.post<any>(`/casino/${game}/start`, { betAmount: rupees(bet), target }); setRound(r); setMultiplier(1); } catch (e) { toast.error(e instanceof ApiError ? e.message : `Could not start ${title}.`) } finally { setBusy(false) } }
  const cash = async () => { if (!round) return; try { setBusy(true); const r = await api.post<any>(`/casino/${game}/cashout`, { roundId: round.id }); setHistory(h => [Number(r.multiplier || multiplier), ...h].slice(0, 12)); setRound(null); toast.success(`Cashed out ${inr(r.payout ?? 0)}`) } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Cashout failed.') } finally { setBusy(false) } }
  return <CasinoShell title={title} subtitle={game === 'crash' ? 'Cash out before the multiplier crashes.' : 'Ride the multiplier and cash out in time.'} icon={<Icon className="h-5 w-5" />}>
    <div className=" gap-4 lg:grid-cols-[1fr_280px]">
      <div className="relative flex min-h-[470px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080e15]"><div className="absolute inset-0 opacity-30" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)`, backgroundSize: '40px 40px' }} /><div className="relative flex flex-1 items-center justify-center"><div className="text-center"><div className="mb-2 text-xs font-bold uppercase tracking-[.35em] text-slate-500">{round ? 'LIVE ROUND' : 'READY'}</div><div className="text-7xl font-black tracking-tight sm:text-9xl" style={{ color: round ? accent : '#64748b' }}>{multiplier.toFixed(2)}x</div>{round && <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400"><Zap className="h-3 w-3" /> Multiplier is live</div>}</div></div><div className="relative border-t border-white/10 bg-black/20 p-4"><div className="mb-3 flex gap-2 overflow-auto">{history.length ? history.map((v,i) => <span key={i} className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">{v.toFixed(2)}x</span>) : <span className="text-xs text-slate-600">No previous rounds</span>}</div><div className="h-1 overflow-hidden rounded bg-white/5"><div className="h-full rounded" style={{ width: `${Math.min(100, ((multiplier-1)/5)*100)}%`, background: accent }} /></div></div></div>
      <div className="space-y-3"><div className="rounded-xl border border-white/10 bg-[#0c1720] p-3"><label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Target</label><Input className="h-11 border-white/10 bg-[#071018] text-white" type="number" min="1.01" max="50" step="0.01" value={target} disabled={!!round || busy} onChange={e => setTarget(Number(e.target.value) || 1.01)} /></div><BetControls bet={bet} setBet={setBet} disabled={!!round || busy} action={start} actionLabel="START" />{round && <Button onClick={cash} disabled={busy} className="h-12 w-full font-black text-black" style={{ backgroundColor: accent }}>CASH OUT · {inr(Math.round(bet * multiplier * 100))}</Button>}<div className="rounded-xl border border-white/10 bg-[#0c1720] p-4"><div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-300"><Lock className="h-4 w-4 text-[#00e701]" /> GAME INFO</div><div className="space-y-2 text-xs text-slate-500"><p>• Server-side round settlement</p><p>• Main INR wallet is used</p><p>• Cashout is available while the round is active</p></div></div></div>
    </div>
  </CasinoShell>
}