src/app/(frontend)/games/[slug]/CasinoGamesPlay.tsx
```tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { money } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const rupees=(n:number)=>Math.max(0,Math.round(n*100))
const inr=(minor:number)=>money(minor)

type CardData={rank:string;suit:string}
const suitIcon=(s:string)=>s==='Hearts'?'♥':s==='Diamonds'?'♦':s==='Clubs'?'♣':'♠'

export function CasinoGamesPlay({slug}:{slug:string}){
  if(slug==='mine')return <Mine/>
  if(slug==='videopoker'||slug==='video-poker')return <Poker/>
  if(slug==='crash')return <Multiplier game="crash"/>
  if(slug==='slide'||slug==='jackpot')return <Multiplier game="slide"/>
  return null
}

function BetBox({value,setValue,disabled}:{value:number;setValue:(n:number)=>void;disabled?:boolean}){return <div className="space-y-2"><label className="text-xs text-text-soft">Bet amount (INR)</label><Input type="number" min="1" step="1" value={value} disabled={disabled} onChange={e=>setValue(Number(e.target.value))}/></div>}

function Mine(){
 const [bet,setBet]=useState(10),[mines,setMines]=useState(3),[round,setRound]=useState<any>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const start=async()=>{try{setBusy(true);const r=await api.post<any>('/casino/mine/create',{betAmount:rupees(bet),mines});setRound({...r,points:[]});setMessage('Pick safe tiles or cash out.')}catch(e){toast.error(e instanceof ApiError?e.message:'Could not start Mine.')}finally{setBusy(false)}}
 const pick=async(point:number)=>{if(!round||busy)return;try{setBusy(true);const r=await api.post<any>('/casino/mine/pick',{roundId:round.id,point});setRound({...round,...r});if(r.status!=='BET'){setMessage(r.status==='WON'?`Won ${inr(r.payout)}`:'Mine hit — round lost');setRound(null)}}catch(e){toast.error(e instanceof ApiError?e.message:'Pick failed')}finally{setBusy(false)}}
 const cash=async()=>{if(!round)return;try{setBusy(true);const r=await api.post<any>('/casino/mine/cashout',{roundId:round.id});setMessage(`Cashed out ${inr(r.payout)}`);setRound(null)}catch(e){toast.error(e instanceof ApiError?e.message:'Cashout failed')}finally{setBusy(false)}}
 return <Card className="overflow-hidden border-[#F5B82E]/20 bg-[#0B111A] p-5 text-white"><div className="flex flex-wrap items-end gap-3"><div className="w-32"><BetBox value={bet} setValue={setBet} disabled={!!round||busy}/></div><div><label className="text-xs text-slate-400">Mines</label><Input className="mt-2 w-24" type="number" min="1" max="24" value={mines} disabled={!!round||busy} onChange={e=>setMines(Number(e.target.value))}/></div>{!round?<Button onClick={start} disabled={busy}>Start</Button>:<Button onClick={cash} disabled={busy}>Cash out</Button>}</div><div className="mx-auto mt-5 grid max-w-md grid-cols-5 gap-2">{Array.from({length:25},(_,i)=>{const picked=round?.picks?.includes(i);const mine=round?.mineIndexes?.includes(i);return <button key={i} disabled={!round||busy||picked} onClick={()=>pick(i)} className={`aspect-square rounded-lg border text-sm transition ${picked?'bg-emerald-500/20 border-emerald-400/50':'bg-slate-900 border-slate-700 hover:border-[#F5B82E]'}`}>{picked?(mine?'💣':'💎'):'?'}</button>})}</div><div className="mt-4 text-center text-sm text-slate-300">{round?`Multiplier ${Number(round.multiplier||1).toFixed(2)}x`:message}</div></Card>
}

function Poker(){
 const [bet,setBet]=useState(10),[round,setRound]=useState<any>(null),[holds,setHolds]=useState<number[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const init=async()=>{try{setBusy(true);const r=await api.post<any>('/casino/poker/init',{betAmount:rupees(bet)});setRound(r);setHolds([]);setMessage('Hold cards, then draw.')}catch(e){toast.error(e instanceof ApiError?e.message:'Could not deal.')}finally{setBusy(false)}}
 const draw=async()=>{if(!round)return;try{setBusy(true);const r=await api.post<any>('/casino/poker/draw',{roundId:round.id,holds});setRound(null);setMessage(`${r.result.replaceAll('_',' ')} · ${r.multiplier}x · ${inr(r.payout)}`);setHolds([])}catch(e){toast.error(e instanceof ApiError?e.message:'Draw failed')}finally{setBusy(false)}}
 return <Card className="border-[#F5B82E]/20 bg-[#0B111A] p-5 text-white"><div className="flex items-end gap-3"><div className="w-36"><BetBox value={bet} setValue={setBet} disabled={!!round||busy}/></div><Button disabled={busy} onClick={round?draw:init}>{round?'Draw':'Deal'}</Button></div>{round&&<div className="mt-6 grid grid-cols-5 gap-2">{round.hand.map((c:CardData,i:number)=>{const held=holds.includes(i);return <button key={i} disabled={busy} onClick={()=>setHolds(h=>held?h.filter(x=>x!==i):[...h,i])} className={`aspect-[2/3] rounded-xl border p-2 text-center text-xl font-bold ${held?'border-[#F5B82E] bg-[#F5B82E]/10':'border-slate-700 bg-white text-slate-900'}`}><div>{c.rank}</div><div>{suitIcon(c.suit)}</div>{held&&<div className="mt-2 text-[10px] uppercase">Hold</div>}</button>})}</div>}<p className="mt-4 text-center text-sm text-slate-300">{message}</p><div className="mt-5 grid grid-cols-3 gap-2 text-xs text-slate-400">{[['Royal Flush','800x'],['Straight Flush','60x'],['4 of a Kind','22x'],['Full House','9x'],['Flush','6x'],['Straight','4x']].map(x=><div key={x[0]} className="rounded-lg bg-slate-900 p-2"><span>{x[0]}</span><b className="float-right text-white">{x[1]}</b></div>)}</div></Card>
}

function Multiplier({game}:{game:'crash'|'slide'}){
 const [bet,setBet]=useState(10),[target,setTarget]=useState(2),[round,setRound]=useState<any>(null),[state,setState]=useState<any>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{if(!round)return;const t=setInterval(async()=>{try{const s=await api.get<any>(`/casino/${game}/state?roundId=${round.id}`);setState(s);if(s.status!=='ACTIVE'){setRound(null);setMessage(s.status==='LOST'?'Round lost.':'Round finished.')}}catch{setRound(null)}},300);return()=>clearInterval(t)},[round,game])
 const start=async()=>{try{setBusy(true);const r=await api.post<any>(`/casino/${game}/start`,{betAmount:rupees(bet),target});setRound(r);setState({multiplier:1,status:'ACTIVE'});setMessage('Cash out before the multiplier reaches the crash point.')}catch(e){toast.error(e instanceof ApiError?e.message:'Could not start round.')}finally{setBusy(false)}}
 const cash=async()=>{if(!round)return;try{setBusy(true);const r=await api.post<any>(`/casino/${game}/cashout`,{roundId:round.id});setRound(null);setMessage(`Cashed out at ${r.multiplier}x · ${inr(r.payout)}`)}catch(e){toast.error(e instanceof ApiError?e.message:'Cashout failed')}finally{setBusy(false)}}
 const m=state?.multiplier||1
 return <Card className="border-[#F5B82E]/20 bg-[#0B111A] p-5 text-white"><div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-xl bg-[#071824]"><div className="text-center"><div className="text-6xl font-black tabular-nums text-[#F5B82E]">{Number(m).toFixed(2)}x</div><p className="mt-2 text-sm text-slate-400">{round?'LIVE':'Ready'}</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><BetBox value={bet} setValue={setBet} disabled={!!round||busy}/><div><label className="text-xs text-text-soft">Target (x)</label><Input className="mt-2" type="number" min="1.01" max="50" step="0.01" value={target} disabled={!!round||busy} onChange={e=>setTarget(Number(e.target.value))}/></div>{round?<Button className="self-end" onClick={cash} disabled={busy}>Cash out</Button>:<Button className="self-end" onClick={start} disabled={busy}>Start {game==='crash'?'Crash':'Slide'}</Button>}</div><p className="mt-4 text-center text-sm text-slate-300">{message}</p></Card>
}

```

src/app/(frontend)/games/[slug]/MathPlay.tsx
```tsx
'use client'
import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Round {
  text?: string
  sequence?: number[]
}

export function MathPlay({ state, onSubmit }: { state: { questions?: Round[]; rounds?: Round[]; secondsPerQuestion?: number }; onSubmit: (answer: unknown) => void }) {
  const items = state.questions ?? state.rounds ?? []
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const item = items[index]
  const isLast = index === items.length - 1
  const isSequence = Boolean(item?.sequence)

  const submitCurrent = () => {
    const n = value.trim() === '' ? null : Number(value)
    const next = [...answers, n]
    setAnswers(next)
    setValue('')
    if (isLast) onSubmit({ answers: next })
    else setIndex((i) => i + 1)
  }

  if (!item) return null

  return (
    <Card className="border-[#F5B82E]/20 bg-[#0B111A] p-5">
      <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#F5B82E]">Question {index + 1} of {items.length}</p>
      {isSequence ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.sequence!.map((n, i) => (
            <span key={i} className="num rounded-chip bg-[#101a2a] px-3 py-1.5 text-[16px] text-slate-100">{n}</span>
          ))}
          <span className="num rounded-chip border-2 border-dashed border-[#F5B82E] px-3 py-1.5 text-[16px] text-[#F5B82E]">?</span>
        </div>
      ) : (
        <p className="num mt-3 text-[28px] text-white">{item.text} = ?</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submitCurrent()
        }}
        className="mt-5 flex gap-2"
      >
        <input
          autoFocus
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^-\d]/g, ''))}
          className="num h-12 flex-1 rounded-control border border-[#F5B82E]/20 bg-[#101a2a] px-4 text-[18px] text-white placeholder:text-slate-400"
          placeholder="Your answer"
        />
        <Button type="submit" className="bg-[#F5B82E] text-[#0B111A] hover:bg-[#E2A33B]">{isLast ? 'Finish' : 'Next'}</Button>
      </form>
    </Card>
  )
}

```

src/app/(frontend)/games/[slug]/MemoryPlay.tsx
```tsx
'use client'
import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const GLYPHS = ['🍎', '🍋', '🍇', '🍉', '🍓', '🍒', '🥝', '🍑', '🍍', '🥥', '🍌', '🫐', '🍈', '🍏', '🥭', '🍐']

export function MemoryPlay({ state, onSubmit }: { state: { rows: number; cols: number; board: number[] }; onSubmit: (answer: unknown) => void }) {
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState<[number, number][]>([])
  const [busy, setBusy] = useState(false)

  const finish = () => onSubmit({ moves })

  const tap = (i: number) => {
    if (busy || matched.has(i) || flipped.includes(i)) return
    const next = [...flipped, i]
    setFlipped(next)
    if (next.length === 2) {
      setBusy(true)
      const [a, b] = next
      const isMatch = state.board[a] === state.board[b]
      setMoves((m) => [...m, [a, b]])
      setTimeout(() => {
        if (isMatch) setMatched((m) => new Set([...m, a, b]))
        setFlipped([])
        setBusy(false)
      }, 500)
    }
  }

  const allMatched = matched.size === state.board.length

  return (
    <Card className="border-[#F5B82E]/20 bg-[#0B111A] p-5">
      <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#F5B82E]">Find every pair</p>
      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }}>
        {state.board.map((symbol, i) => {
          const shown = flipped.includes(i) || matched.has(i)
          return (
            <button
              key={i}
              onClick={() => tap(i)}
              className={`flex aspect-square items-center justify-center rounded-chip text-[20px] transition-colors ${
                shown ? 'bg-[#2F6F4E] text-white' : 'bg-[#101a2a] text-slate-100'
              } ${matched.has(i) ? 'opacity-60' : ''}`}
            >
              {shown ? GLYPHS[symbol % GLYPHS.length] : ''}
            </button>
          )
        })}
      </div>
      <Button className="mt-5 w-full bg-[#F5B82E] text-[#0B111A] hover:bg-[#E2A33B]" disabled={!allMatched} onClick={finish}>
        {allMatched ? 'Finish' : `${matched.size / 2} of ${state.board.length / 2} pairs found`}
      </Button>
    </Card>
  )
}

```

src/app/(frontend)/games/[slug]/page.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'
import { money } from '@/lib/format'
import { QuizPlay } from './QuizPlay'
import { MathPlay } from './MathPlay'
import { MemoryPlay } from './MemoryPlay'
import { ReactionPlay } from './ReactionPlay'
import { SudokuPlay } from './SudokuPlay'
import { SpinWheelPlay } from './SpinWheelPlay'
import { WingoPlay } from './WingoPlay'
import { CasinoGamesPlay } from './CasinoGamesPlay'

interface GameListItem {
  id: number
  name: string
  slug: string
  description: string
  type: string
  reward?: { amount: number }
  durationSeconds: number
}

interface SessionResult {
  score: number
  maxScore: number
  scorePercent: number
  result: 'WIN' | 'PARTIAL' | 'LOSE'
  rewardAmount: number
  rejectionReason?: string
}

const FALLBACK_GAMES: Record<string, Partial<GameListItem>> = {
  quiz: { id: -1, name: 'Quiz', slug: 'quiz', description: 'Test your knowledge and win rewards.', type: 'QUIZ' },
  'quiz-easy': { id: -1, name: 'Quiz — Easy', slug: 'quiz-easy', description: 'Answer 5 quick questions correctly to earn a reward.', type: 'QUIZ' },
  sudoku: { id: -2, name: 'Sudoku', slug: 'sudoku', description: 'Solve the grid and beat the clock.', type: 'SUDOKU' },
  'sudoku-easy': { id: -2, name: 'Sudoku — Easy', slug: 'sudoku-easy', description: 'Solve an easy Sudoku puzzle.', type: 'SUDOKU' },
  'memory-match': { id: -3, name: 'Memory Match', slug: 'memory-match', description: 'Find all the pairs before time runs out.', type: 'MEMORY' },
  'math-challenge': { id: -4, name: 'Math Challenge', slug: 'math-challenge', description: 'Solve the equations and boost your score.', type: 'MATH' },
  'reaction-test': { id: -5, name: 'Reaction Test', slug: 'reaction-test', description: 'Stay sharp and click at the right moment.', type: 'REACTION' },
  wingo: { id: -6, name: 'Wingo', slug: 'wingo', description: 'Pick the lucky number and win a fast reward.', type: 'WINGO' },
  'spin-wheel': { id: -7, name: 'Spin Wheel', slug: 'spin-wheel', description: 'Spin for a chance at instant rewards.', type: 'SPIN_WHEEL' },
  'number-sequence': { id: -8, name: 'Number Sequence', slug: 'number-sequence', description: 'Find the next number in the pattern.', type: 'NUMBER_SEQUENCE' },
  mine: {
    id: -101,
    name: 'Mine',
    slug: 'mine',
    description: 'Find safe tiles and multiply your bet.',
    type: 'MINE',
    durationSeconds: 0,
  },

  videopoker: {
    id: -102,
    name: 'Video Poker',
    slug: 'videopoker',
    description: 'Play poker and win according to the payout table.',
    type: 'POKER',
    durationSeconds: 0,
  },

  'video-poker': {
    id: -102,
    name: 'Video Poker',
    slug: 'video-poker',
    description: 'Play poker and win according to the payout table.',
    type: 'POKER',
    durationSeconds: 0,
  },

  crash: {
    id: -103,
    name: 'Crash',
    slug: 'crash',
    description: 'Ride the multiplier and cash out before it crashes.',
    type: 'CRASH',
    durationSeconds: 0,
  },

  slide: {
    id: -104,
    name: 'Slide',
    slug: 'slide',
    description: 'Ride the multiplier and cash out before the slide ends.',
    type: 'SLIDE',
    durationSeconds: 0,
  },
}

const CASINO_SLUGS = new Set([
  'mine',
  'videopoker',
  'video-poker',
  'crash',
  'slide',
])

export default function GamePlayPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [game, setGame] = useState<GameListItem | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [state, setState] = useState<unknown>(null)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    api.get<{ games: GameListItem[] }>('/public/games')
      .then((d) => {
        const match = d.games.find((g) => g.slug === slug)
        if (match) {
          setGame(match)
          return
        }

        setGame(FALLBACK_GAMES[slug] as GameListItem | undefined ?? null)
      })
      .catch(() => {
        setGame(FALLBACK_GAMES[slug] as GameListItem | undefined ?? null)
      })
  }, [slug])

  const start = async () => {
    if (!game || game.id < 0) {
      toast.error('This game is not available yet.')
      return
    }
    setStarting(true)
    setResult(null)
    try {
      const data = await api.post<{ sessionId: string; state: unknown }>(`/games/${game.id}/start`)
      setSessionId(data.sessionId)
      setState(data.state)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start this game.')
    } finally {
      setStarting(false)
    }
  }

  const submit = async (answer: unknown) => {
    if (!sessionId) return
    try {
      const data = await api.post<SessionResult>(`/game-sessions/${sessionId}/submit`, answer)
      setResult(data)
      setSessionId(null)
      setState(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not submit your result.')
    }
  }

  if (!game) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="mb-3 flex items-center gap-2">
            <Link href="/games" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2">
              <ChevronLeft size={20} className="text-text-soft" />
            </Link>
            <h1 className="text-[18px] font-semibold">Game unavailable</h1>
          </div>
          <Card className="p-5">
            <p className="text-[14px] text-text-soft">This game route does not exist or is not active right now.</p>
            <Link href="/games" className="mt-5 inline-block text-sm font-semibold text-primary">Browse all games</Link>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mb-3 flex items-center gap-2">
        <Link href="/games" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2">
          <ChevronLeft size={20} className="text-text-soft" />
        </Link>
        <h1 className="text-[18px] font-semibold">{game.name}</h1>
      </div>
        {CASINO_SLUGS.has(slug) ? (
          <div className="pb-8">
            <CasinoGamesPlay slug={slug} />
          </div>
        ) : (
          <div className="pb-8">
            {result ? (
              <ResultCard result={result} onPlayAgain={start} />
            ) : sessionId && state ? (
              <PlayArea state={state} onSubmit={submit} />
            ) : (
              <Card className="p-5">
                <p className="text-[14px] text-text-soft">
                  {game.description}
                </p>

                {game.reward?.amount ? (
                  <p className="num mt-3 text-[22px] text-success">
                    Up to {money(game.reward.amount)}
                  </p>
                ) : null}

                {!user ? (
                  <Button
                    className="mt-5 w-full"
                    onClick={() => router.push('/login')}
                  >
                    Sign in to play
                  </Button>
                ) : (
                  <Button
                    className="mt-5 w-full"
                    disabled={starting}
                    onClick={start}
                  >
                    {starting ? 'Starting…' : 'Play'}
                  </Button>
                )}
              </Card>
            )}
          </div>
        )}
      {/* <div className="pb-8">
        {result ? (
          <ResultCard result={result} onPlayAgain={start} />
        ) : sessionId && state ? (
          <PlayArea state={state} onSubmit={submit} />
        ) : (
          <Card className="p-5">
            <p className="text-[14px] text-text-soft">{game.description}</p>
            {game.reward?.amount ? <p className="num mt-3 text-[22px] text-success">Up to {money(game.reward.amount)}</p> : null}
            {!user ? (
              <Button className="mt-5 w-full" onClick={() => router.push('/login')}>Sign in to play</Button>
            ) : (
              <Button className="mt-5 w-full" disabled={starting} onClick={start}>{starting ? 'Starting…' : 'Play'}</Button>
            )}
          </Card>
        )}
      </div> */}
    </AppShell>
  )
}

function PlayArea({ state, onSubmit }: { state: unknown; onSubmit: (answer: unknown) => void }) {
  const kind = (state as { kind: string }).kind
  switch (kind) {
    case 'QUIZ':
      return <QuizPlay state={state as never} onSubmit={onSubmit} />
    case 'MATH':
    case 'NUMBER_SEQUENCE':
      return <MathPlay state={state as never} onSubmit={onSubmit} />
    case 'MEMORY':
      return <MemoryPlay state={state as never} onSubmit={onSubmit} />
    case 'REACTION':
      return <ReactionPlay state={state as never} onSubmit={onSubmit} />
    case 'SUDOKU':
      return <SudokuPlay state={state as never} onSubmit={onSubmit} />
    case 'WINGO':
      return <WingoPlay state={state as never} onSubmit={onSubmit} />
    case 'SPIN_WHEEL':
      return <SpinWheelPlay state={state as never} onSubmit={onSubmit} />
    default:
      return <p className="text-sm text-text-faint">This game type isn&rsquo;t supported yet.</p>
  }
}

function ResultCard({ result, onPlayAgain }: { result: SessionResult; onPlayAgain: () => void }) {
  const won = result.result === 'WIN'
  return (
    <Card className={won ? 'border-success/30 bg-success-tint p-6 text-center' : 'p-6 text-center'}>
      <p className="font-display text-[22px]">{result.rejectionReason ? 'Not counted' : won ? 'Nice work!' : result.result === 'PARTIAL' ? 'Good try' : 'Better luck next time'}</p>
      <p className="mt-1 text-[14px] text-text-soft">
        {result.rejectionReason ?? `Score: ${result.score} / ${result.maxScore} (${result.scorePercent}%)`}
      </p>
      {result.rewardAmount > 0 ? <p className="num mt-4 text-[30px] text-success">+{money(result.rewardAmount)}</p> : null}
      <Button className="mt-6 w-full" onClick={onPlayAgain}>Play again</Button>
    </Card>
  )
}
```

src/app/(frontend)/games/[slug]/QuizPlay.tsx
```tsx
'use client'
import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Question {
  id: number
  question: string
  options: string[]
}

export function QuizPlay({ state, onSubmit }: { state: { questions: Question[] }; onSubmit: (answer: unknown) => void }) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const q = state.questions[index]
  const isLast = index === state.questions.length - 1

  const choose = (optIndex: number) => {
    const next = { ...answers, [q.id]: optIndex }
    setAnswers(next)
    if (isLast) onSubmit({ answers: next })
    else setIndex((i) => i + 1)
  }

  return (
    <Card className="border-[#F5B82E]/20 bg-[#0B111A] p-5">
      <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#F5B82E]">Question {index + 1} of {state.questions.length}</p>
      <p className="mt-3 font-display text-[20px] leading-snug text-white">{q.question}</p>
      <div className="mt-5 space-y-2.5">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => choose(i)}
            className="w-full rounded-control border border-[#F5B82E]/15 bg-[#101a2a] px-4 py-3 text-left text-[14px] text-slate-100 transition-colors hover:border-[#F5B82E]/45 hover:bg-[#141f30]"
          >
            {opt}
          </button>
        ))}
      </div>
    </Card>
  )
}

```

src/app/(frontend)/games/[slug]/ReactionPlay.tsx
```tsx
'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'

export function ReactionPlay({ state, onSubmit }: { state: { rounds: number; delaysMs: number[] }; onSubmit: (answer: unknown) => void }) {
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<'waiting' | 'go' | 'tooSoon'>('waiting')
  const [times, setTimes] = useState<(number | null)[]>([])
  const goAt = useRef<number>(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (round >= state.rounds) {
      onSubmit({ reactionTimesMs: times })
      return
    }
    setPhase('waiting')
    timer.current = setTimeout(() => {
      goAt.current = performance.now()
      setPhase('go')
    }, state.delaysMs[round])
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const tap = () => {
    if (phase === 'waiting') {
      if (timer.current) clearTimeout(timer.current)
      setPhase('tooSoon')
      setTimes((t) => [...t, null])
      setTimeout(() => setRound((r) => r + 1), 700)
      return
    }
    if (phase === 'go') {
      const rt = Math.round(performance.now() - goAt.current)
      setTimes((t) => [...t, rt])
      setRound((r) => r + 1)
    }
  }

  return (
    <Card className="overflow-hidden border-[#F5B82E]/20 bg-[#0B111A] p-0">
      <div className="px-5 pt-5">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#F5B82E]">Round {Math.min(round + 1, state.rounds)} of {state.rounds}</p>
      </div>
      <button
        onClick={tap}
        className={`mt-4 flex h-64 w-full flex-col items-center justify-center transition-colors ${
          phase === 'go' ? 'bg-[#2F6F4E] text-white' : phase === 'tooSoon' ? 'bg-[#C1503A] text-white' : 'bg-[#101a2a] text-slate-100'
        }`}
      >
        <p className="font-display text-[22px]">
          {phase === 'go' ? 'Tap now!' : phase === 'tooSoon' ? 'Too soon' : 'Wait for it…'}
        </p>
      </button>
    </Card>
  )
}

```

src/app/(frontend)/games/[slug]/SpinWheelPlay.tsx
```tsx
'use client'
import React, { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Segment {
  label: string
  color?: string
}

const FALLBACK_COLORS = ['#6D5DF6', '#3B82F6', '#34D399', '#F59E0B', '#F87171', '#22D3EE', '#A78BFA', '#FB923C']
const SIZE = 280
const R = SIZE / 2

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function SpinWheelPlay({ state, onSubmit }: { state: { segments: Segment[]; winningIndex: number }; onSubmit: (answer: unknown) => void }) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [done, setDone] = useState(false)
  const n = state.segments.length
  const segAngle = 360 / n

  const slices = useMemo(
    () =>
      state.segments.map((seg, i) => {
        const start = i * segAngle
        const end = start + segAngle
        const p1 = polar(R, R, R - 2, start)
        const p2 = polar(R, R, R - 2, end)
        const largeArc = segAngle > 180 ? 1 : 0
        const path = `M ${R} ${R} L ${p1.x} ${p1.y} A ${R - 2} ${R - 2} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`
        const mid = start + segAngle / 2
        const labelPos = polar(R, R, R * 0.62, mid)
        return { path, color: seg.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length], label: seg.label, mid, labelPos }
      }),
    [state.segments, segAngle],
  )

  const spin = () => {
    if (spinning || done) return
    setSpinning(true)
    // Land the winning segment's centre under the pointer (fixed at the top, 0deg), with several full turns.
    const targetMid = state.winningIndex * segAngle + segAngle / 2
    const extraTurns = 5 * 360
    const target = extraTurns + (360 - targetMid)
    setRotation(target)
    setTimeout(() => {
      setDone(true)
      onSubmit({})
    }, 3600)
  }

  return (
    <Card className="flex flex-col items-center border-[#F5B82E]/20 bg-[#0B111A] p-5">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <div
          className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2"
          style={{ borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '16px solid #F5B82E' }}
        />
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : undefined }}
        >
          <circle cx={R} cy={R} r={R - 2} fill="#101a2a" stroke="#F5B82E" strokeWidth={2} />
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} opacity={0.9} />
          ))}
          {slices.map((s, i) => (
            <text
              key={i}
              x={s.labelPos.x}
              y={s.labelPos.y}
              fill="#fff"
              fontSize={12}
              fontWeight={600}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${s.mid}, ${s.labelPos.x}, ${s.labelPos.y})`}
            >
              {s.label}
            </text>
          ))}
          <circle cx={R} cy={R} r={22} fill="#0E1726" stroke="#F5B82E" strokeWidth={2} />
        </svg>
      </div>
      <Button className="mt-6 w-full bg-[#F5B82E] text-[#0B111A] hover:bg-[#E2A33B]" disabled={spinning || done} onClick={spin}>
        {done ? 'Revealing…' : spinning ? 'Spinning…' : 'Spin the wheel'}
      </Button>
    </Card>
  )
}
```

src/app/(frontend)/games/[slug]/SudokuPlay.tsx
```tsx
'use client'
import React, { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function SudokuPlay({ state, onSubmit }: { state: { puzzle: string }; onSubmit: (answer: unknown) => void }) {
  const given = useMemo(() => state.puzzle.split('').map(Number), [state.puzzle])
  const [cells, setCells] = useState<number[]>(given)
  const [selected, setSelected] = useState<number | null>(null)

  const setDigit = (n: number) => {
    if (selected === null || given[selected] !== 0) return
    const next = [...cells]
    next[selected] = n
    setCells(next)
  }

  const filled = cells.every((c) => c !== 0)

  return (
    <Card className="border-[#F5B82E]/20 bg-[#0B111A] p-4">
      <div className="grid grid-cols-9 gap-[2px] overflow-hidden rounded-chip border border-[#F5B82E]/20 bg-[#111d2b]">
        {cells.map((val, i) => {
          const row = Math.floor(i / 9)
          const col = i % 9
          const isGiven = given[i] !== 0
          const thickRight = col % 3 === 2 && col !== 8
          const thickBottom = row % 3 === 2 && row !== 8
          return (
            <button
              key={i}
              disabled={isGiven}
              onClick={() => setSelected(i)}
              className={`num aspect-square text-[13px] ${isGiven ? 'bg-[#121c2d] font-medium text-[#F5B82E]' : 'bg-[#0E1726] text-slate-100'} ${
                selected === i ? 'ring-2 ring-inset ring-[#F5B82E]' : ''
              } ${thickRight ? 'border-r-2 border-r-[#F5B82E]/25' : ''} ${thickBottom ? 'border-b-2 border-b-[#F5B82E]/25' : ''}`}
            >
              {val !== 0 ? val : ''}
            </button>
          )
        })}
      </div>
      <div className="mt-4 grid grid-cols-9 gap-1.5">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => setDigit(n)} className="num h-9 rounded-chip bg-[#101a2a] text-[14px] text-slate-100">
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={() => setDigit(0)} className="h-9 flex-1 rounded-chip border border-[#F5B82E]/20 bg-[#101a2a] text-[13px] text-slate-300">Erase</button>
      </div>
      <Button className="mt-4 w-full bg-[#F5B82E] text-[#0B111A] hover:bg-[#E2A33B]" disabled={!filled} onClick={() => onSubmit({ grid: cells.join('') })}>
        {filled ? 'Submit' : 'Fill every cell'}
      </Button>
    </Card>
  )
}

```

src/app/(frontend)/games/[slug]/WingoPlay.tsx
```tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleHelp, Clock3, Minus, Plus, RefreshCw, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'
import { formatMoney } from '@/lib/money'
import { formatWingoMoney, toMinorWingoAmount } from '@/wingo/money'

type Mode = '30s' | '1m' | '3m' | '5m'
type BetType = 'number' | 'color' | 'size'
type Result = { period: string; mode: Mode; number: number; size: 'Big' | 'Small'; colors: string[]; createdAt: string }
type Bet = { id: number | string; period: string; mode: Mode; type: BetType; selection: string; amount: number; payout: number; status: 'PENDING' | 'WON' | 'LOST'; number: number | null; placedAt: string; settledAt?: string | null }
type State = { mode: Mode; balance: number; currentRound: { periodKey: string; endsAt: string; bettingClosesAt: string; remainingSeconds: number; status: string }; results: Result[]; bets: Bet[] }
type Tab = 'game' | 'chart' | 'mine'

const MODES: { id: Mode; label: string; seconds: number }[] = [
  { id: '30s', label: 'Win Go 30s', seconds: 30 },
  { id: '1m', label: 'Win Go 1Min', seconds: 60 },
  { id: '3m', label: 'Win Go 3Min', seconds: 180 },
  { id: '5m', label: 'Win Go 5Min', seconds: 300 },
]
const COLORS = ['Green', 'Violet', 'Red'] as const
const CHIP_VALUES = [10, 50, 100, 500]
const fmtMoney = (minor: number) => formatWingoMoney(minor)
const fmtStake = (major: number) => formatWingoMoney(toMinorWingoAmount(major))
const countdown = (s: number) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
const resultColor = (n: number) => n === 0 ? 'bg-rose-500' : n === 5 ? 'bg-violet-500' : n % 2 ? 'bg-emerald-500' : 'bg-rose-500'

export function WingoPlay(_props?: { state?: unknown; onSubmit?: (answer: unknown) => void }) {
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>('30s')
  const [data, setData] = useState<State | null>(null)
  const [amount, setAmount] = useState(10)
  const [selection, setSelection] = useState<{ type: BetType; value: string } | null>(null)
  const [tab, setTab] = useState<Tab>('game')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [clock, setClock] = useState(Date.now())

  const load = useCallback(async (quiet = false) => {
    if (!user) { setLoading(false); return }
    if (!quiet) setLoading(true)
    try {
      const next = await api.get<State>(`/wingo/state?mode=${mode}`)
      setData(next)
    } catch (error) {
      if (!quiet) toast.error(error instanceof ApiError ? error.message : 'Could not load Wingo state.')
    } finally {
      setLoading(false)
    }
  }, [mode, user])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now())
      void load(true)
    }, 2500)
    return () => window.clearInterval(timer)
  }, [load])

  const secondsLeft = useMemo(() => {
    if (!data?.currentRound.endsAt) return 0
    return Math.max(0, Math.ceil((new Date(data.currentRound.endsAt).getTime() - clock) / 1000))
  }, [data, clock])
  const modeResults = data?.results ?? []
  const modeBets = data?.bets ?? []
  const recentResults = modeResults.slice(0, 5)
  const selectedLabel = selection ? `${selection.type === 'number' ? 'Number' : selection.type === 'color' ? 'Color' : 'Size'}: ${selection.value}` : 'Choose your pick'

  const pick = (type: BetType, value: string) => setSelection((prev) => prev?.type === type && prev.value === value ? null : { type, value })
  const submitBet = async () => {
    if (!selection || !data || placing) return
    if (toMinorWingoAmount(amount) > data.balance) { toast.error('Insufficient wallet balance.'); return }
    setPlacing(true)
    try {
      await api.post('/wingo/bets', { mode, type: selection.type, selection: selection.value, amount, idempotencyKey: crypto.randomUUID() })
      toast.success('Bet placed for the current round.')
      setSelection(null)
      setConfirmOpen(false)
      await load(true)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not place bet.')
      await load(true)
    } finally {
      setPlacing(false)
    }
  }

  if (!user) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center"><h2 className="text-xl font-bold">Sign in to play Wingo</h2><p className="mt-2 text-sm text-slate-500">Your wallet balance and bet history are tied to your account.</p></div>

  return (
    <div className="min-h-dvh bg-[#f4f1e9] pb-24 text-slate-900">
      {/* <header className="relative overflow-hidden bg-[#ffd83d]">
        <div className="mx-auto w-[min(100%-24px,760px)] py-4 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-lg font-extrabold text-[#ffd83d]">51</div><div><div className="text-base font-extrabold">51GAME</div><div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-700/70">PLAY ROOM / WINGO</div></div></div>
            <button type="button" aria-label="Open game rules" onClick={() => setHelpOpen(true)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/15 bg-white/40"><CircleHelp size={17} /></button>
          </div>
          <div className="mt-4 max-w-xl"><div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-700/75"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Virtual points · server-settled rounds</div><h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.05em] sm:text-4xl">Pick a side.<br />Watch it land.</h1><p className="mt-2 text-sm text-slate-700/75">Place a prediction before the round closes.</p></div>
        </div>
      </header> */}

      <main className="mx-auto mt-4 w-[min(100%-24px,760px)]">
        <section className="flex items-center justify-between gap-4 rounded-[18px] border border-slate-900/5 bg-white px-5 py-4 shadow-sm"><div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"><Wallet size={13} /> Wallet balance</div><div className="mt-2 flex items-baseline gap-2 text-3xl font-extrabold tracking-[-0.06em]">{loading && !data ? '—' : fmtMoney(data?.balance ?? 0)}</div></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-800">Real wallet</span></section>

        <div className="mt-3 grid gap-3">
          <div className="grid content-start gap-4">
            <section className="rounded-2xl border border-slate-900/5 bg-white p-3 shadow-sm"><div className="grid grid-cols-4 gap-2 rounded-xl bg-[#f5f3ee] p-1.5">{MODES.map((m) => <button key={m.id} type="button" onClick={() => { setMode(m.id); setSelection(null) }} className={`min-h-[39px] rounded-lg text-[11px] font-extrabold ${mode === m.id ? 'bg-slate-900 text-white shadow' : 'text-slate-500'}`}>{m.id === '30s' ? '30 sec' : m.id === '1m' ? '1 min' : m.id === '3m' ? '3 min' : '5 min'}</button>)}</div><div className="mt-3 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"><span>{MODES.find((m) => m.id === mode)?.label}</span><span>UTC round · {MODES.find((m) => m.id === mode)?.seconds}s</span></div></section>

            <section className="relative grid gap-3 overflow-hidden rounded-[17px] bg-slate-900 p-4 text-white md:grid-cols-[1fr_auto] md:items-center"><div><div className="text-[9px] uppercase tracking-[0.16em] text-white/60">Current issue</div><div className="mt-2 break-all font-mono text-xs text-white/90">{data?.currentRound.periodKey ?? 'Loading round…'}</div><div className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">Next result in</div><div className="mt-1 font-mono text-3xl font-bold tracking-[-0.06em] text-[#ffd83d]">{countdown(secondsLeft)}</div><div className="mt-1 text-[8px] uppercase tracking-[0.12em] text-white/40">minutes : seconds</div></div><div className="text-right"><div className="text-[9px] uppercase tracking-[0.14em] text-white/50">Recent results</div><div className="mt-3 flex justify-end gap-2">{recentResults.length ? recentResults.map((r) => <span key={r.period} title={`${r.period}: ${r.number}`} className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white ${resultColor(r.number)}`}>{r.number}</span>) : <span className="text-xs text-white/50">No settled rounds yet</span>}</div></div></section>

            <section className="rounded-2xl border border-slate-900/5 bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">Make your pick</h2><button onClick={() => void load()} className="flex items-center gap-1 text-xs text-slate-500"><RefreshCw size={13} /> Refresh</button></div><div className="mt-4 grid grid-cols-3 gap-2">{COLORS.map((c) => <button key={c} onClick={() => pick('color', c)} className={`rounded-xl py-3 text-sm font-bold text-white ${c === 'Green' ? 'bg-emerald-500' : c === 'Red' ? 'bg-rose-500' : 'bg-violet-500'} ${selection?.type === 'color' && selection.value === c ? 'ring-4 ring-slate-900/25' : ''}`}>{c}</button>)}</div><div className="mt-3 grid grid-cols-5 gap-2">{Array.from({ length: 10 }, (_, n) => <button key={n} onClick={() => pick('number', String(n))} className={`grid aspect-square place-items-center rounded-full text-sm font-extrabold text-white ${resultColor(n)} ${selection?.type === 'number' && selection.value === String(n) ? 'ring-4 ring-slate-900/25' : ''}`}>{n}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2">{(['Big', 'Small'] as const).map((s) => <button key={s} onClick={() => pick('size', s)} className={`rounded-xl py-3 text-sm font-bold text-white ${s === 'Big' ? 'bg-sky-500' : 'bg-indigo-500'} ${selection?.type === 'size' && selection.value === s ? 'ring-4 ring-slate-900/25' : ''}`}>{s}</button>)}</div>
              <div className="mt-5 flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">Stake (₹)</span><div className="flex items-center gap-2"><button aria-label="Decrease stake" onClick={() => setAmount((n) => Math.max(1, n - 1))} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100"><Minus size={14} /></button><input aria-label="Stake amount" inputMode="numeric" type="number" min={1} max={100000} value={amount} onChange={(e) => setAmount(Math.max(1, Math.min(100000, Math.floor(Number(e.target.value) || 1))))} className="h-9 w-24 rounded-lg border border-slate-200 text-center text-sm font-bold" /><button aria-label="Increase stake" onClick={() => setAmount((n) => Math.min(100000, n + 1))} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100"><Plus size={14} /></button></div></div><div className="mt-2 grid grid-cols-4 gap-2">{CHIP_VALUES.map((v) => <button key={v} onClick={() => setAmount(v)} className={`rounded-lg py-2 text-xs font-bold ${amount === v ? 'bg-amber-300' : 'bg-slate-100 text-slate-600'}`}>{formatMoney(toMinorWingoAmount(v), 'INR')}</button>)}</div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f5f3ee] px-3 py-3"><div><div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">Selected bet</div><div className="mt-1 text-sm font-extrabold">{selectedLabel}</div></div><button disabled={!selection || placing || !data || secondsLeft <= 1 || data.currentRound.status !== 'OPEN'} onClick={() => setConfirmOpen(true)} className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">{placing ? 'Placing…' : 'Place bet'}</button></div><p className="mt-2 text-[10px] leading-relaxed text-slate-500">Bets close before the timer reaches zero. Winnings and stakes settle against your real wallet balance.</p>
            </section>
          </div>

          <aside className="rounded-2xl border border-slate-900/5 bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">History</h2><Clock3 size={16} className="text-slate-400" /></div><div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#f5f3ee] p-1">{([{ id: 'game', label: 'Game' }, { id: 'chart', label: 'Chart' }, { id: 'mine', label: 'My bets' }] as const).map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-lg py-2 text-[11px] font-bold ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{t.label}</button>)}</div>
            {tab === 'game' && <div className="mt-3 space-y-2">{modeResults.length ? modeResults.slice(0, 20).map((r) => <div key={r.period} className="flex items-center justify-between rounded-lg bg-[#f8f7f3] px-3 py-2"><span className="max-w-[68%] truncate font-mono text-[10px] text-slate-500">{r.period}</span><div className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white ${resultColor(r.number)}`}>{r.number}</span><span className="text-[10px] font-bold">{r.size}</span></div></div>) : <p className="py-8 text-center text-xs text-slate-400">No results yet.</p>}</div>}
            {tab === 'chart' && <div className="mt-4"><div className="grid grid-cols-10 gap-1">{modeResults.slice(0, 30).reverse().map((r) => <div key={r.period} title={`${r.period}: ${r.number}`} className={`grid aspect-square place-items-center rounded-md text-[10px] font-bold text-white ${resultColor(r.number)}`}>{r.number}</div>)}</div><p className="mt-3 text-[10px] text-slate-500">Latest settled results, oldest to newest.</p></div>}
            {tab === 'mine' && <div className="mt-3 space-y-2">{modeBets.length ? modeBets.slice(0, 30).map((b) => <div key={b.id} className="rounded-lg bg-[#f8f7f3] p-3"><div className="flex items-center justify-between gap-2"><span className="truncate font-mono text-[10px] text-slate-500">{b.period}</span><span className={`text-[10px] font-extrabold ${b.status === 'WON' ? 'text-emerald-600' : b.status === 'LOST' ? 'text-rose-500' : 'text-amber-600'}`}>{b.status}</span></div><div className="mt-2 flex justify-between text-xs"><span className="font-semibold">{b.type}: {b.selection}</span><span>{fmtStake(b.amount)}</span></div>{b.status !== 'PENDING' && <div className="mt-1 text-right text-[11px] font-bold">Payout: {fmtStake(b.payout)}</div>}</div>) : <p className="py-8 text-center text-xs text-slate-400">Your bets will appear here.</p>}</div>}
          </aside>
        </div>
      </main>

      {confirmOpen && selection && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" aria-labelledby="wingo-confirm-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 id="wingo-confirm-title" className="text-lg font-extrabold">Confirm your bet</h2><button aria-label="Close confirmation" onClick={() => setConfirmOpen(false)}><X size={18} /></button></div><div className="mt-4 rounded-xl bg-[#f5f3ee] p-4"><div className="text-xs text-slate-500">{data?.currentRound.periodKey}</div><div className="mt-2 text-sm font-bold">{selectedLabel}</div><div className="mt-2 text-2xl font-extrabold">{fmtStake(amount)}</div><div className="mt-2 text-xs text-slate-500">Balance after stake: {fmtMoney(Math.max(0, (data?.balance ?? 0) - toMinorWingoAmount(amount)))}</div></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setConfirmOpen(false)} className="rounded-xl bg-slate-100 py-3 text-sm font-bold">Cancel</button><button disabled={placing || !data || toMinorWingoAmount(amount) > data.balance || secondsLeft <= 1} onClick={() => void submitBet()} className="rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-40">{placing ? 'Submitting…' : 'Confirm bet'}</button></div></div></div>}
      {helpOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">How Wingo works</h2><button aria-label="Close rules" onClick={() => setHelpOpen(false)}><X size={18} /></button></div><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600"><li>Choose a round mode, then pick a number, color, or Big/Small.</li><li>Confirm a whole-number stake from your wallet balance.</li><li>Stakes are deducted immediately. Winning payouts are credited after the round settles.</li><li>Round outcomes and payouts are determined server-side using the app’s real wallet ledger.</li></ul><button onClick={() => setHelpOpen(false)} className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">Got it</button></div></div>}
    </div>
  )
}

```

src/app/(frontend)/games/[slug]/WingoPlay.tsx.backup-20261005-002107
```
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleHelp, Clock3, Minus, Plus, RefreshCw, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'

type Mode = '30s' | '1m' | '3m' | '5m'
type BetType = 'number' | 'color' | 'size'
type Result = { period: string; mode: Mode; number: number; size: 'Big' | 'Small'; colors: string[]; createdAt: string }
type Bet = { id: number | string; period: string; mode: Mode; type: BetType; selection: string; amount: number; payout: number; status: 'PENDING' | 'WON' | 'LOST'; number: number | null; placedAt: string; settledAt?: string | null }
type State = { mode: Mode; balance: number; currentRound: { periodKey: string; endsAt: string; bettingClosesAt: string; remainingSeconds: number; status: string }; results: Result[]; bets: Bet[] }
type Tab = 'game' | 'chart' | 'mine'

const MODES: { id: Mode; label: string; seconds: number }[] = [
  { id: '30s', label: 'Win Go 30s', seconds: 30 },
  { id: '1m', label: 'Win Go 1Min', seconds: 60 },
  { id: '3m', label: 'Win Go 3Min', seconds: 180 },
  { id: '5m', label: 'Win Go 5Min', seconds: 300 },
]
const COLORS = ['Green', 'Violet', 'Red'] as const
const CHIP_VALUES = [1, 10, 100, 1000]
const fmt = (n: number) => n.toLocaleString('en-IN')
const countdown = (s: number) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
const resultColor = (n: number) => n === 0 ? 'bg-rose-500' : n === 5 ? 'bg-violet-500' : n % 2 ? 'bg-emerald-500' : 'bg-rose-500'

export function WingoPlay(_props?: { state?: unknown; onSubmit?: (answer: unknown) => void }) {
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>('30s')
  const [data, setData] = useState<State | null>(null)
  const [amount, setAmount] = useState(10)
  const [selection, setSelection] = useState<{ type: BetType; value: string } | null>(null)
  const [tab, setTab] = useState<Tab>('game')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [clock, setClock] = useState(Date.now())

  const load = useCallback(async (quiet = false) => {
    if (!user) { setLoading(false); return }
    if (!quiet) setLoading(true)
    try {
      const next = await api.get<State>(`/wingo/state?mode=${mode}`)
      setData(next)
    } catch (error) {
      if (!quiet) toast.error(error instanceof ApiError ? error.message : 'Could not load Wingo state.')
    } finally {
      setLoading(false)
    }
  }, [mode, user])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now())
      void load(true)
    }, 2500)
    return () => window.clearInterval(timer)
  }, [load])

  const secondsLeft = useMemo(() => {
    if (!data?.currentRound.endsAt) return 0
    return Math.max(0, Math.ceil((new Date(data.currentRound.endsAt).getTime() - clock) / 1000))
  }, [data, clock])
  const modeResults = data?.results ?? []
  const modeBets = data?.bets ?? []
  const recentResults = modeResults.slice(0, 5)
  const selectedLabel = selection ? `${selection.type === 'number' ? 'Number' : selection.type === 'color' ? 'Color' : 'Size'}: ${selection.value}` : 'Choose your pick'

  const pick = (type: BetType, value: string) => setSelection((prev) => prev?.type === type && prev.value === value ? null : { type, value })
  const submitBet = async () => {
    if (!selection || !data || placing) return
    if (amount > data.balance) { toast.error('Not enough Wingo points.'); return }
    setPlacing(true)
    try {
      await api.post('/wingo/bets', { mode, type: selection.type, selection: selection.value, amount, idempotencyKey: crypto.randomUUID() })
      toast.success('Bet placed for the current round.')
      setSelection(null)
      setConfirmOpen(false)
      await load(true)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not place bet.')
      await load(true)
    } finally {
      setPlacing(false)
    }
  }

  if (!user) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center"><h2 className="text-xl font-bold">Sign in to play Wingo</h2><p className="mt-2 text-sm text-slate-500">Your virtual points and bet history are tied to your account.</p></div>

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-9 text-slate-900">
      <header className="relative overflow-hidden bg-[#ffd83d]">
        <div className="mx-auto w-[min(100%-36px,1080px)] py-5 pb-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-lg font-extrabold text-[#ffd83d]">51</div><div><div className="text-base font-extrabold">51GAME</div><div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-700/70">PLAY ROOM / WINGO</div></div></div>
            <button type="button" aria-label="Open game rules" onClick={() => setHelpOpen(true)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/15 bg-white/40"><CircleHelp size={17} /></button>
          </div>
          <div className="mt-6 max-w-xl"><div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-700/75"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Virtual points · server-settled rounds</div><h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-[-0.08em] sm:text-5xl">Pick a side.<br />Watch it land.</h1><p className="mt-2 text-sm text-slate-700/75">Place a prediction before the round closes.</p></div>
        </div>
      </header>

      <main className="mx-auto -mt-14 w-[min(100%-36px,1080px)]">
        <section className="flex items-center justify-between gap-4 rounded-[18px] border border-slate-900/5 bg-white px-5 py-4 shadow-sm"><div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"><Wallet size={13} /> Wingo points</div><div className="mt-2 flex items-baseline gap-2 text-3xl font-extrabold tracking-[-0.06em]">{loading && !data ? '—' : fmt(data?.balance ?? 0)}<small className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">points</small></div></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-800">No cash value</span></section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
          <div className="grid content-start gap-4">
            <section className="rounded-[17px] border border-slate-900/5 bg-white p-4 shadow-sm"><div className="grid grid-cols-4 gap-2 rounded-xl bg-[#f5f3ee] p-1.5">{MODES.map((m) => <button key={m.id} type="button" onClick={() => { setMode(m.id); setSelection(null) }} className={`min-h-[39px] rounded-lg text-[11px] font-extrabold ${mode === m.id ? 'bg-slate-900 text-white shadow' : 'text-slate-500'}`}>{m.id === '30s' ? '30 sec' : m.id === '1m' ? '1 min' : m.id === '3m' ? '3 min' : '5 min'}</button>)}</div><div className="mt-3 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"><span>{MODES.find((m) => m.id === mode)?.label}</span><span>UTC round · {MODES.find((m) => m.id === mode)?.seconds}s</span></div></section>

            <section className="relative grid gap-3 overflow-hidden rounded-[17px] bg-slate-900 p-4 text-white md:grid-cols-[1fr_auto] md:items-center"><div><div className="text-[9px] uppercase tracking-[0.16em] text-white/60">Current issue</div><div className="mt-2 break-all font-mono text-xs text-white/90">{data?.currentRound.periodKey ?? 'Loading round…'}</div><div className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">Next result in</div><div className="mt-1 font-mono text-3xl font-bold tracking-[-0.06em] text-[#ffd83d]">{countdown(secondsLeft)}</div><div className="mt-1 text-[8px] uppercase tracking-[0.12em] text-white/40">minutes : seconds</div></div><div className="text-right"><div className="text-[9px] uppercase tracking-[0.14em] text-white/50">Recent results</div><div className="mt-3 flex justify-end gap-2">{recentResults.length ? recentResults.map((r) => <span key={r.period} title={`${r.period}: ${r.number}`} className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white ${resultColor(r.number)}`}>{r.number}</span>) : <span className="text-xs text-white/50">No settled rounds yet</span>}</div></div></section>

            <section className="rounded-[17px] border border-slate-900/5 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">Make your pick</h2><button onClick={() => void load()} className="flex items-center gap-1 text-xs text-slate-500"><RefreshCw size={13} /> Refresh</button></div><div className="mt-4 grid grid-cols-3 gap-2">{COLORS.map((c) => <button key={c} onClick={() => pick('color', c)} className={`rounded-xl py-3 text-sm font-bold text-white ${c === 'Green' ? 'bg-emerald-500' : c === 'Red' ? 'bg-rose-500' : 'bg-violet-500'} ${selection?.type === 'color' && selection.value === c ? 'ring-4 ring-slate-900/25' : ''}`}>{c}</button>)}</div><div className="mt-3 grid grid-cols-5 gap-2">{Array.from({ length: 10 }, (_, n) => <button key={n} onClick={() => pick('number', String(n))} className={`grid aspect-square place-items-center rounded-full text-sm font-extrabold text-white ${resultColor(n)} ${selection?.type === 'number' && selection.value === String(n) ? 'ring-4 ring-slate-900/25' : ''}`}>{n}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2">{(['Big', 'Small'] as const).map((s) => <button key={s} onClick={() => pick('size', s)} className={`rounded-xl py-3 text-sm font-bold text-white ${s === 'Big' ? 'bg-sky-500' : 'bg-indigo-500'} ${selection?.type === 'size' && selection.value === s ? 'ring-4 ring-slate-900/25' : ''}`}>{s}</button>)}</div>
              <div className="mt-5 flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">Stake (points)</span><div className="flex items-center gap-2"><button aria-label="Decrease stake" onClick={() => setAmount((n) => Math.max(1, n - 1))} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100"><Minus size={14} /></button><input aria-label="Stake points" inputMode="numeric" type="number" min={1} max={100000} value={amount} onChange={(e) => setAmount(Math.max(1, Math.min(100000, Math.floor(Number(e.target.value) || 1))))} className="h-9 w-24 rounded-lg border border-slate-200 text-center text-sm font-bold" /><button aria-label="Increase stake" onClick={() => setAmount((n) => Math.min(100000, n + 1))} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100"><Plus size={14} /></button></div></div><div className="mt-2 grid grid-cols-4 gap-2">{CHIP_VALUES.map((v) => <button key={v} onClick={() => setAmount(v)} className={`rounded-lg py-2 text-xs font-bold ${amount === v ? 'bg-amber-300' : 'bg-slate-100 text-slate-600'}`}>{v.toLocaleString()}</button>)}</div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f5f3ee] px-3 py-3"><div><div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">Selected bet</div><div className="mt-1 text-sm font-extrabold">{selectedLabel}</div></div><button disabled={!selection || placing || !data || secondsLeft <= 1 || data.currentRound.status !== 'OPEN'} onClick={() => setConfirmOpen(true)} className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">{placing ? 'Placing…' : 'Place bet'}</button></div><p className="mt-2 text-[10px] leading-relaxed text-slate-500">Bets close before the timer reaches zero. Results and point settlement are calculated by the server.</p>
            </section>
          </div>

          <aside className="rounded-[17px] border border-slate-900/5 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">History</h2><Clock3 size={16} className="text-slate-400" /></div><div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#f5f3ee] p-1">{([{ id: 'game', label: 'Game' }, { id: 'chart', label: 'Chart' }, { id: 'mine', label: 'My bets' }] as const).map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-lg py-2 text-[11px] font-bold ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{t.label}</button>)}</div>
            {tab === 'game' && <div className="mt-3 space-y-2">{modeResults.length ? modeResults.slice(0, 20).map((r) => <div key={r.period} className="flex items-center justify-between rounded-lg bg-[#f8f7f3] px-3 py-2"><span className="max-w-[68%] truncate font-mono text-[10px] text-slate-500">{r.period}</span><div className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white ${resultColor(r.number)}`}>{r.number}</span><span className="text-[10px] font-bold">{r.size}</span></div></div>) : <p className="py-8 text-center text-xs text-slate-400">No results yet.</p>}</div>}
            {tab === 'chart' && <div className="mt-4"><div className="grid grid-cols-10 gap-1">{modeResults.slice(0, 30).reverse().map((r) => <div key={r.period} title={`${r.period}: ${r.number}`} className={`grid aspect-square place-items-center rounded-md text-[10px] font-bold text-white ${resultColor(r.number)}`}>{r.number}</div>)}</div><p className="mt-3 text-[10px] text-slate-500">Latest settled results, oldest to newest.</p></div>}
            {tab === 'mine' && <div className="mt-3 space-y-2">{modeBets.length ? modeBets.slice(0, 30).map((b) => <div key={b.id} className="rounded-lg bg-[#f8f7f3] p-3"><div className="flex items-center justify-between gap-2"><span className="truncate font-mono text-[10px] text-slate-500">{b.period}</span><span className={`text-[10px] font-extrabold ${b.status === 'WON' ? 'text-emerald-600' : b.status === 'LOST' ? 'text-rose-500' : 'text-amber-600'}`}>{b.status}</span></div><div className="mt-2 flex justify-between text-xs"><span className="font-semibold">{b.type}: {b.selection}</span><span>{fmt(b.amount)} pts</span></div>{b.status !== 'PENDING' && <div className="mt-1 text-right text-[11px] font-bold">Payout: {fmt(b.payout)} pts</div>}</div>) : <p className="py-8 text-center text-xs text-slate-400">Your bets will appear here.</p>}</div>}
          </aside>
        </div>
      </main>

      {confirmOpen && selection && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" aria-labelledby="wingo-confirm-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 id="wingo-confirm-title" className="text-lg font-extrabold">Confirm your bet</h2><button aria-label="Close confirmation" onClick={() => setConfirmOpen(false)}><X size={18} /></button></div><div className="mt-4 rounded-xl bg-[#f5f3ee] p-4"><div className="text-xs text-slate-500">{data?.currentRound.periodKey}</div><div className="mt-2 text-sm font-bold">{selectedLabel}</div><div className="mt-2 text-2xl font-extrabold">{fmt(amount)} <span className="text-xs text-slate-500">points</span></div><div className="mt-2 text-xs text-slate-500">Balance after stake: {fmt(Math.max(0, (data?.balance ?? 0) - amount))} points</div></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setConfirmOpen(false)} className="rounded-xl bg-slate-100 py-3 text-sm font-bold">Cancel</button><button disabled={placing || !data || amount > data.balance || secondsLeft <= 1} onClick={() => void submitBet()} className="rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-40">{placing ? 'Submitting…' : 'Confirm bet'}</button></div></div></div>}
      {helpOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">How Wingo works</h2><button aria-label="Close rules" onClick={() => setHelpOpen(false)}><X size={18} /></button></div><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600"><li>Choose a round mode, then pick a number, color, or Big/Small.</li><li>Confirm a whole-number stake using your virtual Wingo points.</li><li>Stakes are deducted immediately. Winning payouts are credited after the round settles.</li><li>Round outcomes and payouts are determined server-side; virtual points have no cash value.</li></ul><button onClick={() => setHelpOpen(false)} className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">Got it</button></div></div>}
    </div>
  )
}

```

src/app/(frontend)/games/page.tsx
```tsx
'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'
import {
  Brain,
  Calculator,
  Dice1,
  FileQuestionMark,
  Grid3x3,
  LifeBuoy,
  Zap,
  Bomb,
  Spade,
  Rocket,
  TrendingUp,
} from 'lucide-react'

interface GameListItem {
  id: number
  name: string
  slug: string
  description: string
  type: string
  difficulty: string
  featured?: boolean
  icon?: string | null
  thumbnail?: string | null
  reward?: { amount: number; mode: string }
  durationSeconds: number
}

const GAME_LABELS: Record<string, string> = {
  QUIZ: 'Quiz',
  SUDOKU: 'Sudoku',
  MEMORY: 'Memory match',
  NUMBER_SEQUENCE: 'Number sequence',
  MATH: 'Math challenge',
  REACTION: 'Reaction test',
  WINGO: 'Wingo',
}

const CATEGORIES = ['All Games', 'Casual', 'Puzzle']

const GAME_THEMES = {
  MINE: {
    slug: 'mine',
    name: 'Mine',
    emoji: <Bomb />,
    image: null,
    description: 'Find safe tiles and multiply your bet',
    gradient: 'from-[#172554] via-[#1E3A8A] to-[#0B1220]',
    bg: 'from-blue-500/10 to-[#0E1726]',
    accent: 'text-blue-400',
  },

  POKER: {
    slug: 'videopoker',
    name: 'Video Poker',
    emoji: <Spade />,
    image: null,
    description: 'Play poker and win from the payout table',
    gradient: 'from-[#064E3B] via-[#065F46] to-[#071A16]',
    bg: 'from-emerald-500/10 to-[#0E1726]',
    accent: 'text-emerald-400',
  },

  CRASH: {
    slug: 'crash',
    name: 'Crash',
    emoji: <Rocket />,
    image: null,
    description: 'Cash out before the multiplier crashes',
    gradient: 'from-[#3B0764] via-[#581C87] to-[#0B1017]',
    bg: 'from-purple-500/10 to-[#0E1726]',
    accent: 'text-purple-400',
  },

  SLIDE: {
    slug: 'slide',
    name: 'Slide',
    emoji: <TrendingUp />,
    image: null,
    description: 'Ride the multiplier and cash out in time',
    gradient: 'from-[#7C2D12] via-[#9A3412] to-[#0B1017]',
    bg: 'from-orange-500/10 to-[#0E1726]',
    accent: 'text-orange-400',
  },

  QUIZ: {
    slug: 'quiz-easy',
    name: 'Quiz',
    emoji: <FileQuestionMark />,
    image: null,
    description: 'Test your knowledge and win rewards',
    gradient: 'from-[#0E1726] via-[#121A26] to-[#0B1017]',
    bg: 'from-[#F5B82E]/10 to-[#0E1726]',
    accent: 'text-[#F5B82E]',
  },

  SUDOKU: {
    slug: 'sudoku-easy',
    name: 'Sudoku',
    emoji: <Grid3x3 />,
    image: null,
    description: 'Solve the grid and beat the clock',
    gradient: 'from-[#0E1726] via-[#0F1B2B] to-[#0A131E]',
    bg: 'from-[#E2A33B]/10 to-[#0E1726]',
    accent: 'text-[#E2A33B]',
  },

  MEMORY: {
    slug: 'memory-match',
    name: 'Memory Match',
    emoji: <Brain />,
    image: null,
    description: 'Find all the pairs before time runs out',
    gradient: 'from-[#0E1726] via-[#17161A] to-[#0E1726]',
    bg: 'from-[#F5B82E]/10 to-[#0E1726]',
    accent: 'text-[#F5B82E]',
  },

  MATH: {
    slug: 'math-challenge',
    name: 'Math Challenge',
    emoji: <Calculator />,
    image: null,
    description: 'Solve the equations and boost your score',
    gradient: 'from-[#0E1726] via-[#17131A] to-[#0E1726]',
    bg: 'from-[#C1503A]/10 to-[#0E1726]',
    accent: 'text-[#C1503A]',
  },

  REACTION: {
    slug: 'reaction-test',
    name: 'Reaction Test',
    emoji: <Zap />,
    image: null,
    description: 'Stay sharp and click at the right moment',
    gradient: 'from-[#0E1726] via-[#161A2A] to-[#0E1726]',
    bg: 'from-[#F5B82E]/10 to-[#0E1726]',
    accent: 'text-[#F5B82E]',
  },

  WINGO: {
    slug: 'wingo',
    name: 'Wingo',
    emoji: <LifeBuoy />,
    image: null,
    description: 'Pick the lucky number and win a fast reward',
    gradient: 'from-[#0E1726] via-[#1E1B4B] to-[#0B1017]',
    bg: 'from-[#8B5CF6]/10 to-[#0E1726]',
    accent: 'text-[#A78BFA]',
  },

  SPIN_WHEEL: {
    slug: 'spin-wheel',
    name: 'Spin Wheel',
    emoji: <LifeBuoy />,
    image: null,
    description: 'Spin for a chance at instant rewards',
    gradient: 'from-[#0E1726] via-[#140F1D] to-[#0C1118]',
    bg: 'from-[#F5B82E]/10 to-[#0E1726]',
    accent: 'text-[#F5B82E]',
  },

  NUMBER_SEQUENCE: {
    slug: 'number-sequence',
    name: 'Number Sequence',
    emoji: <Dice1 />,
    image: null,
    description: 'Find the next number in the pattern',
    gradient: 'from-[#0E1726] via-[#111827] to-[#0B1017]',
    bg: 'from-[#2F6F4E]/10 to-[#0E1726]',
    accent: 'text-[#2F6F4E]',
  },
} as const

const FEATURED_GAMES = Object.values(GAME_THEMES)

const ALL_STATIC_GAMES = Object.values(GAME_THEMES)

const getGameTheme = (
  game: Pick<GameListItem, 'type' | 'name' | 'slug'>
) => {
  const theme =
    GAME_THEMES[game.type as keyof typeof GAME_THEMES] ??
    GAME_THEMES.NUMBER_SEQUENCE

  return {
    ...theme,
    slug: game.slug,
    name: game.name,
    description: game.name.includes('Quiz')
      ? 'Test your knowledge and win rewards'
      : theme.description,
  }
}

const getGameCategory = (game: GameListItem) => {
  switch (game.type) {
    case 'SUDOKU':
    case 'QUIZ':
    case 'MEMORY':
    case 'NUMBER_SEQUENCE':
    case 'MATH':
      return 'Puzzle'

    case 'REACTION':
    case 'SPIN_WHEEL':
    case 'WINGO':
    case 'MINE':
    case 'POKER':
    case 'CRASH':
    case 'SLIDE':
      return 'Casual'

    default:
      return 'Casual'
  }
}

const CASINO_GAMES: GameListItem[] = [
  {
    id: -101,
    name: 'Mine',
    slug: 'mine',
    description: 'Find safe tiles and multiply your bet',
    type: 'MINE',
    difficulty: 'HARD',
    featured: true,
    icon: null,
    thumbnail: null,
    durationSeconds: 0,
  },
  {
    id: -102,
    name: 'Video Poker',
    slug: 'videopoker',
    description: 'Play poker and win from the payout table',
    type: 'POKER',
    difficulty: 'HARD',
    featured: true,
    icon: null,
    thumbnail: null,
    durationSeconds: 0,
  },
  {
    id: -103,
    name: 'Crash',
    slug: 'crash',
    description: 'Cash out before the multiplier crashes',
    type: 'CRASH',
    difficulty: 'HARD',
    featured: true,
    icon: null,
    thumbnail: null,
    durationSeconds: 0,
  },
  {
    id: -104,
    name: 'Slide',
    slug: 'slide',
    description: 'Ride the multiplier and cash out in time',
    type: 'SLIDE',
    difficulty: 'HARD',
    featured: true,
    icon: null,
    thumbnail: null,
    durationSeconds: 0,
  },
]

export default function GamesPage() {
  const [games, setGames] = useState<GameListItem[] | null>(null)
  const [activeCategory, setActiveCategory] = useState('All Games')
  const scrollRef = useRef<HTMLDivElement>(null)

  const filteredGames = games?.filter((game) => {
    if (activeCategory === 'All Games') {
      return true
    }

    return getGameCategory(game) === activeCategory
  })

  useEffect(() => {
    api
      .get<{ games: GameListItem[] }>('/public/games')
      .then((d) => {
        const dbGames = d.games

        // Avoid duplicates if the API already returns casino games
        const casinoSlugs = new Set(CASINO_GAMES.map((game) => game.slug))

        const normalGames = dbGames.filter(
          (game) => !casinoSlugs.has(game.slug)
        )

        setGames([...CASINO_GAMES, ...normalGames])
      })
      .catch(() => {
        setGames(CASINO_GAMES)
      })
  }, [])

  return (
    <AppShell showBack={true}>
      <div className="space-y-6 pb-6 pt-1">
        {/* ── Header Banner ───────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-5">
          {/* Decorative circles */}
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="absolute right-8 top-4 h-3 w-3 rounded-full bg-amber-400/60 animate-pulse" />
          <div className="absolute right-16 bottom-6 h-2 w-2 rounded-full bg-amber-300/50 animate-pulse" />

          <div className="relative flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Play Games</h2>
              <p className="text-sm font-semibold text-amber-300">Play, Win & Earn Rewards!</p>
              <p className="text-xs text-purple-200/80 leading-relaxed max-w-[220px]">
                Enjoy exciting games and collect coins while playing.
              </p>
            </div>
            <div className="flex-shrink-0 text-5xl mt-1 drop-shadow-lg">🎮</div>
          </div>

          {/* Coin decorations */}
          <div className="absolute bottom-2 right-3 flex items-center gap-1 opacity-60">
            <span className="text-lg">🪙</span>
            <span className="text-sm">🪙</span>
          </div>
        </div>

        {/* ── Category Filter Tabs ────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all ${activeCategory === cat
                ? 'bg-white text-slate-900 font-bold shadow-lg shadow-white/10'
                : 'border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-slate-100'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Featured Games ──────────────────────────────────── */}
        <section className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white">
              Featured Games
            </h3>
          </div>

          <div className="w-full min-w-0 overflow-x-auto overflow-y-visible no-scrollbar">
            <div className="flex w-max gap-2.5 pb-1">
              {(filteredGames?.filter((g) => g.featured).slice(0, 8).map((game) => ({
                ...getGameTheme(game),
                image: (game.thumbnail) ?? (game.icon),
              })) ?? FEATURED_GAMES).map((game) => (
                <Link
                  key={game.slug}
                  href={`/games/${game.slug}`}
                  className="group block w-[76px] shrink-0"
                >
                  <div className="flex flex-col items-center">
                    {/* Game image / emoji */}
                    <div
                      className={`
                relative
  w-[72px]
  h-[72px]
  overflow-hidden
  rounded-[16px]
  border
  border-white/10
  bg-gradient-to-br
  ${game.gradient}
  shadow-[0_8px_20px_rgba(5,7,12,0.35)]
  transition-all
  duration-200
  group-hover:border-[#F5B82E]/40
  group-active:scale-95
              `}
                    >
                      {game.image ? (
                        <img
                          src={game.image}
                          alt={game.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <>
                          <div className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-white/10" />
                          <div className="absolute -bottom-3 -left-3 h-7 w-7 rounded-full bg-black/10" />

                          <div className="relative flex h-full w-full items-center justify-center">
                            <span className="text-[32px] leading-none drop-shadow-md">
                              {game.emoji}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Game name */}
                    <span className="mt-1.5 w-full truncate text-center text-[10px] font-semibold leading-tight text-white">
                      {game.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── All Games Grid ──────────────────────────────────── */}
        <section>
          <h3 className="text-base font-bold text-white mb-3">All Games</h3>

          {!games ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[160px] w-full rounded-2xl" />
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {ALL_STATIC_GAMES.map((game) => (
                <Link key={game.slug} href={`/games/${game.slug}`}>
                  <div className="bg-[#0E1726] border border-[#1F2E45] rounded-2xl p-3 h-[160px] flex flex-col justify-between hover:border-slate-500 transition-colors group">
                    <div className="space-y-2">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${game.bg} flex items-center justify-center`}>
                        <span className="text-xl">{game.emoji}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-tight">{game.name}</h4>
                      <p className="text-[9px] text-slate-400 leading-snug">{game.description}</p>
                    </div>
                    <button className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-1.5 text-[10px] font-bold text-slate-900 shadow-sm shadow-amber-500/20 group-hover:shadow-amber-500/40 active:scale-95 transition-all">
                      Play Now
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {games.map((game) => {
                const theme = getGameTheme(game)
                return (
                  <Link key={game.slug} href={`/games/${game.slug}`}>
                    <div className="bg-[#0E1726] border border-[#F5B82E]/12 rounded-2xl p-3 h-[160px] flex flex-col justify-between hover:border-[#F5B82E]/30 transition-colors group shadow-[0_12px_26px_rgba(5,7,12,0.35)]">
                      <div className="space-y-2">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.bg} flex items-center justify-center`}>
                          <span className="text-xl">{theme.emoji}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white leading-tight">{game.name}</h4>
                        <p className="text-[9px] text-slate-400 leading-snug">{theme.description}</p>
                      </div>
                      <button className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-1.5 text-[10px] font-bold text-slate-900 shadow-sm shadow-amber-500/20 group-hover:shadow-amber-500/40 active:scale-95 transition-all">
                        Play Now
                      </button>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

```

