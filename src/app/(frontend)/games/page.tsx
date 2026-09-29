'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'
import { Brain, Calculator, Dice1, FileQuestionMark, Grid3x3, LifeBuoy, Zap } from 'lucide-react'

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
}

const CATEGORIES = ['All Games', 'Casual', 'Puzzle']

const GAME_THEMES = {
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

const getGameTheme = (game: Pick<GameListItem, 'type' | 'name' | 'slug'>) => {
  const theme = GAME_THEMES[game.type as keyof typeof GAME_THEMES]
  return {
    ...theme,
    slug: game.slug,
    name: game.name,
    description: game.name.includes('Quiz') ? 'Test your knowledge and win rewards' : theme.description,
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
      return 'Casual'

    default:
      return 'Casual'
  }
}

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
    api.get<{ games: GameListItem[] }>('/public/games').then((d) => setGames(d.games))
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

            {/* <Link
              href="/games"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              View All &gt;
            </Link> */}
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
