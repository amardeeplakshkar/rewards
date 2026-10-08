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
  mine: { id: -101, name: 'Mine', slug: 'mine', description: 'Find safe tiles and multiply your bet.', type: 'MINE' },
  videopoker: { id: -102, name: 'Video Poker', slug: 'videopoker', description: 'Hold cards and draw for a winning hand.', type: 'POKER' },
  'video-poker': { id: -102, name: 'Video Poker', slug: 'video-poker', description: 'Hold cards and draw for a winning hand.', type: 'POKER' },
  crash: { id: -103, name: 'Crash', slug: 'crash', description: 'Cash out before the multiplier crashes.', type: 'CRASH' },
  slide: { id: -104, name: 'Slide', slug: 'slide', description: 'Ride the multiplier and cash out in time.', type: 'SLIDE' },
  mines: { id: -101, name: 'Mine', slug: 'mines', description: 'Find safe tiles and multiply your bet.', type: 'MINE' },
}

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

  if (['mine', 'videopoker', 'video-poker', 'crash', 'slide', 'mines'].includes(slug)) {
    const casinoGame = FALLBACK_GAMES[slug] as GameListItem
    return (
      <AppShell>
        <div className="mb-3 flex items-center gap-2">
          <Link href="/games" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2">
            <ChevronLeft size={20} className="text-text-soft" />
          </Link>
          <h1 className="text-[18px] font-semibold">{casinoGame.name}</h1>
        </div>
        <div className="pb-8">
          <CasinoGamesPlay slug={slug} />
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
      <div className="pb-8">
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
      </div>
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
