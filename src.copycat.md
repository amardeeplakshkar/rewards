src/access/index.ts
```typescript
import type { Access, FieldAccess, Where } from 'payload'
import type { AdminRole } from '@/constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUser = any

/** True for staff accounts (the `admins` collection) that are active. End users are never "admin users". */
export const isAdminUser = (user: AnyUser): boolean => Boolean(user && user.collection === 'admins' && user.isActive !== false)

/** SUPER_ADMIN implicitly satisfies every role check. */
export const hasRole = (user: AnyUser, roles: readonly AdminRole[]): boolean => {
  if (!isAdminUser(user)) return false
  const owned: AdminRole[] = user.roles ?? []
  if (owned.includes('SUPER_ADMIN')) return true
  return roles.some((r) => owned.includes(r))
}

/** Collection-level access: allow the listed roles (plus SUPER_ADMIN). */
export const allow =
  (...roles: AdminRole[]): Access =>
  ({ req }) =>
    hasRole(req.user, roles)

/** Field-level access: allow the listed roles (plus SUPER_ADMIN). */
export const fieldAllow =
  (...roles: AdminRole[]): FieldAccess =>
  ({ req }) =>
    hasRole(req.user, roles)

export const denyAll: Access = () => false
export const denyField: FieldAccess = () => false

/** Everyone in the admin panel may sign in; per-collection access restricts what they see. */
export const anyAdmin: Access = ({ req }) => isAdminUser(req.user)

export const superAdminOnly = allow()

/** Role groups reused across collections so the permission matrix lives in one place. */
export const ROLES = {
  userAdmins: ['ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN'] as AdminRole[],
  financeRead: ['FINANCE_ADMIN', 'SUPPORT_AGENT', 'ADMIN'] as AdminRole[],
  finance: ['FINANCE_ADMIN'] as AdminRole[],
  operations: ['ADMIN'] as AdminRole[],
  operationsRead: ['ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN', 'CONTENT_MANAGER'] as AdminRole[],
  content: ['CONTENT_MANAGER', 'ADMIN'] as AdminRole[],
  support: ['SUPPORT_AGENT'] as AdminRole[],
  audit: ['ADMIN', 'FINANCE_ADMIN'] as AdminRole[],
}


```

src/app/(frontend)/earn/page.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'
import { money } from '@/lib/format'
import {
  Gamepad2,
  Dices,
  Users,
  CalendarCheck,
  Share2,
  type LucideIcon,
  ClipboardList,
} from 'lucide-react'

interface Task {
  id: number
  title: string
  description: string
  instructions?: string
  rewardAmount: number
  verificationType?: string
  timerSeconds?: number | null
  myCompletions: number
  perUserLimit: number
}

type TabKey = 'daily' | 'weekly' | 'achievements' | 'special'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'special', label: 'Special' },
]

const TAB_KEYWORDS: Record<TabKey, RegExp[]> = {
  daily: [/daily/i, /login/i, /check[- ]?in/i, /play/i, /game/i, /streak/i],
  weekly: [/weekly/i, /week/i, /7 day/i, /days?/i],
  achievements: [/achievement/i, /milestone/i, /level/i, /progress/i, /goal/i],
  special: [/social/i, /special/i, /refer/i, /invite/i, /friend/i, /share/i, /bonus/i, /exclusive/i, /spin/i],
}

function getTaskTab(task: Pick<Task, 'title' | 'description'>): TabKey {
  const haystack = `${task.title} ${task.description ?? ''}`.toLowerCase()
  for (const [tabKey, keywords] of Object.entries(TAB_KEYWORDS) as [TabKey, RegExp[]][]) {
    if (keywords.some((keyword) => keyword.test(haystack))) return tabKey
  }
  return 'daily'
}

export default function EarnPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('daily')

  const load = () => api.get<{ tasks: Task[] }>('/tasks').then((d) => setTasks(d.tasks))
  const filteredTasks = tasks?.filter((task) => getTaskTab(task) === activeTab) ?? []
  const activeTabLabel = TABS.find((tab) => tab.key === activeTab)?.label ?? 'Daily'

  useEffect(() => {
    load()
  }, [user])

  return (
    <AppShell showBack={true}>
      <div className="space-y-4 pb-6 pt-1">
        {/* ── Header Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-teal-500 p-5">
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/30 backdrop-blur">
              <span className="text-xl">
                <ClipboardList/>
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white">{activeTabLabel} Tasks</h2>
              <p className="mt-0.5 text-sm text-white/70">Complete tasks & earn rewards!</p>
            </div>
          </div>
          {/* Gift decoration */}
          <div className="absolute -right-1 -bottom-1 text-5xl opacity-40 select-none">🎁</div>
          {/* Glow orbs */}
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-teal-400/20 blur-2xl" />
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${activeTab === tab.key
                  ? 'bg-amber-400 font-bold text-slate-900 shadow-lg shadow-amber-400/20'
                  : 'border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Task List ── */}
        <div className="space-y-3">
          {!tasks ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-[#1F2E45] bg-[#0E1726] p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Skeleton className="h-2 w-full rounded-full" />
                        <Skeleton className="mt-2 h-3 w-20" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((t) => (
              <APITaskCard key={t.id} task={t} loggedIn={Boolean(user)} onChanged={load} />
            ))
          ) : (
            <div className="rounded-xl border border-[#1F2E45] bg-[#0E1726] p-6 text-center text-sm text-slate-400">
              No {activeTabLabel.toLowerCase()} tasks available right now.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

/* ━━━━━━━━━━━━━━━━━━ API Task Card (live data) ━━━━━━━━━━━━━━━━━━ */

const TASK_ICON_MAP: Record<
  string,
  { icon: React.ReactNode; bg: string }
> = {
  play: {
    icon: <Gamepad2/>,
    bg: 'bg-gradient-to-br from-orange-500 to-orange-700',
  },

  spin: {
    icon: <Dices/>,
    bg: 'bg-gradient-to-br from-blue-500 to-blue-700',
  },

  refer: {
    icon: <Users/>,
    bg: 'bg-gradient-to-br from-pink-500 to-rose-700',
  },

  login: {
    icon: <CalendarCheck/>,
    bg: 'bg-gradient-to-br from-purple-500 to-purple-700',
  },

  share: {
    icon: <Share2/>,
    bg: 'bg-gradient-to-br from-sky-500 to-sky-700',
  },
}

function guessIcon(title: string) {
  const t = title.toLowerCase()
  if (t.includes('refer') || t.includes('invite') || t.includes('friend')) return TASK_ICON_MAP.refer
  if (t.includes('spin') || t.includes('wheel')) return TASK_ICON_MAP.spin
  if (t.includes('share')) return TASK_ICON_MAP.share
  if (t.includes('login') || t.includes('log in') || t.includes('check-in')) return TASK_ICON_MAP.login
  return TASK_ICON_MAP.play
}

function APITaskCard({ task, loggedIn, onChanged }: { task: Task; loggedIn: boolean; onChanged: () => void }) {
  const done = task.perUserLimit > 0 && task.myCompletions >= task.perUserLimit
  const { icon, bg } = guessIcon(task.title)
  const pct = task.perUserLimit > 0 ? Math.min((task.myCompletions / task.perUserLimit) * 100, 100) : 0

  return (
    <div className="rounded-xl border border-[#1F2E45] bg-[#0E1726] p-4">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}>
          <span className="text-lg">{icon}</span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-white leading-snug">{task.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-400 leading-snug">{task.description}</p>
            </div>
            {/* Reward */}
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-sm">🪙</span>
              <span className="text-sm font-bold text-amber-400">+{money(task.rewardAmount)}</span>
            </div>
          </div>

          {/* Progress bar + action */}
          <div className="mt-3 flex items-center gap-3">
            {task.perUserLimit > 0 && (
              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {task.myCompletions}/{task.perUserLimit}
                </p>
              </div>
            )}

            {!loggedIn ? (
              <span className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-500">
                Sign in
              </span>
            ) : done ? (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400">
                ✓ Completed
              </span>
            ) : (
              <TaskDialog task={task} onChanged={onChanged} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ━━━━━━━━━━━━━━━━━━ Task Dialog (start / complete) ━━━━━━━━━━━━━━━━━━ */

function TaskDialog({ task, onChanged }: { task: Task; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [completion, setCompletion] = useState<{ id: number; startedAt: string } | null>(null)
  const [submission, setSubmission] = useState('')
  const [answerCode, setAnswerCode] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [busy, setBusy] = useState(false)
  const vtype = task.verificationType ?? 'NONE'

  const start = async () => {
    setBusy(true)
    try {
      const data = await api.post<{ completion: { id: number; startedAt: string } }>(`/tasks/${task.id}/start`)
      setCompletion(data.completion)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start this task.')
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (open && !completion) start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const complete = async () => {
    if (!completion) return
    setBusy(true)
    try {
      const data = await api.post<{ completion: { status: string } }>(`/tasks/${task.id}/complete`, {
        completionId: completion.id,
        submission: submission || undefined,
        answerCode: answerCode || undefined,
      })
      if (data.completion.status === 'SUBMITTED') toast.success('Submitted for review')
      else toast.success(`Reward credited — +${money(task.rewardAmount)}`)
      setOpen(false)
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not complete this task.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-full border border-amber-400/60 px-4 py-1.5 text-xs font-bold text-amber-400 transition hover:bg-amber-400/10 active:scale-95">
          Go
        </button>
      </DialogTrigger>
      <DialogContent title={task.title}>
        <p className="text-[14px] text-ink-soft whitespace-pre-line">{task.instructions || task.description}</p>
        {!completion ? (
          <p className="mt-6 text-center text-[13px] text-ink-faint">Starting…</p>
        ) : (
          <div className="mt-5 space-y-4">
            {vtype === 'TIMER' ? <TimerBlock startedAt={completion.startedAt} seconds={task.timerSeconds ?? 20} onReady={() => setRemaining(0)} setRemaining={setRemaining} /> : null}
            {vtype === 'ANSWER_CODE' ? (
              <input
                className="h-12 w-full rounded-control border border-ink/15 px-4"
                placeholder="Enter the code"
                value={answerCode}
                onChange={(e) => setAnswerCode(e.target.value)}
              />
            ) : null}
            {vtype === 'TEXT_SUBMISSION' || vtype === 'MANUAL_REVIEW' ? (
              <textarea
                className="min-h-24 w-full rounded-control border border-ink/15 p-4 text-[14px]"
                placeholder="Add what's requested above"
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
              />
            ) : null}
            <Button className="w-full" disabled={busy || (vtype === 'TIMER' && remaining > 0)} onClick={complete}>
              {vtype === 'TIMER' && remaining > 0 ? `Wait ${remaining}s` : vtype === 'MANUAL_REVIEW' ? 'Submit for review' : 'Complete task'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ━━━━━━━━━━━━━━━━━━ Timer Block ━━━━━━━━━━━━━━━━━━ */

function TimerBlock({ startedAt, seconds, setRemaining }: { startedAt: string; seconds: number; onReady: () => void; setRemaining: (n: number) => void }) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
      const r = Math.max(0, Math.ceil(seconds - elapsed))
      setLeft(r)
      setRemaining(r)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [startedAt, seconds, setRemaining])
  return (
    <div className="rounded-xl bg-slate-800/60 p-4 text-center">
      <p className="num text-[28px] font-bold text-amber-400">{left}s</p>
      <p className="text-[12px] text-slate-500">Please wait before completing</p>
    </div>
  )
}

```

src/app/(frontend)/forgot-password/page.tsx
```tsx
'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await api.post('/auth/forgot-password', { email }).catch(() => null)
    setBusy(false)
    setSent(true)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-bg px-6 pb-24 text-text">
      <div className="brand-gradient mb-5 flex h-11 w-11 items-center justify-center rounded-xl font-display text-[19px] font-semibold text-white">N</div>
      <p className="font-display text-[28px] leading-tight">Reset your password</p>
      {sent ? (
        <p className="mt-3 text-[14px] text-text-soft">If an account exists for {email}, we've sent a link to reset the password.</p>
      ) : (
        <>
          <p className="mt-1 text-[14px] text-text-faint">We'll email you a link to choose a new one.</p>
          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Sending…' : 'Send reset link'}</Button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-[14px] text-text-faint">
        <Link href="/login" className="font-medium text-text">Back to sign in</Link>
      </p>
    </div>
  )
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

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownUp,
  CircleHelp,
  Clock3,
  Minus,
  Plus,
  RotateCcw,
  Volume2,
  Wallet,
  X,
} from 'lucide-react'

interface WingoPlayProps {
  state: unknown
  onSubmit: (answer: unknown) => void
}

type GameMode = '30s' | '1m' | '3m' | '5m'
type BetType = 'number' | 'color' | 'size'
type GameColor = 'Green' | 'Red' | 'Violet'
type GameSize = 'Big' | 'Small'

type GameBet = {
  id: string
  period: string
  mode: GameMode
  type: BetType
  selection: string
  amount: number
  placedAt: number
}

type GameResult = {
  period: string
  mode: GameMode
  number: number
  size: GameSize
  colors: GameColor[]
  createdAt: number
}

type SettledBet = {
  bet: GameBet
  resultNumber: number
  payout: number
  resolvedAt: number
}

type GameData = {
  balance: number
  pending: GameBet[]
  settled: SettledBet[]
  results: GameResult[]
}

type BetSelection = { type: GameBet['type']; selection: string } | null

type HistoryTab = 'game' | 'chart' | 'mine'

const STORAGE_KEY = 'wingo-demo-game-v1'
const CHIP_VALUES = [1, 10, 100, 1000]

const GAME_MODES = [
  { id: '30s', label: 'Win Go 30s', seconds: 30 },
  { id: '1m', label: 'Win Go 1Min', seconds: 60 },
  { id: '3m', label: 'Win Go 3Min', seconds: 180 },
  { id: '5m', label: 'Win Go 5Min', seconds: 300 },
] as const

const pad2 = (value: number) => String(value).padStart(2, '0')

function modeSeconds(mode: GameMode): number {
  return GAME_MODES.find((item) => item.id === mode)?.seconds ?? 30
}

function getPeriodInfo(nowMs: number, mode: GameMode): { period: string; remainingSeconds: number } {
  const date = new Date(nowMs)
  const secondsSinceUtcMidnight = date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds()
  const interval = modeSeconds(mode)
  const roundIndex = Math.floor(secondsSinceUtcMidnight / interval)
  const remainingSeconds = interval - (secondsSinceUtcMidnight % interval)
  const sequence = String(50001 + roundIndex).padStart(5, '0')
  const period = `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}1000${sequence}`

  return { period, remainingSeconds }
}

function getNumberTraits(number: number): { size: GameSize; colors: GameColor[] } {
  const size: GameSize = number >= 5 ? 'Big' : 'Small'
  const colors: GameColor[] =
    number === 0 ? ['Red', 'Violet'] : number === 5 ? ['Green', 'Violet'] : number % 2 === 1 ? ['Green'] : ['Red']

  return { size, colors }
}

function createResult(period: string, mode: GameMode, number: number, createdAt: number): GameResult {
  return {
    period,
    mode,
    number,
    ...getNumberTraits(number),
    createdAt,
  }
}

function createDemoResult(period: string, mode: GameMode, createdAt: number): GameResult {
  let hash = 2166136261
  for (let index = 0; index < period.length; index += 1) {
    hash = Math.imul(hash ^ period.charCodeAt(index), 16777619)
  }
  const number = Math.abs(hash) % 10
  return createResult(period, mode, number, createdAt)
}

function calculatePayout(bet: Pick<GameBet, 'type' | 'selection' | 'amount'>, result: Pick<GameResult, 'number' | 'size' | 'colors'>): number {
  const won =
    (bet.type === 'number' && Number(bet.selection) === result.number) ||
    (bet.type === 'size' && bet.selection === result.size) ||
    (bet.type === 'color' && result.colors.includes(bet.selection as GameColor))

  if (!won) return 0

  let multiplier = 2
  if (bet.type === 'number') multiplier = 9
  if (bet.type === 'color' && bet.selection === 'Violet') multiplier = 4.5
  if (bet.type === 'color' && bet.selection === 'Green' && result.number === 5) multiplier = 1.5
  if (bet.type === 'color' && bet.selection === 'Red' && result.number === 0) multiplier = 1.5

  return Math.round(bet.amount * 0.98 * multiplier * 100) / 100
}

function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${pad2(minutes)}:${pad2(remainder)}`
}

function seedResults(now: number): GameResult[] {
  const items: GameResult[] = []
  for (const mode of GAME_MODES) {
    const seconds = mode.seconds
    for (let ago = 1; ago <= 12; ago += 1) {
      const info = getPeriodInfo(now - seconds * ago * 1000, mode.id)
      if (!items.some((item) => item.mode === mode.id && item.period === info.period)) {
        items.push(createDemoResult(info.period, mode.id, now - seconds * ago * 1000))
      }
    }
  }
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

function loadGameData(): GameData {
  const now = Date.now()
  const fresh: GameData = { balance: 10000, pending: [], settled: [], results: seedResults(now) }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fresh
    const parsed = JSON.parse(raw) as Partial<GameData>
    if (typeof parsed.balance !== 'number' || !Array.isArray(parsed.pending)) return fresh
    const settled = Array.isArray(parsed.settled) ? parsed.settled : []
    const results = Array.isArray(parsed.results) ? parsed.results : fresh.results
    let balance = Math.max(0, parsed.balance)
    const pending: GameBet[] = []
    const recovered: SettledBet[] = [...settled]
    const seenPeriods = new Set(results.map((result: GameResult) => `${result.mode}:${result.period}`))
    for (const bet of parsed.pending as GameBet[]) {
      const currentPeriod = getPeriodInfo(now, bet.mode).period
      if (bet.period !== currentPeriod) {
        const result = createDemoResult(bet.period, bet.mode, now)
        const payout = calculatePayout(bet, result)
        balance += payout
        recovered.push({ bet, resultNumber: result.number, payout, resolvedAt: now })
        const key = `${result.mode}:${result.period}`
        if (!seenPeriods.has(key)) results.push(result)
        seenPeriods.add(key)
      } else pending.push(bet)
    }
    return { balance, pending, settled: recovered, results }
  } catch {
    return fresh
  }
}

function resultTone(result: GameResult): string {
  if (result.number === 0) return 'mix-red'
  if (result.number === 5) return 'mix'
  return result.colors[0].toLowerCase()
}

function toneForNumber(number: number): string {
  if (number === 0) return 'mix-red'
  if (number === 5) return 'mix'
  return getNumberTraits(number).colors[0].toLowerCase()
}

const colorClasses: Record<string, string> = {
  Green: 'bg-emerald-500 text-white',
  Red: 'bg-rose-500 text-white',
  Violet: 'bg-violet-500 text-white',
  Big: 'bg-sky-500 text-white',
  Small: 'bg-indigo-500 text-white',
}

export function WingoPlay({ onSubmit }: WingoPlayProps) {
  const [data, setData] = useState<GameData>(loadGameData)
  const dataRef = useRef(data)
  const [mode, setMode] = useState<GameMode>('30s')
  const [now, setNow] = useState(Date.now())
  const [amount, setAmount] = useState(10)
  const [selection, setSelection] = useState<BetSelection>(null)
  const [historyTab, setHistoryTab] = useState<HistoryTab>('game')
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [revealed, setRevealed] = useState<GameResult | null>(null)
  const [toast, setToast] = useState('')
  const periodRef = useRef<Record<GameMode, string> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeMode = GAME_MODES.find((item) => item.id === mode)!
  const periodInfo = getPeriodInfo(now, mode)

  useEffect(() => {
    dataRef.current = data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    const initial: Partial<Record<GameMode, string>> = {}
    for (const item of GAME_MODES) initial[item.id] = getPeriodInfo(Date.now(), item.id).period
    periodRef.current = initial as Record<GameMode, string>

    const timer = window.setInterval(() => {
      const tick = Date.now()
      setNow(tick)
      if (!periodRef.current) return
      let nextData = dataRef.current
      let changed = false
      let visibleResult: GameResult | null = null
      for (const item of GAME_MODES) {
        const current = getPeriodInfo(tick, item.id).period
        const previous = periodRef.current[item.id]
        if (previous && previous !== current) {
          const result = createDemoResult(previous, item.id, tick)
          const settling = nextData.pending.filter((bet) => bet.mode === item.id && bet.period === previous)
          const keep = nextData.pending.filter((bet) => !(bet.mode === item.id && bet.period === previous))
          let winnings = 0
          const settled = settling.map((bet) => {
            const payout = calculatePayout(bet, result)
            winnings += payout
            return { bet, resultNumber: result.number, payout, resolvedAt: tick }
          })
          const exists = nextData.results.some((entry) => entry.mode === item.id && entry.period === previous)
          nextData = {
            ...nextData,
            balance: nextData.balance + winnings,
            pending: keep,
            settled: [...settled, ...nextData.settled].slice(0, 150),
            results: (exists ? nextData.results : [result, ...nextData.results]).slice(0, 160),
          }
          changed = true
          if (item.id === mode) visibleResult = result
        }
        periodRef.current[item.id] = current
      }
      if (changed) {
        dataRef.current = nextData
        setData(nextData)
      }
      if (visibleResult) setRevealed(visibleResult)
    }, 500)

    return () => window.clearInterval(timer)
  }, [mode])

  useEffect(() => {
    if (!revealed) return
    const timeout = window.setTimeout(() => setRevealed(null), 6500)
    return () => window.clearTimeout(timeout)
  }, [revealed])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const modeResults = useMemo(
    () => data.results.filter((result) => result.mode === mode).sort((a, b) => b.createdAt - a.createdAt),
    [data.results, mode],
  )
  const recentResults = modeResults.slice(0, 5)
  const modePending = data.pending.filter((bet) => bet.mode === mode)
  const modeSettled = data.settled.filter((entry) => entry.bet.mode === mode).slice(0, 15)

  const choiceLabel = selection
    ? selection.type === 'color'
      ? `${selection.selection} color`
      : selection.type === 'size'
        ? `${selection.selection} size`
        : `Number ${selection.selection}`
    : 'Choose your pick'

  function notify(message: string) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

  function choose(type: GameBet['type'], value: string) {
    setSelection((previous) => (previous?.type === type && previous.selection === value ? null : { type, selection: value }))
  }

  function requestBet() {
    if (!selection) {
      notify('Choose a number, color, or size first.')
      return
    }
    if (amount > data.balance) {
      notify('Your play balance is too low for that stake.')
      return
    }
    setConfirmOpen(true)
  }

  function confirmBet() {
    if (!selection || amount > dataRef.current.balance) {
      setConfirmOpen(false)
      notify('This stake is no longer available.')
      return
    }

    const bet: GameBet = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      period: getPeriodInfo(Date.now(), mode).period,
      mode,
      type: selection.type,
      selection: selection.selection,
      amount,
      placedAt: Date.now(),
    }

    const next = {
      ...dataRef.current,
      balance: dataRef.current.balance - amount,
      pending: [bet, ...dataRef.current.pending],
    }

    dataRef.current = next
    setData(next)
    setConfirmOpen(false)
    setSelection(null)
    onSubmit({ type: bet.type, value: bet.selection })
    notify('Pick locked in for this round.')
  }

  function updateAmount(next: number) {
    setAmount(Math.max(1, Math.min(100000, Math.round(next))))
  }

  const resultForReveal = revealed
  const resultWonCount = resultForReveal
    ? data.settled.filter(
        (entry) =>
          entry.resultNumber === resultForReveal.number &&
          entry.bet.period === resultForReveal.period &&
          entry.bet.mode === resultForReveal.mode &&
          entry.payout > 0,
      ).length
    : 0

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-9 text-slate-900">
      <header className="relative overflow-hidden bg-[#ffd83d]">
        <div className="mx-auto w-[min(100%-36px,1080px)] py-5 pb-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-lg font-extrabold tracking-[-0.08em] text-[#ffd83d] shadow-[0_4px_0_rgba(36,38,56,0.14)]">
                51
              </div>
              <div>
                <div className="text-base font-extrabold leading-none tracking-[-0.04em]">51GAME</div>
                <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-700/70">PLAY ROOM / 01</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Open game rules"
                onClick={() => setHelpOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/15 bg-white/40 text-slate-900 transition hover:-translate-y-0.5 hover:bg-white/75"
              >
                <CircleHelp size={17} />
              </button>
              <button
                type="button"
                aria-label="Sound settings"
                className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/15 bg-white/40 text-slate-900 transition hover:-translate-y-0.5 hover:bg-white/75"
              >
                <Volume2 size={16} />
              </button>
            </div>
          </div>

          <div className="mt-6 max-w-xl">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-700/75">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shadow-[0_0_0_4px_rgba(22,157,102,0.13)]" />
              Quick round · demo play
            </div>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-[-0.08em] text-slate-900 sm:text-5xl">
              Pick a side.
              <br />
              Watch it land.
            </h1>
            <p className="mt-2 text-sm text-slate-700/75">One quick prediction, one new result every round.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[min(100%-36px,1080px)] -mt-14">
        <section className="flex items-center justify-between gap-4 rounded-[18px] border border-slate-900/5 bg-white px-5 py-4 shadow-[0_9px_26px_rgba(54,47,25,0.08)]">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              <Wallet size={13} />
              Demo play balance
            </div>
            <div className="mt-2 flex items-baseline gap-2 text-3xl font-extrabold tracking-[-0.06em] text-slate-900">
              {data.balance.toLocaleString()}
              <small className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">credits</small>
            </div>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-800">
            No cash value
          </span>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
          <div className="grid gap-4">
            <section className="rounded-[17px] border border-slate-900/5 bg-white p-4 shadow-[0_5px_18px_rgba(54,47,25,0.035)]">
              <div className="grid grid-cols-4 gap-2 rounded-xl bg-[#f5f3ee] p-1.5">
                {GAME_MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`min-h-[39px] rounded-lg text-[11px] font-extrabold transition ${
                      mode === item.id ? 'bg-slate-900 text-white shadow-[0_3px_7px_rgba(36,38,56,0.17)]' : 'text-slate-500'
                    }`}
                  >
                    {item.id === '30s' ? '30 sec' : item.id === '1m' ? '1 min' : item.id === '3m' ? '3 min' : '5 min'}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                <span>{activeMode.label}</span>
                <span>UTC round · {activeMode.seconds}s</span>
              </div>
            </section>

            <section className="relative grid gap-3 overflow-hidden rounded-[17px] bg-slate-900 p-4 text-white md:grid-cols-[1fr_auto] md:items-center">
              <div className="relative z-10">
                <div className="text-[9px] uppercase tracking-[0.16em] text-white/60">Current issue</div>
                <div className="mt-2 font-mono text-xs text-white/90">{periodInfo.period}</div>
                <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">Next result in</div>
                <div className="mt-1 font-mono text-3xl font-bold tracking-[-0.06em] text-[#ffd83d]">{formatCountdown(periodInfo.remainingSeconds)}</div>
                <div className="mt-1 text-[8px] uppercase tracking-[0.12em] text-white/40">minutes : seconds</div>
              </div>
              <div className="relative z-10 text-right">
                <div className="text-[9px] uppercase tracking-[0.14em] text-white/50">Recent results</div>
                <div className="mt-3 flex justify-end gap-2">
                  {recentResults.length ? (
                    recentResults.map((result) => (
                      <span key={`${result.mode}-${result.period}`} className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${colorClasses[result.colors[0]] ?? 'bg-emerald-500'}`}>
                        {result.number}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-white/60">First round underway</span>
                  )}
                </div>
                {modeResults[0] && (
                  <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-white/60">
                    <span>Last landed</span>
                    <strong className="font-mono text-lg text-[#ffd83d]">{modeResults[0].number}</strong>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[17px] border border-slate-900/5 bg-white shadow-[0_5px_18px_rgba(54,47,25,0.035)]">
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold tracking-[-0.04em] text-slate-900">Make your pick</h2>
                  <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Pick · Set stake · Confirm</span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, number) => (
                    <button
                      key={number}
                      type="button"
                      onClick={() => choose('number', String(number))}
                      className={`relative aspect-[1.25] min-h-[49px] rounded-xl border text-xl font-bold transition ${
                        selection?.type === 'number' && selection.selection === String(number)
                          ? 'border-slate-900 bg-[#fffdf4] shadow-[0_4px_0_rgba(36,38,56,0.13)]'
                          : 'border-[#eeece5] bg-[#faf9f6] hover:-translate-y-0.5 hover:border-slate-300'
                      }`}
                    >
                      <span className={`mx-auto grid h-[30px] w-[30px] place-items-center rounded-full text-[14px] font-bold ${colorClasses[toneForNumber(number)] ?? 'bg-emerald-500 text-white'}`}>
                        {number}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(['Green', 'Violet', 'Red'] as GameColor[]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => choose('color', color)}
                      className={`min-h-[40px] rounded-xl px-2 text-sm font-extrabold text-white transition ${
                        selection?.type === 'color' && selection.selection === color ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                      } ${colorClasses[color]}`}
                    >
                      {color}
                      <span className="ml-1 text-[9px] uppercase tracking-[0.1em] text-white/80">
                        {color === 'Green' ? '2×' : color === 'Violet' ? '4.5×' : '2×'}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(['Big', 'Small'] as GameSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => choose('size', size)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-extrabold transition ${
                        selection?.type === 'size' && selection.selection === size
                          ? 'border-slate-900 bg-[#fff9da]'
                          : 'border-[#e9e6dd] bg-[#f8f7f3] hover:border-slate-300'
                      }`}
                    >
                      <span>{size}</span>
                      <span className="font-mono text-[9px] text-slate-500">{size === 'Big' ? '5–9 · 2×' : '0–4 · 2×'}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex min-h-[34px] items-center justify-between rounded-lg bg-[#f7f6f1] px-2.5 text-[10px] text-slate-500">
                  <span>Current pick</span>
                  <strong className="text-xs font-bold text-slate-900">{choiceLabel}</strong>
                </div>
              </div>

              <div className="border-t border-[#f0eee8] p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Stake · demo credits</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CHIP_VALUES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateAmount(value)}
                      className={`min-w-[49px] rounded-lg border px-2.5 py-1.5 text-[10px] font-bold tracking-[0.08em] ${
                        amount === value ? 'border-slate-900 bg-[#fff7cf] text-slate-900' : 'border-[#e9e6dd] bg-white text-slate-600'
                      }`}
                    >
                      {value.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateAmount(amount - 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-[#e9e6dd] bg-[#f8f7f3] text-slate-700">
                      <Minus size={13} />
                    </button>
                    <span className="min-w-[70px] text-center font-mono text-base font-bold text-slate-900">{amount.toLocaleString()}</span>
                    <button type="button" onClick={() => updateAmount(amount + 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-[#e9e6dd] bg-[#f8f7f3] text-slate-700">
                      <Plus size={13} />
                    </button>
                    <button type="button" onClick={() => updateAmount(amount * 2)} className="grid h-7 w-7 place-items-center rounded-lg border border-[#e9e6dd] bg-[#f8f7f3] text-slate-700">
                      <ArrowDownUp size={13} />
                    </button>
                  </div>
                  <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500">Balance {data.balance.toLocaleString()}</span>
                </div>

                <button
                  type="button"
                  onClick={requestBet}
                  disabled={!selection || amount > data.balance}
                  className="mt-4 w-full rounded-xl bg-[#ffd83d] px-4 py-3 text-sm font-extrabold text-slate-900 shadow-[0_3px_0_#e2bc22] transition hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-[0_1px_0_#e2bc22] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {selection ? `Place ${amount.toLocaleString()} credit pick` : 'Choose a pick to continue'}
                </button>
              </div>
            </section>

            <section className="rounded-[17px] border border-slate-900/5 bg-white shadow-[0_5px_18px_rgba(54,47,25,0.035)]">
              <div className="flex border-b border-[#efede7] px-3">
                {([
                  ['game', 'Game history'],
                  ['chart', 'Chart'],
                  ['mine', 'My history'],
                ] as [HistoryTab, string][]).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setHistoryTab(tab)}
                    className={`flex-1 border-b-2 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] ${
                      historyTab === tab ? 'border-[#ffd83d] text-slate-900' : 'border-transparent text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {historyTab === 'game' && (
                  <>
                    <div className="mb-3 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      <span>Recent outcomes · {activeMode.label}</span>
                      <span>issue / number / color</span>
                    </div>
                    {modeResults.length ? (
                      <div className="overflow-hidden rounded-lg border border-slate-100">
                        <table className="w-full border-collapse text-left text-[10px]">
                          <thead>
                            <tr className="text-slate-400">
                              <th className="px-2 py-2 font-medium uppercase tracking-[0.1em]">Issue</th>
                              <th className="px-2 py-2 font-medium uppercase tracking-[0.1em]">Number</th>
                              <th className="px-2 py-2 font-medium uppercase tracking-[0.1em]">Color</th>
                              <th className="px-2 py-2 font-medium uppercase tracking-[0.1em]">Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modeResults.slice(0, 9).map((result) => (
                              <tr key={result.period} className="border-t border-slate-100 text-slate-700">
                                <td className="px-2 py-2 font-mono text-[9px] text-slate-500">{result.period.slice(-5)}</td>
                                <td className="px-2 py-2">
                                  <span className={`font-mono text-sm font-bold ${resultTone(result) === 'green' ? 'text-emerald-600' : resultTone(result) === 'red' ? 'text-rose-500' : resultTone(result) === 'violet' ? 'text-violet-600' : 'text-slate-700'}`}>
                                    {result.number}
                                  </span>
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex gap-1">
                                    {result.colors.map((color) => (
                                      <span key={color} className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${color === 'Green' ? 'bg-emerald-100 text-emerald-700' : color === 'Red' ? 'bg-rose-100 text-rose-600' : 'bg-violet-100 text-violet-700'}`}>
                                        {color}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-600">{result.size}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-[10px] text-slate-400">
                        <Clock3 size={14} className="mb-2" />
                        Results appear when this round closes.
                      </div>
                    )}
                  </>
                )}

                {historyTab === 'chart' && (
                  <>
                    <div className="mb-3 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      <span>Number road · last 24 rounds</span>
                      <span>Latest →</span>
                    </div>
                    {modeResults.length ? (
                      <div className="grid grid-cols-8 gap-2">
                        {modeResults.slice(0, 24).map((result) => (
                          <div key={result.period} className="flex flex-col items-center gap-1 text-[8px] text-slate-500">
                            <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white ${colorClasses[result.colors[0]] ?? 'bg-emerald-500'}`}>
                              {result.number}
                            </span>
                            <span className="font-mono">{result.period.slice(-3)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-[10px] text-slate-400">The chart will fill with completed rounds.</div>
                    )}
                  </>
                )}

                {historyTab === 'mine' && (
                  <>
                    <div className="mb-3 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      <span>Your picks · {activeMode.label}</span>
                      <span>Stake / outcome</span>
                    </div>
                    {modePending.length === 0 && modeSettled.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-[10px] text-slate-400">
                        <RotateCcw size={14} className="mb-2" />
                        Your confirmed picks will appear here.
                      </div>
                    ) : (
                      <div>
                        {modePending.map((bet) => (
                          <div key={bet.id} className="grid grid-cols-[1fr_auto] gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
                            <div>
                              <div className="text-[10px] font-extrabold">{bet.type === 'number' ? `Number ${bet.selection}` : `${bet.selection} ${bet.type}`}</div>
                              <div className="mt-1 text-[8px] font-medium uppercase tracking-[0.08em] text-slate-400">Issue {bet.period.slice(-5)} · {bet.mode}</div>
                            </div>
                            <div className="text-right font-mono text-[10px] text-slate-700">{bet.amount.toLocaleString()} cr</div>
                          </div>
                        ))}
                        {modeSettled.map((entry) => (
                          <div key={entry.bet.id} className="grid grid-cols-[1fr_auto] gap-3 border-t border-slate-100 py-3">
                            <div>
                              <div className="text-[10px] font-extrabold">{entry.bet.type === 'number' ? `Number ${entry.bet.selection}` : `${entry.bet.selection} ${entry.bet.type}`}</div>
                              <div className="mt-1 text-[8px] font-medium uppercase tracking-[0.08em] text-slate-400">Issue {entry.bet.period.slice(-5)} · landed {entry.resultNumber}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-[10px] text-slate-700">{entry.bet.amount.toLocaleString()} cr</div>
                              <div className={`mt-1 text-[8px] font-bold ${entry.payout > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {entry.payout > 0 ? 'Won' : 'Missed'} · +{entry.payout.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>

          <aside className="grid gap-4">
            <section className="rounded-[17px] border border-slate-900/5 bg-white p-4 shadow-[0_5px_18px_rgba(54,47,25,0.035)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-extrabold tracking-[-0.04em] text-slate-900">Open picks</h2>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-800">{data.pending.length} active</span>
              </div>
              {modePending.length ? (
                <div className="space-y-2">
                  {modePending.slice(0, 5).map((bet) => (
                    <div key={bet.id} className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
                      <div>
                        <div className="text-[10px] font-extrabold text-slate-900">{bet.type === 'number' ? `Number ${bet.selection}` : bet.selection}</div>
                        <div className="mt-1 text-[8px] font-medium uppercase tracking-[0.08em] text-slate-400">Issue {bet.period.slice(-5)} · {bet.mode}</div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-700">{bet.amount.toLocaleString()} cr</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-[10px] text-slate-400">
                  <Clock3 size={14} className="mb-2" />
                  No picks are waiting on this mode.
                </div>
              )}
              <p className="mt-3 text-[9px] leading-5 text-slate-500">
                A confirmed stake is held from your demo credits until the issue resolves. Winners receive their payout less a 2% service fee.
              </p>
            </section>

            <section className="rounded-[17px] border border-slate-900/5 bg-white p-4 shadow-[0_5px_18px_rgba(54,47,25,0.035)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-extrabold tracking-[-0.04em] text-slate-900">How Win Go works</h2>
                <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-400">At a glance</span>
              </div>
              <div className="space-y-3">
                {[
                  ['01', 'Choose your call', 'Pick a number, color, or size before the timer ends.'],
                  ['02', 'One number lands', 'Each issue resolves to a number from 0 through 9.'],
                  ['03', 'Credits update', 'Your stake returns only as a win payout; misses do not.'],
                ].map(([index, title, text]) => (
                  <div key={index} className="grid grid-cols-[26px_1fr] gap-3">
                    <span className="grid h-6 place-items-center rounded-lg bg-[#fff4c2] text-[10px] font-bold text-amber-800">{index}</span>
                    <div>
                      <div className="text-[10px] font-extrabold text-slate-900">{title}</div>
                      <div className="mt-1 text-[9px] leading-5 text-slate-500">{text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#f8f7f3] px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-slate-300"
              >
                <CircleHelp size={14} />
                Full game rules
              </button>
            </section>
          </aside>
        </div>

        <footer className="mt-5 text-center text-[9px] uppercase tracking-[0.12em] text-slate-500">
          51GAME Win Go is a demo game. Credits are for play only and have no cash value.
        </footer>
      </main>

      {helpOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-900/55 p-4" onClick={(event) => event.target === event.currentTarget && setHelpOpen(false)}>
          <section className="w-full max-w-md rounded-[18px] bg-white shadow-2xl" aria-modal="true">
            <div className="flex items-center justify-between bg-[#ffd83d] px-5 py-4">
              <h2 className="text-lg font-extrabold tracking-[-0.05em] text-slate-900">Win Go · quick rules</h2>
              <button type="button" onClick={() => setHelpOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/50 text-slate-900" aria-label="Close rules">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-5 text-sm text-slate-600">
              <div className="grid grid-cols-[26px_1fr] gap-2">
                <span className="grid h-6 place-items-center rounded-lg bg-[#fff4c2] text-[10px] font-bold text-amber-800">01</span>
                <div><div className="font-extrabold text-slate-900">Choose an interval.</div><div className="mt-1 text-[12px]">The 30-second, 1-minute, 3-minute, and 5-minute rooms each keep their own round clock.</div></div>
              </div>
              <div className="grid grid-cols-[26px_1fr] gap-2">
                <span className="grid h-6 place-items-center rounded-lg bg-[#fff4c2] text-[10px] font-bold text-amber-800">02</span>
                <div><div className="font-extrabold text-slate-900">Pick one outcome and stake.</div><div className="mt-1 text-[12px]">Choose a number (9×), a color, or Big / Small (2×). Green pays 1.5× on 5; Red pays 1.5× on 0; Violet pays 4.5× on 0 or 5.</div></div>
              </div>
              <div className="grid grid-cols-[26px_1fr] gap-2">
                <span className="grid h-6 place-items-center rounded-lg bg-[#fff4c2] text-[10px] font-bold text-amber-800">03</span>
                <div><div className="font-extrabold text-slate-900">Confirm before close.</div><div className="mt-1 text-[12px]">The stake is deducted from demo credits when confirmed. When the issue closes, winning payout is calculated after a 2% service fee and returned to your balance.</div></div>
              </div>
            </div>
          </section>
        </div>
      )}

      {confirmOpen && selection && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-900/55 p-4" onClick={(event) => event.target === event.currentTarget && setConfirmOpen(false)}>
          <section className="w-full max-w-md rounded-[18px] bg-white shadow-2xl" aria-modal="true">
            <div className="flex items-center justify-between bg-[#ffd83d] px-5 py-4">
              <h2 className="text-lg font-extrabold tracking-[-0.05em] text-slate-900">Confirm your pick</h2>
              <button type="button" onClick={() => setConfirmOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/50 text-slate-900" aria-label="Close confirmation">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-5 text-sm text-slate-600">
              <p className="m-0">Lock this prediction into the current issue?</p>
              <div className="flex items-center justify-between rounded-lg bg-[#f7f6f1] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <span>Pick</span>
                <strong className="text-xs text-slate-900">{choiceLabel}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#f7f6f1] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <span>Issue</span>
                <strong className="text-xs text-slate-900">{periodInfo.period}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#f7f6f1] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <span>Stake</span>
                <strong className="text-xs text-slate-900">{amount.toLocaleString()} demo credits</strong>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-xl border border-slate-200 bg-[#f8f7f3] px-3 py-2 text-sm font-extrabold text-slate-700">
                  Go back
                </button>
                <button type="button" onClick={confirmBet} className="rounded-xl bg-[#ffd83d] px-3 py-2 text-sm font-extrabold text-slate-900 shadow-[0_3px_0_#e2bc22]">
                  Confirm pick
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {resultForReveal && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-900/55 p-4" onClick={(event) => event.target === event.currentTarget && setRevealed(null)}>
          <section className="w-full max-w-md rounded-[18px] bg-white shadow-2xl" aria-modal="true">
            <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
              <h2 className="text-lg font-extrabold tracking-[-0.05em]">Round complete</h2>
              <button type="button" onClick={() => setRevealed(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white" aria-label="Close result">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col items-center px-5 py-6 text-center">
              <span className={`grid h-[68px] w-[68px] place-items-center rounded-full text-3xl font-bold text-white ${colorClasses[resultForReveal.colors[0]] ?? 'bg-emerald-500'}`}>
                {resultForReveal.number}
              </span>
              <h3 className="mt-4 text-2xl font-extrabold tracking-[-0.06em] text-slate-900">{resultForReveal.size} · {resultForReveal.colors.join(' + ')}</h3>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">Issue {resultForReveal.period} · {resultForReveal.mode.toUpperCase()}</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                {resultWonCount ? `${resultWonCount} of your picks won this issue.` : 'Check your history for this issue.'}
              </p>
              <button type="button" onClick={() => setRevealed(null)} className="mt-5 rounded-lg bg-[#ffd83d] px-6 py-2.5 text-sm font-extrabold text-slate-900">
                Keep playing
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold tracking-[0.1em] text-white shadow-lg">
          {toast}
        </div>
      )}
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
  WINGO: 'Wingo',
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
    case 'WINGO':
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

```

src/app/(frontend)/layout.tsx
```tsx
import type { Metadata, Viewport } from 'next'
import { Sora, Fraunces } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/components/AuthProvider'
import '../globals.css'

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', weight: ['400', '500', '600', '700'] })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['500', '600', '700'], style: ['normal', 'italic'] })

export const metadata: Metadata = {
  title: 'Rewards — earn real money',
  description: 'Complete tasks, play games, and earn real rewards.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F2F4EE',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${fraunces.variable}`}>
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  )
}
```

src/app/(frontend)/login/page.tsx
```tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { ApiError } from '@/lib/api-client'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-bg px-6 pb-24 text-text">
      <div className="brand-gradient mb-5 flex h-11 w-11 items-center justify-center rounded-xl font-display text-[19px] font-semibold text-white">N</div>
      <p className="font-display text-[28px] leading-tight">Welcome back</p>
      <p className="mt-1 text-[14px] text-text-faint">Sign in to keep earning.</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="mb-1.5 text-[13px] text-text-faint">Forgot password?</Link>
          </div>
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-text-faint">
        New here? <Link href="/register" className="font-medium text-text">Create an account</Link>
      </p>
      <button onClick={() => router.push('/')} className="mt-8 text-center text-[13px] text-text-faint">Continue browsing without signing in</button>
    </div>
  )
}
```

src/app/(frontend)/notifications/page.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { api } from '@/lib/api-client'
import { relativeTime } from '@/lib/format'

interface Notification {
  id: number
  type: string
  title: string
  body?: string
  readAt?: string | null
  createdAt: string
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null)

  const load = () => api.get<{ notifications: Notification[] }>('/notifications').then((d) => setItems(d.notifications))

  useEffect(() => {
    load()
  }, [])

  const markRead = async (id: number) => {
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) ?? null)
    await api.post(`/notifications/${id}/read`).catch(() => null)
  }

  return (
    <AppShell>
      <div className="mb-3 flex items-center gap-2">
        <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2">
          <ChevronLeft size={20} className="text-text-soft" />
        </Link>
        <h1 className="text-[18px] font-semibold">Notifications</h1>
      </div>
      <div className="space-y-2 pb-6">
        {!items ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : items.length === 0 ? (
          <EmptyState title="No notifications yet" body="We'll let you know when there's a reward, update or campaign for you." />
        ) : (
          items.map((n) => (
            <Card
              key={n.id}
              onClick={() => !n.readAt && markRead(n.id)}
              className={`px-4 py-3 ${n.readAt ? '' : 'border-brand-to/40 bg-badge-tint'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-medium">{n.title}</p>
                <span className="shrink-0 text-[11px] text-text-faint">{relativeTime(n.createdAt)}</span>
              </div>
              {n.body ? <p className="mt-0.5 text-[13px] text-text-soft">{n.body}</p> : null}
            </Card>
          ))
        )}
      </div>
    </AppShell>
  )
}
```

src/app/(frontend)/page.html
```html
<div
    class="bg-[#02050B] text-slate-100 flex justify-center items-start min-h-screen antialiased selection:bg-yellow-400 selection:text-black">
    
    <div
        class="relative w-full max-w-[412px] bg-[#080E1A] min-h-screen flex flex-col overflow-hidden shadow-2xl border-x border-slate-900 pb-24">
        <section class="px-4 py-2 flex items-center justify-between z-10" data-purpose="app-bar">
            
            <div class="flex items-center space-x-2">
                <div
                    class="w-9 h-9 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center p-0.5 shadow-md shadow-amber-500/20">
                    <div class="w-full h-full bg-[#0E1726] rounded-[10px] flex items-center justify-center">
                        
                    </div>
                </div>
                <div>
                    <div class="flex items-center space-x-1.5 leading-none">
                        <span class="text-base font-black tracking-wide text-amber-400">KING</span>
                        <span class="text-base font-black tracking-wide text-white">888</span>
                    </div>
                    <p class="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">Play • Earn • Redeem</p>
                </div>
            </div>
            
            <div class="flex items-center space-x-2.5">
                
                <button aria-label="Notifications"
                    class="relative w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
                    <svg class="w-4 h-4 fill-current" viewbox="0 0 24 24">
                        <path
                            d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z">
                        </path>
                    </svg>
                    <span
                        class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#080E1A]"></span>
                </button>
                
                <div
                    class="w-8 h-8 rounded-full bg-slate-800 p-0.5 border border-sky-500/70 shadow-sm shadow-sky-500/30 overflow-hidden">
                    <div
                        class="w-full h-full rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-700 flex items-center justify-center text-[11px] font-bold text-white">
                        <svg class="w-5 h-5 text-sky-200 fill-current" viewbox="0 0 24 24">
                            <path
                                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z">
                            </path>
                        </svg>
                    </div>
                </div>
            </div>
        </section>
        
        
        <main class="px-4 py-2 space-y-3.5 z-10 flex-1 overflow-y-auto no-scrollbar">
            
            <section class="flex items-center space-x-3 px-1" data-purpose="user-greeting">
                
                <div
                    class="relative w-10 h-10 rounded-full ring-2 ring-amber-400/60 overflow-hidden bg-slate-700 flex-shrink-0">
                    <div
                        class="w-full h-full bg-gradient-to-tr from-amber-700 to-slate-800 flex items-center justify-center text-amber-200 font-bold text-sm">
                        <User2Icon size={16
                    </div>
                </div>
                
                <div>
                    <h2 class="text-sm font-bold text-white leading-tight">Hello, Raj!</h2>
                    <p class="text-[11px] text-slate-300 font-medium">Keep playing, keep earning! 🚀</p>
                </div>
            </section>
            
            
            <section class="rounded-2xl bg-[#0D1526] border border-[#1A263C] p-3.5 shadow-lg shadow-black/40"
                data-purpose="wallet-overview">
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        
                        <div
                            class="w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 p-0.5 shadow-md shadow-amber-500/30 flex-shrink-0 flex items-center justify-center">
                            <div
                                class="w-full h-full rounded-full bg-amber-500 flex items-center justify-center font-black text-amber-950 text-base border border-amber-300">
                                ₹
                            </div>
                        </div>
                        <div>
                            <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Wallet
                                Balance</span>
                            <div class="text-xl font-black text-amber-400 tracking-tight leading-tight">₹ 2,850</div>
                        </div>
                    </div>
                    
                    <button
                        class="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl glow-gold-btn transition active:scale-95">
                        Withdraw
                    </button>
                </div>
                
                <div class="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/80">
                    
                    <div class="bg-[#080D18] rounded-xl p-2 flex flex-col justify-center border border-slate-800/60">
                        <div class="flex items-center space-x-1 mb-0.5">
                            <span
                                class="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[9px] font-black">₹</span>
                            <span class="text-[9px] text-slate-400 truncate">Total Earned</span>
                        </div>
                        <span class="text-xs font-bold text-white tracking-tight">₹ 12,450</span>
                    </div>
                    
                    <div class="bg-[#080D18] rounded-xl p-2 flex flex-col justify-center border border-slate-800/60">
                        <div class="flex items-center space-x-1 mb-0.5">
                            <span
                                class="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[9px] font-bold">💳</span>
                            <span class="text-[9px] text-slate-400 truncate">Total Withdrawn</span>
                        </div>
                        <span class="text-xs font-bold text-white tracking-tight">₹ 8,250</span>
                    </div>
                    
                    <div class="bg-[#080D18] rounded-xl p-2 flex flex-col justify-center border border-slate-800/60">
                        <div class="flex items-center space-x-1 mb-0.5">
                            <span
                                class="w-4 h-4 rounded-full bg-amber-600/20 text-amber-300 flex items-center justify-center text-[9px]">🏆</span>
                            <span class="text-[9px] text-slate-400 truncate">Pending</span>
                        </div>
                        <span class="text-xs font-bold text-white tracking-tight">₹ 1,200</span>
                    </div>
                </div>
            </section>
            
            
            <section
                class="relative rounded-2xl overflow-hidden p-3.5 glow-cyan-card bg-gradient-to-r from-[#072422] via-[#091C27] to-[#12112C]"
                data-purpose="daily-tasks-banner">
                <div class="flex items-center justify-between relative z-10">
                    <div class="flex items-start space-x-3">
                        
                        <div
                            class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center flex-shrink-0 text-emerald-400 mt-0.5">
                            <svg class="w-6 h-6 fill-current" viewbox="0 0 24 24">
                                <path
                                    d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z">
                                </path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-sm font-black text-emerald-300 tracking-wide">DAILY TASKS</h3>
                            <p class="text-[10px] text-slate-300 font-medium">Complete Tasks &amp; Win Rewards</p>
                            
                            <button
                                class="mt-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-md flex items-center space-x-1 shadow-sm transition active:scale-95">
                                <span>View Tasks</span>
                                <span class="text-[9px]">➔</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                        <div class="text-3xl filter drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] animate-pulse">💎</div>
                        <div class="absolute -top-1 right-0 text-xl filter drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]">✨
                        </div>
                    </div>
                </div>
            </section>
            
            
            <section class="space-y-2.5" data-purpose="top-games-grid">
                
                <div class="flex items-center justify-between px-1">
                    <h3 class="text-sm font-bold text-white tracking-wide">Top Games</h3>
                    <a class="text-[11px] font-semibold text-slate-400 hover:text-amber-400 flex items-center space-x-1 transition"
                        href="#">
                        <span>View All</span>
                        <span>➔</span>
                    </a>
                </div>
                
                <div class="grid grid-cols-4 gap-2">
                    
                    <div class="flex flex-col items-center group cursor-pointer">
                        <div
                            class="w-full aspect-square rounded-2xl bg-gradient-to-br from-[#1E1138] to-[#120B20] border border-purple-500/40 p-1 flex items-center justify-center shadow-md group-hover:border-amber-400 transition">
                            <div
                                class="w-full h-full rounded-xl bg-gradient-to-tr from-pink-500/30 via-indigo-600/30 to-amber-500/30 flex items-center justify-center text-2xl relative overflow-hidden">
                                <span class="filter drop-shadow-[0_0_6px_rgba(244,114,182,0.8)]">🎡</span>
                            </div>
                        </div>
                        <span class="text-[10px] font-semibold text-slate-300 mt-1.5 text-center leading-tight">Spin
                            &amp; Win</span>
                    </div>
                    
                    <div class="flex flex-col items-center group cursor-pointer">
                        <div
                            class="w-full aspect-square rounded-2xl bg-gradient-to-br from-[#271E0B] to-[#140F06] border border-amber-500/40 p-1 flex items-center justify-center shadow-md group-hover:border-amber-400 transition">
                            <div
                                class="w-full h-full rounded-xl bg-gradient-to-tr from-yellow-500/30 via-amber-600/30 to-orange-500/30 flex items-center justify-center text-2xl relative overflow-hidden">
                                <span class="filter drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]">🏎️</span>
                            </div>
                        </div>
                        <span
                            class="text-[10px] font-semibold text-slate-300 mt-1.5 text-center leading-tight">Racing</span>
                    </div>
                    
                    <div class="flex flex-col items-center group cursor-pointer">
                        <div
                            class="w-full aspect-square rounded-2xl bg-gradient-to-br from-[#0B2329] to-[#061217] border border-cyan-500/40 p-1 flex items-center justify-center shadow-md group-hover:border-cyan-300 transition">
                            <div
                                class="w-full h-full rounded-xl bg-gradient-to-tr from-cyan-500/30 via-emerald-600/30 to-blue-500/30 flex items-center justify-center text-2xl relative overflow-hidden">
                                <span class="filter drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]">🔮</span>
                            </div>
                        </div>
                        <span
                            class="text-[10px] font-semibold text-slate-300 mt-1.5 text-center leading-tight">Puzzle</span>
                    </div>
                    
                    <div class="flex flex-col items-center group cursor-pointer">
                        <div
                            class="w-full aspect-square rounded-2xl bg-gradient-to-br from-[#291A08] to-[#170E04] border border-yellow-500/40 p-1 flex items-center justify-center shadow-md group-hover:border-amber-300 transition">
                            <div
                                class="w-full h-full rounded-xl bg-gradient-to-tr from-amber-400/30 via-yellow-600/30 to-yellow-300/30 flex items-center justify-center text-2xl relative overflow-hidden">
                                <span class="filter drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]">💡</span>
                            </div>
                        </div>
                        <span
                            class="text-[10px] font-semibold text-slate-300 mt-1.5 text-center leading-tight">Quiz</span>
                    </div>
                </div>
            </section>
            
            
            <section class="space-y-2.5 pb-2" data-purpose="active-campaigns">
                
                <div class="flex items-center justify-between px-1">
                    <h3 class="text-sm font-bold text-white tracking-wide">Active Campaigns</h3>
                    <a class="text-[11px] font-semibold text-slate-400 hover:text-amber-400 flex items-center space-x-1 transition"
                        href="#">
                        <span>View All</span>
                        <span>➔</span>
                    </a>
                </div>
                
                <div
                    class="relative rounded-2xl p-3.5 glow-purple-card bg-gradient-to-r from-[#210D3B] via-[#1A0B33] to-[#0A061C] flex items-center justify-between overflow-hidden">
                    <div class="flex items-center space-x-3 z-10">
                        
                        <div
                            class="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center flex-shrink-0 text-2xl shadow-inner">
                            🎁
                        </div>
                        <div>
                            <h4 class="text-sm font-bold text-purple-200 leading-tight">Refer &amp; Earn</h4>
                            <p class="text-[10px] text-slate-300 font-medium mt-0.5">Invite Friends &amp; Get <span
                                    class="text-amber-400 font-bold">₹50</span></p>
                        </div>
                    </div>
                    
                    <div class="relative w-14 h-14 flex items-center justify-center z-10">
                        <span class="text-3xl filter drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]">📦</span>
                        <span class="absolute -top-1 -right-1 text-base">✨</span>
                    </div>
                </div>
            </section>
            
        </main>
        
        
        <nav class="fixed bottom-0 max-w-[412px] w-full bg-[#080E1B]/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 z-30 flex items-center justify-between"
            data-purpose="bottom-navigation">
            
            <button aria-label="Home" class="flex flex-col items-center space-y-1 text-amber-400 flex-1 py-1">
                <svg class="w-5 h-5 fill-current" viewbox="0 0 24 24">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
                </svg>
                <span class="text-[10px] font-bold">Home</span>
            </button>
            
            <button aria-label="Games"
                class="flex flex-col items-center space-y-1 text-slate-400 hover:text-slate-200 flex-1 py-1">
                <svg class="w-5 h-5 fill-current" viewbox="0 0 24 24">
                    <path
                        d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm4.5 1c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 8 18.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z">
                    </path>
                </svg>
                <span class="text-[10px] font-medium">Games</span>
            </button>
            
            <div class="flex-1 flex justify-center -mt-5">
                <button aria-label="Earn Rewards"
                    class="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 glow-elevated-btn shadow-lg transform active:scale-95 transition">
                    <div
                        class="w-full h-full rounded-full bg-[#0E1726] flex flex-col items-center justify-center text-amber-400">
                        <svg class="w-5 h-5 fill-current" viewbox="0 0 24 24">
                            <path
                                d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.65-.5-.65C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1h-2v-1c0-.55.45-1 1-1zm-6 0c.55 0 1 .45 1 1v1H8c-.55 0-1-.45-1-1s.45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76V14h2V8.76L15.38 12 17 10.83 14.92 8H20v6z">
                            </path>
                        </svg>
                    </div>
                </button>
            </div>
            
            <button aria-label="Promotion"
                class="flex flex-col items-center space-y-1 text-slate-400 hover:text-slate-200 flex-1 py-1">
                <svg class="w-5 h-5 fill-current" viewbox="0 0 24 24">
                    <path
                        d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-4.5-4.5 1.41-1.41L12 14.17l5.09-5.09 1.41 1.41L12 17z">
                    </path>
                </svg>
                <span class="text-[10px] font-medium">Promotion</span>
            </button>
            
            <button aria-label="Profile"
                class="flex flex-col items-center space-y-1 text-slate-400 hover:text-slate-200 flex-1 py-1">
                <svg class="w-5 h-5 fill-current" viewbox="0 0 24 24">
                    <path
                        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z">
                    </path>
                </svg>
                <span class="text-[10px] font-medium">Profile</span>
            </button>
        </nav>
        
    </div>
    
</div>
```

src/app/(frontend)/page.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, Calculator, ChevronRight, CircleQuestionMark, Dice1, Grid3x3, LifeBuoy, Zap, Gamepad, User2Icon } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/AuthProvider'
import { api } from '@/lib/api-client'
import { money } from '@/lib/format'

interface HomeData {
  maintenance: boolean
  message?: string
  site: { appName: string; tagline: string }
  banners: { id: number; title: string; description?: string; ctaLabel?: string; ctaUrl?: string; image?: string | null }[]
  announcements: { id: number; title: string; body: string; severity: string; isPinned: boolean }[]
  featuredTasks: { id: number; title: string; rewardAmount: number; icon?: string | null }[]
  featuredGames: { id: number; name: string; type: string; reward?: { amount: number }; icon?: React.ReactNode | null; thumbnail?: string | null }[]
  featuredCampaigns: { id: number; name: string; rewardAmount: number; banner?: string | null }[]
}

interface WalletStats {
  availableBalance: number
  pendingBalance: number
  lifetimeEarned: number
  lifetimeWithdrawn: number
}

const getGameEmoji = (type: string) => {
  switch (type) {
    case 'QUIZ':
      return <CircleQuestionMark/>
    case 'SUDOKU':
      return <Grid3x3 />
    case 'MEMORY':
      return <Brain/>
    case 'MATH':
      return <Calculator/>
    case 'REACTION':
      return <Zap/>
    case 'SPIN_WHEEL':
      return <LifeBuoy />
    case 'WINGO':
      return <Dice1 />
    case 'NUMBER_SEQUENCE':
      return <Dice1/>
    default:
      return <Gamepad/>
  }
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<HomeData | null>(null)
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api.get<HomeData>('/home').then(setData).catch(() => null)
  }, [])

  useEffect(() => {
    if (!user) {
      setWalletStats(null)
      return
    }
    api
      .get<{ wallet: WalletStats }>('/wallet')
      .then((d) => setWalletStats(d.wallet))
      .catch(() => setWalletStats(null))
    console.log(`homedata: ${JSON.stringify(data)}`)
    api.get<{ unreadCount: number }>('/notifications').then((d) => setUnread(d.unreadCount)).catch(() => null)
  }, [user])

  return (
    <AppShell>
      {!data ? (
        <div className="space-y-4 pt-2">
          <Skeleton className="h-20 w-full rounded-2xl bg-slate-800/50" />
          <Skeleton className="h-44 w-full rounded-2xl bg-slate-800/50" />
          <Skeleton className="h-24 w-full rounded-2xl bg-slate-800/50" />
          <Skeleton className="h-32 w-full rounded-2xl bg-slate-800/50" />
        </div>
      ) : data.maintenance ? (
        <Card className="mt-6 p-6 text-center bg-(--app-card) border-[#1F2E45]">
          <p className="font-display text-lg text-white">We'll be right back</p>
          <p className="mt-1 text-sm text-slate-400">{data.message}</p>
        </Card>
      ) : (
        <div className="space-y-5 pb-4 pt-1">

          {/* ─── User Greeting / Sign-in Prompt ─── */}
          {user ? (
            <section className="flex items-center gap-3 px-1" data-purpose="user-greeting">
              <div className="relative w-12 h-12 rounded-full ring-2 ring-amber-400/70 ring-offset-2 ring-offset-[#060B14] overflow-hidden flex-shrink-0">
                <div className="w-full h-full bg-gradient-to-br from-amber-600 via-amber-700 to-slate-800 flex items-center justify-center text-xl">
                  <User2Icon size={16}/>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-white leading-tight">
                    Hello, {user.name.split(' ')[0]}
                  </h2>
                  <span className="text-amber-400 text-sm">🪙</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Keep playing, keep earning! 🚀
                </p>
              </div>
            </section>
          ) : (
            <Card className="bg-gradient-to-br from-[#0E1726] to-[#131D30] border-[#1F2E45] px-5 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <span className="text-xl">👑</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Welcome to King 888</h2>
                  <p className="text-xs text-slate-400">{data.site.tagline || 'Earn real money in your spare time'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/register" className="flex-1">
                  <Button variant="marigold" size="sm" className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold border-0">
                    Get Started
                  </Button>
                </Link>
                <Link href="/login" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full border-slate-600 text-slate-300 hover:bg-white/5">
                    Sign In
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* ─── Wallet Balance Card ─── */}
          {user && (
            <Card className="rounded-2xl bg-[#0D1526] border border-[#1A263C] p-4 shadow-xl shadow-black/40" data-purpose="wallet-overview">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                    Wallet Balance
                  </span>
                  <div className="text-2xl font-black text-amber-400 tracking-tight leading-tight mt-0.5">
                    {walletStats === null ? '···' : money(walletStats.availableBalance)}
                  </div>
                </div>
                <Link href="/withdraw">
                  <button className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl glow-gold-btn transition active:scale-95 shadow-lg shadow-amber-500/20">
                    Withdraw
                  </button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/70">
                {/* Total Earned */}
                <div className="bg-[#080D18] rounded-xl p-2.5 border border-slate-800/50">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-black">
                      ↑
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium truncate">Total Earned</span>
                  </div>
                  <span className="text-xs font-bold text-white tracking-tight">
                    {walletStats === null ? '···' : money(walletStats.lifetimeEarned)}
                  </span>
                </div>

                {/* Total Withdrawn */}
                <div className="bg-[#080D18] rounded-xl p-2.5 border border-slate-800/50">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="w-4 h-4 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-[9px] font-black">
                      ↓
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium truncate">Total Withdrawn</span>
                  </div>
                  <span className="text-xs font-bold text-white tracking-tight">
                    {walletStats === null ? '···' : money(walletStats.lifetimeWithdrawn)}
                  </span>
                </div>

                {/* Pending */}
                <div className="bg-[#080D18] rounded-xl p-2.5 border border-slate-800/50">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[9px] font-black">
                      ⏳
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium truncate">Pending</span>
                  </div>
                  <span className="text-xs font-bold text-white tracking-tight">
                    {walletStats === null ? '···' : money(walletStats.pendingBalance)}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* ─── Daily Tasks Banner ─── */}
          <Link href="/earn" className="block">
            <section
              className="relative rounded-2xl overflow-hidden p-4 glow-cyan-card bg-gradient-to-r from-[#072422] via-[#091C27] to-[#12112C]"
              data-purpose="daily-tasks-banner"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-start gap-3">
                  {/* Clipboard check icon */}
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center flex-shrink-0 text-emerald-400 mt-0.5">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-emerald-300 tracking-wide">DAILY TASKS</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Complete Tasks & Win Rewards</p>
                    <span className="mt-2.5 inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-sm">
                      View Tasks <span className="text-xs">→</span>
                    </span>
                  </div>
                </div>

                {/* Sparkle decoration */}
                <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                  <div className="text-3xl filter drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] animate-pulse">💎</div>
                  <div className="absolute -top-1 right-0 text-lg filter drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]">✨</div>
                  <div className="absolute bottom-0 left-0 text-xs filter drop-shadow-[0_0_4px_rgba(234,179,8,0.4)]">✦</div>
                </div>
              </div>

              {/* Subtle gradient overlay on right edge */}
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-purple-900/20 to-transparent pointer-events-none" />
            </section>
          </Link>

          {/* ─── Top Games Section ─── */}
          <Section title="Top Games" href="/games">
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {data.featuredGames.length > 0 ? (
                data.featuredGames.map((g) => ({
                  id: g.id,
                  name: g.name,
                  image: g.thumbnail ?? null,
                  emoji: getGameEmoji(g.type),
                })).map((game) => (
                  <Link
                    key={game.id}
                    href={`/games`}
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
                ))
              ) : (
                <div className="w-full py-2 text-sm text-slate-400">No featured games right now.</div>
              )}
            </div>
          </Section>

          {/* ─── Active Campaigns Section ─── */}
          <Section title="Active Campaigns" href="/promotions">
            <div className="space-y-3">
              {data.featuredCampaigns.length > 0 ? (
                data.featuredCampaigns.map((c) => (
                  <Link key={c.id} href="/promotions">
                    <Card className="bg-gradient-to-r from-[#0E1726] to-[#121A2B] border-[#1F2E45] p-4 flex items-center gap-3 hover:border-amber-500/30 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">🎁</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{c.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Earn up to {money(c.rewardAmount)}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-[#1F2E45] bg-[#0E1726] p-4 text-sm text-slate-400">
                  No featured campaigns right now.
                </div>
              )}
            </div>
          </Section>

          {/* ─── Announcements ─── */}
          {data.announcements.length > 0 && (
            <section className="space-y-2">
              {data.announcements.slice(0, 3).map((a) => (
                <Card
                  key={a.id}
                  className={`px-4 py-3 border-[#1F2E45] ${a.severity === 'WARNING'
                    ? 'bg-red-950/30 border-red-500/20'
                    : a.severity === 'SUCCESS'
                      ? 'bg-emerald-950/30 border-emerald-500/20'
                      : 'bg-(--app-card)'
                    }`}
                >
                  <p className="text-sm font-medium text-white">{a.title}</p>
                  <p className="mt-0.5 text-[13px] text-slate-400">{a.body}</p>
                </Card>
              ))}
            </section>
          )}
        </div>
      )}
    </AppShell>
  )
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-white">{title}</h2>
        <Link href={href} className="flex items-center gap-0.5 text-[12px] text-amber-400/80 font-medium hover:text-amber-300 transition-colors">
          View All <ChevronRight size={14} />
        </Link>
      </div>
      {children}
    </section>
  )
}

```

src/app/(frontend)/profile/page.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, CircleHelp, Gift, LogOutIcon, ReceiptText, Settings, User2Icon, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api } from '@/lib/api-client'
import { money } from '@/lib/format'
import { Card } from '@/components/ui/card'

interface WalletData {
  wallet: {
    availableBalance: number
    pendingBalance: number
    lifetimeEarned: number
    lifetimeWithdrawn: number
  }
}

interface ReferralData {
  referralCode: string
  shareUrl: string
  totalReferred: number
  totalRewarded: number
  totalEarned: number
}

const menuItems: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  iconBg: string
  iconRing: string
}[] = [
  {
    icon: <Gift/>,
    title: 'My Rewards',
    description: 'View your earned rewards',
    href: '/rewards',
    iconBg: 'bg-purple-500/20',
    iconRing: 'border-purple-500/30',
  },

  {
    icon: <ReceiptText/>,
    title: 'Transaction History',
    description: 'Check your earnings & withdrawals',
    href: '/transactions',
    iconBg: 'bg-blue-500/20',
    iconRing: 'border-blue-500/30',
  },

  {
    icon: <Users/>,
    title: 'My Referrals',
    description: 'Friends you invited',
    href: '/referrals',
    iconBg: 'bg-amber-500/20',
    iconRing: 'border-amber-500/30',
  },

  {
    icon: <Settings/>,
    title: 'Settings',
    description: 'Manage your account',
    href: '/settings',
    iconBg: 'bg-emerald-500/20',
    iconRing: 'border-emerald-500/30',
  },

  {
    icon: <CircleHelp/>,
    title: 'Help & Support',
    description: 'Get help or contact us',
    href: '/support',
    iconBg: 'bg-purple-500/20',
    iconRing: 'border-purple-500/30',
  },
]

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [walletStats, setWalletStats] = useState({
    availableBalance: null as number | null,
    pendingBalance: null as number | null,
    lifetimeEarned: null as number | null,
    lifetimeWithdrawn: null as number | null,
  })
  const [referral, setReferral] = useState<ReferralData | null>(null)

  useEffect(() => {
    if (!user) return
    api
      .get<WalletData>('/wallet')
      .then((d) =>
        setWalletStats({
          availableBalance: d.wallet.availableBalance,
          pendingBalance: d.wallet.pendingBalance,
          lifetimeEarned: d.wallet.lifetimeEarned,
          lifetimeWithdrawn: d.wallet.lifetimeWithdrawn,
        }),
      )
      .catch(() => null)
    api
      .get<ReferralData>('/referrals')
      .then(setReferral)
      .catch(() => null)
  }, [user])

  if (!user) {
    return (
      <AppShell>
        <EmptyState
          title="Sign in to see your profile"
          action={
            <Link href="/login">
              <Button size="sm" className="mt-2">
                Sign in
              </Button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4 pb-8 pt-1">
        {/* ── User Info Card ── */}
        <div className="bg-[#0E1726] border border-[#1F2E45] rounded-2xl p-5">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative w-[60px] h-[60px] rounded-full ring-[3px] ring-amber-400/70 overflow-hidden flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-amber-600 via-amber-800 to-slate-900 flex items-center justify-center text-2xl">
                <User2Icon size={16}/>
              </div>
            </div>

            {/* Name & username */}
            <h2 className="mt-3 text-lg font-bold text-white">{user.name}</h2>
            {/* Bio */}
            <p className="mt-2 text-[13px] text-slate-300">
              Keep playing, keep earning! 🚀
            </p>
          </div>
        </div>

        {/* ── Wallet Balance Card ── */}
        {user && (
          <Card className="rounded-2xl bg-[#0D1526] border border-[#1A263C] p-4 shadow-xl shadow-black/40" data-purpose="wallet-overview">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                  Wallet Balance
                </span>
                <div className="text-2xl font-black text-amber-400 tracking-tight leading-tight mt-0.5">
                  {walletStats === null ? '···' : money(walletStats.availableBalance || 0)}
                </div>
              </div>
              <Link href="/withdraw">
                <button className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl glow-gold-btn transition active:scale-95 shadow-lg shadow-amber-500/20">
                  Withdraw
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/70">
              {/* Total Earned */}
              <div className="bg-[#080D18] rounded-xl p-2.5 border border-slate-800/50">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-black">
                    ↑
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium truncate">Total Earned</span>
                </div>
                <span className="text-xs font-bold text-white tracking-tight">
                  {walletStats === null ? '···' : money(walletStats.lifetimeEarned || 0)}
                </span>
              </div>

              {/* Total Withdrawn */}
              <div className="bg-[#080D18] rounded-xl p-2.5 border border-slate-800/50">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-4 h-4 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-[9px] font-black">
                    ↓
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium truncate">Total Withdrawn</span>
                </div>
                <span className="text-xs font-bold text-white tracking-tight">
                  {walletStats === null ? '···' : money(walletStats.lifetimeWithdrawn || 0)}
                </span>
              </div>

              {/* Pending */}
              <div className="bg-[#080D18] rounded-xl p-2.5 border border-slate-800/50">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[9px] font-black">
                    ⏳
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium truncate">Pending</span>
                </div>
                <span className="text-xs font-bold text-white tracking-tight">
                  {walletStats === null ? '···' : money(walletStats.pendingBalance || 0)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* ── Menu Items ── */}
        <div className="bg-[#0E1726] border border-[#1F2E45] rounded-2xl overflow-hidden divide-y divide-[#1F2E45]">
          {menuItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center px-4 py-3.5 hover:bg-white/[0.02] transition-colors active:bg-white/[0.04]"
            >
              <div
                className={`w-9 h-9 rounded-xl ${item.iconBg} border ${item.iconRing} flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-base">{item.icon}</span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {item.description}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
            </Link>
          ))}

          {/* Logout row */}
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3.5 hover:bg-white/[0.02] transition-colors active:bg-white/[0.04]"
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-base">
                <LogOutIcon/>
              </span>
            </div>
            <div className="ml-3 flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-red-400">Logout</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sign out from your account
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
          </button>
        </div>
      </div>
    </AppShell>
  )
}

```

src/app/(frontend)/promotions/page.tsx
```tsx
'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Copy, Share2 } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'
import { money } from '@/lib/format'
import Link from 'next/link'

interface ActionProgress { type: string; target: number; current: number; met: boolean; label?: string }
interface Campaign {
  id: number
  name: string
  description: string
  rewardAmount: number
  progress: ActionProgress[] | null
  claimed?: boolean
}

interface ReferralData {
  referralCode: string
  shareUrl: string
  totalReferred: number
  totalRewarded: number
  totalEarned: number
}

const ACTION_LABELS: Record<string, string> = {
  TASKS_COMPLETED: 'Complete tasks',
  GAMES_PLAYED: 'Play games',
  GAMES_WON: 'Win games',
  REFERRALS_QUALIFIED: 'Referrals',
  AMOUNT_EARNED: 'Earn',
  SPECIFIC_TASK: 'Complete the task',
  SPECIFIC_GAME: 'Play the game',
}

export default function PromotionsPage() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [claiming, setClaiming] = useState<number | null>(null)
  const [referral, setReferral] = useState<ReferralData | null>(null)
  const [isReferralLoading, setIsReferralLoading] = useState(true)
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(true)

  const loadCampaigns = useCallback(
    () =>
      api
        .get<{ campaigns: Campaign[] }>('/campaigns')
        .then((d) => setCampaigns(d.campaigns))
        .finally(() => setIsCampaignsLoading(false)),
    [],
  )

  const loadReferral = useCallback(() => {
    if (!user) {
      setReferral(null)
      setIsReferralLoading(false)
      return
    }
    setIsReferralLoading(true)
    api
      .get<ReferralData>('/referrals')
      .then(setReferral)
      .catch(() => setReferral(null))
      .finally(() => setIsReferralLoading(false))
  }, [user])

  useEffect(() => {
    loadCampaigns()
    loadReferral()
  }, [user, loadCampaigns, loadReferral])

  const claim = async (id: number) => {
    setClaiming(id)
    try {
      await api.post(`/campaigns/${id}/claim`)
      toast.success('Reward claimed!')
      loadCampaigns()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not claim this reward.')
    } finally {
      setClaiming(null)
    }
  }

  const copyCode = async () => {
    const code = referral?.referralCode ?? 'RAJ123'
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Referral code copied!')
    } catch {
      toast.error('Could not copy code')
    }
  }

  const shareCode = async () => {
    const code = referral?.referralCode ?? 'RAJ123'
    const url = referral?.shareUrl ?? ''
    const shareData = {
      title: 'Join King 888!',
      text: `Use my referral code ${code} to join King 888 and earn rewards!`,
      url,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${url}`)
        toast.success('Share link copied to clipboard!')
      }
    } catch {
      // User cancelled share
    }
  }

  const stats = [
    { label: 'Total Referrals', value: isReferralLoading ? null : referral?.totalReferred ?? 0, icon: '👥' },
    { label: 'Total Earned', value: isReferralLoading ? null : money(referral?.totalEarned ?? 0), icon: '🪙' },
    { label: 'Rewards Claimed', value: isReferralLoading ? null : referral?.totalRewarded ?? 0, icon: '🎁' },
  ]

  const steps = [
    { num: 1, icon: '📤', title: 'Share Your Code' },
    { num: 2, icon: '🎮', title: 'Friends Join & Play' },
    { num: 3, icon: '🎉', title: 'You Both Get Rewards' },
  ]

  const rewards = [
    { amount: '₹50', desc: 'When your friend registers', gradient: 'from-purple-600/80 to-purple-900/80' },
    { amount: '₹100', desc: 'When they add ₹100 or more', gradient: 'from-blue-600/80 to-blue-900/80' },
    { amount: '10%', desc: 'Lifetime commission on their earnings', gradient: 'from-purple-600/80 to-fuchsia-900/80' },
  ]

  return (
    <AppShell>
      <div className="space-y-5 pb-6 pt-1">

        {/* ── Hero Banner ───────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 px-5 py-8 text-center">
          {/* Decorative blurs */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-purple-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />

          {/* Floating emojis */}
          <div className="relative z-10">
            <div className="mb-3 flex items-center justify-center gap-3 text-3xl">
              <span>👥</span>
              <span className="text-4xl">🎁</span>
              <span>🪙</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">Refer &amp; Earn</h2>
            <p className="mt-1 text-base font-semibold text-amber-300">Invite Friends &amp; Get Rewards!</p>
            <p className="mt-1.5 text-sm text-purple-200/80">
              The more your friends play, the more you earn.
            </p>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          {isReferralLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="mt-2 h-5 w-14" />
                  <Skeleton className="mt-2 h-3 w-16" />
                </div>
              ))
            : stats.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center"
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="mt-1.5 text-lg font-bold text-white">{s.value}</span>
                  <span className="mt-0.5 text-[11px] leading-tight text-slate-400">{s.label}</span>
                </div>
              ))}
        </div>

        {/* ── Your Referral Code ─────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Your Referral Code</h3>
          <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-amber-400/50 bg-[#0E1726] px-5 py-4">
            {isReferralLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <span className="font-mono text-2xl font-extrabold tracking-[0.15em] text-amber-400">
                {referral?.referralCode ?? '—'}
              </span>
            )}
            <button
              onClick={copyCode}
              disabled={isReferralLoading || !referral?.referralCode}
              className="rounded-lg border border-[#1F2E45] bg-[#0E1726] p-2.5 text-slate-300 transition hover:bg-white/5 hover:text-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={20} />
            </button>
          </div>
          <Button
            onClick={shareCode}
            className="glow-gold-btn w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-base font-bold text-slate-900 hover:from-amber-400 hover:to-amber-500"
            size="lg"
          >
            <Share2 size={18} />
            Share Now
          </Button>
        </div>

        {/* ── How It Works ──────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">How It Works?</h3>
            <button className="text-xs font-medium text-amber-400 hover:underline">View Details &gt;</button>
          </div>
          <div className="rounded-xl border border-[#1F2E45] bg-[#0E1726] px-3 py-5">
            <div className="flex items-start justify-between">
              {steps.map((step, i) => (
                <React.Fragment key={step.num}>
                  <div className="flex flex-1 flex-col items-center text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/30">
                      {step.num}
                    </div>
                    <span className="mt-2 text-lg">{step.icon}</span>
                    <span className="mt-1.5 text-[11px] font-medium leading-tight text-slate-300">
                      {step.title}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <span className="mt-3 text-lg text-amber-400/60">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── Referral Rewards ──────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Referral Rewards</h3>
            <Link href={'/referrals'} className="text-xs font-medium text-amber-400 hover:underline">View All &gt;</Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {rewards.map((r) => (
              <div
                key={r.amount}
                className={`flex flex-col items-center rounded-xl bg-gradient-to-br ${r.gradient} border border-white/10 px-2 py-4 text-center`}
              >
                <span className="text-xl font-extrabold text-white">{r.amount}</span>
                <span className="mt-1.5 text-[10px] leading-tight text-white/70">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Invite More CTA Banner ────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-800/90 via-indigo-800/80 to-amber-700/70 px-5 py-5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-500/20 blur-2xl" />
          <div className="relative z-10 flex items-center gap-4">
            <span className="text-4xl">🏆</span>
            <div>
              <h4 className="text-base font-bold text-white">Invite More, Earn More</h4>
              <p className="mt-0.5 text-[12px] leading-snug text-purple-200/80">
                Top referrers get exclusive rewards and special bonuses!
              </p>
            </div>
          </div>
        </div>

        {/* ── Campaigns Section ─────────────────────────────────── */}
        {isCampaignsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Active Campaigns</h3>
            {campaigns.map((c) => {
              const allMet = c.progress?.every((p) => p.met) ?? false
              const claimed = Boolean(c.claimed)
              return (
                <Card key={c.id} className="p-4 rounded-xl border border-[#1F2E45] bg-[#0E1726]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium leading-snug">{c.name}</p>
                      <p className="mt-0.5 text-[10px] text-muted">{c.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="num shrink-0 text-[19px] text-marigold-deep">{money(c.rewardAmount)}</p>
                      {claimed ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          Claimed
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {c.progress && c.progress.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {c.progress.map((p, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-[12px] text-ink-faint">
                            <span>{p.label || ACTION_LABELS[p.type] || p.type}</span>
                            <span>{Math.min(p.current, p.target)} / {p.target}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-(--app-dark)-dim">
                            <div className="h-full bg-banyan" style={{ width: `${Math.min(100, (p.current / p.target) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3">
                    {!user ? (
                      <Button size="sm" variant="outline" disabled>Sign in to track progress</Button>
                    ) : claimed ? (
                      <Button size="sm" disabled>
                        Claimed
                      </Button>
                    ) : (
                      <Button size="sm" disabled={!allMet || claiming === c.id} onClick={() => claim(c.id)}>
                        {claiming === c.id ? 'Claiming…' : allMet ? 'Claim reward' : 'In progress'}
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState title="No campaigns right now" body="Limited-time promotions will show up here." />
        )}
      </div>
    </AppShell>
  )
}

```

src/app/(frontend)/referrals/page.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Share2, Users, Gift, Clock, CheckCircle, XCircle, Coins, ChevronRight, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'
import { money, relativeTime } from '@/lib/format'

interface ReferralData {
  referralCode: string
  shareUrl: string
  totalReferred: number
  totalRewarded: number
  totalEarned: number
  referrals: {
    id: number
    status: string
    registeredAt: string | null
    rewardedAt: string | null
    referrerReward: number | null
  }[]
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDING: { label: 'Pending', icon: <Clock size={14} />, color: 'text-amber-400' },
  QUALIFIED: { label: 'Qualified', icon: <CheckCircle size={14} />, color: 'text-blue-400' },
  REWARDED: { label: 'Rewarded', icon: <Gift size={14} />, color: 'text-emerald-400' },
  REJECTED: { label: 'Rejected', icon: <XCircle size={14} />, color: 'text-slate-500' },
}

export default function ReferralsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!user) return
    setLoading(true)
    api
      .get<ReferralData>('/referrals')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [user])

  const copyCode = async () => {
    if (!data?.referralCode) return
    try {
      await navigator.clipboard.writeText(data.referralCode)
      toast.success('Referral code copied!')
    } catch {
      toast.error('Could not copy code')
    }
  }

  const shareCode = async () => {
    if (!data) return
    const shareData = {
      title: 'Join King 888!',
      text: `Use my referral code ${data.referralCode} to join King 888 and earn rewards!`,
      url: data.shareUrl,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
        toast.success('Share link copied to clipboard!')
      }
    } catch {
      // User cancelled or unsupported
    }
  }

  if (!user) {
    return (
      <AppShell showBack>
        <EmptyState
          title="Sign in to see your referrals"
          action={
            <Link href="/login">
              <button className="mt-3 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2 text-sm font-bold text-slate-900">
                Sign In
              </button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-5 pb-6 pt-1">
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 p-5">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-purple-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Users size={22} className="text-purple-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">Refer &amp; Earn</h2>
              <p className="mt-0.5 text-sm text-purple-200/80">Invite friends and earn rewards for every successful referral</p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-1 -bottom-1 text-4xl opacity-20">
            <UserPlus size={32} />
          </div>
        </div>

        {/* ── Stats Row ── */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="mt-2 h-5 w-14" />
                <Skeleton className="mt-1 h-3 w-16" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-3 gap-2.5">
            <div className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center">
              <Users size={20} className="text-purple-400" />
              <span className="mt-1.5 text-lg font-bold text-white">{data.totalReferred}</span>
              <span className="mt-0.5 text-[11px] text-slate-400">Friends Referred</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center">
              <Coins size={20} className="text-amber-400" />
              <span className="mt-1.5 text-lg font-bold text-white">{money(data.totalEarned)}</span>
              <span className="mt-0.5 text-[11px] text-slate-400">Total Earned</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center">
              <Gift size={20} className="text-emerald-400" />
              <span className="mt-1.5 text-lg font-bold text-white">{data.totalRewarded}</span>
              <span className="mt-0.5 text-[11px] text-slate-400">Rewarded</span>
            </div>
          </div>
        ) : null}

        {/* ── Referral Code Card ── */}
        <div className="space-y-4">
          <h3 className="text-center text-sm font-semibold text-slate-300">
            Your Referral Code
          </h3>

          {loading ? (
            <Skeleton className="h-16 w-full rounded-2xl bg-slate-800/50" />
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-400/40 bg-[#0E1726] px-4 py-4">
              <span className="font-mono text-2xl font-extrabold tracking-[0.15em] text-amber-400">
                {data?.referralCode ?? '—'}
              </span>

              <button
                onClick={copyCode}
                aria-label="Copy referral code"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1F2E45] bg-[#080D18] text-slate-300 transition hover:bg-white/5 hover:text-amber-400 active:scale-95"
              >
                <Copy size={18} />
              </button>
            </div>
          )}

          <button
            onClick={shareCode}
            disabled={loading || !data?.shareUrl}
            className="glow-gold-btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-3 text-base font-bold text-slate-900 transition hover:from-amber-300 hover:to-yellow-300 disabled:opacity-50"
          >
            <Share2 size={18} />
            Share Now
          </button>
        </div>

        {/* ── Referral List ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-white">Referred Friends</h3>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                </Card>
              ))}
            </div>
          ) : !data || data.referrals.length === 0 ? (
            <EmptyState
              title="No referrals yet"
              body="Share your code with friends and earn rewards when they sign up and complete activities."
            />
          ) : (
            <div className="space-y-2">
              {data.referrals.map((ref) => {
                const cfg = STATUS_CONFIG[ref.status] || { label: ref.status, icon: <Clock size={14} />, color: 'text-slate-400' }
                return (
                  <Card key={ref.id} className="border-[#1F2E45] bg-[#0E1726] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                        <UserPlus size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                          {ref.referrerReward ? (
                            <span className="text-xs font-bold text-emerald-400">+{money(ref.referrerReward)}</span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {ref.registeredAt ? relativeTime(ref.registeredAt) : '—'}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-600" />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

```

src/app/(frontend)/register/page.tsx
```tsx
'use client'
import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { ApiError } from '@/lib/api-client'

function RegisterForm() {
  const { register } = useAuth()
  const params = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const ref = params.get('ref')
    if (ref) setReferralCode(ref)
  }, [params])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await register({ name, email, password, referralCode: referralCode || undefined })
      toast.success('Account created')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-bg px-6 pb-24 text-text">
      <div className="brand-gradient mb-5 flex h-11 w-11 items-center justify-center rounded-xl font-display text-[19px] font-semibold text-white">N</div>
      <p className="font-display text-[28px] leading-tight">Start earning</p>
      <p className="mt-1 text-[14px] text-text-faint">Complete tasks and play games for real rewards.</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1 text-[12px] text-text-faint">At least 8 characters.</p>
        </div>
        <div>
          <Label htmlFor="ref">Referral code (optional)</Label>
          <Input id="ref" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="e.g. AB12CD3" />
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating account…' : 'Create account'}</Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-text-faint">
        Already have an account? <Link href="/login" className="font-medium text-text">Sign in</Link>
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}

```

src/app/(frontend)/reset-password/page.tsx
```tsx
'use client'
import React, { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success('Password updated. Please sign in.')
      router.push('/login')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'This link is invalid or has expired.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-24">
      <p className="font-display text-[28px] leading-tight">Choose a new password</p>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy || !token} className="w-full">{busy ? 'Saving…' : 'Save password'}</Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

```

src/app/(frontend)/rewards/page.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Coins, Gift, Gamepad2, ClipboardList, Users, Sparkles, Trophy, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api } from '@/lib/api-client'
import { money, relativeTime } from '@/lib/format'

interface WalletData {
  wallet: {
    availableBalance: number
    pendingBalance: number
    lifetimeEarned: number
    lifetimeWithdrawn: number
    currency: string
  }
  transactions: {
    id: number
    type: string
    amount: number
    description: string
    createdAt: string
  }[]
}

const TX_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  TASK_REWARD: { label: 'Task reward', icon: <ClipboardList size={16} /> },
  GAME_REWARD: { label: 'Game reward', icon: <Gamepad2 size={16} /> },
  CAMPAIGN_REWARD: { label: 'Campaign reward', icon: <Gift size={16} /> },
  REFERRAL_REWARD: { label: 'Referral bonus', icon: <Users size={16} /> },
  BONUS: { label: 'Bonus', icon: <Sparkles size={16} /> },
  REFUND: { label: 'Refund', icon: <Trophy size={16} /> },
  ADMIN_CREDIT: { label: 'Admin credit', icon: <Trophy size={16} /> },
}

const EARNING_TYPES = new Set(Object.keys(TX_CONFIG))

export default function RewardsPage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<WalletData['wallet'] | null>(null)
  const [rewards, setRewards] = useState<WalletData['transactions'] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setWallet(null)
      setRewards(null)
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .get<WalletData>('/wallet')
      .then((d) => {
        setWallet(d.wallet)
        const earnings = d.transactions.filter((t) => EARNING_TYPES.has(t.type) && t.amount > 0)
        setRewards(earnings)
      })
      .catch(() => {
        setWallet(null)
        setRewards(null)
      })
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <AppShell showBack>
        <EmptyState
          title="Sign in to see your rewards"
          action={
            <Link href="/login">
              <button className="mt-3 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2 text-sm font-bold text-slate-900">
                Sign In
              </button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-5 pb-6 pt-1">
        {/* ── Hero Banner ────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-700 to-teal-600 p-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Trophy size={22} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">My Rewards</h2>
              <p className="mt-0.5 text-sm text-purple-200/80">Your complete reward history and balance</p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-2 -bottom-2 text-3xl opacity-20">
            <Coins size={32} />
          </div>
        </div>

        {/* ── Wallet Summary ── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl bg-slate-800/50" />
            ))}
          </div>
        ) : wallet ? (
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-[#1F2E45] bg-[#0D1526] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Available Balance</span>
              <div className="mt-1 text-2xl font-black text-amber-400">{money(wallet.availableBalance)}</div>
            </Card>
            <Card className="border-[#1F2E45] bg-[#0D1526] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Lifetime Earned</span>
              <div className="mt-1 text-2xl font-black text-emerald-400">{money(wallet.lifetimeEarned)}</div>
            </Card>
            <Card className="border-[#1F2E45] bg-[#0D1526] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Total Withdrawn</span>
              <div className="mt-1 text-2xl font-black text-slate-300">{money(wallet.lifetimeWithdrawn)}</div>
            </Card>
            <Card className="border-[#1F2E45] bg-[#0D1526] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Pending</span>
              <div className="mt-1 text-2xl font-black text-orange-400">{money(wallet.pendingBalance)}</div>
            </Card>
          </div>
        ) : null}

        {/* ── Rewards List ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-white">Reward History</h3>
            <Link href="/transactions" className="text-[12px] font-medium text-amber-400/80 hover:text-amber-300">
              See all transactions <ArrowRight size={12} />
            </Link>
          </div>

          {!rewards ? (
            <EmptyState title="No rewards yet" body="Complete tasks, play games, and refer friends to start earning." />
          ) : rewards.length === 0 ? (
            <EmptyState title="No rewards yet" body="Complete tasks, play games, and refer friends to start earning." />
          ) : (
            <div className="space-y-2">
              {rewards.map((tx) => {
                const cfg = TX_CONFIG[tx.type] || { label: tx.type, icon: <Coins size={16} /> }
                return (
                  <Card key={tx.id} className="border-[#1F2E45] bg-[#0E1726] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {cfg.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{tx.description || cfg.label}</p>
                        <p className="text-[11px] text-slate-500">{cfg.label} · {relativeTime(tx.createdAt)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-bold text-emerald-400">+{money(tx.amount)}</span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

```

src/app/(frontend)/settings/page.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { User, Mail, Phone, Copy, LogOut, CreditCard, Plus, Globe, Trash2, Shield, X } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'

interface FullUser {
  id: number
  email: string
  name: string
  status: string
  referralCode?: string
  phone?: string | null
  timezone?: string
  lastLoginAt?: string | null
}

interface PayoutMethod {
  id: number
  type: string
  label: string
  maskedDetails: string
  isDefault: boolean
}

const PAYOUT_ICONS: Record<string, React.ReactNode> = {
  UPI: <Globe size={16} />,
  BANK: <CreditCard size={16} />,
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING_VERIFICATION: 'Pending verification',
  SUSPENDED: 'Suspended',
  BLOCKED: 'Blocked',
  DELETED: 'Deleted',
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [fullUser, setFullUser] = useState<FullUser | null>(null)
  const [methods, setMethods] = useState<PayoutMethod[] | null>(null)
  const [methodsLoading, setMethodsLoading] = useState(true)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newMethod, setNewMethod] = useState({ type: 'UPI' as 'UPI' | 'BANK', label: '', upiId: '', accountNumber: '', ifsc: '', bankName: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!user) return
    api
      .get<{ user: FullUser }>('/auth/me')
      .then((d) => {
        setFullUser(d.user)
        if (!resetEmail) setResetEmail(d.user.email)
      })
      .catch(() => null)
    api
      .get<{ methods: PayoutMethod[] }>('/payout-methods')
      .then((d) => setMethods(d.methods))
      .catch(() => setMethods(null))
      .finally(() => setMethodsLoading(false))
  }, [user])

  const copyCode = async () => {
    if (!fullUser?.referralCode) return
    try {
      await navigator.clipboard.writeText(fullUser.referralCode)
      toast.success('Referral code copied!')
    } catch {
      toast.error('Could not copy code')
    }
  }

  const handleResetPassword = async () => {
    if (!resetEmail) return
    setResetLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: resetEmail })
      toast.success('Password reset link sent to your email')
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Something went wrong')
      }
    } finally {
      setResetLoading(false)
    }
  }

  const handleAddMethod = async () => {
    setAdding(true)
    try {
      const body: Record<string, unknown> = {
        type: newMethod.type,
        label: newMethod.label,
        holderName: fullUser?.name,
      }
      if (newMethod.type === 'UPI') body.upiId = newMethod.upiId
      else {
        body.accountNumber = newMethod.accountNumber
        body.ifsc = newMethod.ifsc
        body.bankName = newMethod.bankName
      }
      await api.post<{ method: PayoutMethod }>('/payout-methods', body)
      toast.success('Payout method added')
      setShowAddDialog(false)
      setNewMethod({ type: 'UPI', label: '', upiId: '', accountNumber: '', ifsc: '', bankName: '' })
      api.get<{ methods: PayoutMethod[] }>('/payout-methods').then((d) => setMethods(d.methods)).catch(() => null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Something went wrong')
      }
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteMethod = async (id: number) => {
    try {
      await api.del<{ removed: boolean }>(`/payout-methods/${id}`)
      toast.success('Payout method removed')
      setMethods((prev) => prev?.filter((m) => m.id !== id) ?? null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Something went wrong')
      }
    }
  }

  if (!user) {
    return (
      <AppShell showBack>
        <EmptyState
          title="Sign in to manage settings"
          action={
            <Link href="/login">
              <button className="mt-3 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2 text-sm font-bold text-slate-900">
                Sign In
              </button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell >
      <div className="space-y-5 pb-6 pt-1">
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-600 p-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Shield size={22} className="text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">Settings</h2>
              <p className="mt-0.5 text-sm text-cyan-200/80">Manage your account and preferences</p>
            </div>
          </div>
        </div>

        {/* ── Account Section ── */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-white">Account</h3>
          {!fullUser ? (
            <Card className="border-[#1F2E45] bg-[#0E1726] p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-[#1F2E45] bg-[#0E1726] p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-900">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-white">{fullUser.name}</h4>
                  <p className="text-sm text-slate-400">{fullUser.email}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 ${fullUser.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {STATUS_LABELS[fullUser.status] ?? fullUser.status}
                    </span>
                    {fullUser.lastLoginAt ? <span>Last login: {new Date(fullUser.lastLoginAt).toLocaleDateString('en-IN')}</span> : null}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="border-[#1F2E45] bg-[#0E1726] p-1.5">
            <SettingRow
              icon={<Mail size={18} className="text-slate-400" />}
              label="Email address"
              value={fullUser?.email ?? '—'}
              loading={!fullUser}
            />
            <SettingRow
              icon={<Phone size={18} className="text-slate-400" />}
              label="Phone number"
              value={fullUser?.phone ?? '—'}
              loading={!fullUser}
            />
            <SettingRow
              icon={<Shield size={18} className="text-slate-400" />}
              label="Timezone"
              value={fullUser?.timezone ?? 'Asia/Kolkata'}
              loading={!fullUser}
            />
            <SettingRow
              icon={<Globe size={18} className="text-slate-400" />}
              label="Referral code"
              value={fullUser?.referralCode ?? '—'}
              loading={!fullUser}
              action={fullUser?.referralCode ? (
                <button onClick={copyCode} className="rounded-lg border border-[#1F2E45] bg-[#080D18] p-1.5 text-slate-300 hover:bg-white/5 hover:text-amber-400">
                  <Copy size={16} />
                </button>
              ) : undefined}
            />
          </Card>
        </div>

        {/* ── Payout Methods ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-white">Payout Methods</h3>
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-1 text-[12px] font-medium text-amber-400/80 hover:text-amber-300"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {methodsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-1 h-4 w-1/2" />
                </Card>
              ))}
            </div>
          ) : methods && methods.length > 0 ? (
            <Card className="border-[#1F2E45] bg-[#0E1726] p-1.5">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                      {PAYOUT_ICONS[m.type] ?? <CreditCard size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.label}</p>
                      <p className="text-[11px] text-slate-500">{m.maskedDetails}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.isDefault ? (
                      <span className="text-[11px] font-semibold text-emerald-400">Default</span>
                    ) : null}
                    <button
                      onClick={() => handleDeleteMethod(m.id)}
                      className="rounded-lg border border-[#1F2E45] bg-[#080D18] p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState
              title="No payout methods"
              body="Add a payout method to receive your rewards."
              action={
                <Button size="sm" className="mt-2" onClick={() => setShowAddDialog(true)}>
                  Add Payout Method
                </Button>
              }
            />
          )}
        </div>

        {/* ── Add Payout Method Dialog ── */}
        {showAddDialog && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-t-card bg-surface px-5 pb-8 pt-5 safe-bottom">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-[19px] text-amber-500">Add Payout Method</h3>
                <button onClick={() => setShowAddDialog(false)} className="rounded-full p-1.5 hover:bg-ink/5">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewMethod({ ...newMethod, type: 'UPI' })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-center text-sm font-medium ${newMethod.type === 'UPI' ? 'border-amber-400/50 bg-amber-600/20 text-amber-400' : 'border-muted text-slate-400'}`}
                  >
                    UPI
                  </button>
                  <button
                    onClick={() => setNewMethod({ ...newMethod, type: 'BANK' })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-center text-sm font-medium ${newMethod.type === 'BANK' ? 'border-amber-400/50 bg-amber-600/20 text-amber-400' : 'border-muted text-slate-400'}`}
                  >
                    Bank
                  </button>
                </div>
                <div>
                  <Label>Label</Label>
                  <Input
                    placeholder={newMethod.type === 'UPI' ? 'e.g. Gpay' : 'e.g. SBI Savings'}
                    value={newMethod.label}
                    onChange={(e) => setNewMethod({ ...newMethod, label: e.target.value })}
                  />
                </div>
                {newMethod.type === 'UPI' ? (
                  <>
                    <div>
                      <Label>UPI ID</Label>
                      <Input
                        placeholder="name@upi"
                        value={newMethod.upiId}
                        onChange={(e) => setNewMethod({ ...newMethod, upiId: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Account Number</Label>
                      <Input
                        placeholder="1234567890"
                        value={newMethod.accountNumber}
                        onChange={(e) => setNewMethod({ ...newMethod, accountNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>IFSC</Label>
                      <Input
                        placeholder="SBIN0001234"
                        value={newMethod.ifsc}
                        onChange={(e) => setNewMethod({ ...newMethod, ifsc: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Bank Name</Label>
                      <Input
                        placeholder="State Bank of India"
                        value={newMethod.bankName}
                        onChange={(e) => setNewMethod({ ...newMethod, bankName: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <Button className="w-full" onClick={handleAddMethod} disabled={adding || !newMethod.label}>
                  {adding ? 'Adding…' : 'Add Payout Method'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Security Section ── */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-white">Security</h3>
          <Card className="border-[#1F2E45] bg-[#0E1726] p-4 space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase">Reset password</Label>
              <p className="mt-1 text-[13px] text-slate-400">Send a password reset link to your email</p>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="border-[#1F2E45] bg-[#080D18]"
                />
                <Button size="sm" onClick={handleResetPassword} disabled={resetLoading || !resetEmail}>
                  {resetLoading ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </div>

            <div className="border-t border-[#1F2E45] pt-3">
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-left text-red-400 hover:bg-red-500/15"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

function SettingRow({
  icon,
  label,
  value,
  loading,
  action,
}: {
  icon: React.ReactNode
  label: string
  value: string
  loading?: boolean
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-3 w-24" />
          ) : (
            <p className="text-[13px] font-medium text-white">{value}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}

```

src/app/(frontend)/support/page.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, Globe, HelpCircle, ChevronRight, FileText, Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'

interface SiteData {
  site: {
    appName: string
    tagline: string
    supportEmail?: string | null
    supportPhone?: string | null
    supportUrl?: string | null
  }
}

interface LegalData {
  terms: string
  privacyPolicy: string
  refundPolicy: string
  responsibleUse: string
}

const FAQ_ITEMS = [
  {
    question: 'How do I earn rewards?',
    answer: 'Complete daily tasks, play games, claim campaign rewards, and earn referral bonuses. Your balance updates in real-time as you play.',
  },
  {
    question: 'When can I withdraw my earnings?',
    answer: 'You can request a withdrawal once your available balance meets the minimum threshold (₹100). Withdrawals are processed within 24–48 hours during business days.',
  },
  {
    question: 'What payout methods are supported?',
    answer: 'We support UPI transfers and bank transfers (NEFT/RTGS). Add your preferred payout method in Settings > Payout Methods.',
  },
  {
    question: 'How does the referral program work?',
    answer: 'Share your unique referral code with friends. When they sign up and complete a qualifying activity, you both earn rewards automatically.',
  },
]

export default function SupportPage() {
  const [site, setSite] = useState<SiteData['site'] | null>(null)
  const [legal, setLegal] = useState<LegalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const homeData = await api.get<SiteData>('/home')
        setSite(homeData.site)
      } catch {
        setSite(null)
      }
      try {
        const legalData = await api.get<LegalData>('/legal')
        setLegal(legalData)
      } catch {
        setLegal(null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const copyEmail = async () => {
    if (!site?.supportEmail) return
    try {
      await navigator.clipboard.writeText(site.supportEmail)
      toast.success('Email copied!')
    } catch {
      toast.error('Could not copy email')
    }
  }

  return (
    <AppShell >
      <div className="space-y-5 pb-6 pt-1">
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 p-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <HelpCircle size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">Help &amp; Support</h2>
              <p className="mt-0.5 text-sm text-white/80">We're here to help you</p>
            </div>
          </div>
        </div>

        {/* ── Contact Info ── */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-white">Contact Us</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Card className="border-[#1F2E45] bg-[#0E1726] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium text-white break-all">{site?.supportEmail ?? 'support@king888.com'}</p>
                  </div>
                  <button
                    onClick={copyEmail}
                    className="rounded-lg border border-[#1F2E45] bg-[#080D18] p-1.5 text-slate-300 hover:bg-white/5 hover:text-amber-400"
                    title="Copy email"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </Card>

              {site?.supportPhone ? (
                <Card className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                      <Phone size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="font-medium text-white">{site.supportPhone}</p>
                    </div>
                  </div>
                </Card>
              ) : null}

              {site?.supportUrl ? (
                <Card className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                      <Globe size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">Website</p>
                      <p className="font-medium text-white truncate">{site.supportUrl}</p>
                    </div>
                    <a
                      href={site.supportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-[#1F2E45] bg-[#080D18] p-1.5 text-slate-300 hover:bg-white/5 hover:text-amber-400"
                      title="Visit website"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </Card>
              ) : null}
            </div>
          )}
        </div>

        {/* ── FAQ ── */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-white">Frequently Asked Questions</h3>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <Card key={item.question} className="border-[#1F2E45] bg-[#0E1726] p-3">
                <p className="text-sm font-medium text-white">{item.question}</p>
                <p className="mt-1 text-[13px] text-slate-400 leading-relaxed">{item.answer}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Legal Links ── */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-white">Legal</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <Skeleton className="h-5 w-24" />
                </Card>
              ))}
            </div>
          ) : legal ? (
            <Card className="border-[#1F2E45] bg-[#0E1726] p-1.5">
              {legal.terms ? (
                <LegalLink href="/legal/terms" icon={<FileText size={16} />} label="Terms & Conditions" />
              ) : null}
              {legal.privacyPolicy ? (
                <LegalLink href="/legal/privacy" icon={<FileText size={16} />} label="Privacy Policy" />
              ) : null}
              {legal.refundPolicy ? (
                <LegalLink href="/legal/refund" icon={<FileText size={16} />} label="Refund Policy" />
              ) : null}
              {legal.responsibleUse ? (
                <LegalLink href="/legal/responsible-use" icon={<FileText size={16} />} label="Responsible Use Policy" />
              ) : null}
            </Card>
          ) : (
            <Card className="border-[#1F2E45] bg-[#0E1726] p-3">
              <p className="text-sm text-slate-400">Legal documents are not available right now.</p>
            </Card>
          )}
        </div>

        {/* ── Contact Form Quick Action ── */}
        <Card className="border-[#1F2E45] bg-[#0E1726] p-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <MessageCircle size={20} />
            </div>
            <p className="text-sm text-slate-400">
              Can&apos;t find what you&apos;re looking for? Reach out to our support team via email anytime.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}

function LegalLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-white/[0.02] hover:text-white transition-colors"
    >
      {icon}
      <span className="text-[13px]">{label}</span>
      <ChevronRight size={14} className="ml-auto text-slate-600" />
    </Link>
  )
}

```

src/app/(frontend)/transactions/page.tsx
```tsx
'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Gamepad2,
  Gift,
  Users,
  Sparkles,
  Trophy,
  Clock,
  Undo,
  Wallet,
} from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api } from '@/lib/api-client'
import { money, relativeTime } from '@/lib/format'

interface WalletData {
  wallet: {
    availableBalance: number
    pendingBalance: number
    lifetimeEarned: number
    lifetimeWithdrawn: number
    currency: string
  }
  transactions: {
    id: number
    type: string
    amount: number
    description: string
    createdAt: string
  }[]
}

const TX_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  TASK_REWARD: { label: 'Task reward', icon: <ClipboardList size={16} /> },
  GAME_REWARD: { label: 'Game reward', icon: <Gamepad2 size={16} /> },
  CAMPAIGN_REWARD: { label: 'Campaign reward', icon: <Gift size={16} /> },
  REFERRAL_REWARD: { label: 'Referral bonus', icon: <Users size={16} /> },
  BONUS: { label: 'Bonus', icon: <Sparkles size={16} /> },
  WITHDRAWAL: { label: 'Withdrawal', icon: <TrendingDown size={16} /> },
  REFUND: { label: 'Refund', icon: <Undo size={16} /> },
  ADMIN_CREDIT: { label: 'Admin credit', icon: <Trophy size={16} /> },
  ADMIN_DEBIT: { label: 'Admin debit', icon: <TrendingDown size={16} /> },
  REVERSAL: { label: 'Reversal', icon: <Undo size={16} /> },
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const [txs, setTxs] = useState<WalletData['transactions'] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTxs(null)
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .get<WalletData>('/wallet')
      .then((d) => setTxs(d.transactions))
      .catch(() => setTxs(null))
      .finally(() => setLoading(false))
  }, [user])

  const grouped = useMemo(() => {
    if (!txs) return null
    const now = Date.now()
    const today: typeof txs = []
    const yesterday: typeof txs = []
    const earlier: typeof txs = []
    txs.forEach((tx) => {
      const diffDays = Math.floor((now - new Date(tx.createdAt).getTime()) / 86_400_000)
      if (diffDays === 0) today.push(tx)
      else if (diffDays === 1) yesterday.push(tx)
      else earlier.push(tx)
    })
    return { today, yesterday, earlier }
  }, [txs])

  if (!user) {
    return (
      <AppShell showBack>
        <EmptyState
          title="Sign in to see your transactions"
          action={
            <Link href="/login">
              <button className="mt-3 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2 text-sm font-bold text-slate-900">
                Sign In
              </button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  const renderGroup = (label: string, items: WalletData['transactions']) => {
    if (items.length === 0) return null
    return (
      <div key={label} className="space-y-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">{label}</h3>
        {items.map((tx) => {
          const cfg = TX_CONFIG[tx.type] || { label: tx.type, icon: <Wallet size={16} /> }
          const isCredit = tx.amount >= 0
          return (
            <Card key={tx.id} className="border-[#1F2E45] bg-[#0E1726] p-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    isCredit ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
                  }`}
                >
                  {cfg.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{tx.description || cfg.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">{cfg.label}</span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[11px] text-slate-500">{relativeTime(tx.createdAt)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-sm font-bold ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCredit ? '+' : ''}{money(Math.abs(tx.amount))}
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <AppShell >
      <div className="space-y-5 pb-6 pt-1">
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-cyan-600 p-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <ArrowUpDown size={22} className="text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">Transaction History</h2>
              <p className="mt-0.5 text-sm text-cyan-200/80">All earnings and withdrawals in one place</p>
            </div>
          </div>
        </div>

        {/* ── Transaction Groups ── */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-[#1F2E45] bg-[#0E1726] p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-700/50" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-4 w-2/3 rounded bg-slate-700/50" />
                    <div className="h-3 w-1/2 rounded bg-slate-700/50" />
                  </div>
                  <div className="h-4 w-16 rounded bg-slate-700/50" />
                </div>
              {/* </div> */}
            </Card>
          ))}
          </div>
        ) : !grouped ? (
          <EmptyState title="No transactions yet" body="Your transaction history will appear here once you start earning." />
        ) : grouped.today.length === 0 && grouped.yesterday.length === 0 && grouped.earlier.length === 0 ? (
          <EmptyState title="No transactions yet" body="Your transaction history will appear here once you start earning." />
        ) : (
          <div className="space-y-5">
            {renderGroup('Today', grouped.today)}
            {renderGroup('Yesterday', grouped.yesterday)}
            {renderGroup('Earlier', grouped.earlier)}
          </div>
        )}
      </div>
    </AppShell>
  )
}

```

src/app/(frontend)/wallet/page.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'
import { money, relativeTime } from '@/lib/format'
import { WithdrawDialog } from './WithdrawDialog'

interface Wallet { availableBalance: number; pendingBalance: number; lifetimeEarned: number; lifetimeWithdrawn: number }
interface Tx { id: number; type: string; amount: number; description: string; createdAt: string }
interface Withdrawal { id: number; amount: number; method: string; status: string; requestedAt: string; failureReason?: string | null }

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
}

export default function WalletPage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [txs, setTxs] = useState<Tx[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [tab, setTab] = useState<'activity' | 'withdrawals'>('activity')

  const load = () => {
    api.get<{ wallet: Wallet; transactions: Tx[] }>('/wallet').then((d) => {
      setWallet(d.wallet)
      setTxs(d.transactions)
    })
    api.get<{ withdrawals: Withdrawal[] }>('/withdrawals').then((d) => setWithdrawals(d.withdrawals))
  }

  useEffect(() => {
    if (user) load()
  }, [user])

  const cancel = async (id: number) => {
    try {
      await api.post(`/withdrawals/${id}/cancel`)
      toast.success('Withdrawal cancelled')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not cancel this withdrawal.')
    }
  }

  if (!user) {
    return (
      <AppShell title="Wallet">
        <EmptyState title="Sign in to see your wallet" body="Track earnings and request withdrawals once you're signed in." />
      </AppShell>
    )
  }

  return (
    <AppShell title="Wallet">
      <div className="pb-8 pt-1">
        {!wallet ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <Card className="bg-ink px-6 py-6 text-paper">
              <p className="text-[13px] text-paper/60">Available balance</p>
              <p className="num mt-1 text-[38px] leading-none">{money(wallet.availableBalance)}</p>
              <div className="mt-4 flex gap-4 text-[13px] text-paper/70">
                <span>Held: <span className="num">{money(wallet.pendingBalance)}</span></span>
                <span>Lifetime earned: <span className="num">{money(wallet.lifetimeEarned)}</span></span>
              </div>
              <WithdrawDialog available={wallet.availableBalance} onDone={load} />
            </Card>

            <div className="mt-6 flex gap-1 rounded-control bg-(--app-dark)-dim p-1">
              <button onClick={() => setTab('activity')} className={`flex-1 rounded-chip py-2 text-[13px] font-medium ${tab === 'activity' ? 'bg-surface' : 'text-ink-faint'}`}>Activity</button>
              <button onClick={() => setTab('withdrawals')} className={`flex-1 rounded-chip py-2 text-[13px] font-medium ${tab === 'withdrawals' ? 'bg-surface' : 'text-ink-faint'}`}>Withdrawals</button>
            </div>

            <div className="mt-4 space-y-2">
              {tab === 'activity' ? (
                txs.length === 0 ? (
                  <EmptyState title="No activity yet" body="Complete a task or play a game to see it here." />
                ) : (
                  txs.map((t) => (
                    <div key={t.id} className="flex items-center justify-between border-b border-ink/8 py-2.5">
                      <div>
                        <p className="text-[14px]">{t.description}</p>
                        <p className="text-[12px] text-ink-faint">{relativeTime(t.createdAt)}</p>
                      </div>
                      <p className={`num text-[15px] ${t.amount >= 0 ? 'text-banyan-deep' : 'text-ink-soft'}`}>{t.amount >= 0 ? '+' : ''}{money(t.amount)}</p>
                    </div>
                  ))
                )
              ) : withdrawals.length === 0 ? (
                <EmptyState title="No withdrawals yet" body="Requested withdrawals will appear here." />
              ) : (
                withdrawals.map((w) => (
                  <Card key={w.id} className="p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="num text-[16px]">{money(w.amount)}</p>
                      <span className="rounded-full bg-(--app-dark)-dim px-2.5 py-0.5 text-[12px]">{STATUS_LABEL[w.status] ?? w.status}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-faint">{w.method} · {relativeTime(w.requestedAt)}</p>
                    {w.failureReason ? <p className="mt-1 text-[12px] text-coral">{w.failureReason}</p> : null}
                    {w.status === 'PENDING' ? (
                      <button onClick={() => cancel(w.id)} className="mt-2 text-[12px] text-ink-faint underline">Cancel request</button>
                    ) : null}
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

```

src/app/(frontend)/wallet/WithdrawDialog.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { api, ApiError } from '@/lib/api-client'
import { money } from '@/lib/format'

interface PayoutMethod { id: number; type: 'UPI' | 'BANK'; label: string; maskedDetails: string; isDefault: boolean }

export function WithdrawDialog({ available, onDone }: { available: number; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [methods, setMethods] = useState<PayoutMethod[] | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [addingMethod, setAddingMethod] = useState(false)

  const loadMethods = () =>
    api.get<{ methods: PayoutMethod[] }>('/payout-methods').then((d) => {
      setMethods(d.methods)
      setSelected((prev) => prev ?? d.methods.find((m) => m.isDefault)?.id ?? d.methods[0]?.id ?? null)
    })

  useEffect(() => {
    if (open) loadMethods()
  }, [open])

  const submit = async () => {
    if (!selected) return toast.error('Add a payout method first.')
    setBusy(true)
    try {
      await api.post('/withdrawals', { amount, payoutMethodId: selected })
      toast.success('Withdrawal requested')
      setOpen(false)
      setAmount('')
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not request this withdrawal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="marigold" size="sm" className="mt-5">Withdraw</Button>
      </DialogTrigger>
      <DialogContent title="Withdraw funds">
        {addingMethod ? (
          <AddMethodForm
            onAdded={(m) => {
              setMethods((prev) => [...(prev ?? []), m])
              setSelected(m.id)
              setAddingMethod(false)
            }}
            onCancel={() => setAddingMethod(false)}
          />
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
              <p className="mt-1 text-[12px] text-ink-faint">Available: {money(available)}</p>
            </div>
            <div>
              <Label>Payout method</Label>
              {!methods ? (
                <p className="text-[13px] text-ink-faint">Loading…</p>
              ) : methods.length === 0 ? (
                <Button variant="outline" size="sm" onClick={() => setAddingMethod(true)}>Add a payout method</Button>
              ) : (
                <div className="space-y-2">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelected(m.id)}
                      className={`flex w-full items-center justify-between rounded-control border px-4 py-3 text-left text-[14px] ${
                        selected === m.id ? 'border-banyan bg-banyan-tint' : 'border-ink/15'
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className="text-ink-faint">{m.maskedDetails}</span>
                    </button>
                  ))}
                  <button onClick={() => setAddingMethod(true)} className="text-[13px] text-ink-faint underline">Add another method</button>
                </div>
              )}
            </div>
            <Button className="w-full" disabled={busy || !amount || !selected} onClick={submit}>
              {busy ? 'Requesting…' : 'Request withdrawal'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddMethodForm({ onAdded, onCancel }: { onAdded: (m: PayoutMethod) => void; onCancel: () => void }) {
  const [type, setType] = useState<'UPI' | 'BANK'>('UPI')
  const [upiId, setUpiId] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [holderName, setHolderName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      const method = await api.post<{ method: PayoutMethod }>('/payout-methods', {
        type,
        label: type === 'UPI' ? 'UPI' : 'Bank account',
        upiId: type === 'UPI' ? upiId : undefined,
        accountNumber: type === 'BANK' ? accountNumber : undefined,
        ifsc: type === 'BANK' ? ifsc : undefined,
        holderName: holderName || undefined,
      })
      toast.success('Payout method added')
      onAdded(method.method)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add this payout method.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setType('UPI')} className={`flex-1 rounded-control border py-2.5 text-[14px] ${type === 'UPI' ? 'border-banyan bg-banyan-tint' : 'border-ink/15'}`}>UPI</button>
        <button onClick={() => setType('BANK')} className={`flex-1 rounded-control border py-2.5 text-[14px] ${type === 'BANK' ? 'border-banyan bg-banyan-tint' : 'border-ink/15'}`}>Bank account</button>
      </div>
      {type === 'UPI' ? (
        <div>
          <Label htmlFor="upi">UPI ID</Label>
          <Input id="upi" placeholder="name@bank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="acc">Account number</Label>
            <Input id="acc" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} />
          </div>
          <div>
            <Label htmlFor="ifsc">IFSC code</Label>
            <Input id="ifsc" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} />
          </div>
        </>
      )}
      <div>
        <Label htmlFor="holder">Account holder name</Label>
        <Input id="holder" value={holderName} onChange={(e) => setHolderName(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Back</Button>
        <Button className="flex-1" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save method'}</Button>
      </div>
    </div>
  )
}

```

src/app/(payload)/admin/[[...segments]]/not-found.tsx
```tsx
import config from '@payload-config'
import { NotFoundPage } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

const NotFound = ({ params, searchParams }: Args) => NotFoundPage({ config, params, searchParams, importMap })

export default NotFound

```

src/app/(payload)/admin/[[...segments]]/page.tsx
```tsx
import type { Metadata } from 'next'
import config from '@payload-config'
import { generatePageMetadata, RootPage } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

const Page = ({ params, searchParams }: Args) => RootPage({ config, params, searchParams, importMap })

export default Page

```

src/app/(payload)/admin/importMap.js
```javascript
import { UserRelatedLinks as UserRelatedLinks_9c1e50f3276f85ee55b0f4fa17efb6c6 } from '../../../components/admin/UserRelatedLinks'
import { MoneyField as MoneyField_6f5e6e782d36f9f3a19a1ebbba920cfc } from '../../../components/admin/MoneyField'
import { RscEntryLexicalCell as RscEntryLexicalCell_44fe37237e0ebf4470c9990d8cb7b07e } from '@payloadcms/richtext-lexical/rsc'
import { RscEntryLexicalField as RscEntryLexicalField_44fe37237e0ebf4470c9990d8cb7b07e } from '@payloadcms/richtext-lexical/rsc'
import { LexicalDiffComponent as LexicalDiffComponent_44fe37237e0ebf4470c9990d8cb7b07e } from '@payloadcms/richtext-lexical/rsc'
import { InlineToolbarFeatureClient as InlineToolbarFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { HorizontalRuleFeatureClient as HorizontalRuleFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { UploadFeatureClient as UploadFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { BlockquoteFeatureClient as BlockquoteFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { RelationshipFeatureClient as RelationshipFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { LinkFeatureClient as LinkFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { ChecklistFeatureClient as ChecklistFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { OrderedListFeatureClient as OrderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { UnorderedListFeatureClient as UnorderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { IndentFeatureClient as IndentFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { AlignFeatureClient as AlignFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { HeadingFeatureClient as HeadingFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { ParagraphFeatureClient as ParagraphFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { InlineCodeFeatureClient as InlineCodeFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { SuperscriptFeatureClient as SuperscriptFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { SubscriptFeatureClient as SubscriptFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { StrikethroughFeatureClient as StrikethroughFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { UnderlineFeatureClient as UnderlineFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { BoldFeatureClient as BoldFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { ItalicFeatureClient as ItalicFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { S3ClientUploadHandler as S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24 } from '@payloadcms/storage-s3/client'
import { Dashboard as Dashboard_16b88e9b8c48e393fa86591406efd08f } from '../../../components/admin/Dashboard'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'

/** @type import('payload').ImportMap */
export const importMap = {
  "/components/admin/UserRelatedLinks#UserRelatedLinks": UserRelatedLinks_9c1e50f3276f85ee55b0f4fa17efb6c6,
  "/components/admin/MoneyField#MoneyField": MoneyField_6f5e6e782d36f9f3a19a1ebbba920cfc,
  "@payloadcms/richtext-lexical/rsc#RscEntryLexicalCell": RscEntryLexicalCell_44fe37237e0ebf4470c9990d8cb7b07e,
  "@payloadcms/richtext-lexical/rsc#RscEntryLexicalField": RscEntryLexicalField_44fe37237e0ebf4470c9990d8cb7b07e,
  "@payloadcms/richtext-lexical/rsc#LexicalDiffComponent": LexicalDiffComponent_44fe37237e0ebf4470c9990d8cb7b07e,
  "@payloadcms/richtext-lexical/client#InlineToolbarFeatureClient": InlineToolbarFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#HorizontalRuleFeatureClient": HorizontalRuleFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#UploadFeatureClient": UploadFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#BlockquoteFeatureClient": BlockquoteFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#RelationshipFeatureClient": RelationshipFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#LinkFeatureClient": LinkFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#ChecklistFeatureClient": ChecklistFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#OrderedListFeatureClient": OrderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#UnorderedListFeatureClient": UnorderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#IndentFeatureClient": IndentFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#AlignFeatureClient": AlignFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#HeadingFeatureClient": HeadingFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#ParagraphFeatureClient": ParagraphFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#InlineCodeFeatureClient": InlineCodeFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#SuperscriptFeatureClient": SuperscriptFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#SubscriptFeatureClient": SubscriptFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#StrikethroughFeatureClient": StrikethroughFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#UnderlineFeatureClient": UnderlineFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#BoldFeatureClient": BoldFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#ItalicFeatureClient": ItalicFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/storage-s3/client#S3ClientUploadHandler": S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24,
  "/components/admin/Dashboard#Dashboard": Dashboard_16b88e9b8c48e393fa86591406efd08f,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1
}

```

src/app/(payload)/api/[...slug]/route.ts
```typescript
import config from '@payload-config'
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)

```

src/app/(payload)/layout.tsx
```tsx
import type { ServerFunctionClient } from 'payload'

import config from '@payload-config'
import '@payloadcms/next/css'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout

```

src/app/api/admin/metrics/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { isAdminUser } from '@/access'
import { dayBounds, addDays } from '@/lib/time'
import { getSettings } from '@/services/settings'

const RANGES: Record<string, number> = { today: 0, yesterday: 1, '7d': 7, '30d': 30 }

export async function GET(req: NextRequest) {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: req.headers })
  if (!isAdminUser(user)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admins only.' } }, { status: 403 })

  const range = req.nextUrl.searchParams.get('range') ?? 'today'
  const settings = await getSettings(payload)
  const tz = settings.site.defaultTimezone
  const now = new Date()

  let start: Date
  let end: Date
  if (range === 'yesterday') {
    const y = dayBounds(addDays(now, -1), tz)
    start = y.start
    end = y.end
  } else {
    const days = RANGES[range] ?? 0
    end = dayBounds(now, tz).end
    start = days > 0 ? dayBounds(addDays(now, -days), tz).start : dayBounds(now, tz).start
  }

  const between = { greater_than_equal: start.toISOString(), less_than: end.toISOString() }

  const [totalUsers, newUsers, activeUsers, rewardsRange, withdrawalsTotal, withdrawalsPending, withdrawalsCompleted, withdrawalsFailed, taskCompletions, gamesPlayed, campaignClaims, referralConversions] = await Promise.all([
    payload.count({ collection: 'users', overrideAccess: true }),
    payload.count({ collection: 'users', where: { createdAt: between }, overrideAccess: true }),
    payload.count({ collection: 'users', where: { lastLoginAt: between }, overrideAccess: true }),
    payload.find({ collection: 'wallet-transactions', where: { amount: { greater_than: 0 }, createdAt: between }, limit: 5000, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'withdrawals', where: { status: { equals: 'COMPLETED' } }, limit: 5000, depth: 0, overrideAccess: true }),
    payload.count({ collection: 'withdrawals', where: { status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'] } }, overrideAccess: true }),
    payload.count({ collection: 'withdrawals', where: { status: { equals: 'COMPLETED' }, completedAt: between }, overrideAccess: true }),
    payload.count({ collection: 'withdrawals', where: { status: { equals: 'FAILED' }, failedAt: between }, overrideAccess: true }),
    payload.count({ collection: 'task-completions', where: { status: { equals: 'COMPLETED' }, completedAt: between }, overrideAccess: true }),
    payload.count({ collection: 'game-sessions', where: { status: { equals: 'COMPLETED' }, createdAt: between }, overrideAccess: true }),
    payload.count({ collection: 'campaign-claims', where: { claimedAt: between }, overrideAccess: true }),
    payload.count({ collection: 'referrals', where: { status: { in: ['QUALIFIED', 'REWARDED'] }, qualifiedAt: between }, overrideAccess: true }),
  ])

  const rewardsTodaySum = rewardsRange.docs.reduce((s, t) => s + t.amount, 0)

  let allTimeSum = 0
  let page = 1
  for (;;) {
    const res = await payload.find({ collection: 'wallet-transactions', where: { amount: { greater_than: 0 } }, limit: 1000, page, depth: 0, overrideAccess: true, sort: 'id' })
    allTimeSum += res.docs.reduce((s, t) => s + t.amount, 0)
    if (!res.hasNextPage) break
    page++
    if (page > 50) break
  }

  return NextResponse.json({
    ok: true,
    data: {
      range,
      totalUsers: totalUsers.totalDocs,
      newUsers: newUsers.totalDocs,
      activeUsers: activeUsers.totalDocs,
      rewardsIssuedAllTime: allTimeSum,
      rewardsIssuedRange: rewardsTodaySum,
      totalWithdrawalsCompleted: withdrawalsTotal.docs.reduce((s, w) => s + w.amount, 0),
      withdrawalsPending: withdrawalsPending.totalDocs,
      withdrawalsCompleted: withdrawalsCompleted.totalDocs,
      withdrawalsFailed: withdrawalsFailed.totalDocs,
      taskCompletions: taskCompletions.totalDocs,
      gamesPlayed: gamesPlayed.totalDocs,
      campaignClaims: campaignClaims.totalDocs,
      referralConversions: referralConversions.totalDocs,
    },
  })
}

```

src/app/api/auth/forgot-password/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPayloadClient } from '@/lib/payload'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-meta'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ ok: true, data: null })
  const ip = getClientIp(req.headers)
  await enforceRateLimit(LIMITS.passwordResetIp, ip).catch(() => null)
  await enforceRateLimit(LIMITS.passwordResetAccount, body.data.email.toLowerCase()).catch(() => null)
  const payload = await getPayloadClient()
  await payload.forgotPassword({ collection: 'users', data: body.data, disableEmail: false }).catch(() => null)
  return NextResponse.json({ ok: true, data: null })
}

```

src/app/api/auth/login/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePayloadCookie } from 'payload/shared'
import { getUserPayloadClient } from '@/lib/payload'
import { AppError, isAppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-meta'
import { recordLogin } from '@/services/user'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const ip = getClientIp(req.headers)
    await enforceRateLimit(LIMITS.loginIp, ip, 'Too many login attempts from this network. Please try again later.')
    await enforceRateLimit(LIMITS.loginAccount, body.email.toLowerCase(), 'Too many login attempts for this account. Please try again later.')

    const payload = await getUserPayloadClient()
    const result = await payload.login({ collection: 'users', data: body, req: { headers: req.headers } as never }).catch(() => null)
    if (!result?.user || !result.token) throw new AppError('UNAUTHENTICATED', 'Incorrect email or password.')
    if (result.user.status === 'BLOCKED' || result.user.status === 'DELETED') throw new AppError('ACCOUNT_RESTRICTED', 'This account is not able to sign in.')

    await recordLogin(payload, {}, result.user.id, ip)
    const cookie = generatePayloadCookie({ collectionAuthConfig: payload.collections.users.config.auth, cookiePrefix: payload.config.cookiePrefix, token: result.token })
    const res = NextResponse.json({ ok: true, data: { user: { id: result.user.id, email: result.user.email, name: result.user.name, status: result.user.status } } })
    res.headers.append('Set-Cookie', cookie)
    return res
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email and password.' } }, { status: 422 })
    if (isAppError(err)) return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.status })
    console.error('[auth/login]', err)
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL', message: 'Sign in failed. Please try again.' } }, { status: 500 })
  }
}

```

src/app/api/auth/logout/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateExpiredPayloadCookie } from 'payload/shared'
import { getPayloadClient, getUserPayloadClient } from '@/lib/payload'

export async function POST(_req: NextRequest) {
  const userPayload = await getUserPayloadClient()
  const adminPayload = await getPayloadClient()

  const userCookie = generateExpiredPayloadCookie({
    collectionAuthConfig: userPayload.collections.users.config.auth,
    cookiePrefix: userPayload.config.cookiePrefix,
  })
  const adminCookie = generateExpiredPayloadCookie({
    collectionAuthConfig: adminPayload.collections.admins.config.auth,
    cookiePrefix: adminPayload.config.cookiePrefix,
  })

  const res = NextResponse.json({ ok: true, data: null })
  res.headers.append('Set-Cookie', userCookie)
  res.headers.append('Set-Cookie', adminCookie)
  return res
}

```

src/app/api/auth/me/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'

export const GET = withApi(async ({ user }) => ok({ user }), { requireAuth: true })

```

src/app/api/auth/register/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePayloadCookie } from 'payload/shared'
import { getUserPayloadClient } from '@/lib/payload'
import { AppError, isAppError } from '@/lib/errors'
import { registerUser } from '@/services/user'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(120),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
  timezone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const payload = await getUserPayloadClient()
    const user = await registerUser({ payload, headers: req.headers, ...body })

    const requireVerify = process.env.REQUIRE_EMAIL_VERIFICATION === 'true'
    if (requireVerify) {
      return NextResponse.json({ ok: true, data: { user: { id: user.id, email: user.email, status: user.status }, requiresVerification: true } })
    }

    const { token } = await payload.login({ collection: 'users', data: { email: body.email, password: body.password }, req: { headers: req.headers } as never })
    const cookie = generatePayloadCookie({ collectionAuthConfig: payload.collections.users.config.auth, cookiePrefix: payload.config.cookiePrefix, token: token! })
    const res = NextResponse.json({ ok: true, data: { user: { id: user.id, email: user.email, name: user.name, status: user.status, referralCode: user.referralCode } } })
    res.headers.append('Set-Cookie', cookie)
    return res
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message ?? 'Invalid input' } }, { status: 422 })
    if (isAppError(err)) return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.status })
    console.error('[auth/register]', err)
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL', message: 'Registration failed. Please try again.' } }, { status: 500 })
  }
}

```

src/app/api/auth/reset-password/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePayloadCookie } from 'payload/shared'
import { getUserPayloadClient } from '@/lib/payload'
import { isAppError } from '@/lib/errors'

const schema = z.object({ token: z.string().min(10), password: z.string().min(8) })

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const payload = await getUserPayloadClient()
    const result = await payload.resetPassword({ collection: 'users', data: body, overrideAccess: true })
    const cookie = generatePayloadCookie({ collectionAuthConfig: payload.collections.users.config.auth, cookiePrefix: payload.config.cookiePrefix, token: result.token! })
    const res = NextResponse.json({ ok: true, data: { user: { id: result.user.id, email: result.user.email } } })
    res.headers.append('Set-Cookie', cookie)
    return res
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a valid new password.' } }, { status: 422 })
    if (isAppError(err)) return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.status })
    return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'This reset link is invalid or has expired.' } }, { status: 400 })
  }
}

```

src/app/api/campaigns/[id]/claim/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { claimCampaign } from '@/services/campaign'

export const POST = withApi(async ({ payload, req, user }, _request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const claim = await claimCampaign({ payload, req, user: user!, campaignId: Number(id) })
  return ok({ claim })
})

```

src/app/api/campaigns/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { computeCampaignProgress } from '@/services/campaign'
import { getSettings } from '@/services/settings'
import { AppError } from '@/lib/errors'

export const GET = withApi(async ({ payload, req, user }) => {
  const settings = await getSettings(payload)
  if (!settings.features.campaignsEnabled) throw new AppError('FEATURE_DISABLED', 'Campaigns are temporarily unavailable.')
  const now = new Date().toISOString()
  const res = await payload.find({
    collection: 'campaigns',
    where: { status: { equals: 'ACTIVE' }, or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now } }] },
    sort: '-featured',
    limit: 100,
    depth: 1,
    overrideAccess: true,
    req,
  })
  const campaigns = res.docs.filter((c) => !c.endsAt || new Date(c.endsAt) > new Date())
  const claimedDocs = user
    ? await payload.find({ collection: 'campaign-claims', where: { user: { equals: user.id } }, limit: 500, depth: 0, overrideAccess: true, req })
    : { docs: [] as { campaign: number | { id: number } }[] }
  const claimedCampaignIds = new Set(
    claimedDocs.docs.map((c) => (typeof c.campaign === 'object' ? c.campaign.id : c.campaign)),
  )
  const withProgress = await Promise.all(
    campaigns.map(async (c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      rewardAmount: c.rewardAmount,
      banner: typeof c.banner === 'object' ? c.banner?.url : null,
      requiredActions: c.requiredActions,
      progress: user ? await computeCampaignProgress(payload, req, c, user.id) : null,
      claimed: claimedCampaignIds.has(c.id),
    })),
  )
  return ok({ campaigns: withProgress })
}, { requireAuth: false })

```

src/app/api/cron/tick/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { notify } from '@/services/notification'
import { withFlag } from '@/services/context'

/**
 * Call this endpoint once a minute (e.g. from a hosting platform's scheduler) with header
 * `Authorization: Bearer $CRON_SECRET`. It activates/expires scheduled content and sends
 * campaign start / ending-soon notifications exactly once per campaign.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid cron secret.' } }, { status: 401 })

  const payload = await getPayloadClient()
  const now = new Date()
  const results: Record<string, number> = {}

  // Activate scheduled tasks/games whose startsAt has passed.
  for (const slug of ['tasks', 'games'] as const) {
    const due = await payload.find({ collection: slug, where: { status: { equals: 'SCHEDULED' }, startsAt: { less_than_equal: now.toISOString() } }, limit: 200, depth: 0, overrideAccess: true })
    for (const doc of due.docs) await payload.update({ collection: slug, id: doc.id, data: { status: 'ACTIVE' }, overrideAccess: true, context: { skipAudit: true } })
    results[`${slug}_activated`] = due.docs.length

    const expired = await payload.find({ collection: slug, where: { status: { equals: 'ACTIVE' }, endsAt: { less_than_equal: now.toISOString() } }, limit: 200, depth: 0, overrideAccess: true })
    for (const doc of expired.docs) await payload.update({ collection: slug, id: doc.id, data: { status: 'EXPIRED' }, overrideAccess: true, context: { skipAudit: true } })
    results[`${slug}_expired`] = expired.docs.length
  }

  // Campaign lifecycle + notifications.
  const scheduledCampaigns = await payload.find({ collection: 'campaigns', where: { status: { equals: 'SCHEDULED' }, startsAt: { less_than_equal: now.toISOString() } }, limit: 200, depth: 0, overrideAccess: true })
  for (const c of scheduledCampaigns.docs) await payload.update({ collection: 'campaigns', id: c.id, data: { status: 'ACTIVE' }, overrideAccess: true, context: { skipAudit: true } })
  results.campaigns_activated = scheduledCampaigns.docs.length

  const expiredCampaigns = await payload.find({ collection: 'campaigns', where: { status: { equals: 'ACTIVE' }, endsAt: { less_than_equal: now.toISOString() } }, limit: 200, depth: 0, overrideAccess: true })
  for (const c of expiredCampaigns.docs) await payload.update({ collection: 'campaigns', id: c.id, data: { status: 'EXPIRED' }, overrideAccess: true, context: { skipAudit: true } })
  results.campaigns_expired = expiredCampaigns.docs.length

  const startingCampaigns = await payload.find({ collection: 'campaigns', where: { status: { equals: 'ACTIVE' }, startNotifiedAt: { exists: false } }, limit: 200, depth: 0, overrideAccess: true })
  for (const c of startingCampaigns.docs) {
    const users = await payload.find({ collection: 'users', where: { status: { equals: 'ACTIVE' } }, limit: 1000, depth: 0, overrideAccess: true })
    for (const u of users.docs) await notify({ payload, userId: u.id, type: 'CAMPAIGN_STARTED', title: 'New campaign live', body: `"${c.name}" is now live — check it out!`, dedupeKey: `campaign:${c.id}:started:${u.id}` })
    await withFlag({}, 'skipAudit', () => payload.update({ collection: 'campaigns', id: c.id, data: { startNotifiedAt: now.toISOString() }, overrideAccess: true }))
  }
  results.campaigns_start_notified = startingCampaigns.docs.length

  const endingSoon = new Date(now.getTime() + 24 * 3_600_000).toISOString()
  const endingCampaigns = await payload.find({ collection: 'campaigns', where: { status: { equals: 'ACTIVE' }, endsAt: { less_than_equal: endingSoon, greater_than: now.toISOString() }, endingNotifiedAt: { exists: false } }, limit: 200, depth: 0, overrideAccess: true })
  for (const c of endingCampaigns.docs) {
    const users = await payload.find({ collection: 'users', where: { status: { equals: 'ACTIVE' } }, limit: 1000, depth: 0, overrideAccess: true })
    for (const u of users.docs) await notify({ payload, userId: u.id, type: 'CAMPAIGN_ENDING', title: 'Campaign ending soon', body: `"${c.name}" ends within 24 hours.`, dedupeKey: `campaign:${c.id}:ending:${u.id}` })
    await withFlag({}, 'skipAudit', () => payload.update({ collection: 'campaigns', id: c.id, data: { endingNotifiedAt: now.toISOString() }, overrideAccess: true }))
  }
  results.campaigns_ending_notified = endingCampaigns.docs.length

  // Expire game sessions that ran past their deadline without a submission.
  const staleSessions = await payload.find({ collection: 'game-sessions', where: { status: { equals: 'STARTED' }, expiresAt: { less_than: now.toISOString() } }, limit: 500, depth: 0, overrideAccess: true })
  for (const s of staleSessions.docs) await payload.update({ collection: 'game-sessions', id: s.id, data: { status: 'EXPIRED', endedAt: now.toISOString() }, overrideAccess: true })
  results.sessions_expired = staleSessions.docs.length

  return NextResponse.json({ ok: true, data: results })
}

```

src/app/api/game-sessions/[id]/submit/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { submitGameSession } from '@/services/game'

export const POST = withApi(async ({ payload, req, user }, request, { params }: { params: Promise<{ id: string }> }) => {
  const { id: sessionId } = await params
  const answer = await request.json().catch(() => ({}))
  const session = await submitGameSession({ payload, req, user: user!, sessionId, answer })
  return ok({ score: session.score, maxScore: session.maxScore, scorePercent: session.scorePercent, result: session.result, rewardAmount: session.rewardAmount, rounds: session.rounds, rejectionReason: session.rejectionReason })
})

```

src/app/api/games/[id]/start/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { startGameSession } from '@/services/game'

export const POST = withApi(async ({ payload, req, user }, request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const { session, client } = await startGameSession({ payload, req, user: user!, gameId: Number(id), headers: request.headers })
  return ok({ sessionId: session.sessionId, expiresAt: session.expiresAt, maxScore: session.maxScore, state: client })
})

```

src/app/api/home/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { CACHE, cached } from '@/lib/cache'
import { getSettings } from '@/services/settings'

export const GET = withApi(async ({ payload, req }) => {
  const now = new Date().toISOString()
  const [banners, announcements, settings] = await Promise.all([
    cached(`${CACHE.banners}:active`, 30, async () => {
      const res = await payload.find({ collection: 'banners', where: { isActive: { equals: true }, or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now } }] }, sort: 'sortOrder', limit: 20, depth: 1, overrideAccess: true })
      return res.docs.filter((b) => !b.endsAt || new Date(b.endsAt) > new Date()).map((b) => ({ id: b.id, title: b.title, description: b.description, ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl, image: typeof b.image === 'object' ? b.image?.url : null }))
    }),
    cached(`${CACHE.announcements}:active`, 30, async () => {
      const res = await payload.find({ collection: 'announcements', where: { isActive: { equals: true } }, sort: '-isPinned', limit: 20, depth: 0, overrideAccess: true })
      return res.docs.map((a) => ({ id: a.id, title: a.title, body: a.body, severity: a.severity, isPinned: a.isPinned }))
    }),
    getSettings(payload),
  ])

  if (settings.features.maintenanceMode) {
    return ok({ maintenance: true, message: settings.features.maintenanceMessage, site: settings.site }, 200)
  }

  const [tasks, games, campaigns] = await Promise.all([
    payload.find({ collection: 'tasks', where: { isActive: { equals: true }, status: { equals: 'ACTIVE' }, featured: { equals: true } }, limit: 6, depth: 0, overrideAccess: true, req }),
    payload.find({ collection: 'games', where: { status: { equals: 'ACTIVE' }, featured: { equals: true } }, limit: 6, depth: 1, overrideAccess: true, req }),
    payload.find({ collection: 'campaigns', where: { status: { equals: 'ACTIVE' }, featured: { equals: true } }, limit: 6, depth: 0, overrideAccess: true, req }),
  ])

  return ok({
    maintenance: false,
    site: settings.site,
    banners,
    announcements,
    featuredTasks: tasks.docs.map((t) => ({ id: t.id, title: t.title, rewardAmount: t.rewardAmount, icon: typeof t.icon === 'object' ? t.icon?.url : null })),
    featuredGames: games.docs.map((g) => ({ id: g.id, name: g.name, type: g.type, reward: g.reward, icon: typeof g.icon === 'object' ? g.icon?.url : null, thumbnail: typeof g.thumbnail === 'object' ? g.thumbnail?.url : null, })),
    featuredCampaigns: campaigns.docs.map((c) => ({ id: c.id, name: c.name, rewardAmount: c.rewardAmount, banner: typeof c.banner === 'object' ? c.banner?.url : null })),
  })
}, { requireAuth: false })

```

src/app/api/legal/route.ts
```typescript
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

/** Extracts plain text from a Lexical richText JSON tree (best-effort, headings/paragraphs/lists only). */
function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { type?: string; text?: string; children?: unknown[] }
  if (typeof n.text === 'string') return n.text
  const childText = (n.children ?? []).map(extractText).join('')
  if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'listitem') return childText + '\n\n'
  return childText
}

export async function GET() {
  const payload = await getPayloadClient()
  const legal = await payload.findGlobal({ slug: 'legal-settings', overrideAccess: true, depth: 0 })
  const toText = (rt: unknown) => {
    const root = (rt as { root?: { children?: unknown[] } } | null | undefined)?.root
    if (!root?.children?.length) return ''
    return root.children.map(extractText).join('').trim()
  }
  return NextResponse.json({
    ok: true,
    data: {
      terms: toText(legal.terms),
      privacyPolicy: toText(legal.privacyPolicy),
      refundPolicy: toText(legal.refundPolicy),
      responsibleUse: toText(legal.responsibleUse),
    },
  })
}
```

src/app/api/notifications/[id]/read/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { AppError } from '@/lib/errors'
import { withFlag } from '@/services/context'

export const POST = withApi(async ({ payload, req, user }, _request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const n = await payload.findByID({ collection: 'notifications', id: Number(id), depth: 0, overrideAccess: true, req }).catch(() => null)
  const owner = n && (typeof n.user === 'object' ? n.user.id : n.user)
  if (!n || owner !== user!.id) throw new AppError('NOT_FOUND', 'Notification not found.')
  const updated = await withFlag(req, 'serviceWrite', () => payload.update({ collection: 'notifications', id: n.id, overrideAccess: true, depth: 0, req, data: { readAt: n.readAt ?? new Date().toISOString() } }))
  return ok({ notification: { id: updated.id, readAt: updated.readAt } })
})

```

src/app/api/notifications/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'

export const GET = withApi(async ({ payload, req, user }) => {
  const res = await payload.find({ collection: 'notifications', where: { user: { equals: user!.id } }, sort: '-createdAt', limit: 50, depth: 0, overrideAccess: true, req })
  const unread = await payload.count({ collection: 'notifications', where: { user: { equals: user!.id }, readAt: { exists: false } }, overrideAccess: true, req })
  return ok({
    unreadCount: unread.totalDocs,
    notifications: res.docs.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, data: n.data, readAt: n.readAt, createdAt: n.createdAt })),
  })
})

```

src/app/api/payout-methods/[id]/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { removePayoutMethod } from '@/services/payout-method'

export const DELETE = withApi(async ({ payload, req, user }, _request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  await removePayoutMethod(payload, req, user!, Number(id))
  return ok({ removed: true })
})

```

src/app/api/payout-methods/route.ts
```typescript
import { z } from 'zod'
import { withApi, ok } from '@/lib/api/handler'
import { addPayoutMethod } from '@/services/payout-method'

export const GET = withApi(async ({ payload, req, user }) => {
  const res = await payload.find({ collection: 'payout-methods', where: { user: { equals: user!.id }, status: { equals: 'ACTIVE' } }, sort: '-isDefault', limit: 20, depth: 0, overrideAccess: true, req })
  return ok({ methods: res.docs.map((m) => ({ id: m.id, type: m.type, label: m.label, maskedDetails: m.maskedDetails, isDefault: m.isDefault })) })
})

const schema = z.object({
  type: z.enum(['UPI', 'BANK']),
  label: z.string().min(1).max(60),
  holderName: z.string().max(120).optional(),
  upiId: z.string().optional(),
  accountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  bankName: z.string().max(120).optional(),
  makeDefault: z.boolean().optional(),
})

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = schema.parse(await request.json())
  const method = await addPayoutMethod({ payload, req, user: user!, ...body })
  return ok({ method: { id: method.id, type: method.type, label: method.label, maskedDetails: method.maskedDetails, isDefault: method.isDefault } }, 201)
})

```

src/app/api/public/games/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { getSettings } from '@/services/settings'
import { AppError } from '@/lib/errors'

export const GET = withApi(async ({ payload, req }) => {
  const settings = await getSettings(payload)
  if (!settings.features.gamesEnabled) throw new AppError('FEATURE_DISABLED', 'Games are temporarily unavailable.')
  const now = new Date().toISOString()
  const res = await payload.find({
    collection: 'games',
    where: { status: { equals: 'ACTIVE' }, or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now } }] },
    sort: '-featured',
    limit: 100,
    depth: 1,
    overrideAccess: true,
    req,
  })
  const games = res.docs.filter((g) => !g.endsAt || new Date(g.endsAt) > new Date())
  return ok({
    games: games.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description,
      type: g.type,
      difficulty: g.difficulty,
      featured: g.featured,
      reward: g.reward,
      durationSeconds: g.durationSeconds,
      icon: typeof g.icon === 'object' ? g.icon?.url : null,
      thumbnail: typeof g.thumbnail === 'object' ? g.thumbnail?.url : null,
    })),
  })
}, { requireAuth: false })

```

src/app/api/referrals/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { getSettings } from '@/services/settings'
import { AppError } from '@/lib/errors'

export const GET = withApi(async ({ payload, req, user }) => {
  const settings = await getSettings(payload)
  if (!settings.features.referralsEnabled) throw new AppError('FEATURE_DISABLED', 'Referrals are temporarily unavailable.')
  const res = await payload.find({ collection: 'referrals', where: { referrer: { equals: user!.id } }, sort: '-createdAt', limit: 100, depth: 0, overrideAccess: true, req })
  const rewarded = res.docs.filter((r) => r.status === 'REWARDED')
  return ok({
    referralCode: user!.referralCode,
    shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${user!.referralCode}`,
    totalReferred: res.totalDocs,
    totalRewarded: rewarded.length,
    totalEarned: rewarded.reduce((s, r) => s + (r.referrerReward ?? 0), 0),
    referrals: res.docs.map((r) => ({ id: r.id, status: r.status, registeredAt: r.registeredAt, rewardedAt: r.rewardedAt, referrerReward: r.referrerReward })),
  })
})

```

src/app/api/tasks/[id]/complete/route.ts
```typescript
import { z } from 'zod'
import { withApi, ok } from '@/lib/api/handler'
import { completeTask } from '@/services/task'

const schema = z.object({ completionId: z.number(), submission: z.string().max(2000).optional(), answerCode: z.string().max(200).optional() })

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = schema.parse(await request.json())
  const completion = await completeTask({ payload, req, user: user!, completionId: body.completionId, submission: body.submission, answerCode: body.answerCode })
  return ok({ completion })
})

```

src/app/api/tasks/[id]/start/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { startTask } from '@/services/task'

export const POST = withApi(async ({ payload, req, user }, request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const completion = await startTask({ payload, req, user: user!, taskId: Number(id), headers: request.headers })
  return ok({ completion })
})

```

src/app/api/tasks/route.ts
```typescript
import { z } from 'zod'
import { withApi, ok } from '@/lib/api/handler'
import { getSettings } from '@/services/settings'
import { AppError } from '@/lib/errors'

export const GET = withApi(async ({ payload, req, user }) => {
  const settings = await getSettings(payload)
  if (!settings.features.tasksEnabled) throw new AppError('FEATURE_DISABLED', 'Tasks are temporarily unavailable.')
  const now = new Date().toISOString()
  const res = await payload.find({
    collection: 'tasks',
    where: { isActive: { equals: true }, status: { equals: 'ACTIVE' }, or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now } }] },
    sort: '-priority',
    limit: 100,
    depth: 1,
    overrideAccess: true,
    req,
  })
  const tasks = res.docs.filter((t) => !t.endsAt || new Date(t.endsAt) > new Date())
  const myCompletions = user
    ? await payload.find({ collection: 'task-completions', where: { user: { equals: user.id }, task: { in: tasks.map((t) => t.id) } }, limit: 500, depth: 0, overrideAccess: true, req })
    : { docs: [] as { task: number | { id: number }; status: string }[] }
  const countsByTask = new Map<number, number>()
  for (const c of myCompletions.docs) {
    const id = typeof c.task === 'object' ? c.task.id : c.task
    if (c.status !== 'REJECTED') countsByTask.set(id, (countsByTask.get(id) ?? 0) + 1)
  }
  return ok({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      description: t.description,
      instructions: t.instructions,
      rewardAmount: t.rewardAmount,
      verificationType: t.verification?.type,
      timerSeconds: t.verification?.timerSeconds ?? null,
      featured: t.featured,
      myCompletions: countsByTask.get(t.id) ?? 0,
      perUserLimit: t.perUserLimit,
      icon: typeof t.icon === 'object' ? t.icon?.url : null,
    })),
  })
}, { requireAuth: false })

```

src/app/api/wallet/route.ts
```typescript
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

```

src/app/api/withdrawals/[id]/cancel/route.ts
```typescript
import { withApi, ok } from '@/lib/api/handler'
import { cancelWithdrawal } from '@/services/withdrawal'

export const POST = withApi(async ({ payload, req, user }, _request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const withdrawal = await cancelWithdrawal(payload, req, user!, Number(id))
  return ok({ withdrawal: { id: withdrawal.id, status: withdrawal.status } })
})

```

src/app/api/withdrawals/route.ts
```typescript
import { z } from 'zod'
import { withApi, ok } from '@/lib/api/handler'
import { requestWithdrawal } from '@/services/withdrawal'
import { parseMajorToMinor } from '@/lib/money'

export const GET = withApi(async ({ payload, req, user }) => {
  const res = await payload.find({ collection: 'withdrawals', where: { user: { equals: user!.id } }, sort: '-createdAt', limit: 30, depth: 0, overrideAccess: true, req })
  return ok({
    withdrawals: res.docs.map((w) => ({ id: w.id, amount: w.amount, method: w.method, status: w.status, requestedAt: w.requestedAt, completedAt: w.completedAt, failureReason: w.failureReason, payoutSummary: w.payoutSummary })),
  })
})

const schema = z.object({ amount: z.string().or(z.number()), payoutMethodId: z.number() })

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = schema.parse(await request.json())
  const amount = typeof body.amount === 'number' ? body.amount : parseMajorToMinor(body.amount)
  const withdrawal = await requestWithdrawal({ payload, req, user: user!, amount, payoutMethodId: body.payoutMethodId })
  return ok({ withdrawal: { id: withdrawal.id, amount: withdrawal.amount, status: withdrawal.status } }, 201)
})

```

src/app/globals.css
```css
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  --app-dark: #060B14;
    --app-card: #0E1726;
    --app-border: #1F2E45;
    --gold-primary: #F5B82E;
    --gold-glow: #E5A512;
    /* Paper — warm sage-white, not the cream/terracotta default */
    --color-paper: #F2F4EE;
  --color-paper-dim: #E9ECE3;

  /* Ink — deep green-black, not pure #111 */
  --color-ink: #14231E;
  --color-ink-soft: #3C4A44;
  --color-ink-faint: #8A948E;

  /* Marigold — primary action accent */
  --color-marigold: #E2A33B;
  --color-marigold-deep: #C4841F;
  --color-marigold-tint: #FBEDD3;

  /* Banyan green — money / earned / success */
  --color-banyan: #2F6F4E;
  --color-banyan-deep: #1F4E36;
  --color-banyan-tint: #DFEEE4;

  /* Coral — reserved for warnings / errors / negative amounts only */
  --color-coral: #C1503A;
  --color-coral-tint: #F7E1DC;

  --color-surface: #FFFFFF;

  --font-sans: var(--font-sora), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-fraunces), ui-serif, Georgia, serif;

  --radius-card: 1.5rem;
  --radius-chip: 0.75rem;
  --radius-control: 1rem;
}

:root {
  color-scheme: light;
}

html,
body {
  background: var(--app-dark);
  color: #e2e8f0;
}

body {
  font-family: var(--font-sans);
  -webkit-tap-highlight-color: transparent;
}

.font-display {
  font-family: var(--font-display);
}

/* Numerals in money contexts always use the display face, tabular so amounts align */
.num {
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

::selection {
  background: rgba(245, 184, 46, 0.3);
  color: white;
}

:focus-visible {
  outline: 2px solid var(--gold-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {

  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.safe-top {
  padding-top: env(safe-area-inset-top, 0px);
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.glow-gold-btn {
      box-shadow: 0 0 14px rgba(245, 184, 46, 0.45);
    }
    .glow-cyan-card {
      border: 1px solid rgba(16, 185, 129, 0.4);
      box-shadow: 0 0 18px rgba(16, 185, 129, 0.15) inset, 0 0 15px rgba(16, 185, 129, 0.2);
    }
    .glow-purple-card {
      border: 1px solid rgba(168, 85, 247, 0.4);
      box-shadow: 0 0 20px rgba(168, 85, 247, 0.2) inset, 0 0 16px rgba(168, 85, 247, 0.25);
    }
    .glow-elevated-btn {
      box-shadow: 0 0 18px rgba(245, 184, 46, 0.5);
    }
    .glow-amber-card {
      border: 1px solid rgba(245, 184, 46, 0.3);
      box-shadow: 0 0 16px rgba(245, 184, 46, 0.1) inset, 0 0 12px rgba(245, 184, 46, 0.15);
    }
    .glow-blue-card {
      border: 1px solid rgba(59, 130, 246, 0.3);
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.1) inset, 0 0 12px rgba(59, 130, 246, 0.15);
    }
```

src/collections/Admins.ts
```typescript
import type { CollectionConfig } from 'payload'
import { ADMIN_ROLES, toOptions } from '@/constants'
import { fieldAllow, hasRole, isAdminUser, superAdminOnly } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'

const prod = process.env.NODE_ENV === 'production'

/** Staff accounts for the Payload admin panel. End users live in the separate `users` collection. */
export const Admins: CollectionConfig = {
  slug: 'admins',
  labels: { singular: 'Admin', plural: 'Admins' },
  admin: {
    useAsTitle: 'email',
    group: 'System',
    defaultColumns: ['email', 'name', 'roles', 'isActive', 'lastLoginAt'],
    description: 'Staff who can sign in to this admin panel. Only Super admins can manage staff accounts.',
  },
  auth: {
    tokenExpiration: 60 * 60 * 12,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: { secure: prod, sameSite: 'Lax' },
  },
  access: {
    admin: ({ req }) => isAdminUser(req.user),
    create: superAdminOnly,
    delete: superAdminOnly,
    read: ({ req }) => {
      if (!isAdminUser(req.user)) return false
      if (hasRole(req.user, [])) return true // SUPER_ADMIN
      return { id: { equals: req.user!.id } }
    },
    update: ({ req }) => {
      if (!isAdminUser(req.user)) return false
      if (hasRole(req.user, [])) return true
      return { id: { equals: req.user!.id } }
    },
  },
  hooks: {
    ...auditCollectionHooks('admins', { created: 'ADMIN_CREATED', updated: 'ADMIN_UPDATED', deleted: 'ADMIN_UPDATED' }),
    beforeLogin: [
      ({ user }) => {
        if ((user as { isActive?: boolean }).isActive === false) throw new Error('This admin account has been deactivated.')
      },
    ],
    // afterLogin: [
    //   async ({ req, user }) => {
    //     const lastLoginAt = user.lastLoginAt
    //       ? new Date(user.lastLoginAt).getTime()
    //       : 0

    //     const now = Date.now()

    //     if (lastLoginAt && now - lastLoginAt < 5 * 60 * 1000) {
    //       return
    //     }

    //     console.time('admin-last-login-update')

    //     try {
    //       await req.payload.update({
    //         collection: 'admins',
    //         id: user.id,
    //         data: {
    //           lastLoginAt: new Date().toISOString(),
    //         },
    //         overrideAccess: true,
    //         context: {
    //           skipAudit: true,
    //         },
    //       })
    //     } catch (error) {
    //       console.error('Failed to update lastLoginAt:', error)
    //     }

    //     console.timeEnd('admin-last-login-update')
    //   },
    // ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['SUPPORT_AGENT'],
      options: toOptions(ADMIN_ROLES),
      access: { create: fieldAllow(), update: fieldAllow() },
      admin: {
        description:
          'SUPER_ADMIN: everything · ADMIN: users, tasks, games, campaigns · FINANCE_ADMIN: wallets, transactions, withdrawals · CONTENT_MANAGER: banners, campaigns, media, content · SUPPORT_AGENT: read-only user support data',
      },
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true, access: { update: fieldAllow() } },
    { name: 'lastLoginAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
  ],
}

```

src/collections/Announcements.ts
```typescript
import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { invalidateCollectionCache } from '@/hooks/cache'
import { schedule } from '@/utilities/fields'

const audit = auditCollectionHooks('announcements', { created: 'CONTENT_UPDATED', updated: 'CONTENT_UPDATED', deleted: 'CONTENT_UPDATED' })
const cache = invalidateCollectionCache('announcements')

export const Announcements: CollectionConfig = {
  slug: 'announcements',
  labels: { singular: 'Announcement', plural: 'Announcements' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'severity', 'isActive', 'isPinned', 'publishedAt'] },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow(...ROLES.content),
    update: allow(...ROLES.content),
    delete: allow(...ROLES.content),
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.isActive && !originalDoc?.publishedAt && !data.publishedAt) data.publishedAt = new Date().toISOString()
        return data
      },
    ],
    afterChange: [...audit.afterChange, ...cache.afterChange],
    afterDelete: [...audit.afterDelete, ...cache.afterDelete],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'body', type: 'textarea', required: true },
    {
      name: 'severity',
      type: 'select',
      defaultValue: 'INFO',
      options: [
        { label: 'Info', value: 'INFO' },
        { label: 'Success', value: 'SUCCESS' },
        { label: 'Warning', value: 'WARNING' },
      ],
    },
    { name: 'image', type: 'upload', relationTo: 'media' },
    ...schedule(),
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
    { name: 'isPinned', type: 'checkbox', defaultValue: false },
    { name: 'publishedAt', type: 'date', admin: { readOnly: true } },
  ],
}

```

src/collections/AuditLogs.ts
```typescript
import type { CollectionConfig } from 'payload'
import { AUDIT_ACTIONS, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { immutableRecord } from '@/hooks/immutable'

const RO = { readOnly: true } as const

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Audit log', plural: 'Audit logs' },
  admin: {
    group: 'System',
    useAsTitle: 'action',
    defaultColumns: ['createdAt', 'action', 'actorLabel', 'collectionSlug', 'documentId', 'ip'],
    listSearchableFields: ['actorLabel', 'documentId', 'collectionSlug'],
    description: 'Append-only record of sensitive operations.',
  },
  access: { read: allow(...ROLES.audit), create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['collectionSlug', 'documentId'] }, { fields: ['action', 'createdAt'] }],
  hooks: immutableRecord('Audit log', { requireContextFlag: 'auditWrite' }),
  fields: [
    { name: 'admin', type: 'relationship', relationTo: 'admins', index: true, admin: RO },
    { name: 'actorLabel', type: 'text', admin: RO },
    { name: 'action', type: 'select', required: true, index: true, options: toOptions(AUDIT_ACTIONS), admin: RO },
    { name: 'collectionSlug', type: 'text', index: true, admin: RO },
    { name: 'documentId', type: 'text', index: true, admin: RO },
    { name: 'before', type: 'json', admin: RO },
    { name: 'after', type: 'json', admin: RO },
    { name: 'metadata', type: 'json', admin: RO },
    { name: 'ip', type: 'text', admin: RO },
    { name: 'userAgent', type: 'text', admin: RO },
  ],
}

```

src/collections/Banners.ts
```typescript
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { invalidateCollectionCache } from '@/hooks/cache'
import { schedule } from '@/utilities/fields'

const audit = auditCollectionHooks('banners', { created: 'CONTENT_UPDATED', updated: 'CONTENT_UPDATED', deleted: 'CONTENT_UPDATED' })
const cache = invalidateCollectionCache('banners')

export const Banners: CollectionConfig = {
  slug: 'banners',
  labels: { singular: 'Banner', plural: 'Banners' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'isActive', 'startsAt', 'endsAt', 'sortOrder'] },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow(...ROLES.content),
    update: allow(...ROLES.content),
    delete: allow(...ROLES.content),
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) throw new APIError('The end time must be after the start time.', 400)
        const url = data.ctaUrl as string | undefined
        if (url && !(url.startsWith('/') && !url.startsWith('//')) && !/^https:\/\//i.test(url)) {
          throw new APIError('The button destination must be an in-app path (e.g. /earn) or an https:// URL.', 400)
        }
        return data
      },
    ],
    afterChange: [...audit.afterChange, ...cache.afterChange],
    afterDelete: [...audit.afterDelete, ...cache.afterDelete],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'ctaLabel', type: 'text', label: 'Button label' },
    { name: 'ctaUrl', type: 'text', label: 'Button destination', admin: { description: 'In-app path like /earn or /promotions, or a full https:// URL.' } },
    ...schedule(),
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
    { name: 'sortOrder', type: 'number', defaultValue: 0 },
  ],
}

```

src/collections/CampaignClaims.ts
```typescript
import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const CampaignClaims: CollectionConfig = {
  slug: 'campaign-claims',
  labels: { singular: 'Campaign claim', plural: 'Campaign claims' },
  admin: { group: 'Campaigns & Referrals', useAsTitle: 'id', defaultColumns: ['claimedAt', 'campaign', 'user', 'rewardAmount'] },
  access: { read: allow(...ROLES.operationsRead), create: () => false, update: () => false, delete: () => false },
  indexes: [
    { fields: ['campaign', 'user', 'claimNumber'], unique: true },
    { fields: ['user', 'claimedAt'] },
  ],
  fields: [
    { name: 'campaign', type: 'relationship', relationTo: 'campaigns', required: true, index: true, admin: RO },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'claimNumber', type: 'number', required: true, admin: RO },
    moneyField('rewardAmount', { admin: RO }),
    { name: 'transaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'claimedAt', type: 'date', required: true, index: true, admin: RO },
    { name: 'progress', type: 'json', admin: RO },
  ],
}

```

src/collections/Campaigns.ts
```typescript
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { CAMPAIGN_ACTION_TYPES, CAMPAIGN_STATUSES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { invalidateCollectionCache } from '@/hooks/cache'
import { moneyField, schedule, slugify } from '@/utilities/fields'

const audit = auditCollectionHooks('campaigns', { created: 'CAMPAIGN_CREATED', updated: 'CAMPAIGN_UPDATED', deleted: 'CAMPAIGN_DELETED' })
const cache = invalidateCollectionCache('campaigns')

export const Campaigns: CollectionConfig = {
  slug: 'campaigns',
  labels: { singular: 'Campaign', plural: 'Campaigns' },
  admin: {
    group: 'Campaigns & Referrals',
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'rewardAmount', 'startsAt', 'endsAt', 'featured'],
    listSearchableFields: ['name', 'slug'],
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow(...ROLES.content),
    update: allow(...ROLES.content),
    delete: allow(...ROLES.content),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (!data.slug && data.name) data.slug = slugify(data.name)
        if (typeof data.slug === 'string') data.slug = slugify(data.slug)
        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) throw new APIError('The end time must be after the start time.', 400)
        return data
      },
    ],
    afterChange: [...audit.afterChange, ...cache.afterChange],
    afterDelete: [...audit.afterDelete, ...cache.afterDelete],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'slug', type: 'text', required: true, unique: true, index: true },
            { name: 'description', type: 'textarea', required: true },
            { name: 'banner', type: 'upload', relationTo: 'media' },
            { name: 'terms', type: 'richText', label: 'Terms & conditions' },
          ],
        },
        {
          label: 'Reward',
          fields: [
            moneyField('rewardAmount', { required: true, min: 1, defaultValue: 500 }),
            { name: 'rewardType', type: 'select', defaultValue: 'CASH', options: [{ label: 'Cash reward', value: 'CASH' }, { label: 'Bonus', value: 'BONUS' }] },
          ],
        },
        {
          label: 'Required actions',
          fields: [
            {
              name: 'requiredActions',
              type: 'array',
              admin: { description: 'All actions must be met (counted from the campaign start) before a user can claim.' },
              fields: [
                { name: 'type', type: 'select', required: true, options: toOptions(CAMPAIGN_ACTION_TYPES) },
                { name: 'target', type: 'number', required: true, min: 1, defaultValue: 1, admin: { description: 'Count required. For "Amount earned" enter the amount in paise.' } },
                { name: 'task', type: 'relationship', relationTo: 'tasks', admin: { condition: (_, s) => s?.type === 'SPECIFIC_TASK' } },
                { name: 'game', type: 'relationship', relationTo: 'games', admin: { condition: (_, s) => s?.type === 'SPECIFIC_GAME' } },
                { name: 'label', type: 'text', admin: { description: 'Optional friendly label shown to users.' } },
              ],
            },
          ],
        },
        {
          label: 'Eligibility & limits',
          fields: [
            {
              name: 'eligibility',
              type: 'group',
              fields: [
                { name: 'minAccountAgeDays', type: 'number', min: 0, defaultValue: 0 },
                { name: 'requireVerifiedAccount', type: 'checkbox', defaultValue: false },
                { name: 'requirePayoutMethod', type: 'checkbox', defaultValue: false },
                moneyField('minLifetimeEarned'),
              ],
            },
            { name: 'perUserLimit', type: 'number', min: 1, defaultValue: 1, required: true, admin: { description: 'Times one user can claim.' } },
            { name: 'userLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Maximum number of different users who can claim. 0 = unlimited.' } },
            { name: 'globalLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Maximum total claims across all users. 0 = unlimited.' } },
          ],
        },
        {
          label: 'Schedule & status',
          fields: [
            { name: 'status', type: 'select', required: true, index: true, defaultValue: 'DRAFT', options: toOptions(CAMPAIGN_STATUSES) },
            ...schedule({ requiredStart: false }),
            { name: 'featured', type: 'checkbox', defaultValue: false, index: true },
            { name: 'sortOrder', type: 'number', defaultValue: 0 },
            { name: 'startNotifiedAt', type: 'date', admin: { readOnly: true, description: 'Set once the "campaign started" notifications were sent.' } },
            { name: 'endingNotifiedAt', type: 'date', admin: { readOnly: true, description: 'Set once the "ending soon" notifications were sent.' } },
          ],
        },
      ],
    },
  ],
}

```

src/collections/Games.ts
```typescript
import type { CollectionConfig, Field } from 'payload'
import { APIError } from 'payload'
import { DIFFICULTIES, GAME_STATUSES, GAME_TYPES, MATH_OPERATIONS, REWARD_MODES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { invalidateCollectionCache } from '@/hooks/cache'
import { moneyField, schedule, slugify } from '@/utilities/fields'

const audit = auditCollectionHooks('games', { created: 'GAME_CREATED', updated: 'GAME_UPDATED', deleted: 'GAME_DELETED' })
const cache = invalidateCollectionCache('games')

const when = (...types: string[]) => ({ condition: (data: Record<string, unknown>) => types.includes(String(data?.type)) })

const configFields: Field[] = [
  // QUIZ
  { name: 'questionCount', type: 'number', min: 1, max: 50, defaultValue: 5, admin: { ...when('QUIZ', 'NUMBER_SEQUENCE', 'MATH'), description: 'Number of questions per session.' } },
  { name: 'secondsPerQuestion', type: 'number', min: 3, max: 300, defaultValue: 20, admin: { ...when('QUIZ', 'NUMBER_SEQUENCE', 'MATH'), description: 'Default time per question (quiz questions can override it).' } },
  { name: 'category', type: 'text', admin: { ...when('QUIZ'), description: 'Optional: only draw questions from this category.' } },
  // SUDOKU
  {
    name: 'sudokuSource',
    type: 'select',
    defaultValue: 'CMS_THEN_GENERATED',
    options: [
      { label: 'Use puzzles from the Sudoku collection, generate if none', value: 'CMS_THEN_GENERATED' },
      { label: 'Only puzzles from the Sudoku collection', value: 'CMS_ONLY' },
      { label: 'Always generate a fresh puzzle', value: 'GENERATED' },
    ],
    admin: when('SUDOKU'),
  },
  { name: 'minSolveSeconds', type: 'number', min: 0, defaultValue: 20, admin: { ...when('SUDOKU', 'MEMORY'), description: 'Completions faster than this are rejected as implausible.' } },
  // MEMORY
  { name: 'rows', type: 'number', min: 2, max: 8, defaultValue: 4, admin: when('MEMORY') },
  { name: 'cols', type: 'number', min: 2, max: 8, defaultValue: 4, admin: { ...when('MEMORY'), description: 'rows × cols must be an even number.' } },
  // MATH
  {
    name: 'mathOperations',
    type: 'select',
    hasMany: true,
    options: toOptions(MATH_OPERATIONS),
    defaultValue: ['MIXED'],
    admin: when('MATH'),
  },
  // REACTION
  { name: 'rounds', type: 'number', min: 1, max: 10, defaultValue: 5, admin: when('REACTION') },
  { name: 'minDelayMs', type: 'number', min: 500, defaultValue: 1200, admin: when('REACTION') },
  { name: 'maxDelayMs', type: 'number', min: 1000, defaultValue: 4000, admin: when('REACTION') },
  // SPIN_WHEEL
  {
    name: 'segments',
    type: 'array',
    minRows: 2,
    maxRows: 12,
    admin: {
      ...when('SPIN_WHEEL'),
      description: 'Each slice of the wheel. Weight controls how often it is picked (higher = more likely). Use amount 0 for a "Try again" slice.',
    },
    fields: [
      { name: 'label', type: 'text', required: true, admin: { description: 'Shown on the wheel, e.g. "₹5" or "Try again".' } },
      moneyField('amount', { required: true, defaultValue: 0 }),
      { name: 'weight', type: 'number', required: true, min: 0.01, defaultValue: 1, admin: { description: 'Relative odds. A weight of 2 lands twice as often as a weight of 1.' } },
      { name: 'color', type: 'text', admin: { description: 'Optional hex color for this slice, e.g. #6D5DF6' } },
    ],
  },
]

export const Games: CollectionConfig = {
  slug: 'games',
  labels: { singular: 'Game', plural: 'Games' },
  admin: {
    group: 'Games',
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'difficulty', 'status', 'featured', 'sortOrder'],
    listSearchableFields: ['name', 'slug'],
    description: 'Each record is a playable game room. Create one record per difficulty (e.g. Sudoku Easy, Sudoku Hard) to give each its own reward and limits.',
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow('ADMIN'),
    update: allow('ADMIN'),
    delete: allow('ADMIN'),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (!data.slug && data.name) data.slug = slugify(data.name)
        if (typeof data.slug === 'string') data.slug = slugify(data.slug)
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        const type = data.type ?? originalDoc?.type
        const cfg = { ...(originalDoc?.config ?? {}), ...(data.config ?? {}) }
        if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) throw new APIError('The end time must be after the start time.', 400)
        if (type === 'MEMORY' && ((cfg.rows ?? 4) * (cfg.cols ?? 4)) % 2 !== 0) throw new APIError('Memory Match needs an even number of cards (rows × cols).', 400)
        if (type === 'REACTION' && (cfg.maxDelayMs ?? 4000) <= (cfg.minDelayMs ?? 1200)) throw new APIError('Max delay must be greater than min delay.', 400)
        if (type === 'SPIN_WHEEL' && !((cfg.segments?.length ?? 0) >= 2)) throw new APIError('Add at least two wheel segments.', 400)
        const reward = { ...(originalDoc?.reward ?? {}), ...(data.reward ?? {}) }
        if (reward.mode === 'TIERED' && !(reward.tiers?.length > 0)) throw new APIError('Add at least one reward tier.', 400)
        return data
      },
    ],
    afterChange: [...audit.afterChange, ...cache.afterChange],
    afterDelete: [...audit.afterDelete, ...cache.afterDelete],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'slug', type: 'text', required: true, unique: true, index: true },
            { name: 'description', type: 'textarea', required: true },
            { name: 'type', type: 'select', required: true, index: true, options: toOptions(GAME_TYPES) },
            { name: 'difficulty', type: 'select', required: true, defaultValue: 'EASY', options: toOptions(DIFFICULTIES), admin: { description: 'Drives question/puzzle difficulty. Quiz supports Easy–Hard; Sudoku supports Easy–Expert.' } },
            { name: 'icon', type: 'upload', relationTo: 'media' },
            { name: 'thumbnail', type: 'upload', relationTo: 'media' },
            { name: 'featured', type: 'checkbox', defaultValue: false, index: true },
            { name: 'sortOrder', type: 'number', defaultValue: 0 },
          ],
        },
        {
          label: 'Status & schedule',
          fields: [
            { name: 'status', type: 'select', required: true, index: true, defaultValue: 'DRAFT', options: toOptions(GAME_STATUSES) },
            ...schedule(),
          ],
        },
        {
          label: 'Reward',
          fields: [
            {
              name: 'reward',
              type: 'group',
              fields: [
                {
                  name: 'mode',
                  type: 'select',
                  defaultValue: 'FIXED',
                  options: [
                    { label: 'Fixed — full amount if the minimum score is reached', value: 'FIXED' },
                    { label: 'Per score — proportional to the score', value: 'PER_SCORE' },
                    { label: 'Tiered — different amount per score band', value: 'TIERED' },
                  ],
                },
                moneyField('amount', { defaultValue: 50, admin: { description: 'FIXED: paid amount · PER_SCORE: paid at 100% score.' } }),
                { name: 'minScorePercent', type: 'number', min: 0, max: 100, defaultValue: 60, admin: { description: 'Minimum score (%) required to earn anything.' } },
                {
                  name: 'tiers',
                  type: 'array',
                  admin: { condition: (_, s) => s?.mode === 'TIERED', description: 'The highest tier whose minimum the score reaches is paid.' },
                  fields: [
                    { name: 'minScorePercent', type: 'number', required: true, min: 0, max: 100 },
                    moneyField('amount', { required: true }),
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Limits',
          fields: [
            { name: 'maxAttemptsPerDay', type: 'number', min: 0, defaultValue: 5, admin: { description: 'Sessions a user can start per day. 0 = unlimited.' } },
            { name: 'dailyRewardedPlays', type: 'number', min: 0, defaultValue: 3, admin: { description: 'Sessions per day that can pay a reward. 0 = unlimited.' } },
            { name: 'cooldownSeconds', type: 'number', min: 0, defaultValue: 30, admin: { description: 'Wait time between two sessions of this game.' } },
            { name: 'durationSeconds', type: 'number', min: 10, defaultValue: 180, admin: { description: 'Time allowed to finish a session before it expires.' } },
          ],
        },
        {
          label: 'Configuration',
          fields: [{ name: 'config', type: 'group', fields: configFields, admin: { description: 'Only the settings relevant to the selected game type apply.' } }],
        },
      ],
    },
  ],
}
```

src/collections/GameSessions.ts
```typescript
import type { CollectionConfig } from 'payload'
import { toOptions, GAME_SESSION_STATUSES, GAME_RESULTS } from '@/constants'
import { allow, fieldAllow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const GameSessions: CollectionConfig = {
  slug: 'game-sessions',
  labels: { singular: 'Game session', plural: 'Game sessions' },
  admin: {
    group: 'Games',
    useAsTitle: 'sessionId',
    defaultColumns: ['startedAt', 'user', 'game', 'status', 'score', 'result', 'rewardAmount'],
    listSearchableFields: ['sessionId'],
    description: 'Every play is persisted. Results are computed and validated on the server.',
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: () => false,
    update: () => false,
    delete: allow(), // SUPER_ADMIN housekeeping only
  },
  indexes: [
    { fields: ['user', 'game', 'createdAt'] },
    { fields: ['user', 'dayKey'] },
    { fields: ['game', 'createdAt'] },
  ],
  fields: [
    { name: 'sessionId', type: 'text', required: true, unique: true, index: true, admin: RO },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'game', type: 'relationship', relationTo: 'games', required: true, index: true, admin: RO },
    { name: 'status', type: 'select', required: true, index: true, options: toOptions(GAME_SESSION_STATUSES), defaultValue: 'STARTED', admin: RO },
    { name: 'startedAt', type: 'date', required: true, admin: RO },
    { name: 'endedAt', type: 'date', admin: RO },
    { name: 'expiresAt', type: 'date', required: true, admin: RO },
    { name: 'dayKey', type: 'text', index: true, admin: { ...RO, description: 'Calendar day (in the site timezone) used for daily limits.' } },
    { name: 'score', type: 'number', admin: RO },
    { name: 'maxScore', type: 'number', admin: RO },
    { name: 'scorePercent', type: 'number', admin: RO },
    { name: 'result', type: 'select', options: toOptions(GAME_RESULTS), admin: RO },
    { name: 'attempts', type: 'number', defaultValue: 0, admin: RO },
    moneyField('rewardAmount', { admin: RO }),
    { name: 'transaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'rounds', type: 'json', admin: { ...RO, description: 'Client-safe breakdown of questions / rounds.' } },
    { name: 'rejectionReason', type: 'text', admin: RO },
    // Contains answers — visible to super admins only, never returned to end users.
    { name: 'serverState', type: 'json', access: { read: fieldAllow() }, admin: { ...RO, description: 'Server-side state (answers). Super admin only.' } },
    { name: 'ip', type: 'text', admin: RO },
    { name: 'userAgent', type: 'text', admin: RO },
    { name: 'device', type: 'text', admin: RO },
  ],
}

```

src/collections/Media.ts
```typescript
import type { CollectionConfig } from 'payload'
import { allow } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  admin: { group: 'Content', useAsTitle: 'alt', defaultColumns: ['filename', 'alt', 'isActive', 'createdAt'] },
  access: {
    read: () => true, // images are shown to end users; nothing sensitive lives here
    create: allow('CONTENT_MANAGER', 'ADMIN'),
    update: allow('CONTENT_MANAGER', 'ADMIN'),
    delete: allow('CONTENT_MANAGER', 'ADMIN'),
  },
  hooks: auditCollectionHooks('media', { created: 'CONTENT_UPDATED', updated: 'CONTENT_UPDATED', deleted: 'CONTENT_UPDATED' }),
  upload: {
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'],
    imageSizes: [
      { name: 'thumbnail', width: 320, height: 320, position: 'centre' },
      { name: 'card', width: 720, height: undefined },
      { name: 'banner', width: 1440, height: undefined },
    ],
    adminThumbnail: 'thumbnail',
    formatOptions: { format: 'webp', options: { quality: 82 } },
    resizeOptions: { width: 2000, withoutEnlargement: true, fit: 'inside' },
    focalPoint: true,
  },
  fields: [
    { name: 'alt', type: 'text', required: true, admin: { description: 'Describe the image for screen readers.' } },
    { name: 'caption', type: 'text' },
    { name: 'isActive', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}

```

src/collections/Notifications.ts
```typescript
import type { CollectionConfig } from 'payload'
import { NOTIFICATION_TYPES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: { singular: 'Notification', plural: 'Notifications' },
  admin: { group: 'Users & Wallets', useAsTitle: 'title', defaultColumns: ['createdAt', 'user', 'type', 'title', 'readAt'] },
  access: { read: allow(...ROLES.userAdmins), create: () => false, update: () => false, delete: allow() },
  indexes: [{ fields: ['user', 'readAt', 'createdAt'] }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { readOnly: true } },
    { name: 'type', type: 'select', required: true, options: toOptions(NOTIFICATION_TYPES), index: true, admin: { readOnly: true } },
    { name: 'title', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'body', type: 'textarea', admin: { readOnly: true } },
    { name: 'data', type: 'json', admin: { readOnly: true } },
    { name: 'readAt', type: 'date', index: true, admin: { readOnly: true } },
    { name: 'dedupeKey', type: 'text', unique: true, index: true, admin: { readOnly: true, description: 'Prevents duplicate notifications for the same event.' } },
    { name: 'channels', type: 'json', admin: { readOnly: true, description: 'Delivery status per channel (in-app now; email/push/Telegram later).' } },
  ],
}

```

src/collections/PayoutMethods.ts
```typescript
import type { CollectionConfig } from 'payload'
import { PAYOUT_METHOD_TYPES, toOptions } from '@/constants'
import { allow, fieldAllow, ROLES } from '@/access'

const RO = { readOnly: true } as const

/**
 * A user's saved payout destinations. Account numbers / UPI IDs are AES-256-GCM encrypted at rest; only a
 * masked form is stored in the clear.
 */
export const PayoutMethods: CollectionConfig = {
  slug: 'payout-methods',
  labels: { singular: 'Payout method', plural: 'Payout methods' },
  admin: { group: 'Finance', useAsTitle: 'label', defaultColumns: ['user', 'type', 'maskedDetails', 'isDefault', 'status'] },
  access: { read: allow(...ROLES.financeRead), create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['user', 'status'] }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'type', type: 'select', required: true, options: toOptions(PAYOUT_METHOD_TYPES), admin: RO },
    { name: 'label', type: 'text', required: true, admin: RO },
    { name: 'holderName', type: 'text', admin: RO },
    { name: 'maskedDetails', type: 'text', required: true, admin: RO },
    { name: 'ifsc', type: 'text', admin: RO },
    { name: 'bankName', type: 'text', admin: RO },
    { name: 'encryptedDetails', type: 'text', required: true, access: { read: fieldAllow('FINANCE_ADMIN') }, admin: { hidden: true } },
    { name: 'fingerprint', type: 'text', index: true, admin: { ...RO, description: 'Hash of the destination, used to detect the same account on several users.' } },
    { name: 'isDefault', type: 'checkbox', defaultValue: false, admin: RO },
    { name: 'status', type: 'select', defaultValue: 'ACTIVE', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Removed', value: 'REMOVED' }], index: true, admin: RO },
    { name: 'removedAt', type: 'date', admin: RO },
  ],
}

```

src/collections/QuizQuestions.ts
```typescript
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { QUESTION_TYPES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'

export const QuizQuestions: CollectionConfig = {
  slug: 'quiz-questions',
  labels: { singular: 'Quiz question', plural: 'Quiz questions' },
  admin: {
    group: 'Games',
    useAsTitle: 'question',
    defaultColumns: ['question', 'difficulty', 'category', 'points', 'isActive'],
    listSearchableFields: ['question', 'category'],
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow(...ROLES.content),
    update: allow(...ROLES.content),
    delete: allow(...ROLES.content),
  },
  hooks: {
    ...auditCollectionHooks('quiz-questions', { created: 'CONTENT_UPDATED', updated: 'CONTENT_UPDATED', deleted: 'CONTENT_UPDATED' }),
    beforeValidate: [
      ({ data }) => {
        if (data?.type === 'TRUE_FALSE') {
          const current = data.options as { text: string; isCorrect?: boolean }[] | undefined
          const trueCorrect = current?.find((o) => /^true$/i.test(o.text))?.isCorrect ?? current?.[0]?.isCorrect ?? true
          data.options = [
            { text: 'True', isCorrect: Boolean(trueCorrect) },
            { text: 'False', isCorrect: !trueCorrect },
          ]
        }
        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        const options = (data.options ?? []) as { text: string; isCorrect?: boolean }[]
        if (options.length < 2) throw new APIError('A question needs at least two options.', 400)
        if (options.filter((o) => o.isCorrect).length !== 1) throw new APIError('Mark exactly one option as correct.', 400)
        return data
      },
    ],
  },
  fields: [
    { name: 'question', type: 'textarea', required: true },
    { name: 'type', type: 'select', defaultValue: 'MULTIPLE_CHOICE', required: true, options: toOptions(QUESTION_TYPES) },
    {
      name: 'options',
      type: 'array',
      minRows: 2,
      maxRows: 6,
      required: true,
      admin: { description: 'Tick "Correct answer" on exactly one option. For True/False the options are set automatically.' },
      fields: [
        { name: 'text', type: 'text', required: true },
        { name: 'isCorrect', type: 'checkbox', label: 'Correct answer', defaultValue: false },
      ],
    },
    { name: 'explanation', type: 'textarea', admin: { description: 'Shown to the user after they finish the quiz.' } },
    {
      name: 'difficulty',
      type: 'select',
      required: true,
      defaultValue: 'EASY',
      index: true,
      options: [
        { label: 'Easy', value: 'EASY' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'Hard', value: 'HARD' },
      ],
    },
    { name: 'category', type: 'text', index: true },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'timeLimitSeconds', type: 'number', min: 3, max: 300, admin: { description: 'Overrides the game default for this question.' } },
    { name: 'points', type: 'number', min: 1, defaultValue: 10, required: true },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
  ],
}

```

src/collections/ReferralRules.ts
```typescript
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { REFERRAL_QUALIFICATIONS, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { moneyField, schedule } from '@/utilities/fields'

export const ReferralRules: CollectionConfig = {
  slug: 'referral-rules',
  labels: { singular: 'Referral rule', plural: 'Referral rules' },
  admin: {
    group: 'Campaigns & Referrals',
    useAsTitle: 'name',
    defaultColumns: ['name', 'isActive', 'qualification', 'referrerReward', 'startsAt', 'endsAt', 'priority'],
    description:
      'A new sign-up with a referral code is bound to the highest-priority rule that is active at that moment. If none is active, the defaults in Reward settings apply.',
  },
  access: { read: allow(...ROLES.operationsRead), create: allow('ADMIN'), update: allow('ADMIN'), delete: allow('ADMIN') },
  hooks: {
    ...auditCollectionHooks('referral-rules', { created: 'CAMPAIGN_CREATED', updated: 'CAMPAIGN_UPDATED', deleted: 'CAMPAIGN_DELETED' }),
    beforeChange: [
      ({ data }) => {
        if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) throw new APIError('The end time must be after the start time.', 400)
        if (data.qualification === 'AMOUNT_EARNED' && !(data.qualificationAmount > 0)) throw new APIError('Set the amount the referred user must earn.', 400)
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
    { name: 'priority', type: 'number', defaultValue: 0, admin: { description: 'Higher priority wins when several rules are active.' } },
    { name: 'campaign', type: 'relationship', relationTo: 'campaigns', admin: { description: 'Optional: link this rule to a campaign for reporting.' } },
    ...schedule(),
    moneyField('referrerReward', { required: true, defaultValue: 1000, admin: { description: 'Paid to the person who referred.' } }),
    moneyField('refereeReward', { defaultValue: 0, admin: { description: 'Optional welcome bonus paid to the new user when they qualify.' } }),
    {
      name: 'qualification',
      type: 'select',
      required: true,
      defaultValue: 'FIRST_TASK',
      options: [
        { label: 'Registration (reward immediately on sign-up)', value: 'REGISTRATION' },
        { label: 'Verified account', value: 'VERIFIED_ACCOUNT' },
        { label: 'First completed task', value: 'FIRST_TASK' },
        { label: 'First completed game', value: 'FIRST_GAME' },
        { label: 'Earned at least an amount', value: 'AMOUNT_EARNED' },
      ],
    },
    moneyField('qualificationAmount', { admin: { condition: (d) => d?.qualification === 'AMOUNT_EARNED' } }),
    { name: 'perReferrerLimit', type: 'number', min: 0, defaultValue: 50, admin: { description: 'Max rewarded referrals per referrer. 0 = unlimited.' } },
    { name: 'globalLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Max rewarded referrals under this rule. 0 = unlimited.' } },
  ],
}

```

src/collections/Referrals.ts
```typescript
import type { CollectionConfig } from 'payload'
import { REFERRAL_STATUSES, toOptions } from '@/constants'
import { allow, fieldAllow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const Referrals: CollectionConfig = {
  slug: 'referrals',
  labels: { singular: 'Referral', plural: 'Referrals' },
  admin: {
    group: 'Campaigns & Referrals',
    useAsTitle: 'id',
    defaultColumns: ['registeredAt', 'referrer', 'referredUser', 'status', 'qualifiedAt', 'rewardedAt'],
    description: 'Set a PENDING referral to REJECTED to block a suspected fake referral. Payouts are made automatically by the platform.',
  },
  access: { read: allow(...ROLES.operationsRead), create: () => false, update: allow('ADMIN'), delete: () => false },
  indexes: [{ fields: ['referrer', 'status'] }],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        if (req.context?.serviceWrite) return data
        if (data.status && data.status !== originalDoc?.status) {
          if (originalDoc?.status !== 'PENDING' || data.status !== 'REJECTED') throw new Error('Staff can only reject PENDING referrals.')
          data.rejectedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'referrer', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'referredUser', type: 'relationship', relationTo: 'users', required: true, unique: true, index: true, admin: RO },
    { name: 'code', type: 'text', required: true, admin: RO },
    { name: 'status', type: 'select', required: true, defaultValue: 'PENDING', index: true, options: toOptions(REFERRAL_STATUSES), access: { update: fieldAllow('ADMIN') } },
    { name: 'rule', type: 'relationship', relationTo: 'referral-rules', admin: RO },
    { name: 'terms', type: 'json', admin: { ...RO, description: 'Snapshot of the reward terms at registration.' } },
    { name: 'registeredAt', type: 'date', required: true, admin: RO },
    { name: 'qualifiedAt', type: 'date', admin: RO },
    { name: 'rewardedAt', type: 'date', admin: RO },
    { name: 'rejectedAt', type: 'date', admin: RO },
    { name: 'rejectionReason', type: 'text', access: { update: fieldAllow('ADMIN') } },
    moneyField('referrerReward', { admin: RO }),
    moneyField('refereeReward', { admin: RO }),
    { name: 'referrerTransaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'refereeTransaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
  ],
}

```

src/collections/SudokuPuzzles.ts
```typescript
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { DIFFICULTIES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { isValidSolution, parseGrid, matchesGivens } from '@/games/sudoku-core'

export const SudokuPuzzles: CollectionConfig = {
  slug: 'sudoku-puzzles',
  labels: { singular: 'Sudoku puzzle', plural: 'Sudoku puzzles' },
  admin: {
    group: 'Games',
    useAsTitle: 'label',
    defaultColumns: ['label', 'difficulty', 'isActive', 'createdAt'],
    description:
      'Optional curated puzzles. Enter 81 characters row by row: digits 1-9, and 0 or . for an empty cell. Games can also generate puzzles automatically.',
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow(...ROLES.content),
    update: allow(...ROLES.content),
    delete: allow(...ROLES.content),
  },
  hooks: {
    ...auditCollectionHooks('sudoku-puzzles', { created: 'CONTENT_UPDATED', updated: 'CONTENT_UPDATED', deleted: 'CONTENT_UPDATED' }),
    beforeChange: [
      ({ data }) => {
        const puzzle = parseGrid(String(data.puzzle ?? ''))
        const solution = parseGrid(String(data.solution ?? ''))
        if (!puzzle || !solution) throw new APIError('Puzzle and solution must each be exactly 81 characters (digits 1-9, and 0 or . for blanks).', 400)
        if (solution.includes(0)) throw new APIError('The solution must be completely filled in.', 400)
        if (!isValidSolution(solution)) throw new APIError('The solution is not a valid Sudoku grid.', 400)
        if (!matchesGivens(puzzle, solution)) throw new APIError('The puzzle clues do not match the solution.', 400)
        data.puzzle = puzzle.join('')
        data.solution = solution.join('')
        data.clueCount = puzzle.filter((n) => n !== 0).length
        return data
      },
    ],
  },
  fields: [
    { name: 'label', type: 'text', required: true },
    { name: 'difficulty', type: 'select', required: true, index: true, options: toOptions(DIFFICULTIES) },
    { name: 'puzzle', type: 'textarea', required: true },
    { name: 'solution', type: 'textarea', required: true },
    { name: 'clueCount', type: 'number', admin: { readOnly: true } },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
  ],
}

```

src/collections/TaskCompletions.ts
```typescript
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { TASK_COMPLETION_STATUSES, toOptions } from '@/constants'
import { allow, fieldAllow, ROLES } from '@/access'
import { asApiError } from '@/utilities/api-error'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const TaskCompletions: CollectionConfig = {
  slug: 'task-completions',
  labels: { singular: 'Task completion', plural: 'Task completions' },
  admin: {
    group: 'Earning',
    useAsTitle: 'id',
    defaultColumns: ['task', 'user', 'status', 'rewardAmount', 'startedAt', 'completedAt'],
    description: 'Submissions awaiting review appear with status SUBMITTED. Set the status to COMPLETED to pay out or REJECTED to decline.',
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: () => false,
    update: allow('ADMIN'),
    delete: () => false,
  },
  indexes: [
    { fields: ['user', 'task'] },
    { fields: ['task', 'completedAt'] },
    { fields: ['task', 'user', 'attemptNumber'], unique: true },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        if (operation !== 'update' || !originalDoc || req.context?.serviceWrite) return data
        // Manual review transitions only.
        if (data.status && data.status !== originalDoc.status) {
          if (originalDoc.status !== 'SUBMITTED') throw new APIError('Only SUBMITTED completions can be reviewed.', 400)
          if (!['COMPLETED', 'REJECTED'].includes(data.status)) throw new APIError('Review result must be COMPLETED or REJECTED.', 400)
          if (data.status === 'REJECTED' && !data.rejectionReason) throw new APIError('Add a rejection reason.', 400)
          data.reviewedAt = new Date().toISOString()
          data.reviewedBy = req.user?.id
          if (data.status === 'REJECTED') data.rejectedAt = data.reviewedAt
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || req.context?.serviceWrite) return doc
        if (previousDoc?.status === 'SUBMITTED' && doc.status === 'COMPLETED') {
          const { approveSubmittedCompletion } = await import('@/services/task')
          await asApiError(() => approveSubmittedCompletion({ payload: req.payload, req, completionId: doc.id }))
        } else if (previousDoc?.status === 'SUBMITTED' && doc.status === 'REJECTED') {
          const { logAudit } = await import('@/services/audit')
          await logAudit({ payload: req.payload, req, action: 'TASK_COMPLETION_REVIEWED', collection: 'task-completions', documentId: doc.id, after: { status: 'REJECTED', reason: doc.rejectionReason } })
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'task', type: 'relationship', relationTo: 'tasks', required: true, index: true, admin: RO },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'attemptNumber', type: 'number', required: true, defaultValue: 1, admin: RO },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'STARTED',
      options: toOptions(TASK_COMPLETION_STATUSES),
      access: { update: fieldAllow('ADMIN') },
    },
    { name: 'startedAt', type: 'date', required: true, admin: RO },
    { name: 'submittedAt', type: 'date', admin: RO },
    { name: 'completedAt', type: 'date', index: true, admin: RO },
    { name: 'rejectedAt', type: 'date', admin: RO },
    { name: 'submission', type: 'textarea', admin: RO },
    moneyField('rewardAmount', { admin: RO }),
    { name: 'transaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'rejectionReason', type: 'text', access: { update: fieldAllow('ADMIN') } },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'admins', admin: RO },
    { name: 'reviewedAt', type: 'date', admin: RO },
    { name: 'ip', type: 'text', admin: RO },
    { name: 'device', type: 'text', admin: RO },
  ],
}

```

src/collections/Tasks.ts
```typescript
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { TASK_STATUSES, TASK_VERIFICATION_TYPES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { invalidateCollectionCache } from '@/hooks/cache'
import { moneyField, schedule, slugify } from '@/utilities/fields'

const audit = auditCollectionHooks('tasks', { created: 'TASK_CREATED', updated: 'TASK_UPDATED', deleted: 'TASK_DELETED' })
const cache = invalidateCollectionCache('tasks')

export const Tasks: CollectionConfig = {
  slug: 'tasks',
  labels: { singular: 'Task', plural: 'Tasks' },
  admin: {
    group: 'Earning',
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'rewardAmount', 'startsAt', 'endsAt', 'featured', 'priority'],
    listSearchableFields: ['title', 'slug'],
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow('ADMIN'),
    update: allow('ADMIN'),
    delete: allow('ADMIN'),
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (!data) return data
        if (!data.slug && data.title) data.slug = slugify(data.title)
        if (typeof data.slug === 'string') data.slug = slugify(data.slug)
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
          throw new APIError('The end time must be after the start time.', 400)
        }
        const v = data.verification ?? originalDoc?.verification
        if (v?.type === 'TIMER' && !(v.timerSeconds > 0)) throw new APIError('Set how many seconds the user must wait (timer verification).', 400)
        if (v?.type === 'ANSWER_CODE' && !v.answerCode) throw new APIError('Set the secret answer/code users must enter.', 400)
        if (data.status === 'ACTIVE' && !originalDoc?.publishedAt && !data.publishedAt) data.publishedAt = new Date().toISOString()
        return data
      },
    ],
    afterChange: [...audit.afterChange, ...cache.afterChange],
    afterDelete: [...audit.afterDelete, ...cache.afterDelete],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'slug', type: 'text', required: true, unique: true, index: true, admin: { description: 'Auto-generated from the title.' } },
            { name: 'description', type: 'textarea', required: true, admin: { description: 'Short summary shown on the task card.' } },
            { name: 'instructions', type: 'textarea', admin: { description: 'Step-by-step instructions shown on the task page. Line breaks are preserved.' } },
            { name: 'icon', type: 'upload', relationTo: 'media', label: 'Icon / image' },
          ],
        },
        {
          label: 'Reward',
          fields: [
            moneyField('rewardAmount', { required: true, min: 1, defaultValue: 100 }),
            {
              name: 'rewardType',
              type: 'select',
              defaultValue: 'CASH',
              options: [
                { label: 'Cash reward (ledger: Task reward)', value: 'CASH' },
                { label: 'Bonus (ledger: Bonus)', value: 'BONUS' },
              ],
            },
          ],
        },
        {
          label: 'Limits',
          fields: [
            { name: 'perUserLimit', type: 'number', min: 1, defaultValue: 1, required: true, admin: { description: 'How many times each user can complete this task in total.' } },
            { name: 'perUserDailyLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: '0 = no daily cap per user.' } },
            { name: 'cooldownMinutes', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Minimum minutes between two completions by the same user.' } },
            { name: 'dailyLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Max completions per day across all users. 0 = unlimited.' } },
            { name: 'totalLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Max completions across all users. 0 = unlimited.' } },
          ],
        },
        {
          label: 'Schedule & status',
          fields: [
            { name: 'status', type: 'select', options: toOptions(TASK_STATUSES), defaultValue: 'DRAFT', required: true, index: true },
            { name: 'isActive', type: 'checkbox', defaultValue: true, admin: { description: 'Master switch. Untick to hide immediately regardless of status.' } },
            ...schedule(),
            { name: 'publishedAt', type: 'date', admin: { readOnly: true } },
          ],
        },
        {
          label: 'Eligibility',
          fields: [
            {
              name: 'eligibility',
              type: 'group',
              fields: [
                { name: 'minAccountAgeDays', type: 'number', min: 0, defaultValue: 0 },
                { name: 'requireVerifiedAccount', type: 'checkbox', defaultValue: false },
                { name: 'requirePayoutMethod', type: 'checkbox', defaultValue: false },
                moneyField('minLifetimeEarned', { admin: { description: 'Users must have earned at least this much.' } }),
              ],
            },
          ],
        },
        {
          label: 'Verification',
          fields: [
            {
              name: 'verification',
              type: 'group',
              fields: [
                {
                  name: 'type',
                  type: 'select',
                  defaultValue: 'NONE',
                  options: [
                    { label: 'None — reward when the user taps Complete', value: 'NONE' },
                    { label: 'Timer — user must wait before completing', value: 'TIMER' },
                    { label: 'Answer / code — user enters a secret code', value: 'ANSWER_CODE' },
                    { label: 'Text submission — user submits text, auto-accepted', value: 'TEXT_SUBMISSION' },
                    { label: 'Manual review — staff approve before payout', value: 'MANUAL_REVIEW' },
                  ],
                },
                { name: 'timerSeconds', type: 'number', min: 1, admin: { condition: (_, s) => s?.type === 'TIMER' } },
                { name: 'answerCode', type: 'text', admin: { condition: (_, s) => s?.type === 'ANSWER_CODE', description: 'Case-insensitive. Never shown to users.' } },
                { name: 'submissionPrompt', type: 'text', admin: { condition: (_, s) => ['TEXT_SUBMISSION', 'MANUAL_REVIEW'].includes(s?.type), description: 'What the user should submit, e.g. "Paste your username".' } },
              ],
            },
          ],
        },
        {
          label: 'Display',
          fields: [
            { name: 'featured', type: 'checkbox', defaultValue: false, index: true },
            { name: 'priority', type: 'number', defaultValue: 0, admin: { description: 'Higher priority is listed first.' } },
            { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { description: 'Tie-breaker. Lower comes first.' } },
          ],
        },
      ],
    },
  ],
}

```

src/collections/Users.ts
```typescript
import type { CollectionConfig, PayloadHandler } from 'payload'
import { APIError } from 'payload'
import { toOptions, USER_STATUSES, DEFAULT_TIMEZONE, type UserStatus } from '@/constants'
import { allow, fieldAllow, hasRole, isAdminUser } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { isValidTimezone } from '@/lib/time'
import { diffDocs } from '@/utilities/diff'

const prod = process.env.NODE_ENV === 'production'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/** Built-in Payload auth endpoints are replaced by /api/auth/* (rate limited, status aware). */
const useAppAuthRoutes: PayloadHandler = () =>
  Response.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Use the application auth endpoints.' } }, { status: 404 })

const auditBase = auditCollectionHooks('users', { created: 'OTHER', updated: 'USER_STATUS_CHANGED', deleted: 'OTHER' })

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'User', plural: 'Users' },
  admin: {
    useAsTitle: 'email',
    group: 'Users & Wallets',
    defaultColumns: ['email', 'name', 'status', 'referralCode', 'lastLoginAt', 'createdAt'],
    listSearchableFields: ['email', 'name', 'phone', 'referralCode'],
    description: 'Registered platform users. Use the status field to suspend, block or reactivate an account.',
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    useSessions: true,
    cookies: { secure: prod, sameSite: 'Lax' },
    verify:
      process.env.REQUIRE_EMAIL_VERIFICATION === 'true'
        ? {
            generateEmailSubject: () => 'Verify your email',
            generateEmailHTML: ({ token }) =>
              `<p>Welcome! Confirm your email to start earning.</p><p><a href="${appUrl}/verify?token=${token}">Verify email</a></p>`,
          }
        : false,
    forgotPassword: {
      generateEmailSubject: () => 'Reset your password',
      generateEmailHTML: (args) =>
        `<p>We received a request to reset your password.</p><p><a href="${appUrl}/reset-password?token=${args?.token}">Choose a new password</a></p><p>If this wasn't you, you can ignore this email.</p>`,
    },
  },
  endpoints: [
    { path: '/login', method: 'post', handler: useAppAuthRoutes },
    { path: '/forgot-password', method: 'post', handler: useAppAuthRoutes },
    { path: '/reset-password', method: 'post', handler: useAppAuthRoutes },
    { path: '/first-register', method: 'post', handler: useAppAuthRoutes },
    { path: '/unlock', method: 'post', handler: useAppAuthRoutes },
  ],
  access: {
    admin: () => false, // end users can never open the admin panel
    create: () => false, // registration goes through UserService.register
    read: ({ req }) => {
      if (hasRole(req.user, ['ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN'])) return true
      if (req.user?.collection === 'users') return { id: { equals: req.user.id } }
      return false
    },
    update: allow('ADMIN'),
    delete: allow(), // SUPER_ADMIN only — prefer status = DELETED
  },
  hooks: {
    afterDelete: auditBase.afterDelete,
    beforeLogin: [
      ({ user }) => {
        const status = (user as { status?: UserStatus }).status
        if (status === 'BLOCKED' || status === 'DELETED') throw new APIError('This account is not allowed to sign in.', 403)
      },
    ],
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (!data) return data
        if (operation === 'create' && !data.referralCode) {
          const { generateUniqueReferralCode } = await import('@/services/user')
          data.referralCode = await generateUniqueReferralCode(req.payload, req)
        }
        if (typeof data.email === 'string') data.email = data.email.trim().toLowerCase()
        if (typeof data.phone === 'string') {
          const digits = data.phone.replace(/[^\d+]/g, '')
          data.phone = digits.length ? digits : undefined
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        // Email verified (Payload flips _verified) → activate.
        if (operation === 'update' && data._verified === true && originalDoc?.status === 'PENDING_VERIFICATION' && !data.status) {
          data.status = 'ACTIVE'
        }
        if (data.status && originalDoc && data.status !== originalDoc.status) {
          data.statusChangedAt = new Date().toISOString()
        }
        if (data.status === 'DELETED' && !data.deletedAt) data.deletedAt = new Date().toISOString()
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'create') {
          const { ensureWallet } = await import('@/services/wallet')
          await ensureWallet(req.payload, doc.id, req)
          return doc
        }
        // Admin status changes are audited with a specific action.
        if (isAdminUser(req.user) && previousDoc && doc.status !== previousDoc.status) {
          const { logAudit } = await import('@/services/audit')
          const action =
            doc.status === 'SUSPENDED' ? 'USER_SUSPENDED'
            : doc.status === 'BLOCKED' ? 'USER_BLOCKED'
            : previousDoc.status === 'SUSPENDED' && doc.status === 'ACTIVE' ? 'USER_UNSUSPENDED'
            : 'USER_STATUS_CHANGED'
          await logAudit({
            payload: req.payload,
            req,
            action,
            collection: 'users',
            documentId: doc.id,
            ...diffDocs({ status: previousDoc.status, statusReason: previousDoc.statusReason }, { status: doc.status, statusReason: doc.statusReason }),
          })
        } else if (isAdminUser(req.user)) {
          const diff = diffDocs(previousDoc, doc)
          if (Object.keys(diff.after).length) {
            const { logAudit } = await import('@/services/audit')
            await logAudit({ payload: req.payload, req, action: 'OTHER', collection: 'users', documentId: doc.id, ...diff })
          }
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'phone', type: 'text', unique: true, index: true, admin: { description: 'Digits with optional country code, e.g. +919876543210' } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'ACTIVE',
      index: true,
      options: toOptions(USER_STATUSES),
      access: { create: fieldAllow('ADMIN'), update: fieldAllow('ADMIN') },
      admin: { position: 'sidebar', description: 'SUSPENDED users can sign in but cannot earn or withdraw. BLOCKED users cannot sign in.' },
    },
    { name: 'statusReason', type: 'text', access: { update: fieldAllow('ADMIN') }, admin: { position: 'sidebar', description: 'Internal note about why the status changed.' } },
    { name: 'statusChangedAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'referralCode', type: 'text', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'timezone',
      type: 'text',
      defaultValue: DEFAULT_TIMEZONE,
      validate: (v: unknown) => (typeof v === 'string' && isValidTimezone(v)) || 'Use a valid IANA timezone, e.g. Asia/Kolkata',
      admin: { description: 'IANA timezone used to display dates to this user.' },
    },
    { name: 'phoneVerified', type: 'checkbox', defaultValue: false, access: { update: fieldAllow('ADMIN') } },
    { name: 'termsAcceptedAt', type: 'date', admin: { readOnly: true } },
    { name: 'registrationIp', type: 'text', admin: { readOnly: true } },
    { name: 'lastLoginAt', type: 'date', admin: { readOnly: true } },
    { name: 'lastLoginIp', type: 'text', admin: { readOnly: true } },
    { name: 'deletedAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'relatedRecords',
      type: 'ui',
      admin: { components: { Field: '/components/admin/UserRelatedLinks#UserRelatedLinks' } },
    },
  ],
}

```

src/collections/WalletAdjustments.ts
```typescript
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { allow, hasRole, ROLES } from '@/access'
import { asApiError } from '@/utilities/api-error'
import { moneyField } from '@/utilities/fields'

/**
 * The only supported way for staff to change a balance manually. Creating an adjustment applies the
 * ledger entry, wallet update and audit log atomically with the adjustment record itself.
 */
export const WalletAdjustments: CollectionConfig = {
  slug: 'wallet-adjustments',
  labels: { singular: 'Wallet adjustment', plural: 'Wallet adjustments' },
  admin: {
    group: 'Finance',
    useAsTitle: 'reason',
    defaultColumns: ['createdAt', 'type', 'user', 'amount', 'reason', 'admin'],
    description: 'Manually credit, debit or reverse a transaction. Adjustments cannot be edited or deleted once created.',
  },
  access: {
    read: allow(...ROLES.financeRead),
    create: allow('FINANCE_ADMIN'),
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data) return data
        if (!hasRole(req.user, ['FINANCE_ADMIN'])) throw new APIError('Only finance admins can adjust balances.', 403)
        data.admin = req.user!.id
        data.status = 'APPLIED'
        data.appliedAt = new Date().toISOString()
        if (data.type === 'REVERSAL') {
          if (!data.targetTransaction) throw new APIError('Choose the transaction to reverse.', 400)
        } else {
          if (!data.user) throw new APIError('Choose a user.', 400)
          if (!data.amount || data.amount <= 0) throw new APIError('Enter an amount greater than zero.', 400)
        }
        if (!data.reason || String(data.reason).trim().length < 5) throw new APIError('A clear reason is required (min 5 characters).', 400)
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        const { applyAdminAdjustment } = await import('@/services/wallet')
        await asApiError(() => applyAdminAdjustment({ payload: req.payload, req, adjustment: doc }))
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Credit (add funds)', value: 'CREDIT' },
        { label: 'Debit (remove funds)', value: 'DEBIT' },
        { label: 'Reverse a transaction', value: 'REVERSAL' },
      ],
    },
    { name: 'user', type: 'relationship', relationTo: 'users', admin: { condition: (d) => d?.type !== 'REVERSAL' } },
    moneyField('amount', { admin: { condition: (d) => d?.type !== 'REVERSAL' } }),
    {
      name: 'targetTransaction',
      type: 'relationship',
      relationTo: 'wallet-transactions',
      admin: { condition: (d) => d?.type === 'REVERSAL', description: 'The ledger row to reverse. It can be reversed once.' },
    },
    { name: 'reason', type: 'textarea', required: true },
    { name: 'reference', type: 'text', admin: { description: 'Ticket number, complaint id or other reference.' } },
    { name: 'admin', type: 'relationship', relationTo: 'admins', admin: { readOnly: true } },
    { name: 'status', type: 'select', options: [{ label: 'Applied', value: 'APPLIED' }], defaultValue: 'APPLIED', admin: { readOnly: true } },
    { name: 'appliedAt', type: 'date', admin: { readOnly: true } },
    { name: 'resultingTransaction', type: 'relationship', relationTo: 'wallet-transactions', admin: { readOnly: true } },
  ],
}

```

src/collections/Wallets.ts
```typescript
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { DEFAULT_CURRENCY, toOptions, WALLET_STATUSES } from '@/constants'
import { allow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

/**
 * One wallet per user. Balances are DERIVED state — they may only be changed by WalletService, which
 * always writes a matching ledger row in the same transaction. Direct edits (REST, admin UI, other code)
 * are rejected by the beforeChange guard below.
 */
export const Wallets: CollectionConfig = {
  slug: 'wallets',
  labels: { singular: 'Wallet', plural: 'Wallets' },
  admin: {
    group: 'Users & Wallets',
    useAsTitle: 'id',
    defaultColumns: ['user', 'availableBalance', 'pendingBalance', 'lifetimeEarned', 'lifetimeWithdrawn', 'status'],
    description: 'Read-only. Use Wallet adjustments to credit, debit or reverse funds — every change is ledgered and audited.',
  },
  access: {
    read: allow(...ROLES.financeRead),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [{ fields: ['user'], unique: true }],
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (!req.context?.walletWrite) {
          throw new APIError('Wallet balances can only be changed through WalletService.', 403)
        }
        for (const k of ['availableBalance', 'pendingBalance', 'lifetimeEarned', 'lifetimeWithdrawn'] as const) {
          const v = data[k]
          if (v !== undefined && (!Number.isSafeInteger(v) || v < 0)) throw new APIError(`${k} must be a non-negative integer`, 500)
        }
        if (operation === 'create') {
          for (const k of ['availableBalance', 'pendingBalance', 'lifetimeEarned', 'lifetimeWithdrawn'] as const) {
            if (data[k]) throw new APIError('Wallets must be created empty.', 500)
          }
        }
        return data
      },
    ],
    beforeDelete: [() => { throw new APIError('Wallets cannot be deleted.', 403) }],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, unique: true, index: true, admin: { readOnly: true } },
    moneyField('availableBalance', { admin: { readOnly: true, description: 'Spendable balance in paise.' } }),
    moneyField('pendingBalance', { admin: { readOnly: true, description: 'Funds held for withdrawals that are not yet settled.' } }),
    moneyField('lifetimeEarned', { admin: { readOnly: true } }),
    moneyField('lifetimeWithdrawn', { admin: { readOnly: true } }),
    { name: 'currency', type: 'text', defaultValue: DEFAULT_CURRENCY, required: true, admin: { readOnly: true } },
    { name: 'status', type: 'select', options: toOptions(WALLET_STATUSES), defaultValue: 'ACTIVE', required: true, index: true, admin: { readOnly: true } },
  ],
}

```

src/collections/WalletTransactions.ts
```typescript
import type { CollectionConfig } from 'payload'
import { toOptions, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '@/constants'
import { allow, ROLES } from '@/access'
import { immutableRecord } from '@/hooks/immutable'
import { signedMoneyField } from '@/utilities/fields'

/** Immutable double-entry-style ledger. One row per balance movement of `availableBalance`. */
export const WalletTransactions: CollectionConfig = {
  slug: 'wallet-transactions',
  labels: { singular: 'Transaction', plural: 'Transactions' },
  admin: {
    group: 'Users & Wallets',
    useAsTitle: 'description',
    defaultColumns: ['createdAt', 'user', 'type', 'amount', 'balanceAfter', 'description'],
    listSearchableFields: ['description', 'referenceId', 'idempotencyKey'],
    description: 'Append-only ledger. Rows can never be edited or deleted.',
  },
  access: {
    read: allow(...ROLES.financeRead),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [
    { fields: ['user', 'createdAt'] },
    { fields: ['type', 'createdAt'] },
    { fields: ['referenceType', 'referenceId'] },
  ],
  hooks: immutableRecord('Ledger', { requireContextFlag: 'ledgerWrite' }),
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'wallet', type: 'relationship', relationTo: 'wallets', required: true, index: true },
    { name: 'type', type: 'select', options: toOptions(TRANSACTION_TYPES), required: true, index: true },
    signedMoneyField('amount', { required: true, admin: { description: 'Signed movement of the available balance, in paise.' } }),
    signedMoneyField('balanceBefore', { required: true }),
    signedMoneyField('balanceAfter', { required: true }),
    { name: 'currency', type: 'text', required: true },
    { name: 'referenceType', type: 'text', index: true },
    { name: 'referenceId', type: 'text', index: true },
    { name: 'description', type: 'text', required: true },
    { name: 'status', type: 'select', options: toOptions(TRANSACTION_STATUSES), defaultValue: 'COMPLETED', required: true },
    { name: 'idempotencyKey', type: 'text', required: true, unique: true, index: true, admin: { description: 'Guarantees a business event is credited at most once.' } },
    { name: 'reversalOf', type: 'relationship', relationTo: 'wallet-transactions', unique: true, index: true },
    { name: 'metadata', type: 'json' },
  ],
}

```

src/collections/Withdrawals.ts
```typescript
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { PAYOUT_METHOD_TYPES, toOptions, WITHDRAWAL_STATUSES } from '@/constants'
import { allow, fieldAllow, hasRole, ROLES } from '@/access'
import { asApiError } from '@/utilities/api-error'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const Withdrawals: CollectionConfig = {
  slug: 'withdrawals',
  labels: { singular: 'Withdrawal', plural: 'Withdrawals' },
  admin: {
    group: 'Finance',
    useAsTitle: 'id',
    defaultColumns: ['requestedAt', 'user', 'amount', 'method', 'status', 'transactionReference'],
    listSearchableFields: ['transactionReference', 'idempotencyKey'],
    description:
      'Workflow: PENDING → UNDER_REVIEW → APPROVED → PROCESSING → COMPLETED. Rejecting, failing or cancelling refunds the held funds automatically. Amounts can never be edited.',
  },
  access: {
    read: allow(...ROLES.financeRead),
    create: () => false, // created only by WithdrawalService
    update: allow('FINANCE_ADMIN'),
    delete: () => false,
  },
  indexes: [
    { fields: ['user', 'status'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['user', 'requestedAt'] },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        if (operation !== 'update' || !originalDoc) return data
        if (req.context?.serviceWrite) return data
        if (!hasRole(req.user, ['FINANCE_ADMIN'])) throw new APIError('Only finance admins can process withdrawals.', 403)
        const { prepareStatusChange } = await import('@/services/withdrawal')
        return asApiError(async () => prepareStatusChange({ data, originalDoc, adminId: req.user?.id as number }))
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || !previousDoc || doc.status === previousDoc.status) return doc
        const { applyStatusEffects } = await import('@/services/withdrawal')
        await asApiError(() => applyStatusEffects({ payload: req.payload, req, withdrawal: doc, from: previousDoc.status }))
        return doc
      },
    ],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'wallet', type: 'relationship', relationTo: 'wallets', required: true, admin: RO },
    moneyField('amount', { required: true, min: 1, admin: RO }),
    { name: 'currency', type: 'text', required: true, admin: RO },
    { name: 'method', type: 'select', required: true, options: toOptions(PAYOUT_METHOD_TYPES), admin: RO },
    { name: 'payoutMethod', type: 'relationship', relationTo: 'payout-methods', admin: RO },
    { name: 'payoutSummary', type: 'text', admin: { ...RO, description: 'Masked destination for support staff.' } },
    // Encrypted snapshot of the destination at request time. Only finance roles can read it.
    { name: 'payoutDetailsEncrypted', type: 'text', access: { read: fieldAllow('FINANCE_ADMIN'), create: () => false, update: () => false }, admin: { hidden: true } },
    {
      name: 'payoutDetails',
      type: 'json',
      virtual: true,
      access: { read: fieldAllow('FINANCE_ADMIN'), create: () => false, update: () => false },
      admin: { readOnly: true, description: 'Decrypted destination — visible to finance admins only. Every view of this page should be treated as sensitive.' },
      hooks: {
        afterRead: [
          async ({ siblingData }) => {
            const enc = (siblingData as { payoutDetailsEncrypted?: string }).payoutDetailsEncrypted
            if (!enc) return undefined
            try {
              const { decrypt } = await import('@/lib/crypto')
              return JSON.parse(decrypt(enc))
            } catch {
              return { error: 'Unable to decrypt payout details' }
            }
          },
        ],
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'PENDING',
      options: toOptions(WITHDRAWAL_STATUSES),
      access: { update: fieldAllow('FINANCE_ADMIN') },
    },
    { name: 'failureReason', type: 'text', access: { update: fieldAllow('FINANCE_ADMIN') }, admin: { description: 'Required when rejecting or failing. Shown to the user.' } },
    { name: 'transactionReference', type: 'text', index: true, access: { update: fieldAllow('FINANCE_ADMIN') }, admin: { description: 'Bank UTR / payout reference. Required to mark COMPLETED.' } },
    { name: 'adminNote', type: 'textarea', access: { update: fieldAllow('FINANCE_ADMIN') }, admin: { description: 'Internal note, never shown to the user.' } },
    { name: 'requestedAt', type: 'date', required: true, index: true, admin: RO },
    { name: 'reviewedAt', type: 'date', admin: RO },
    { name: 'processedAt', type: 'date', admin: RO },
    { name: 'completedAt', type: 'date', admin: RO },
    { name: 'rejectedAt', type: 'date', admin: RO },
    { name: 'failedAt', type: 'date', admin: RO },
    { name: 'cancelledAt', type: 'date', admin: RO },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'admins', admin: RO },
    { name: 'debitTransaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'refundTransaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'idempotencyKey', type: 'text', required: true, unique: true, index: true, admin: RO },
    { name: 'metadata', type: 'json', admin: RO },
  ],
}

```

src/components/admin/Dashboard.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import { Gutter } from '@payloadcms/ui'

interface Metrics {
  range: string
  totalUsers: number
  newUsers: number
  activeUsers: number
  rewardsIssuedAllTime: number
  rewardsIssuedRange: number
  totalWithdrawalsCompleted: number
  withdrawalsPending: number
  withdrawalsCompleted: number
  withdrawalsFailed: number
  taskCompletions: number
  gamesPlayed: number
  campaignClaims: number
  referralConversions: number
}

const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const RANGES: { value: string; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

const Card: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 'var(--style-radius-m)', padding: 20, background: 'var(--theme-elevation-0)' }}>
    <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>{value}</div>
    {sub ? <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>{sub}</div> : null}
  </div>
)

export const Dashboard: React.FC = () => {
  const [range, setRange] = useState('today')
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/metrics?range=${range}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => setMetrics(json.ok ? json.data : null))
      .finally(() => setLoading(false))
  }, [range])

  return (
    <Gutter>
      <div style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--theme-elevation-150)',
                  background: range === r.value ? 'var(--theme-elevation-800)' : 'transparent',
                  color: range === r.value ? 'var(--theme-elevation-0)' : 'inherit',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading || !metrics ? (
          <div style={{ opacity: 0.6 }}>Loading metrics…</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
              <Card label="Total users" value={metrics.totalUsers.toLocaleString('en-IN')} />
              <Card label="New users" value={metrics.newUsers.toLocaleString('en-IN')} sub={RANGES.find((r) => r.value === range)?.label} />
              <Card label="Active users" value={metrics.activeUsers.toLocaleString('en-IN')} sub="Logged in during range" />
              <Card label="Rewards issued (all time)" value={money(metrics.rewardsIssuedAllTime)} />
              <Card label="Rewards issued" value={money(metrics.rewardsIssuedRange)} sub={RANGES.find((r) => r.value === range)?.label} />
              <Card label="Total withdrawals paid" value={money(metrics.totalWithdrawalsCompleted)} sub="All time, completed" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <Card label="Withdrawals pending" value={metrics.withdrawalsPending.toLocaleString('en-IN')} />
              <Card label="Withdrawals completed" value={metrics.withdrawalsCompleted.toLocaleString('en-IN')} />
              <Card label="Withdrawals failed" value={metrics.withdrawalsFailed.toLocaleString('en-IN')} />
              <Card label="Task completions" value={metrics.taskCompletions.toLocaleString('en-IN')} />
              <Card label="Games played" value={metrics.gamesPlayed.toLocaleString('en-IN')} />
              <Card label="Campaign claims" value={metrics.campaignClaims.toLocaleString('en-IN')} />
              <Card label="Referral conversions" value={metrics.referralConversions.toLocaleString('en-IN')} />
            </div>
          </>
        )}
      </div>
    </Gutter>
  )
}

```

src/components/admin/MoneyField.tsx
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import { FieldLabel, useField } from '@payloadcms/ui'
import type { NumberFieldClientProps } from 'payload'

const toDecimal = (minor: number) => {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/**
 * Admin editor for money fields. Staff type rupees ("25.50"); the value stored in the database is always
 * an integer number of paise (2550). Parsing is string based — no floating point.
 */
export const MoneyField: React.FC<NumberFieldClientProps> = (props) => {
  const { field, path, readOnly, validate } = props
  const { value, setValue, showError, errorMessage } = useField<number | null>({ path, validate: validate as never })
  const [text, setText] = useState<string>('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(typeof value === 'number' ? toDecimal(value) : '')
  }, [value, focused])

  const onChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, '')
    if (!/^\d*\.?\d{0,2}$/.test(cleaned)) return
    setText(cleaned)
    if (cleaned === '' || cleaned === '.') return setValue(null)
    const [w = '0', f = ''] = cleaned.split('.')
    setValue(Number(w || '0') * 100 + Number(f.padEnd(2, '0')))
  }

  const description = (field.admin as { description?: string } | undefined)?.description
  const box: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: `1px solid ${showError ? 'var(--theme-error-500)' : 'var(--theme-elevation-150)'}`,
    background: 'var(--theme-input-bg)',
    borderRadius: 'var(--style-radius-s)',
    padding: '0 12px',
    height: 40,
  }

  return (
    <div className="field-type number" style={{ marginBottom: 'var(--base)' }}>
      <FieldLabel label={field.label} path={path} required={field.required} />
      <div style={box}>
        <span style={{ opacity: 0.6 }}>₹</span>
        <input
          inputMode="decimal"
          value={text}
          disabled={Boolean(readOnly)}
          placeholder="0.00"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, border: 0, outline: 0, background: 'transparent', color: 'inherit', font: 'inherit' }}
        />
        <span style={{ opacity: 0.5, fontSize: 12, whiteSpace: 'nowrap' }}>{typeof value === 'number' ? `${value.toLocaleString('en-IN')} paise` : ''}</span>
      </div>
      {showError && errorMessage ? <div style={{ color: 'var(--theme-error-500)', fontSize: 13, marginTop: 4 }}>{errorMessage}</div> : null}
      {description ? <div style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>{description}</div> : null}
    </div>
  )
}

```

src/components/admin/UserRelatedLinks.tsx
```tsx
'use client'
import React from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

const LINKS: { label: string; collection: string; field: string }[] = [
  { label: 'Wallet', collection: 'wallets', field: 'user' },
  { label: 'Transactions', collection: 'wallet-transactions', field: 'user' },
  { label: 'Withdrawals', collection: 'withdrawals', field: 'user' },
  { label: 'Payout methods', collection: 'payout-methods', field: 'user' },
  { label: 'Task history', collection: 'task-completions', field: 'user' },
  { label: 'Game history', collection: 'game-sessions', field: 'user' },
  { label: 'Campaign claims', collection: 'campaign-claims', field: 'user' },
  { label: 'Referrals made', collection: 'referrals', field: 'referrer' },
  { label: 'Notifications', collection: 'notifications', field: 'user' },
]

/** Jump-links from a user record to everything that belongs to them. */
export const UserRelatedLinks: React.FC = () => {
  const { id } = useDocumentInfo()
  if (!id) return null
  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Related records</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {LINKS.map((l) => (
          <a
            key={l.collection}
            href={`/admin/collections/${l.collection}?where[${l.field}][equals]=${id}`}
            style={{ padding: '6px 12px', border: '1px solid var(--theme-elevation-150)', borderRadius: 6, textDecoration: 'none', color: 'inherit', fontSize: 13 }}
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  )
}

```

src/components/AppShell.tsx
```tsx
'use client'
import React from 'react'
import Link from 'next/link'
import { Bell, ChevronLeft, User2Icon } from 'lucide-react'
import { BottomNav } from './BottomNav'

export function AppShell({
  children,
  title,
  right,
  showBack = false,
  hideHeader = false,
}: {
  children: React.ReactNode
  title?: string
  right?: React.ReactNode
  showBack?: boolean
  hideHeader?: boolean
}) {
  return (
    <div className="min-h-dvh bg-(--app-dark) pb-24">
      {!hideHeader && (
        <header className="safe-top sticky top-0 z-30 flex items-center justify-between bg-(--app-dark)/95   backdrop-blur">
          {title ? (
            <>
              <h1 className="font-display text-[22px] font-medium text-ink">{title}</h1>
              {right}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 p-4">
                {showBack && (
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="rounded-full p-1 hover:bg-white/5"
                    aria-label="Go back"
                  >
                    <ChevronLeft size={22} className="text-slate-300" />
                  </button>
                )}
                <Link href="/" className="flex items-center gap-1.5">
                  <div
                  style={{
                    backgroundImage: "url('/logo.jpeg')"
                  }}
                  className="flex h-8 w-8 bg-center bg-cover items-center justify-center rounded-lg">

                  </div>
                  <div className="leading-none">
                    <h1 className="text-base font-black tracking-tight text-white">
                      KING <span className="text-amber-400">888</span>
                    </h1>
                    <p className="text-[7px] font-medium tracking-[0.15em] text-slate-400">Play · Earn · Redeem</p>
                  </div>
                </Link>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/notifications" className="relative rounded-full p-2 hover:bg-white/5">
                  <Bell size={20} className="text-slate-300" />
                </Link>
                <Link href="/profile" className="relative">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-slate-500 bg-gradient-to-br from-slate-600 to-slate-800">
                <User2Icon size={16}/>
                  </div>
                </Link>
              </div>
            </>
          )}
        </header>
      )}

      <main className="mx-auto max-w-md px-4">{children}</main>
      <BottomNav />
    </div>
  )
}

```

src/components/AuthProvider.tsx
```tsx
'use client'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, ApiError } from '@/lib/api-client'

export interface SessionUser {
  id: number
  email: string
  name: string
  status: string
  referralCode?: string
}

interface AuthState {
  user: SessionUser | null
  loading: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (input: { email: string; password: string; name: string; referralCode?: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: SessionUser | null }>('/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<{ user: SessionUser }>('/auth/login', { email, password })
      setUser(data.user)
      router.push('/')
    },
    [router],
  )

  const register = useCallback(
    async (input: { email: string; password: string; name: string; referralCode?: string }) => {
      const data = await api.post<{ user: SessionUser }>('/auth/register', input)
      setUser(data.user)
      router.push('/')
    },
    [router],
  )

  const logout = useCallback(async () => {
    await api.post('/auth/logout')
    setUser(null)
    router.push('/login')
  }, [router])

  return <AuthContext.Provider value={{ user, loading, refresh, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ApiError }

```

src/components/BottomNav.tsx
```tsx
'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Gamepad2, Coins, Gift, User } from 'lucide-react'

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/earn', label: 'Earn', icon: Coins },
  { href: '/promotions', label: 'Promotion', icon: Gift },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1F2E45] bg-[#0A1020]/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]"
            >
              <div className={`rounded-xl p-1.5 ${active ? 'bg-amber-400/15' : ''}`}>
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.6}
                  className={active ? 'text-amber-400' : 'text-slate-500'}
                />
              </div>
              <span className={active ? 'font-semibold text-amber-400' : 'text-slate-500'}>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

```

src/components/EmptyState.tsx
```tsx
import React from 'react'

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-ink/15 px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {body ? <p className="max-w-[26ch] text-sm text-ink-faint">{body}</p> : null}
      {action}
    </div>
  )
}

```

src/components/ui/button.tsx
```tsx
import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper hover:bg-ink-soft',
        marigold: 'bg-marigold text-ink hover:bg-marigold-deep hover:text-paper',
        outline: 'border border-ink/15 bg-transparent text-ink hover:bg-ink/5',
        ghost: 'bg-transparent text-ink hover:bg-ink/5',
        danger: 'bg-coral text-paper hover:opacity-90',
      },
      size: {
        default: 'h-12 px-5 text-[15px]',
        sm: 'h-9 px-3.5 text-sm',
        lg: 'h-14 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'marigold', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'

```

src/components/ui/card.tsx
```tsx
import React from 'react'
import { cn } from '@/lib/cn'

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('rounded-card border border-[#F5B82E]/15 bg-[#0E1726] text-slate-100 shadow-[0_12px_30px_rgba(5,7,12,0.35)]', className)} {...props} />
)

```

src/components/ui/dialog.tsx
```tsx
'use client'
import React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger

export function DialogContent({ className, children, title, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-card bg-surface px-5 pb-8 pt-5 safe-bottom',
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex items-center justify-between">
          <DialogPrimitive.Title className="font-display text-[19px]">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="rounded-full p-1.5 hover:bg-ink/5">
            <X size={18} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

```

src/components/ui/input.tsx
```tsx
import React from 'react'
import { cn } from '@/lib/cn'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-12 w-full rounded-control border border-ink/15 bg-surface px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-banyan',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, ...props }) => (
  <label className={cn('mb-1.5 block text-[13px] font-medium text-ink-soft', className)} {...props} />
)

```

src/components/ui/skeleton.tsx
```tsx
import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-chip bg-ink/8', className)} />
}

```

src/constants/index.ts
```typescript
/**
 * Centralised constants. Every enum used by Payload select fields, Zod schemas and
 * services is defined here exactly once.
 */

export const DEFAULT_CURRENCY = 'INR'
export const DEFAULT_TIMEZONE = 'Asia/Kolkata'
export const MINOR_UNITS_PER_MAJOR = 100

export const USER_STATUSES = ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'BLOCKED', 'DELETED'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const SCHEDULABLE_STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'DISABLED'] as const
export const TASK_STATUSES = SCHEDULABLE_STATUSES
export type TaskStatus = (typeof TASK_STATUSES)[number]
export const GAME_STATUSES = SCHEDULABLE_STATUSES
export type GameStatus = (typeof GAME_STATUSES)[number]

export const CAMPAIGN_STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'COMPLETED'] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const REWARD_SOURCES = ['TASK', 'GAME', 'CAMPAIGN', 'REFERRAL', 'BONUS', 'ADMIN_ADJUSTMENT'] as const
export type RewardSource = (typeof REWARD_SOURCES)[number]

export const TRANSACTION_TYPES = [
  'TASK_REWARD',
  'GAME_REWARD',
  'CAMPAIGN_REWARD',
  'REFERRAL_REWARD',
  'BONUS',
  'WITHDRAWAL',
  'REFUND',
  'ADMIN_CREDIT',
  'ADMIN_DEBIT',
  'REVERSAL',
] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

/** Ledger types that add to the available balance and count as "earned". */
export const CREDIT_EARNING_TYPES: readonly TransactionType[] = [
  'TASK_REWARD',
  'GAME_REWARD',
  'CAMPAIGN_REWARD',
  'REFERRAL_REWARD',
  'BONUS',
  'ADMIN_CREDIT',
]
/** Ledger types that count as earning for stats/dashboards (excludes admin credits). */
export const EARNING_TYPES_FOR_STATS: readonly TransactionType[] = [
  'TASK_REWARD',
  'GAME_REWARD',
  'CAMPAIGN_REWARD',
  'REFERRAL_REWARD',
  'BONUS',
]

export const REWARD_SOURCE_TO_TX_TYPE: Record<RewardSource, TransactionType> = {
  TASK: 'TASK_REWARD',
  GAME: 'GAME_REWARD',
  CAMPAIGN: 'CAMPAIGN_REWARD',
  REFERRAL: 'REFERRAL_REWARD',
  BONUS: 'BONUS',
  ADMIN_ADJUSTMENT: 'ADMIN_CREDIT',
}

export const WALLET_STATUSES = ['ACTIVE', 'FROZEN'] as const
export const TRANSACTION_STATUSES = ['COMPLETED'] as const

export const TASK_COMPLETION_STATUSES = ['STARTED', 'SUBMITTED', 'COMPLETED', 'REJECTED', 'EXPIRED'] as const
export type TaskCompletionStatus = (typeof TASK_COMPLETION_STATUSES)[number]

export const TASK_VERIFICATION_TYPES = ['NONE', 'TIMER', 'ANSWER_CODE', 'TEXT_SUBMISSION', 'MANUAL_REVIEW'] as const
export type TaskVerificationType = (typeof TASK_VERIFICATION_TYPES)[number]

export const GAME_TYPES = ['QUIZ', 'SUDOKU', 'MEMORY', 'NUMBER_SEQUENCE', 'MATH', 'REACTION', 'SPIN_WHEEL', 'WINGO'] as const
export type GameType = (typeof GAME_TYPES)[number]

export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const GAME_SESSION_STATUSES = ['STARTED', 'COMPLETED', 'EXPIRED', 'REJECTED'] as const
export type GameSessionStatus = (typeof GAME_SESSION_STATUSES)[number]
export const GAME_RESULTS = ['WIN', 'PARTIAL', 'LOSE'] as const
export type GameResult = (typeof GAME_RESULTS)[number]

export const REWARD_MODES = ['FIXED', 'PER_SCORE', 'TIERED'] as const
export type RewardMode = (typeof REWARD_MODES)[number]

export const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE'] as const
export const MATH_OPERATIONS = ['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'PERCENTAGE', 'MIXED'] as const
export type MathOperation = (typeof MATH_OPERATIONS)[number]

export const CAMPAIGN_ACTION_TYPES = [
  'TASKS_COMPLETED',
  'GAMES_PLAYED',
  'GAMES_WON',
  'REFERRALS_QUALIFIED',
  'AMOUNT_EARNED',
  'SPECIFIC_TASK',
  'SPECIFIC_GAME',
] as const
export type CampaignActionType = (typeof CAMPAIGN_ACTION_TYPES)[number]

export const REFERRAL_STATUSES = ['PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED'] as const
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number]
export const REFERRAL_QUALIFICATIONS = ['REGISTRATION', 'VERIFIED_ACCOUNT', 'FIRST_TASK', 'FIRST_GAME', 'AMOUNT_EARNED'] as const
export type ReferralQualification = (typeof REFERRAL_QUALIFICATIONS)[number]

export const WITHDRAWAL_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
  'FAILED',
  'CANCELLED',
] as const
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number]
/** Withdrawal states in which funds are still held (debited from available, not yet settled). */
export const OPEN_WITHDRAWAL_STATUSES: readonly WithdrawalStatus[] = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING']

export const PAYOUT_METHOD_TYPES = ['UPI', 'BANK'] as const
export type PayoutMethodType = (typeof PAYOUT_METHOD_TYPES)[number]

export const NOTIFICATION_TYPES = [
  'REWARD_CREDITED',
  'TASK_COMPLETED',
  'GAME_REWARD',
  'CAMPAIGN_STARTED',
  'CAMPAIGN_ENDING',
  'WITHDRAWAL_REQUESTED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REJECTED',
  'WITHDRAWAL_COMPLETED',
  'REFERRAL_REWARDED',
  'SYSTEM',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const AUDIT_ACTIONS = [
  'USER_SUSPENDED',
  'USER_UNSUSPENDED',
  'USER_BLOCKED',
  'USER_STATUS_CHANGED',
  'REWARD_CREDITED',
  'REWARD_DEBITED',
  'TRANSACTION_REVERSED',
  'WITHDRAWAL_REQUESTED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REJECTED',
  'WITHDRAWAL_COMPLETED',
  'WITHDRAWAL_FAILED',
  'WITHDRAWAL_CANCELLED',
  'WITHDRAWAL_STATUS_CHANGED',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_DELETED',
  'TASK_COMPLETION_REVIEWED',
  'GAME_CREATED',
  'GAME_UPDATED',
  'GAME_DELETED',
  'CAMPAIGN_CREATED',
  'CAMPAIGN_UPDATED',
  'CAMPAIGN_DELETED',
  'SETTINGS_UPDATED',
  'CONTENT_UPDATED',
  'ADMIN_CREATED',
  'ADMIN_UPDATED',
  'WALLET_RECONCILED',
  'OTHER',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const REDIS_PREFIX = 'rw:'
export const SESSION_COOKIE = 'rw_session'
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  FINANCE_ADMIN: 'Finance admin',
  CONTENT_MANAGER: 'Content manager',
  SUPPORT_AGENT: 'Support agent',
}

export const toOptions = <T extends readonly string[]>(values: T, labels?: Partial<Record<T[number], string>>) =>
  values.map((value) => ({
    value,
    label: labels?.[value as T[number]] ?? value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
  }))
```

src/games/__tests__/sudoku-core.test.ts
```typescript
import { describe, expect, it } from 'vitest'
import { countSolutions, generatePuzzle, gridToString, isValidSolution, matchesGivens, parseGrid, solve } from '../sudoku-core'

const VALID_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'

describe('parseGrid', () => {
  it('parses an 81-character grid using 0 or . for blanks', () => {
    const withDots = VALID_SOLUTION.slice(0, 40) + '.'.repeat(41)
    const grid = parseGrid(withDots)
    expect(grid).not.toBeNull()
    expect(grid).toHaveLength(81)
    expect(grid![40]).toBe(0)
  })
  it('rejects the wrong length or invalid characters', () => {
    expect(parseGrid('123')).toBeNull()
    expect(parseGrid('a'.repeat(81))).toBeNull()
  })
})

describe('isValidSolution', () => {
  it('accepts a real solved grid', () => {
    expect(isValidSolution(parseGrid(VALID_SOLUTION)!)).toBe(true)
  })
  it('rejects a grid with a repeated digit in a row', () => {
    const broken = parseGrid(VALID_SOLUTION)!
    broken[1] = broken[0] // duplicate within row 0
    expect(isValidSolution(broken)).toBe(false)
  })
  it('rejects an incomplete grid', () => {
    const incomplete = parseGrid(VALID_SOLUTION)!
    incomplete[0] = 0
    expect(isValidSolution(incomplete)).toBe(false)
  })
})

describe('matchesGivens', () => {
  it('is true when every non-zero puzzle cell matches the solution', () => {
    const solution = parseGrid(VALID_SOLUTION)!
    const puzzle = solution.map((v, i) => (i % 3 === 0 ? v : 0))
    expect(matchesGivens(puzzle, solution)).toBe(true)
  })
  it('is false when a clue contradicts the solution', () => {
    const solution = parseGrid(VALID_SOLUTION)!
    const puzzle = new Array(81).fill(0)
    puzzle[0] = solution[0] === 9 ? 1 : 9
    expect(matchesGivens(puzzle, solution)).toBe(false)
  })
})

describe('solve / countSolutions', () => {
  it('solves a puzzle down to a valid grid consistent with the givens', () => {
    const solution = parseGrid(VALID_SOLUTION)!
    const puzzle = solution.map((v, i) => (i % 2 === 0 ? v : 0))
    const solved = solve(puzzle)
    expect(solved).not.toBeNull()
    expect(isValidSolution(solved!)).toBe(true)
    expect(matchesGivens(puzzle, solved!)).toBe(true)
  })
  it('a puzzle generated with a unique solution reports exactly one', () => {
    const { puzzle } = generatePuzzle('EASY', 1500)
    expect(countSolutions(puzzle, 2)).toBe(1)
  }, 10_000)
  it('reports 0 solutions for a puzzle whose givens contradict each other', () => {
    const solution = parseGrid(VALID_SOLUTION)!
    const puzzle = new Array(81).fill(0)
    puzzle[0] = solution[0]
    puzzle[1] = solution[0] // same digit given twice in row 0 — no valid completion exists
    expect(countSolutions(puzzle, 2)).toBe(0)
  })
})

describe('generatePuzzle', () => {
  it('produces a puzzle whose givens match its own solution and has a unique solution', () => {
    const { puzzle, solution } = generatePuzzle('EASY', 1500)
    expect(isValidSolution(solution)).toBe(true)
    expect(matchesGivens(puzzle, solution)).toBe(true)
    expect(countSolutions(puzzle, 2)).toBe(1)
  }, 10_000)

  it('harder difficulties have fewer or equal clues than easier ones', () => {
    const easy = generatePuzzle('EASY', 1200)
    const hard = generatePuzzle('HARD', 1200)
    const clues = (g: number[]) => g.filter((n) => n !== 0).length
    expect(clues(hard.puzzle)).toBeLessThanOrEqual(clues(easy.puzzle))
  }, 15_000)
})

describe('gridToString', () => {
  it('round-trips with parseGrid', () => {
    const grid = parseGrid(VALID_SOLUTION)!
    expect(gridToString(grid)).toBe(VALID_SOLUTION)
  })
})

```

src/games/__tests__/wingo-engine.test.ts
```typescript
import { describe, expect, it } from 'vitest'
import { wingoEngine } from '../wingo-engine'

describe('wingoEngine', () => {
  it('starts a valid round with the 0-9 betting board', async () => {
    const game = { reward: { amount: 100 } } as any
    const round = await wingoEngine.start({} as any, game)

    expect(round.client.kind).toBe('WINGO')
    expect(round.client.numbers).toHaveLength(10)
    expect(round.server.kind).toBe('WINGO')
    expect(round.server.winningNumber).toBeGreaterThanOrEqual(0)
    expect(round.server.winningNumber).toBeLessThan(10)
  })

  it('awards the exact number bet at 9x', async () => {
    const game = { reward: { amount: 100 } } as any
    const result = await wingoEngine.submit({} as any, game, {
      server: { kind: 'WINGO', winningNumber: 7 },
      payload: { type: 'NUMBER', value: 7 },
      elapsedSeconds: 5,
    })

    expect(result.score).toBe(1)
    expect(result.rewardOverride).toBe(900)
  })

  it('applies the color and size payout rules from the 51-game reference', async () => {
    const game = { reward: { amount: 100 } } as any

    const greenResult = await wingoEngine.submit({} as any, game, {
      server: { kind: 'WINGO', winningNumber: 5 },
      payload: { type: 'COLOR', value: 'green' },
      elapsedSeconds: 5,
    })
    expect(greenResult.score).toBe(1)
    expect(greenResult.rewardOverride).toBe(150)

    const violetResult = await wingoEngine.submit({} as any, game, {
      server: { kind: 'WINGO', winningNumber: 5 },
      payload: { type: 'COLOR', value: 'violet' },
      elapsedSeconds: 5,
    })
    expect(violetResult.score).toBe(1)
    expect(violetResult.rewardOverride).toBe(450)

    const bigResult = await wingoEngine.submit({} as any, game, {
      server: { kind: 'WINGO', winningNumber: 8 },
      payload: { type: 'SIZE', value: 'big' },
      elapsedSeconds: 5,
    })
    expect(bigResult.score).toBe(1)
    expect(bigResult.rewardOverride).toBe(200)
  })

  it('rejects invalid Wingo bets', async () => {
    const game = { reward: { amount: 100 } } as any
    const result = await wingoEngine.submit({} as any, game, {
      server: { kind: 'WINGO', winningNumber: 3 },
      payload: { type: 'COLOR', value: 'yellow' },
      elapsedSeconds: 5,
    })

    expect(result.score).toBe(0)
    expect(result.rejectionReason).toBeTruthy()
  })
})

```

src/games/math-engine.ts
```typescript
import { randomInt } from 'node:crypto'
import type { MathOperation } from '@/constants'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

interface MathQuestion {
  text: string
  answer: number
}

function makeQuestion(op: MathOperation, difficulty: string): MathQuestion {
  const range = difficulty === 'EASY' ? 20 : difficulty === 'MEDIUM' ? 50 : difficulty === 'HARD' ? 100 : 500
  const a = randomInt(1, range)
  const b = randomInt(1, range)
  switch (op) {
    case 'ADDITION':
      return { text: `${a} + ${b}`, answer: a + b }
    case 'SUBTRACTION':
      return { text: `${Math.max(a, b)} - ${Math.min(a, b)}`, answer: Math.abs(a - b) }
    case 'MULTIPLICATION': {
      const small = randomInt(2, difficulty === 'EASY' ? 12 : 20)
      const small2 = randomInt(2, difficulty === 'EASY' ? 12 : 20)
      return { text: `${small} × ${small2}`, answer: small * small2 }
    }
    case 'DIVISION': {
      const divisor = randomInt(2, 12)
      const quotient = randomInt(2, 20)
      return { text: `${divisor * quotient} ÷ ${divisor}`, answer: quotient }
    }
    case 'PERCENTAGE': {
      const pct = [5, 10, 15, 20, 25, 50][randomInt(6)]!
      const base = randomInt(2, 20) * 10
      return { text: `${pct}% of ${base}`, answer: Math.round((pct / 100) * base) }
    }
    default: {
      const ops: MathOperation[] = ['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'PERCENTAGE']
      return makeQuestion(ops[randomInt(ops.length)]!, difficulty)
    }
  }
}

export const mathEngine: GameEngine = {
  type: 'MATH',
  async start(_payload, game) {
    const count = game.config?.questionCount ?? 8
    const ops = (game.config?.mathOperations?.length ? game.config.mathOperations : ['MIXED']) as MathOperation[]
    const questions = Array.from({ length: count }, () => makeQuestion(ops[randomInt(ops.length)]!, game.difficulty))
    return {
      client: { kind: 'MATH', questions: questions.map((q) => ({ text: q.text })), secondsPerQuestion: game.config?.secondsPerQuestion ?? 15 },
      server: { kind: 'MATH', answers: questions.map((q) => q.answer) },
      maxScore: count,
    }
  },
  async submit(_payload, _game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { answers: number[] }
    const given = (input.payload as { answers?: (number | null)[] })?.answers ?? []
    let score = 0
    const rounds = server.answers.map((ans, i) => {
      const correct = given[i] === ans
      if (correct) score++
      return { index: i, correct }
    })
    return { score, maxScore: server.answers.length, rounds }
  },
}

```

src/games/memory-engine.ts
```typescript
import { randomInt } from 'node:crypto'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

/** Memory Match: N pairs of symbols placed on a rows×cols board. Client sends the sequence of flip pairs it made. */
export const memoryEngine: GameEngine = {
  type: 'MEMORY',
  async start(_payload, game) {
    const rows = game.config?.rows ?? 4
    const cols = game.config?.cols ?? 4
    const cells = rows * cols
    const pairs = cells / 2
    const symbolIds = Array.from({ length: pairs }, (_, i) => i)
    const board = shuffle([...symbolIds, ...symbolIds])
    return {
      // The board is sent to the client so it can render real matches during play. This is a deliberate
      // trade-off for a casual, capped-reward game: server still re-validates the moves against its own
      // copy on submit, and per-play rewards are small and rate/daily-limited, so knowing the layout
      // in advance isn't a money-security issue — only a minor gameplay-integrity one.
      client: { kind: 'MEMORY', rows, cols, cellCount: cells, board },
      server: { kind: 'MEMORY', board },
      maxScore: pairs,
    }
  },
  async submit(_payload, game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { board: number[] }
    const minSolveSeconds = game.config?.minSolveSeconds ?? 0
    const moves = (input.payload as { moves?: [number, number][] })?.moves ?? []
    const pairs = server.board.length / 2

    if (minSolveSeconds && input.elapsedSeconds < minSolveSeconds) return { score: 0, maxScore: pairs, rounds: null, rejectionReason: 'Submitted implausibly fast.' }
    if (!Array.isArray(moves) || moves.length > pairs * 3) return { score: 0, maxScore: pairs, rounds: null, rejectionReason: 'Malformed submission.' }

    const matched = new Set<number>()
    let score = 0
    for (const move of moves) {
      const [a, b] = move
      if (typeof a !== 'number' || typeof b !== 'number' || a === b) continue
      if (a < 0 || a >= server.board.length || b < 0 || b >= server.board.length) continue
      if (matched.has(a) || matched.has(b)) continue
      if (server.board[a] === server.board[b]) {
        matched.add(a)
        matched.add(b)
        score++
      }
    }
    return { score, maxScore: pairs, rounds: { matchedPairs: score, totalMoves: moves.length } }
  },
}

```

src/games/number-sequence-engine.ts
```typescript
import { randomInt } from 'node:crypto'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

type SeqKind = 'ARITHMETIC' | 'GEOMETRIC' | 'FIBONACCI_LIKE'

function makeSequence(difficulty: string): { sequence: number[]; answer: number; kind: SeqKind } {
  const length = difficulty === 'EASY' ? 5 : difficulty === 'MEDIUM' ? 6 : difficulty === 'HARD' ? 7 : 8
  const kinds: SeqKind[] = ['ARITHMETIC', 'GEOMETRIC', 'FIBONACCI_LIKE']
  const kind = kinds[randomInt(kinds.length)]!
  const start = randomInt(1, 10)
  const seq: number[] = []
  if (kind === 'ARITHMETIC') {
    const step = randomInt(2, difficulty === 'EASY' ? 6 : 12)
    for (let i = 0; i < length; i++) seq.push(start + step * i)
  } else if (kind === 'GEOMETRIC') {
    const ratio = randomInt(2, 3)
    let v = start
    for (let i = 0; i < length; i++) {
      seq.push(v)
      v *= ratio
    }
  } else {
    let a = start
    let b = start + randomInt(1, 5)
    seq.push(a, b)
    for (let i = 2; i < length; i++) {
      const c = a + b
      seq.push(c)
      a = b
      b = c
    }
  }
  return { sequence: seq.slice(0, -1), answer: seq[seq.length - 1]!, kind }
}

/** Number Sequence: user finds the next number in each of N sequences. */
export const numberSequenceEngine: GameEngine = {
  type: 'NUMBER_SEQUENCE',
  async start(_payload, game) {
    const count = game.config?.questionCount ?? 5
    const rounds = Array.from({ length: count }, () => makeSequence(game.difficulty))
    return {
      client: { kind: 'NUMBER_SEQUENCE', rounds: rounds.map((r) => ({ sequence: r.sequence })), secondsPerQuestion: game.config?.secondsPerQuestion ?? 20 },
      server: { kind: 'NUMBER_SEQUENCE', answers: rounds.map((r) => r.answer) },
      maxScore: count,
    }
  },
  async submit(_payload, _game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { answers: number[] }
    const given = (input.payload as { answers?: (number | null)[] })?.answers ?? []
    let score = 0
    const rounds = server.answers.map((ans, i) => {
      const correct = given[i] === ans
      if (correct) score++
      return { index: i, correct }
    })
    return { score, maxScore: server.answers.length, rounds }
  },
}

```

src/games/quiz-core.ts
```typescript
import type { Payload, Where } from 'payload'
import type { Game } from '@/payload-types'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

interface ServerQuestion {
  id: number
  correctIndex: number
  points: number
}

async function pickQuestions(payload: Payload, game: Game) {
  const count = game.config?.questionCount ?? 5
  const diffMap: Record<string, string> = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD', EXPERT: 'HARD' }
  const where: Record<string, { equals: string | boolean }> = { isActive: { equals: true }, difficulty: { equals: diffMap[game.difficulty] ?? 'EASY' } }
  if (game.config?.category) where.category = { equals: game.config.category }

  let pool = await payload.find({ collection: 'quiz-questions', where: where as Where, limit: 200, depth: 0, overrideAccess: true })
  if (pool.docs.length < count) pool = await payload.find({ collection: 'quiz-questions', where: { isActive: { equals: true } }, limit: 200, depth: 0, overrideAccess: true })

  const shuffled = [...pool.docs].sort(() => Math.random() - 0.5).slice(0, count)
  return shuffled.map((q) => {
    const correctIndex = Math.max(0, q.options.findIndex((o) => o.isCorrect))
    return {
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options.map((o) => o.text),
      timeLimitSeconds: q.timeLimitSeconds ?? game.config?.secondsPerQuestion ?? 20,
      points: q.points,
      correctIndex,
    }
  })
}

export const quizEngine: GameEngine = {
  type: 'QUIZ',
  async start(payload, game) {
    const questions = await pickQuestions(payload, game)
    const maxScore = questions.reduce((s, q) => s + q.points, 0)
    return {
      client: { kind: 'QUIZ', questions: questions.map(({ correctIndex: _c, ...rest }) => rest) },
      server: { kind: 'QUIZ', questions: questions.map((q): ServerQuestion => ({ id: q.id, correctIndex: q.correctIndex, points: q.points })) },
      maxScore,
    }
  },
  async submit(_payload, _game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { questions: ServerQuestion[] }
    const answers = (input.payload as { answers?: Record<string, number> })?.answers ?? {}
    let score = 0
    const rounds = server.questions.map((q) => {
      const given = answers[String(q.id)]
      const correct = given === q.correctIndex
      if (correct) score += q.points
      return { id: q.id, given, correct }
    })
    const maxScore = server.questions.reduce((s, q) => s + q.points, 0)
    return { score, maxScore, rounds }
  },
}

```

src/games/reaction-engine.ts
```typescript
import { randomInt } from 'node:crypto'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

/**
 * Reaction: N rounds, each with a server-chosen delay before the "go" signal. The client reports its
 * reaction time per round; we score rounds under a generous ceiling to filter out bot/instant responses.
 */
const MIN_PLAUSIBLE_MS = 120
const MAX_COUNTED_MS = 1500

export const reactionEngine: GameEngine = {
  type: 'REACTION',
  async start(_payload, game) {
    const rounds = game.config?.rounds ?? 5
    const minDelay = game.config?.minDelayMs ?? 1200
    const maxDelay = game.config?.maxDelayMs ?? 4000
    const delays = Array.from({ length: rounds }, () => randomInt(minDelay, maxDelay + 1))
    return {
      client: { kind: 'REACTION', rounds, delaysMs: delays },
      server: { kind: 'REACTION', delaysMs: delays },
      maxScore: rounds,
    }
  },
  async submit(_payload, _game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { delaysMs: number[] }
    const times = (input.payload as { reactionTimesMs?: (number | null)[] })?.reactionTimesMs ?? []
    let score = 0
    const rounds = server.delaysMs.map((_, i) => {
      const t = times[i]
      const valid = typeof t === 'number' && t >= MIN_PLAUSIBLE_MS && t <= MAX_COUNTED_MS
      if (valid) score++
      return { index: i, reactionMs: t ?? null, counted: valid }
    })
    return { score, maxScore: server.delaysMs.length, rounds }
  },
}

```

src/games/registry.ts
```typescript
import type { GameType } from '@/constants'
import type { GameEngine } from './types'
import { quizEngine } from './quiz-core'
import { sudokuEngine } from './sudoku-engine'
import { memoryEngine } from './memory-engine'
import { numberSequenceEngine } from './number-sequence-engine'
import { mathEngine } from './math-engine'
import { reactionEngine } from './reaction-engine'
import { spinWheelEngine } from './spin-wheel-engine'
import { wingoEngine } from './wingo-engine'

export const ENGINES: Record<GameType, GameEngine> = {
  QUIZ: quizEngine,
  SUDOKU: sudokuEngine,
  MEMORY: memoryEngine,
  NUMBER_SEQUENCE: numberSequenceEngine,
  MATH: mathEngine,
  REACTION: reactionEngine,
  SPIN_WHEEL: spinWheelEngine,
  WINGO: wingoEngine,
}
```

src/games/spin-wheel-engine.ts
```typescript
import { randomInt } from 'node:crypto'
import { AppError } from '@/lib/errors'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

interface WheelSegment {
  label: string
  amount: number
  weight: number
  color?: string | null
}

/** Picks an index with probability proportional to each segment's weight, using a CSPRNG. */
function weightedPick(segments: WheelSegment[]): number {
  const total = segments.reduce((s, seg) => s + Math.max(0, seg.weight), 0)
  if (total <= 0) return randomInt(segments.length)
  // Scale to an integer range for randomInt (which requires integer bounds).
  const scale = 1_000_000
  const target = randomInt(Math.round(total * scale))
  let acc = 0
  for (let i = 0; i < segments.length; i++) {
    acc += Math.max(0, segments[i]!.weight) * scale
    if (target < acc) return i
  }
  return segments.length - 1
}

/**
 * A single spin of a prize wheel. There is no player skill/input — the server picks the winning slice at
 * start() time (so the client can animate the wheel precisely to that slice) and credits its amount
 * unconditionally on submit(), bypassing the game's generic score-based reward group entirely.
 */
export const spinWheelEngine: GameEngine = {
  type: 'SPIN_WHEEL',
  async start(_payload, game) {
    const segments = (game.config?.segments ?? []) as WheelSegment[]
    if (segments.length < 2) throw new AppError('NOT_AVAILABLE', 'This wheel is not configured yet.')

    const winningIndex = weightedPick(segments)
    const amount = Math.max(0, segments[winningIndex]!.amount)

    return {
      client: {
        kind: 'SPIN_WHEEL',
        segments: segments.map((s) => ({ label: s.label, color: s.color ?? undefined })),
        winningIndex,
      },
      server: { kind: 'SPIN_WHEEL', winningIndex, amount },
      maxScore: 1,
    }
  },
  async submit(_payload, _game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { winningIndex: number; amount: number }
    const won = server.amount > 0
    return {
      score: won ? 1 : 0,
      maxScore: 1,
      rounds: { winningIndex: server.winningIndex, amount: server.amount },
      rewardOverride: server.amount,
    }
  },
}
```

src/games/sudoku-core.ts
```typescript
import { randomInt } from 'node:crypto'
import type { Difficulty } from '@/constants'

/** Pure Sudoku helpers (no I/O). A grid is a flat array of 81 numbers, 0 = empty. */
export type Grid = number[]

export const CLUES_BY_DIFFICULTY: Record<Difficulty, number> = { EASY: 42, MEDIUM: 35, HARD: 30, EXPERT: 26 }

export function parseGrid(s: string): Grid | null {
  const clean = s.replace(/\s+/g, '')
  if (clean.length !== 81 || !/^[0-9.]{81}$/.test(clean)) return null
  return [...clean].map((c) => (c === '.' ? 0 : Number(c)))
}

export const gridToString = (g: Grid) => g.map((n) => (n === 0 ? '0' : String(n))).join('')

const rowOf = (i: number) => (i / 9) | 0
const colOf = (i: number) => i % 9
const boxOf = (i: number) => ((rowOf(i) / 3) | 0) * 3 + ((colOf(i) / 3) | 0)

/** No digit repeated within any row, column or box (blanks ignored). */
export function isConsistent(g: Grid): boolean {
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)
  for (let i = 0; i < 81; i++) {
    const d = g[i]!
    if (d === 0) continue
    if (d < 1 || d > 9) return false
    const bit = 1 << d
    if (rows[rowOf(i)] & bit || cols[colOf(i)] & bit || boxes[boxOf(i)] & bit) return false
    rows[rowOf(i)] |= bit
    cols[colOf(i)] |= bit
    boxes[boxOf(i)] |= bit
  }
  return true
}

/** Completely filled and consistent. */
export function isValidSolution(g: Grid): boolean {
  return g.length === 81 && g.every((n) => n >= 1 && n <= 9) && isConsistent(g)
}

/** Every non-empty clue in `puzzle` equals the same cell in `solution`. */
export function matchesGivens(puzzle: Grid, solution: Grid): boolean {
  return puzzle.every((n, i) => n === 0 || n === solution[i])
}

const popcount = (n: number) => {
  let c = 0
  while (n) {
    n &= n - 1
    c++
  }
  return c
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

interface SearchOpts {
  limit: number
  randomise?: boolean
}

/** Backtracking solver with minimum-remaining-values heuristic. Returns solution count (capped) and first solution. */
function search(input: Grid, opts: SearchOpts): { count: number; solution: Grid | null } {
  // Guard: if two already-filled cells conflict, the row/col/box bitmasks below would silently
  // collapse the duplicate bit, and the search would proceed as if only one cell were given — it can
  // never detect a given-vs-given conflict on its own. Bail out up front instead.
  if (!isConsistent(input)) return { count: 0, solution: null }

  const g = input.slice()
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)
  for (let i = 0; i < 81; i++) {
    if (g[i]) {
      const bit = 1 << g[i]!
      rows[rowOf(i)] |= bit
      cols[colOf(i)] |= bit
      boxes[boxOf(i)] |= bit
    }
  }
  let count = 0
  let first: Grid | null = null

  const go = () => {
    if (count >= opts.limit) return
    let best = -1
    let bestMask = 0
    let bestN = 10
    for (let i = 0; i < 81; i++) {
      if (g[i] !== 0) continue
      const mask = ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]) & 0x3fe
      const n = popcount(mask)
      if (n === 0) return
      if (n < bestN) {
        best = i
        bestMask = mask
        bestN = n
        if (n === 1) break
      }
    }
    if (best === -1) {
      count++
      if (!first) first = g.slice()
      return
    }
    const digits = opts.randomise ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]) : [1, 2, 3, 4, 5, 6, 7, 8, 9]
    for (const d of digits) {
      if (!(bestMask & (1 << d))) continue
      const bit = 1 << d
      g[best] = d
      rows[rowOf(best)] |= bit
      cols[colOf(best)] |= bit
      boxes[boxOf(best)] |= bit
      go()
      g[best] = 0
      rows[rowOf(best)] &= ~bit
      cols[colOf(best)] &= ~bit
      boxes[boxOf(best)] &= ~bit
      if (count >= opts.limit) return
    }
  }
  go()
  return { count, solution: first }
}

export const countSolutions = (g: Grid, limit = 2) => search(g, { limit }).count

export function solve(g: Grid): Grid | null {
  return search(g, { limit: 1 }).solution
}

/** Generate a puzzle with a unique solution. Falls back to a slightly easier puzzle if the time budget is hit. */
export function generatePuzzle(difficulty: Difficulty, budgetMs = 2500): { puzzle: Grid; solution: Grid } {
  const solution = search(new Array(81).fill(0), { limit: 1, randomise: true }).solution!
  const puzzle = solution.slice()
  const target = CLUES_BY_DIFFICULTY[difficulty]
  const deadline = Date.now() + budgetMs
  let clues = 81
  for (const idx of shuffle([...Array(81).keys()])) {
    if (clues <= target || Date.now() > deadline) break
    const keep = puzzle[idx]!
    puzzle[idx] = 0
    if (countSolutions(puzzle, 2) !== 1) puzzle[idx] = keep
    else clues--
  }
  return { puzzle, solution }
}

```

src/games/sudoku-engine.ts
```typescript
import type { GameEngine, SubmitInput, SubmitResult } from './types'
import { generatePuzzle, gridToString, matchesGivens, parseGrid } from './sudoku-core'
import { AppError } from '@/lib/errors'

export const sudokuEngine: GameEngine = {
  type: 'SUDOKU',
  async start(payload, game) {
    const source = game.config?.sudokuSource ?? 'CMS_THEN_GENERATED'
    let puzzle: number[] | null = null
    let solution: number[] | null = null

    if (source !== 'GENERATED') {
      const res = await payload.find({ collection: 'sudoku-puzzles', where: { difficulty: { equals: game.difficulty }, isActive: { equals: true } }, limit: 50, depth: 0, overrideAccess: true })
      if (res.docs.length) {
        const pick = res.docs[Math.floor(Math.random() * res.docs.length)]!
        puzzle = parseGrid(pick.puzzle)
        solution = parseGrid(pick.solution)
      }
    }
    if (!puzzle || !solution) {
      if (source === 'CMS_ONLY') throw new AppError('NOT_AVAILABLE', 'No puzzles are available for this difficulty right now.')
      const gen = generatePuzzle(game.difficulty)
      puzzle = gen.puzzle
      solution = gen.solution
    }
    const clueCount = puzzle.filter((n) => n !== 0).length
    const maxScore = 81 - clueCount
    return {
      client: { kind: 'SUDOKU', puzzle: gridToString(puzzle), difficulty: game.difficulty },
      server: { kind: 'SUDOKU', puzzle, solution },
      maxScore,
    }
  },
  async submit(_payload, game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { puzzle: number[]; solution: number[] }
    const given = (input.payload as { grid?: string })?.grid
    const grid = given ? parseGrid(given) : null
    const minSolveSeconds = game.config?.minSolveSeconds ?? 20
    const maxScore = 81 - server.puzzle.filter((n: number) => n !== 0).length

    if (!grid) return { score: 0, maxScore, rounds: null, rejectionReason: 'Malformed submission.' }
    if (input.elapsedSeconds < minSolveSeconds) return { score: 0, maxScore, rounds: null, rejectionReason: 'Submitted implausibly fast.' }
    if (!matchesGivens(server.puzzle, grid)) return { score: 0, maxScore, rounds: null, rejectionReason: 'Given clues were modified.' }

    const blanks = server.puzzle.filter((n) => n === 0).length
    const solvedCells = server.puzzle.reduce((acc, v, i) => acc + (v === 0 && grid[i] === server.solution[i] ? 1 : 0), 0)
    return { score: solvedCells, maxScore: blanks, rounds: { solvedCells, totalBlanks: blanks } }
  },
}

```

src/games/types.ts
```typescript
import type { Payload } from 'payload'
import type { Game } from '@/payload-types'

/** Data sent to the client when a session starts. Must never leak answers/solutions. */
export interface ClientSessionState {
  kind: string
  [key: string]: unknown
}

/** Server-only state persisted in GameSessions.serverState. Holds answers/solutions. */
export interface ServerSessionState {
  kind: string
  [key: string]: unknown
}

export interface StartResult {
  client: ClientSessionState
  server: ServerSessionState
  maxScore: number
}

export interface SubmitInput {
  server: ServerSessionState
  /** Client-provided answers/actions. Never trusted for scoring directly — engines re-derive correctness from `server`. */
  payload: unknown
  elapsedSeconds: number
}

export interface SubmitResult {
  score: number
  maxScore: number
  rounds: unknown
  rejectionReason?: string
  /**
   * For games where the reward isn't a function of score (e.g. a prize wheel), the engine can supply the
   * exact minor-unit amount to credit directly. When set, GameService credits this instead of computing a
   * reward from the game's generic reward group. Daily rewarded-play caps still apply.
   */
  rewardOverride?: number
}

export interface GameEngine {
  type: string
  start(payload: Payload, game: Game): Promise<StartResult>
  submit(payload: Payload, game: Game, input: SubmitInput): Promise<SubmitResult>
}
```

src/games/wingo-engine.ts
```typescript
import { randomInt } from 'node:crypto'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

type WingoColor = 'red' | 'green' | 'violet'
type WingoSize = 'big' | 'small'
type WingoBetType = 'NUMBER' | 'COLOR' | 'SIZE'

type WingoBet =
  | { type: 'NUMBER'; value: number }
  | { type: 'COLOR'; value: WingoColor }
  | { type: 'SIZE'; value: WingoSize }

interface WingoClientState {
  kind: 'WINGO'
  numbers: number[]
  colors: Array<{ value: WingoColor; label: string; multiplier: number }>
  sizes: Array<{ value: WingoSize; label: string; multiplier: number }>
  baseReward: number
}

interface WingoServerState {
  kind: 'WINGO'
  winningNumber: number
  baseReward: number
}

function getMultiplierForColor(value: WingoColor, winningNumber: number): number | null {
  if (value === 'red') {
    if (winningNumber === 0) return 1.5
    if ([2, 4, 6, 8].includes(winningNumber)) return 2
    return null
  }

  if (value === 'green') {
    if (winningNumber === 5) return 1.5
    if ([1, 3, 7, 9].includes(winningNumber)) return 2
    return null
  }

  if (value === 'violet') {
    if ([0, 5].includes(winningNumber)) return 4.5
    return null
  }

  return null
}

function getMultiplierForSize(value: WingoSize, winningNumber: number): number | null {
  if (value === 'big' && winningNumber >= 5) return 2
  if (value === 'small' && winningNumber <= 4) return 2
  return null
}

function parseBet(payload: unknown): WingoBet | null {
  const bet = payload as { type?: string; value?: string | number | null } | undefined
  if (!bet || typeof bet.type !== 'string') return null

  if (bet.type === 'NUMBER') {
    const value = typeof bet.value === 'number' ? bet.value : Number(bet.value)
    if (!Number.isInteger(value) || value < 0 || value > 9) return null
    return { type: 'NUMBER', value }
  }

  if (bet.type === 'COLOR') {
    const value = String(bet.value ?? '').toLowerCase()
    if (value === 'red' || value === 'green' || value === 'violet') {
      return { type: 'COLOR', value }
    }
    return null
  }

  if (bet.type === 'SIZE') {
    const value = String(bet.value ?? '').toLowerCase()
    if (value === 'big' || value === 'small') {
      return { type: 'SIZE', value }
    }
    return null
  }

  return null
}

export const wingoEngine: GameEngine = {
  type: 'WINGO',
  async start(_payload, game) {
    const baseReward = Number(game.reward?.amount ?? 100)
    const winningNumber = randomInt(10)

    return {
      client: {
        kind: 'WINGO',
        numbers: Array.from({ length: 10 }, (_, index) => index),
        colors: [
          { value: 'red', label: 'Red', multiplier: 2 },
          { value: 'green', label: 'Green', multiplier: 2 },
          { value: 'violet', label: 'Violet', multiplier: 4.5 },
        ],
        sizes: [
          { value: 'big', label: 'Big', multiplier: 2 },
          { value: 'small', label: 'Small', multiplier: 2 },
        ],
        baseReward,
      } satisfies WingoClientState,
      server: {
        kind: 'WINGO',
        winningNumber,
        baseReward,
      } satisfies WingoServerState,
      maxScore: 1,
    }
  },
  async submit(_payload, game, input: SubmitInput): Promise<SubmitResult> {
    const server = input.server as unknown as WingoServerState
    const bet = parseBet(input.payload)
    const baseReward = Number(game.reward?.amount ?? server.baseReward ?? 100)

    if (!bet) {
      return {
        score: 0,
        maxScore: 1,
        rounds: { winningNumber: server.winningNumber, bet: input.payload ?? null },
        rejectionReason: 'Choose a valid number, color, or big/small bet.',
      }
    }

    let multiplier: number | null = null
    if (bet.type === 'NUMBER') {
      multiplier = bet.value === server.winningNumber ? 9 : null
    }
    if (bet.type === 'COLOR') {
      multiplier = getMultiplierForColor(bet.value, server.winningNumber)
    }
    if (bet.type === 'SIZE') {
      multiplier = getMultiplierForSize(bet.value, server.winningNumber)
    }

    const won = multiplier !== null
    const rewardOverride = won && multiplier !== null ? Math.round(baseReward * multiplier) : 0

    return {
      score: won ? 1 : 0,
      maxScore: 1,
      rounds: {
        bet,
        winningNumber: server.winningNumber,
        won,
        multiplier,
      },
      rewardOverride,
    }
  },
}

```

src/globals/index.ts
```typescript
import type { GlobalConfig } from 'payload'
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE, REFERRAL_QUALIFICATIONS, toOptions } from '@/constants'
import { allow } from '@/access'
import { auditGlobalHook } from '@/hooks/audit'
import { invalidateGlobalCache } from '@/hooks/cache'
import { isValidTimezone } from '@/lib/time'
import { moneyField } from '@/utilities/fields'

const hooks = (slug: string) => ({ afterChange: [auditGlobalHook(slug), invalidateGlobalCache('settings')] })

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: { group: 'Settings' },
  access: { read: allow('ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT', 'FINANCE_ADMIN'), update: allow('ADMIN') },
  hooks: hooks('site-settings'),
  fields: [
    { name: 'appName', type: 'text', required: true, defaultValue: 'Rewards' },
    { name: 'tagline', type: 'text', defaultValue: 'Play, complete tasks and earn.' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'favicon', type: 'upload', relationTo: 'media' },
    { name: 'supportEmail', type: 'email' },
    { name: 'supportPhone', type: 'text' },
    { name: 'supportUrl', type: 'text' },
    {
      name: 'defaultTimezone',
      type: 'text',
      required: true,
      defaultValue: DEFAULT_TIMEZONE,
      validate: (v: unknown) => (typeof v === 'string' && isValidTimezone(v)) || 'Use a valid IANA timezone, e.g. Asia/Kolkata',
      admin: { description: 'Used for daily limits/resets and for users who have not chosen a timezone.' },
    },
    { name: 'currency', type: 'select', required: true, defaultValue: DEFAULT_CURRENCY, options: [{ label: 'Indian Rupee (INR)', value: 'INR' }], admin: { description: 'Amounts are stored in minor units (paise).' } },
  ],
}

export const RewardSettings: GlobalConfig = {
  slug: 'reward-settings',
  label: 'Reward settings',
  admin: { group: 'Settings' },
  access: { read: allow('ADMIN', 'FINANCE_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT'), update: allow('FINANCE_ADMIN', 'ADMIN') },
  hooks: hooks('reward-settings'),
  fields: [
    {
      type: 'collapsible',
      label: 'Withdrawals',
      fields: [
        moneyField('minimumWithdrawal', { required: true, min: 1, defaultValue: 10000 }),
        moneyField('maximumWithdrawal', { required: true, min: 1, defaultValue: 1000000 }),
        moneyField('dailyWithdrawalLimit', { required: true, min: 1, defaultValue: 2500000, admin: { description: 'Total a user may request per day (site timezone).' } }),
        { name: 'maxOpenWithdrawals', type: 'number', min: 1, defaultValue: 1, required: true, admin: { description: 'Requests a user may have in progress at once.' } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Referral defaults',
      fields: [
        moneyField('defaultReferralReward', { defaultValue: 1000, admin: { description: 'Used when no active Referral rule exists.' } }),
        { name: 'defaultReferralQualification', type: 'select', defaultValue: 'FIRST_TASK', options: toOptions(REFERRAL_QUALIFICATIONS) },
        moneyField('defaultReferralQualificationAmount', { admin: { description: 'Only used with "Amount earned".' } }),
        { name: 'defaultReferralPerReferrerLimit', type: 'number', min: 0, defaultValue: 50 },
      ],
    },
    {
      type: 'collapsible',
      label: 'Game defaults',
      fields: [moneyField('defaultGameReward', { defaultValue: 50, admin: { description: 'Suggested reward when creating a new game.' } })],
    },
  ],
}

export const FeatureSettings: GlobalConfig = {
  slug: 'feature-settings',
  label: 'Feature settings',
  admin: { group: 'Settings', description: 'Turn platform features on or off instantly.' },
  access: { read: allow('ADMIN', 'FINANCE_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT'), update: allow('ADMIN') },
  hooks: hooks('feature-settings'),
  fields: [
    { name: 'gamesEnabled', type: 'checkbox', defaultValue: true },
    { name: 'tasksEnabled', type: 'checkbox', defaultValue: true },
    { name: 'campaignsEnabled', type: 'checkbox', defaultValue: true },
    { name: 'referralsEnabled', type: 'checkbox', defaultValue: true },
    { name: 'withdrawalsEnabled', type: 'checkbox', defaultValue: true },
    { name: 'registrationEnabled', type: 'checkbox', defaultValue: true },
    { name: 'maintenanceMode', type: 'checkbox', defaultValue: false, admin: { description: 'Shows a maintenance page to users. Admin panel stays available.' } },
    { name: 'maintenanceMessage', type: 'textarea', defaultValue: 'We are making improvements and will be back shortly.' },
  ],
}

export const LegalSettings: GlobalConfig = {
  slug: 'legal-settings',
  label: 'Legal',
  admin: { group: 'Settings' },
  access: { read: allow('ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT', 'FINANCE_ADMIN'), update: allow('ADMIN', 'CONTENT_MANAGER') },
  hooks: hooks('legal-settings'),
  fields: [
    { name: 'terms', type: 'richText', label: 'Terms & conditions' },
    { name: 'privacyPolicy', type: 'richText' },
    { name: 'refundPolicy', type: 'richText' },
    { name: 'responsibleUse', type: 'richText', label: 'Responsible use policy' },
  ],
}

```

src/hooks/audit.ts
```typescript
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'
import type { AuditAction } from '@/constants'
import { diffDocs, snapshot } from '@/utilities/diff'

interface AuditHookConfig {
  created?: AuditAction
  updated?: AuditAction
  deleted?: AuditAction
}

/**
 * Records admin-initiated create/update/delete of a collection document. Changes made by services
 * (end-user actions) are audited explicitly by those services, so we only act when an admin is on the request.
 */
export const auditCollectionHooks = (slug: string, cfg: AuditHookConfig) => {
  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
    if ((req.user as { collection?: string } | null)?.collection !== 'admins') return doc
    if (req.context?.skipAudit) return doc
    const { logAudit } = await import('@/services/audit')
    if (operation === 'create') {
      await logAudit({ payload: req.payload, req, action: cfg.created ?? 'OTHER', collection: slug, documentId: doc.id, after: snapshot(doc) })
    } else {
      const diff = diffDocs(previousDoc, doc)
      if (Object.keys(diff.after).length === 0) return doc
      await logAudit({ payload: req.payload, req, action: cfg.updated ?? 'OTHER', collection: slug, documentId: doc.id, ...diff })
    }
    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    if ((req.user as { collection?: string } | null)?.collection !== 'admins') return doc
    const { logAudit } = await import('@/services/audit')
    await logAudit({ payload: req.payload, req, action: cfg.deleted ?? 'OTHER', collection: slug, documentId: doc.id, before: snapshot(doc) })
    return doc
  }

  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}

export const auditGlobalHook = (slug: string): GlobalAfterChangeHook => async ({ doc, previousDoc, req }) => {
  const { logAudit } = await import('@/services/audit')
  const diff = diffDocs(previousDoc, doc)
  if (Object.keys(diff.after).length === 0) return doc
  await logAudit({ payload: req.payload, req, action: 'SETTINGS_UPDATED', collection: slug, documentId: slug, ...diff })
  return doc
}

```

src/hooks/cache.ts
```typescript
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/** Drop cached public content whenever an editor changes it in the admin panel. */
export const invalidateCollectionCache = (...prefixes: string[]) => {
  const afterChange: CollectionAfterChangeHook = async ({ doc }) => {
    const { invalidateCache } = await import('@/lib/cache')
    await invalidateCache(...prefixes)
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
    const { invalidateCache } = await import('@/lib/cache')
    await invalidateCache(...prefixes)
    return doc
  }
  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}

export const invalidateGlobalCache = (...prefixes: string[]): GlobalAfterChangeHook => async ({ doc }) => {
  const { invalidateCache } = await import('@/lib/cache')
  await invalidateCache(...prefixes)
  return doc
}

```

src/hooks/immutable.ts
```typescript
import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook } from 'payload'
import { APIError } from 'payload'

/**
 * Append-only guard used by the ledger and audit log. Works even with `overrideAccess: true`, so no code path
 * (other than raw SQL, which the DB triggers in scripts/apply-db-guards.ts also block) can rewrite history.
 */
export const immutableRecord = (label: string, opts: { requireContextFlag?: string } = {}) => {
  const beforeChange: CollectionBeforeChangeHook = ({ operation, data, req }) => {
    if (operation === 'update') throw new APIError(`${label} records are immutable and cannot be modified.`, 403)
    if (opts.requireContextFlag && !req.context?.[opts.requireContextFlag]) {
      throw new APIError(`${label} records can only be created by the platform services.`, 403)
    }
    return data
  }
  const beforeDelete: CollectionBeforeDeleteHook = () => {
    throw new APIError(`${label} records are immutable and cannot be deleted.`, 403)
  }
  return { beforeChange: [beforeChange], beforeDelete: [beforeDelete] }
}

```

src/lib/__tests__/crypto.test.ts
```typescript
import { beforeAll, describe, expect, it } from 'vitest'
import { decrypt, encrypt, maskTail, maskUpi, randomCode, safeEqual, sha256 } from '../crypto'

beforeAll(() => {
  process.env.DATA_ENCRYPTION_KEY = '0'.repeat(63) + '1' // 64 hex chars, deterministic for tests
})

describe('encrypt / decrypt', () => {
  it('round-trips a plaintext value', () => {
    const plain = JSON.stringify({ upiId: 'someone@bank' })
    const cipher = encrypt(plain)
    expect(cipher.startsWith('v1.')).toBe(true)
    expect(decrypt(cipher)).toBe(plain)
  })
  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const a = encrypt('hello')
    const b = encrypt('hello')
    expect(a).not.toBe(b)
  })
  it('rejects a tampered ciphertext', () => {
    const cipher = encrypt('secret value')
    const parts = cipher.split('.')
    parts[3] = parts[3]!.slice(0, -2) + (parts[3]!.slice(-2) === 'AA' ? 'BB' : 'AA')
    expect(() => decrypt(parts.join('.'))).toThrow()
  })
})

describe('sha256 / safeEqual', () => {
  it('is deterministic', () => {
    expect(sha256('abc')).toBe(sha256('abc'))
    expect(sha256('abc')).not.toBe(sha256('abd'))
  })
  it('safeEqual compares strings correctly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'ab')).toBe(false)
  })
})

describe('randomCode', () => {
  it('avoids ambiguous characters and respects length', () => {
    for (let i = 0; i < 50; i++) {
      const code = randomCode(8)
      expect(code).toHaveLength(8)
      expect(code).not.toMatch(/[0O1I]/)
    }
  })
})

describe('masking helpers', () => {
  it('maskTail keeps only the last few characters', () => {
    expect(maskTail('123456789012', 4)).toBe('********9012')
  })
  it('maskUpi partially hides the handle name', () => {
    const masked = maskUpi('johndoe@okbank')
    expect(masked.endsWith('@okbank')).toBe(true)
    expect(masked.startsWith('jo')).toBe(true)
    expect(masked).not.toContain('hndoe')
  })
})

```

src/lib/__tests__/errors.test.ts
```typescript
import { describe, expect, it } from 'vitest'
import { AppError, isAppError } from '../errors'

describe('AppError', () => {
  it('maps codes to the right HTTP status', () => {
    expect(new AppError('NOT_FOUND', 'x').status).toBe(404)
    expect(new AppError('INSUFFICIENT_FUNDS', 'x').status).toBe(409)
    expect(new AppError('RATE_LIMITED', 'x').status).toBe(429)
    expect(new AppError('UNAUTHENTICATED', 'x').status).toBe(401)
    expect(new AppError('FORBIDDEN', 'x').status).toBe(403)
  })
  it('carries details and retryAfterSeconds', () => {
    const err = new AppError('RATE_LIMITED', 'slow down', { retryAfterSeconds: 30, details: { limit: 5 } })
    expect(err.retryAfterSeconds).toBe(30)
    expect(err.details).toEqual({ limit: 5 })
  })
  it('is recognised by isAppError, unlike a plain Error', () => {
    expect(isAppError(new AppError('BAD_REQUEST', 'x'))).toBe(true)
    expect(isAppError(new Error('x'))).toBe(false)
    expect(isAppError('x')).toBe(false)
  })
})

```

src/lib/__tests__/money.test.ts
```typescript
import { describe, expect, it } from 'vitest'
import { assertMinor, assertPositiveMinor, formatMoney, minorToDecimalString, mulDivFloor, parseMajorToMinor } from '../money'
import { AppError } from '../errors'

describe('parseMajorToMinor', () => {
  it('parses whole rupees', () => {
    expect(parseMajorToMinor('100')).toBe(10000)
  })
  it('parses two decimal places', () => {
    expect(parseMajorToMinor('25.50')).toBe(2550)
    expect(parseMajorToMinor('0.05')).toBe(5)
  })
  it('pads a single decimal place', () => {
    expect(parseMajorToMinor('10.5')).toBe(1050)
  })
  it('rejects more than two decimal places', () => {
    expect(() => parseMajorToMinor('10.505')).toThrow(AppError)
  })
  it('rejects negative and malformed input', () => {
    expect(() => parseMajorToMinor('-10')).toThrow(AppError)
    expect(() => parseMajorToMinor('abc')).toThrow(AppError)
    expect(() => parseMajorToMinor('')).toThrow(AppError)
  })
})

describe('minorToDecimalString', () => {
  it('round-trips against parseMajorToMinor', () => {
    for (const s of ['0.00', '1.00', '25.50', '999999.99']) {
      expect(minorToDecimalString(parseMajorToMinor(s))).toBe(s)
    }
  })
  it('handles negative amounts', () => {
    expect(minorToDecimalString(-2550)).toBe('-25.50')
  })
  it('pads fractional paise', () => {
    expect(minorToDecimalString(5)).toBe('0.05')
  })
})

describe('formatMoney', () => {
  it('formats INR with grouping and symbol', () => {
    expect(formatMoney(150000)).toBe('₹1,500.00')
  })
  it('shows a plus sign for signed positive amounts when requested', () => {
    expect(formatMoney(500, 'INR', { signed: true })).toBe('+₹5.00')
  })
  it('shows a minus sign for negative amounts', () => {
    expect(formatMoney(-500)).toBe('−₹5.00')
  })
})

describe('mulDivFloor', () => {
  it('computes proportional rewards without floats', () => {
    expect(mulDivFloor(100, 60, 100)).toBe(60)
    expect(mulDivFloor(99, 1, 3)).toBe(33)
    expect(mulDivFloor(10, 1, 3)).toBe(3) // floors, never rounds up
  })
  it('throws on division by zero', () => {
    expect(() => mulDivFloor(10, 1, 0)).toThrow(AppError)
  })
})

describe('assertMinor / assertPositiveMinor', () => {
  it('accepts safe integers', () => {
    expect(() => assertMinor(100)).not.toThrow()
  })
  it('rejects floats, NaN and non-numbers', () => {
    expect(() => assertMinor(1.5)).toThrow(AppError)
    expect(() => assertMinor(Number.NaN)).toThrow(AppError)
    expect(() => assertMinor('100')).toThrow(AppError)
  })
  it('assertPositiveMinor rejects zero and negative', () => {
    expect(() => assertPositiveMinor(0)).toThrow(AppError)
    expect(() => assertPositiveMinor(-1)).toThrow(AppError)
    expect(() => assertPositiveMinor(1)).not.toThrow()
  })
})

```

src/lib/__tests__/time.test.ts
```typescript
import { describe, expect, it } from 'vitest'
import { addDays, dayBounds, formatDuration, inWindow, isValidTimezone, safeTimezone, startOfDayInTz } from '../time'

describe('isValidTimezone / safeTimezone', () => {
  it('accepts a real IANA zone', () => {
    expect(isValidTimezone('Asia/Kolkata')).toBe(true)
  })
  it('rejects garbage', () => {
    expect(isValidTimezone('Not/AZone')).toBe(false)
  })
  it('falls back to the default for missing/invalid input', () => {
    expect(safeTimezone(undefined)).toBe('Asia/Kolkata')
    expect(safeTimezone('nonsense')).toBe('Asia/Kolkata')
    expect(safeTimezone('Europe/London')).toBe('Europe/London')
  })
})

describe('startOfDayInTz', () => {
  it('returns local midnight as a UTC instant for IST (UTC+5:30)', () => {
    // 2025-06-15T10:00:00Z is 2025-06-15T15:30 IST -> local midnight was 2025-06-14T18:30:00Z
    const d = new Date('2025-06-15T10:00:00Z')
    const start = startOfDayInTz(d, 'Asia/Kolkata')
    expect(start.toISOString()).toBe('2025-06-14T18:30:00.000Z')
  })
  it('matches UTC midnight for the UTC zone', () => {
    const d = new Date('2025-06-15T10:00:00Z')
    const start = startOfDayInTz(d, 'UTC')
    expect(start.toISOString()).toBe('2025-06-15T00:00:00.000Z')
  })
})

describe('dayBounds', () => {
  it('produces a 24 hour [start, end) window', () => {
    const { start, end } = dayBounds(new Date('2025-06-15T10:00:00Z'), 'Asia/Kolkata')
    expect(end.getTime() - start.getTime()).toBe(24 * 3_600_000)
  })
})

describe('addDays', () => {
  it('adds whole days', () => {
    const d = new Date('2025-01-01T00:00:00Z')
    expect(addDays(d, 5).toISOString()).toBe('2025-01-06T00:00:00.000Z')
    expect(addDays(d, -1).toISOString()).toBe('2024-12-31T00:00:00.000Z')
  })
})

describe('inWindow', () => {
  const now = new Date('2025-06-15T12:00:00Z')
  it('is true with no bounds', () => {
    expect(inWindow(now)).toBe(true)
  })
  it('respects a start bound', () => {
    expect(inWindow(now, '2025-06-16T00:00:00Z')).toBe(false)
    expect(inWindow(now, '2025-06-01T00:00:00Z')).toBe(true)
  })
  it('respects an end bound (exclusive)', () => {
    expect(inWindow(now, undefined, '2025-06-15T12:00:00Z')).toBe(false)
    expect(inWindow(now, undefined, '2025-06-15T12:00:01Z')).toBe(true)
  })
})

describe('formatDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(125)).toBe('2m 05s')
    expect(formatDuration(3725)).toBe('1h 2m')
  })
})

```

src/lib/api-client.ts
```typescript
'use client'

export class ApiError extends Error {
  code: string
  status: number
  details?: Record<string, unknown>
  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
    cache: 'no-store',
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.ok) {
    const err = json?.error ?? { code: 'INTERNAL', message: 'Something went wrong. Please try again.' }
    throw new ApiError(err.code, err.message, res.status, err.details)
  }
  return json.data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

```

src/lib/api/handler.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import type { PayloadRequest } from 'payload'
import { getUserPayloadClient } from '@/lib/payload'
import { AppError, isAppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import type { User } from '@/payload-types'

export interface ApiContext {
  payload: Awaited<ReturnType<typeof getUserPayloadClient>>
  req: PayloadRequest
  user: User | null
  headers: Headers
}

function fail(err: unknown) {
  if (isAppError(err)) {
    return NextResponse.json({ ok: false, error: { code: err.code, message: err.message, details: err.details } }, { status: err.status, headers: err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined })
  }
  console.error('[api] unhandled error:', err)
  return NextResponse.json({ ok: false, error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } }, { status: 500 })
}

/** Wraps a route handler with a Payload req/user, global rate limiting, and consistent error shaping. */
export function withApi<Ctx = unknown>(
  fn: (ctx: ApiContext, req: NextRequest, routeCtx: Ctx) => Promise<NextResponse>,
  opts: { requireAuth?: boolean } = { requireAuth: true },
) {
  return async (req: NextRequest, routeCtx: Ctx): Promise<NextResponse> => {
    try {
      console.time('[withApi] TOTAL')

      console.time('[withApi] getPayloadClient')
      const payload = await getUserPayloadClient()
      console.timeEnd('[withApi] getPayloadClient')

      console.time('[withApi] payload.auth')
      const { user } = await payload.auth({ headers: req.headers })
      console.timeEnd('[withApi] payload.auth')

      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        '0.0.0.0'

      console.time('[withApi] rateLimit')
      await enforceRateLimit(LIMITS.api, ip)
      console.timeEnd('[withApi] rateLimit')

      console.time('[withApi] auth checks')

      if (opts.requireAuth) {
        if (
          !user ||
          (user as { collection?: string }).collection !== 'users'
        ) {
          throw new AppError(
            'UNAUTHENTICATED',
            'Please sign in to continue.',
          )
        }

        const status = (user as unknown as User).status

        if (status === 'BLOCKED' || status === 'DELETED') {
          throw new AppError(
            'ACCOUNT_RESTRICTED',
            'This account cannot sign in.',
          )
        }
      }

      console.timeEnd('[withApi] auth checks')

      const payloadReq = {
        user,
        headers: req.headers,
        payload,
      } as unknown as PayloadRequest

      console.time('[withApi] handler')
      const response = await fn(
        {
          payload,
          req: payloadReq,
          user: (user as unknown as User) ?? null,
          headers: req.headers,
        },
        req,
        routeCtx,
      )
      console.timeEnd('[withApi] handler')

      console.timeEnd('[withApi] TOTAL')

      return response
    } catch (err) {
      console.timeEnd('[withApi] TOTAL')
      return fail(err)
    }
  }
}

export const ok = (data: unknown, init?: number) => NextResponse.json({ ok: true, data }, { status: init ?? 200 })

```

src/lib/cache.ts
```typescript
import { safeKv } from './redis'

const CACHE_PREFIX = 'cache:'

/**
 * Read-through JSON cache backed by Redis. On a Redis failure the loader result is returned uncached.
 * Only ever cache derived/public data — never balances.
 */
export async function cached<T>(name: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const key = `${CACHE_PREFIX}${name}`
  const hit = await safeKv('cache.get', (k) => k.get(key), null)
  if (hit !== null) {
    try {
      return JSON.parse(hit) as T
    } catch {
      /* fall through to reload */
    }
  }
  const value = await loader()
  await safeKv('cache.set', (k) => k.set(key, JSON.stringify(value), { px: ttlSeconds * 1000 }), false)
  return value
}

export async function invalidateCache(...prefixes: string[]) {
  for (const p of prefixes) {
    await safeKv('cache.invalidate', (k) => k.deleteByPrefix(`${CACHE_PREFIX}${p}`), undefined)
  }
}

export const CACHE = {
  settings: 'settings',
  banners: 'banners',
  campaigns: 'campaigns',
  games: 'games',
  announcements: 'announcements',
  tasks: 'tasks',
} as const

```

src/lib/cn.ts
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

src/lib/crypto.ts
```typescript
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const key = () => {
  const hex = process.env.DATA_ENCRYPTION_KEY
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('DATA_ENCRYPTION_KEY must be 64 hex chars')
  return Buffer.from(hex, 'hex')
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.')
}

export function decrypt(payload: string): string {
  const [v, iv, tag, data] = payload.split('.')
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported ciphertext format')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
export function randomCode(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return out
}

export function maskTail(value: string, visible = 4): string {
  if (value.length <= visible) return '*'.repeat(value.length)
  return '*'.repeat(Math.max(4, value.length - visible)) + value.slice(-visible)
}

export function maskUpi(upi: string): string {
  const [name = '', handle = ''] = upi.split('@')
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${handle}`
}

```

src/lib/db.ts
```typescript
import { sql } from 'drizzle-orm'
import { createLocalReq, commitTransaction, initTransaction, killTransaction, type Payload, type PayloadRequest } from 'payload'

/**
 * Returns the drizzle handle bound to the request's open transaction (or the pool when there is none).
 * This is what lets us run raw SQL (advisory locks, aggregates) inside the same transaction Payload uses.
 */
export async function getDb(payload: Payload, req?: Partial<PayloadRequest>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = payload.db as any
  const id = req?.transactionID ? await req.transactionID : undefined
  return (id && adapter.sessions?.[id]?.db) || adapter.drizzle
}

/**
 * Transaction-scoped advisory lock keyed by an arbitrary string. Released automatically at COMMIT/ROLLBACK.
 * Used to serialise all mutations of a single wallet (or a single campaign) at the database level.
 */
export async function advisoryXactLock(payload: Payload, req: Partial<PayloadRequest>, key: string) {
  const db = await getDb(payload, req)
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`)
}

/**
 * Runs `fn` inside a database transaction. If `existing` already carries a transaction (e.g. we are inside
 * a Payload hook) the work joins it, so a hook + service call commit or roll back together.
 */
export async function withTransaction<T>(
  payload: Payload,
  existing: Partial<PayloadRequest> | undefined | null,
  fn: (req: PayloadRequest) => Promise<T>,
): Promise<T> {
  if (existing?.transactionID) return fn(existing as PayloadRequest)
  const req = await createLocalReq({}, payload)
  const owns = await initTransaction(req)
  try {
    const result = await fn(req)
    if (owns) await commitTransaction(req)
    return result
  } catch (err) {
    if (owns) await killTransaction(req)
    throw err
  }
}

export async function rawQuery<T = Record<string, unknown>>(payload: Payload, query: ReturnType<typeof sql>, req?: Partial<PayloadRequest>): Promise<T[]> {
  const db = await getDb(payload, req)
  const res = await db.execute(query)
  return (res.rows ?? res) as T[]
}

export { sql }

```

src/lib/env.ts
```typescript
import { z } from 'zod'

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PAYLOAD_SECRET: z.string().min(16, 'PAYLOAD_SECRET must be at least 16 characters'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  REDIS_URL: z.string().optional(),
  DATA_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'DATA_ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
  CRON_SECRET: z.string().optional(),
  REQUIRE_EMAIL_VERIFICATION: bool,
  DB_PUSH: bool,
  PAYOUT_PROVIDER: z.string().default('manual'),
})

export type Env = z.infer<typeof schema>

let cached: Env | undefined

/** Validated server environment. Throws a readable error when something required is missing. */
export function env(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${msg}`)
  }
  if (parsed.data.NODE_ENV === 'production') {
    const problems: string[] = []
    if (!parsed.data.REDIS_URL) problems.push('REDIS_URL is required in production')
    if (/^0+$/.test(parsed.data.DATA_ENCRYPTION_KEY)) problems.push('DATA_ENCRYPTION_KEY must not be the example value')
    if (parsed.data.PAYLOAD_SECRET.startsWith('change-me')) problems.push('PAYLOAD_SECRET must not be the example value')
    if (!parsed.data.CRON_SECRET || parsed.data.CRON_SECRET.startsWith('change-me')) problems.push('CRON_SECRET must be set')
    if (problems.length) throw new Error(`Unsafe production configuration:\n  - ${problems.join('\n  - ')}`)
  }
  cached = parsed.data
  return cached
}

export const isProd = () => process.env.NODE_ENV === 'production'

```

src/lib/errors.ts
```typescript
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'ACCOUNT_RESTRICTED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'LIMIT_REACHED'
  | 'NOT_ELIGIBLE'
  | 'NOT_AVAILABLE'
  | 'COOLDOWN'
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_STATE'
  | 'FEATURE_DISABLED'
  | 'LOCKED'
  | 'INTERNAL'

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  ACCOUNT_RESTRICTED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  LIMIT_REACHED: 409,
  NOT_ELIGIBLE: 403,
  NOT_AVAILABLE: 409,
  COOLDOWN: 429,
  INSUFFICIENT_FUNDS: 409,
  INVALID_STATE: 409,
  FEATURE_DISABLED: 503,
  LOCKED: 423,
  INTERNAL: 500,
}

/** Expected, user-presentable error. Anything else is treated as an internal failure. */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: Record<string, unknown>
  readonly retryAfterSeconds?: number

  constructor(code: ErrorCode, message: string, opts: { details?: Record<string, unknown>; retryAfterSeconds?: number } = {}) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS[code]
    this.details = opts.details
    this.retryAfterSeconds = opts.retryAfterSeconds
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError

```

src/lib/format.ts
```typescript
export function money(paise: number): string {
  const sign = paise < 0 ? '−' : ''
  const abs = Math.abs(paise)
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return `${sign}₹${whole.toLocaleString('en-IN')}.${frac}`
}

export function moneyCompact(paise: number): string {
  const abs = Math.abs(paise)
  return abs % 100 === 0 ? `₹${Math.floor(abs / 100).toLocaleString('en-IN')}` : money(paise)
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

```

src/lib/game.ts
```typescript
export const GAME_MODES = [
  { id: '30s', label: 'Win Go 30s', seconds: 30 },
  { id: '1m', label: 'Win Go 1Min', seconds: 60 },
  { id: '3m', label: 'Win Go 3Min', seconds: 180 },
  { id: '5m', label: 'Win Go 5Min', seconds: 300 },
] as const

export type GameMode = (typeof GAME_MODES)[number]['id']
export type BetType = 'number' | 'color' | 'size'
export type GameColor = 'Green' | 'Red' | 'Violet'
export type GameSize = 'Big' | 'Small'

export interface GameBet {
  id: string
  period: string
  mode: GameMode
  type: BetType
  selection: string
  amount: number
  placedAt: number
}

export interface GameResult {
  period: string
  mode: GameMode
  number: number
  size: GameSize
  colors: GameColor[]
  createdAt: number
}

export interface Settlement {
  betId: string
  resultNumber: number
  won: boolean
  payout: number
}

export interface PeriodInfo {
  period: string
  remainingSeconds: number
  roundIndex: number
}

const pad2 = (value: number) => String(value).padStart(2, '0')

export function modeSeconds(mode: GameMode): number {
  return GAME_MODES.find((item) => item.id === mode)?.seconds ?? 30
}

export function getPeriodInfo(nowMs: number, mode: GameMode): PeriodInfo {
  const date = new Date(nowMs)
  const secondsSinceUtcMidnight =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds()
  const interval = modeSeconds(mode)
  const roundIndex = Math.floor(secondsSinceUtcMidnight / interval)
  const remainingSeconds = interval - (secondsSinceUtcMidnight % interval)
  const sequence = String(50001 + roundIndex).padStart(5, '0')
  const period = `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}1000${sequence}`

  return { period, remainingSeconds, roundIndex }
}

export function getNumberTraits(number: number): {
  size: GameSize
  colors: GameColor[]
} {
  const size: GameSize = number >= 5 ? 'Big' : 'Small'
  const colors: GameColor[] =
    number === 0 ? ['Red', 'Violet'] : number === 5 ? ['Green', 'Violet'] : number % 2 === 1 ? ['Green'] : ['Red']

  return { size, colors }
}

export function createResult(
  period: string,
  mode: GameMode,
  number: number,
  createdAt: number,
): GameResult {
  return {
    period,
    mode,
    number,
    ...getNumberTraits(number),
    createdAt,
  }
}

export function createDemoResult(
  period: string,
  mode: GameMode,
  createdAt: number,
): GameResult {
  let hash = 2166136261
  for (let index = 0; index < period.length; index += 1) {
    hash = Math.imul(hash ^ period.charCodeAt(index), 16777619)
  }
  const number = Math.abs(hash) % 10
  return createResult(period, mode, number, createdAt)
}

export function calculatePayout(
  bet: Pick<GameBet, 'type' | 'selection' | 'amount'>,
  result: Pick<GameResult, 'number' | 'size' | 'colors'>,
): number {
  const won =
    (bet.type === 'number' && Number(bet.selection) === result.number) ||
    (bet.type === 'size' && bet.selection === result.size) ||
    (bet.type === 'color' && result.colors.includes(bet.selection as GameColor))

  if (!won) return 0

  let multiplier = 2
  if (bet.type === 'number') multiplier = 9
  if (bet.type === 'color' && bet.selection === 'Violet') multiplier = 4.5
  if (bet.type === 'color' && bet.selection === 'Green' && result.number === 5) {
    multiplier = 1.5
  }
  if (bet.type === 'color' && bet.selection === 'Red' && result.number === 0) {
    multiplier = 1.5
  }

  return Math.round(bet.amount * 0.98 * multiplier * 100) / 100
}

export function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${pad2(minutes)}:${pad2(remainder)}`
}

```

src/lib/lock.ts
```typescript
import { randomUUID } from 'node:crypto'
import { AppError } from './errors'
import { kv } from './redis'

/**
 * Distributed mutex (SET NX PX + compare-and-delete release).
 *
 * This is a *fast-fail guard* that stops duplicate concurrent requests (double-click, replay) before they
 * hit the database. Correctness does NOT rely on it: money paths additionally take a PostgreSQL advisory
 * transaction lock and rely on unique idempotency keys. If Redis is unreachable we log and continue,
 * because the database guarantees remain intact.
 */
export async function withLock<T>(
  name: string,
  fn: () => Promise<T>,
  opts: { ttlMs?: number; waitMs?: number; message?: string } = {},
): Promise<T> {
  const ttlMs = opts.ttlMs ?? 15_000
  const waitMs = opts.waitMs ?? 0
  const key = `lock:${name}`
  const token = randomUUID()
  const deadline = Date.now() + waitMs
  let held = false
  let redisDown = false

  for (;;) {
    try {
      held = await kv().set(key, token, { px: ttlMs, nx: true })
    } catch (err) {
      console.error('[lock] Redis unavailable, continuing on DB guarantees:', (err as Error).message)
      redisDown = true
      break
    }
    if (held) break
    if (Date.now() >= deadline) {
      throw new AppError('LOCKED', opts.message ?? 'Another request for this action is already in progress. Please wait a moment.', {
        retryAfterSeconds: 2,
      })
    }
    await new Promise((r) => setTimeout(r, 75))
  }

  try {
    return await fn()
  } finally {
    if (held && !redisDown) {
      try {
        await kv().releaseIfEquals(key, token)
      } catch {
        /* lock expires by TTL */
      }
    }
  }
}

```

src/lib/money.ts
```typescript
import { DEFAULT_CURRENCY, MINOR_UNITS_PER_MAJOR } from '@/constants'
import { AppError } from './errors'

/** All money is stored as integer minor units (paise). No floating-point arithmetic on balances. */

export function assertMinor(value: unknown, label = 'amount'): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new AppError('BAD_REQUEST', `${label} must be an integer number of minor units`)
  }
}

export function assertPositiveMinor(value: unknown, label = 'amount'): asserts value is number {
  assertMinor(value, label)
  if (value <= 0) throw new AppError('BAD_REQUEST', `${label} must be greater than zero`)
}

/**
 * Convert a decimal string ("100.50") to minor units (10050) using string parsing only,
 * so no float rounding can ever creep in.
 */
export function parseMajorToMinor(input: string): number {
  const s = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new AppError('VALIDATION_ERROR', 'Enter a valid amount with at most 2 decimals')
  const [whole, frac = ''] = s.split('.')
  const minor = Number(whole) * MINOR_UNITS_PER_MAJOR + Number(frac.padEnd(2, '0'))
  if (!Number.isSafeInteger(minor)) throw new AppError('VALIDATION_ERROR', 'Amount is too large')
  return minor
}

/** 10050 -> "100.50" (string based, no float division). */
export function minorToDecimalString(minor: number): string {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  const whole = Math.floor(abs / MINOR_UNITS_PER_MAJOR)
  const frac = String(abs % MINOR_UNITS_PER_MAJOR).padStart(2, '0')
  return `${sign}${whole}.${frac}`
}

const CURRENCY_LOCALE: Record<string, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB' }
const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

/** Presentation only — never feed the result back into calculations. */
export function formatMoney(minor: number, currency: string = DEFAULT_CURRENCY, opts: { signed?: boolean } = {}): string {
  const major = minorToDecimalString(Math.abs(minor))
  const [whole, frac] = major.split('.')
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? 'en-IN').format(Number(whole))
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `
  const sign = minor < 0 ? '−' : opts.signed && minor > 0 ? '+' : ''
  return `${sign}${symbol}${formatted}.${frac}`
}

/** floor(amount * numerator / denominator) using integer math only. */
export function mulDivFloor(amount: number, numerator: number, denominator: number): number {
  if (denominator === 0) throw new AppError('BAD_REQUEST', 'Division by zero')
  return Math.floor((amount * numerator) / denominator)
}

```

src/lib/payload.ts
```typescript
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

const userConfig = { ...config, cookiePrefix: 'rw-user' } as typeof config

/** Default Payload instance for admin and non-user system-level operations. */
export const getPayloadClient = (): Promise<Payload> => getPayload({ config })

/** Separate cookie namespace for the public app auth session so it does not overwrite the admin cookie. */
export const getUserPayloadClient = (): Promise<Payload> => getPayload({ config: userConfig })

```

src/lib/rate-limit.ts
```typescript
import { AppError } from './errors'
import { kv } from './redis'

export interface RateLimitRule {
  /** Logical bucket, e.g. "login:ip" */
  name: string
  limit: number
  windowSec: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/** Fixed-window limiter (atomic INCR + PEXPIRE). Fails open when Redis is unavailable. */
export async function rateLimit(rule: RateLimitRule, identity: string): Promise<RateLimitResult> {
  try {
    const { count, ttlMs } = await kv().incr(`rl:${rule.name}:${identity}`, rule.windowSec * 1000)
    return {
      allowed: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    }
  } catch (err) {
    console.error('[rate-limit] Redis unavailable, failing open:', (err as Error).message)
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 }
  }
}

export async function enforceRateLimit(rule: RateLimitRule, identity: string, message?: string) {
  const res = await rateLimit(rule, identity)
  if (!res.allowed) {
    throw new AppError('RATE_LIMITED', message ?? 'Too many requests. Please slow down and try again shortly.', {
      retryAfterSeconds: res.retryAfterSeconds,
    })
  }
  return res
}

/** Central catalogue so limits are easy to audit and tune. */
export const LIMITS = {
  api: { name: 'api', limit: 240, windowSec: 60 },
  loginIp: { name: 'login:ip', limit: 20, windowSec: 15 * 60 },
  loginAccount: { name: 'login:acct', limit: 8, windowSec: 15 * 60 },
  registerIp: { name: 'register:ip', limit: 10, windowSec: 60 * 60 },
  passwordResetIp: { name: 'pwreset:ip', limit: 10, windowSec: 60 * 60 },
  passwordResetAccount: { name: 'pwreset:acct', limit: 3, windowSec: 60 * 60 },
  gameStart: { name: 'game:start', limit: 30, windowSec: 60 * 60 },
  gameAction: { name: 'game:action', limit: 240, windowSec: 60 },
  gameComplete: { name: 'game:complete', limit: 30, windowSec: 60 * 60 },
  taskAction: { name: 'task:action', limit: 60, windowSec: 60 * 60 },
  campaignClaim: { name: 'campaign:claim', limit: 20, windowSec: 60 * 60 },
  withdrawal: { name: 'withdrawal:create', limit: 5, windowSec: 60 * 60 },
  payoutMethod: { name: 'payout:write', limit: 20, windowSec: 60 * 60 },
  referralQualify: { name: 'referral:qualify', limit: 20, windowSec: 60 * 60 },
} satisfies Record<string, RateLimitRule>

```

src/lib/redis.ts
```typescript
import Redis from 'ioredis'
import { REDIS_PREFIX } from '@/constants'
import { isProd } from './env'

/**
 * Thin key/value abstraction over Redis.
 *
 * Redis is used ONLY for ephemeral concerns: rate limiting, cooldown hints, distributed locks and caches.
 * PostgreSQL remains the single source of truth for every balance, reward and withdrawal. Correctness of
 * money operations never depends on Redis (see WalletService: advisory locks + unique idempotency keys).
 */
export interface KV {
  readonly kind: 'redis' | 'memory'
  get(key: string): Promise<string | null>
  set(key: string, value: string, opts?: { px?: number; nx?: boolean }): Promise<boolean>
  del(...keys: string[]): Promise<void>
  /** Atomically increments a counter, setting the TTL on first hit. */
  incr(key: string, windowMs: number): Promise<{ count: number; ttlMs: number }>
  releaseIfEquals(key: string, value: string): Promise<boolean>
  /** Remaining TTL in ms (-2 when missing, -1 when no expiry). */
  ttl(key: string): Promise<number>
  deleteByPrefix(prefix: string): Promise<void>
}

const INCR_LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local t = redis.call('PTTL', KEYS[1])
if t < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); t = tonumber(ARGV[1]) end
return {c, t}
`
const RELEASE_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end
`

class RedisKV implements KV {
  readonly kind = 'redis' as const
  constructor(private client: Redis) {}

  async get(key: string) {
    return this.client.get(REDIS_PREFIX + key)
  }
  async set(key: string, value: string, opts: { px?: number; nx?: boolean } = {}) {
    const k = REDIS_PREFIX + key
    let res: 'OK' | null
    if (opts.px && opts.nx) res = await this.client.set(k, value, 'PX', opts.px, 'NX')
    else if (opts.px) res = await this.client.set(k, value, 'PX', opts.px)
    else if (opts.nx) res = await this.client.set(k, value, 'NX')
    else res = await this.client.set(k, value)
    return res === 'OK'
  }
  async del(...keys: string[]) {
    if (keys.length) await this.client.del(...keys.map((k) => REDIS_PREFIX + k))
  }
  async incr(key: string, windowMs: number) {
    const [count, ttlMs] = (await this.client.eval(INCR_LUA, 1, REDIS_PREFIX + key, String(windowMs))) as [number, number]
    return { count, ttlMs }
  }
  async releaseIfEquals(key: string, value: string) {
    return (await this.client.eval(RELEASE_LUA, 1, REDIS_PREFIX + key, value)) === 1
  }
  async ttl(key: string) {
    return this.client.pttl(REDIS_PREFIX + key)
  }
  async deleteByPrefix(prefix: string) {
    const stream = this.client.scanStream({ match: `${REDIS_PREFIX}${prefix}*`, count: 200 })
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length) await this.client.del(...keys)
    }
  }
}

/** Single-process fallback for local development / tests only. Never used in production. */
class MemoryKV implements KV {
  readonly kind = 'memory' as const
  private store = new Map<string, { v: string; exp: number | null }>()

  private live(key: string) {
    const e = this.store.get(key)
    if (!e) return undefined
    if (e.exp !== null && e.exp <= Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return e
  }
  async get(key: string) {
    return this.live(key)?.v ?? null
  }
  async set(key: string, value: string, opts: { px?: number; nx?: boolean } = {}) {
    if (opts.nx && this.live(key)) return false
    this.store.set(key, { v: value, exp: opts.px ? Date.now() + opts.px : null })
    return true
  }
  async del(...keys: string[]) {
    keys.forEach((k) => this.store.delete(k))
  }
  async incr(key: string, windowMs: number) {
    const e = this.live(key)
    if (!e) {
      this.store.set(key, { v: '1', exp: Date.now() + windowMs })
      return { count: 1, ttlMs: windowMs }
    }
    e.v = String(Number(e.v) + 1)
    return { count: Number(e.v), ttlMs: (e.exp ?? Date.now()) - Date.now() }
  }
  async releaseIfEquals(key: string, value: string) {
    const e = this.live(key)
    if (e && e.v === value) {
      this.store.delete(key)
      return true
    }
    return false
  }
  async ttl(key: string) {
    const e = this.live(key)
    if (!e) return -2
    return e.exp === null ? -1 : e.exp - Date.now()
  }
  async deleteByPrefix(prefix: string) {
    for (const k of [...this.store.keys()]) if (k.startsWith(prefix)) this.store.delete(k)
  }
}

const g = globalThis as unknown as { __rwKV?: KV }

export function kv(): KV {
  if (g.__rwKV) return g.__rwKV
  const url = process.env.REDIS_URL
  if (!url) {
    if (isProd()) throw new Error('REDIS_URL is required in production')
    console.warn('[redis] REDIS_URL not set — using in-memory fallback (development only, single instance).')
    g.__rwKV = new MemoryKV()
    return g.__rwKV
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    enableReadyCheck: true,
    lazyConnect: false,
  })
  client.on('error', (err) => console.error('[redis] error:', err.message))
  g.__rwKV = new RedisKV(client)
  return g.__rwKV
}

/** Run a Redis call; on failure log and return the fallback so a Redis outage degrades instead of taking the app down. */
export async function safeKv<T>(label: string, fn: (k: KV) => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn(kv())
  } catch (err) {
    console.error(`[redis] ${label} failed:`, (err as Error).message)
    return fallback
  }
}

```

src/lib/request-meta.ts
```typescript
export interface RequestMeta {
  ip: string
  userAgent: string
  device: string
}

export function getClientIp(headers: Headers): string {
  // NOTE: your reverse proxy / load balancer MUST overwrite x-forwarded-for, otherwise clients can spoof it.
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return headers.get('x-real-ip') ?? headers.get('cf-connecting-ip') ?? '0.0.0.0'
}

function deviceFromUa(ua: string): string {
  const u = ua.toLowerCase()
  if (!u) return 'unknown'
  const os = /android/.test(u) ? 'Android' : /iphone|ipad|ios/.test(u) ? 'iOS' : /windows/.test(u) ? 'Windows' : /mac os/.test(u) ? 'macOS' : /linux/.test(u) ? 'Linux' : 'Other'
  const browser = /edg\//.test(u) ? 'Edge' : /chrome\//.test(u) ? 'Chrome' : /firefox\//.test(u) ? 'Firefox' : /safari\//.test(u) ? 'Safari' : 'Other'
  const kind = /mobile|android|iphone/.test(u) ? 'mobile' : 'desktop'
  return `${os}/${browser}/${kind}`
}

export function getRequestMeta(headers: Headers): RequestMeta {
  const userAgent = (headers.get('user-agent') ?? '').slice(0, 300)
  return { ip: getClientIp(headers), userAgent, device: deviceFromUa(userAgent) }
}

```

src/lib/time.ts
```typescript
import { DEFAULT_TIMEZONE } from '@/constants'

/** All persisted timestamps are UTC. These helpers only convert for boundaries / display. */

export const utcNow = () => new Date()

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function safeTimezone(tz?: string | null): string {
  return tz && isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
}

/** Offset (ms) of `tz` from UTC at instant `date`. */
function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** UTC instant for local midnight of the calendar day containing `date` in `tz`. */
export function startOfDayInTz(date: Date, tz: string): Date {
  const zone = safeTimezone(tz)
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  const [y, m, d] = parts.split('-').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const offset = tzOffsetMs(guess, zone)
  let result = new Date(guess.getTime() - offset)
  const offset2 = tzOffsetMs(result, zone)
  if (offset2 !== offset) result = new Date(guess.getTime() - offset2)
  return result
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

/** [start, end) of the local day in tz. */
export function dayBounds(date: Date, tz: string): { start: Date; end: Date } {
  const start = startOfDayInTz(date, tz)
  const end = startOfDayInTz(new Date(start.getTime() + 36 * 3_600_000), tz)
  return { start, end }
}

export function inWindow(now: Date, start?: string | Date | null, end?: string | Date | null): boolean {
  if (start && now < new Date(start)) return false
  if (end && now >= new Date(end)) return false
  return true
}

export function formatInTz(
  date: string | Date | null | undefined,
  tz: string,
  opts: { seconds?: boolean; dateOnly?: boolean; withZone?: boolean } = {},
): string {
  if (!date) return '—'
  const d = new Date(date)
  const zone = safeTimezone(tz)
  const base: Intl.DateTimeFormatOptions = { timeZone: zone, day: '2-digit', month: 'short', year: 'numeric' }
  if (!opts.dateOnly) {
    base.hour = '2-digit'
    base.minute = '2-digit'
    base.hourCycle = 'h23'
    if (opts.seconds) base.second = '2-digit'
  }
  const s = new Intl.DateTimeFormat('en-GB', base).format(d).replace(',', '')
  return opts.withZone ? `${s} ${zone}` : s
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${String(sec).padStart(2, '0')}s`
  return `${sec}s`
}

```

src/lib/utils.ts
```typescript
export { cn } from "cn"

```

src/payload-types.ts
```typescript
/* tslint:disable */
/* eslint-disable */
/**
 * This file was automatically generated by Payload.
 * DO NOT MODIFY IT BY HAND. Instead, modify your source Payload config,
 * and re-run `payload generate:types` to regenerate this file.
 */

/**
 * Supported timezones in IANA format.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "supportedTimezones".
 */
export type SupportedTimezones =
  | 'Asia/Kolkata'
  | 'UTC'
  | 'Asia/Dubai'
  | 'Asia/Singapore'
  | 'Europe/London'
  | 'America/New_York'
  | 'America/Los_Angeles'
  | 'Australia/Sydney';

export interface Config {
  auth: {
    admins: AdminAuthOperations;
    users: UserAuthOperations;
  };
  blocks: {};
  collections: {
    admins: Admin;
    users: User;
    wallets: Wallet;
    'wallet-transactions': WalletTransaction;
    'wallet-adjustments': WalletAdjustment;
    tasks: Task;
    'task-completions': TaskCompletion;
    games: Game;
    'game-sessions': GameSession;
    'quiz-questions': QuizQuestion;
    'sudoku-puzzles': SudokuPuzzle;
    campaigns: Campaign;
    'campaign-claims': CampaignClaim;
    'referral-rules': ReferralRule;
    referrals: Referral;
    withdrawals: Withdrawal;
    'payout-methods': PayoutMethod;
    banners: Banner;
    announcements: Announcement;
    notifications: Notification;
    media: Media;
    'audit-logs': AuditLog;
    'payload-kv': PayloadKv;
    'payload-locked-documents': PayloadLockedDocument;
    'payload-preferences': PayloadPreference;
    'payload-migrations': PayloadMigration;
  };
  collectionsJoins: {};
  collectionsSelect: {
    admins: AdminsSelect<false> | AdminsSelect<true>;
    users: UsersSelect<false> | UsersSelect<true>;
    wallets: WalletsSelect<false> | WalletsSelect<true>;
    'wallet-transactions': WalletTransactionsSelect<false> | WalletTransactionsSelect<true>;
    'wallet-adjustments': WalletAdjustmentsSelect<false> | WalletAdjustmentsSelect<true>;
    tasks: TasksSelect<false> | TasksSelect<true>;
    'task-completions': TaskCompletionsSelect<false> | TaskCompletionsSelect<true>;
    games: GamesSelect<false> | GamesSelect<true>;
    'game-sessions': GameSessionsSelect<false> | GameSessionsSelect<true>;
    'quiz-questions': QuizQuestionsSelect<false> | QuizQuestionsSelect<true>;
    'sudoku-puzzles': SudokuPuzzlesSelect<false> | SudokuPuzzlesSelect<true>;
    campaigns: CampaignsSelect<false> | CampaignsSelect<true>;
    'campaign-claims': CampaignClaimsSelect<false> | CampaignClaimsSelect<true>;
    'referral-rules': ReferralRulesSelect<false> | ReferralRulesSelect<true>;
    referrals: ReferralsSelect<false> | ReferralsSelect<true>;
    withdrawals: WithdrawalsSelect<false> | WithdrawalsSelect<true>;
    'payout-methods': PayoutMethodsSelect<false> | PayoutMethodsSelect<true>;
    banners: BannersSelect<false> | BannersSelect<true>;
    announcements: AnnouncementsSelect<false> | AnnouncementsSelect<true>;
    notifications: NotificationsSelect<false> | NotificationsSelect<true>;
    media: MediaSelect<false> | MediaSelect<true>;
    'audit-logs': AuditLogsSelect<false> | AuditLogsSelect<true>;
    'payload-kv': PayloadKvSelect<false> | PayloadKvSelect<true>;
    'payload-locked-documents': PayloadLockedDocumentsSelect<false> | PayloadLockedDocumentsSelect<true>;
    'payload-preferences': PayloadPreferencesSelect<false> | PayloadPreferencesSelect<true>;
    'payload-migrations': PayloadMigrationsSelect<false> | PayloadMigrationsSelect<true>;
  };
  db: {
    defaultIDType: number;
  };
  fallbackLocale: null;
  globals: {
    'site-settings': SiteSetting;
    'reward-settings': RewardSetting;
    'feature-settings': FeatureSetting;
    'legal-settings': LegalSetting;
  };
  globalsSelect: {
    'site-settings': SiteSettingsSelect<false> | SiteSettingsSelect<true>;
    'reward-settings': RewardSettingsSelect<false> | RewardSettingsSelect<true>;
    'feature-settings': FeatureSettingsSelect<false> | FeatureSettingsSelect<true>;
    'legal-settings': LegalSettingsSelect<false> | LegalSettingsSelect<true>;
  };
  locale: null;
  widgets: {
    collections: CollectionsWidget;
  };
  user: Admin | User;
  jobs: {
    tasks: unknown;
    workflows: unknown;
  };
}
export interface AdminAuthOperations {
  forgotPassword: {
    email: string;
    password: string;
  };
  login: {
    email: string;
    password: string;
  };
  registerFirstUser: {
    email: string;
    password: string;
  };
  unlock: {
    email: string;
    password: string;
  };
}
export interface UserAuthOperations {
  forgotPassword: {
    email: string;
    password: string;
  };
  login: {
    email: string;
    password: string;
  };
  registerFirstUser: {
    email: string;
    password: string;
  };
  unlock: {
    email: string;
    password: string;
  };
}
/**
 * Staff who can sign in to this admin panel. Only Super admins can manage staff accounts.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "admins".
 */
export interface Admin {
  id: number;
  name: string;
  /**
   * SUPER_ADMIN: everything · ADMIN: users, tasks, games, campaigns · FINANCE_ADMIN: wallets, transactions, withdrawals · CONTENT_MANAGER: banners, campaigns, media, content · SUPPORT_AGENT: read-only user support data
   */
  roles: ('SUPER_ADMIN' | 'ADMIN' | 'FINANCE_ADMIN' | 'CONTENT_MANAGER' | 'SUPPORT_AGENT')[];
  isActive?: boolean | null;
  lastLoginAt?: string | null;
  updatedAt: string;
  createdAt: string;
  email: string;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  resetPasswordRequestedAt?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  sessions?:
    | {
        id: string;
        createdAt?: string | null;
        expiresAt: string;
      }[]
    | null;
  password?: string | null;
  collection: 'admins';
}
/**
 * Registered platform users. Use the status field to suspend, block or reactivate an account.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users".
 */
export interface User {
  id: number;
  name: string;
  /**
   * Digits with optional country code, e.g. +919876543210
   */
  phone?: string | null;
  /**
   * SUSPENDED users can sign in but cannot earn or withdraw. BLOCKED users cannot sign in.
   */
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'BLOCKED' | 'DELETED';
  /**
   * Internal note about why the status changed.
   */
  statusReason?: string | null;
  statusChangedAt?: string | null;
  referralCode?: string | null;
  /**
   * IANA timezone used to display dates to this user.
   */
  timezone?: string | null;
  phoneVerified?: boolean | null;
  termsAcceptedAt?: string | null;
  registrationIp?: string | null;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  deletedAt?: string | null;
  updatedAt: string;
  createdAt: string;
  email: string;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  resetPasswordRequestedAt?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  sessions?:
    | {
        id: string;
        createdAt?: string | null;
        expiresAt: string;
      }[]
    | null;
  password?: string | null;
  collection: 'users';
}
/**
 * Read-only. Use Wallet adjustments to credit, debit or reverse funds — every change is ledgered and audited.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "wallets".
 */
export interface Wallet {
  id: number;
  user: number | User;
  /**
   * Spendable balance in paise.
   */
  availableBalance?: number | null;
  /**
   * Funds held for withdrawals that are not yet settled.
   */
  pendingBalance?: number | null;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  lifetimeEarned?: number | null;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  lifetimeWithdrawn?: number | null;
  currency: string;
  status: 'ACTIVE' | 'FROZEN';
  updatedAt: string;
  createdAt: string;
}
/**
 * Append-only ledger. Rows can never be edited or deleted.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "wallet-transactions".
 */
export interface WalletTransaction {
  id: number;
  user: number | User;
  wallet: number | Wallet;
  type:
    | 'TASK_REWARD'
    | 'GAME_REWARD'
    | 'CAMPAIGN_REWARD'
    | 'REFERRAL_REWARD'
    | 'BONUS'
    | 'WITHDRAWAL'
    | 'REFUND'
    | 'ADMIN_CREDIT'
    | 'ADMIN_DEBIT'
    | 'REVERSAL';
  /**
   * Signed movement of the available balance, in paise.
   */
  amount: number;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  balanceBefore: number;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  balanceAfter: number;
  currency: string;
  referenceType?: string | null;
  referenceId?: string | null;
  description: string;
  status: 'COMPLETED';
  /**
   * Guarantees a business event is credited at most once.
   */
  idempotencyKey: string;
  reversalOf?: (number | null) | WalletTransaction;
  metadata?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * Manually credit, debit or reverse a transaction. Adjustments cannot be edited or deleted once created.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "wallet-adjustments".
 */
export interface WalletAdjustment {
  id: number;
  type: 'CREDIT' | 'DEBIT' | 'REVERSAL';
  user?: (number | null) | User;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  amount?: number | null;
  /**
   * The ledger row to reverse. It can be reversed once.
   */
  targetTransaction?: (number | null) | WalletTransaction;
  reason: string;
  /**
   * Ticket number, complaint id or other reference.
   */
  reference?: string | null;
  admin?: (number | null) | Admin;
  status?: 'APPLIED' | null;
  appliedAt?: string | null;
  resultingTransaction?: (number | null) | WalletTransaction;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "tasks".
 */
export interface Task {
  id: number;
  title: string;
  /**
   * Auto-generated from the title.
   */
  slug: string;
  /**
   * Short summary shown on the task card.
   */
  description: string;
  /**
   * Step-by-step instructions shown on the task page. Line breaks are preserved.
   */
  instructions?: string | null;
  icon?: (number | null) | Media;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  rewardAmount: number;
  rewardType?: ('CASH' | 'BONUS') | null;
  /**
   * How many times each user can complete this task in total.
   */
  perUserLimit: number;
  /**
   * 0 = no daily cap per user.
   */
  perUserDailyLimit?: number | null;
  /**
   * Minimum minutes between two completions by the same user.
   */
  cooldownMinutes?: number | null;
  /**
   * Max completions per day across all users. 0 = unlimited.
   */
  dailyLimit?: number | null;
  /**
   * Max completions across all users. 0 = unlimited.
   */
  totalLimit?: number | null;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'DISABLED';
  /**
   * Master switch. Untick to hide immediately regardless of status.
   */
  isActive?: boolean | null;
  /**
   * Stored in UTC. Pick the timezone the schedule is meant for (default Asia/Kolkata).
   */
  startsAt?: string | null;
  startsAt_tz?: SupportedTimezones;
  /**
   * Leave empty for no end.
   */
  endsAt?: string | null;
  endsAt_tz?: SupportedTimezones;
  publishedAt?: string | null;
  eligibility?: {
    minAccountAgeDays?: number | null;
    requireVerifiedAccount?: boolean | null;
    requirePayoutMethod?: boolean | null;
    /**
     * Users must have earned at least this much.
     */
    minLifetimeEarned?: number | null;
  };
  verification?: {
    type?: ('NONE' | 'TIMER' | 'ANSWER_CODE' | 'TEXT_SUBMISSION' | 'MANUAL_REVIEW') | null;
    timerSeconds?: number | null;
    /**
     * Case-insensitive. Never shown to users.
     */
    answerCode?: string | null;
    /**
     * What the user should submit, e.g. "Paste your username".
     */
    submissionPrompt?: string | null;
  };
  featured?: boolean | null;
  /**
   * Higher priority is listed first.
   */
  priority?: number | null;
  /**
   * Tie-breaker. Lower comes first.
   */
  sortOrder?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media".
 */
export interface Media {
  id: number;
  /**
   * Describe the image for screen readers.
   */
  alt: string;
  caption?: string | null;
  isActive?: boolean | null;
  _objectKey?: string | null;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
  sizes?: {
    thumbnail?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    card?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    banner?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
  };
}
/**
 * Submissions awaiting review appear with status SUBMITTED. Set the status to COMPLETED to pay out or REJECTED to decline.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "task-completions".
 */
export interface TaskCompletion {
  id: number;
  task: number | Task;
  user: number | User;
  attemptNumber: number;
  status: 'STARTED' | 'SUBMITTED' | 'COMPLETED' | 'REJECTED' | 'EXPIRED';
  startedAt: string;
  submittedAt?: string | null;
  completedAt?: string | null;
  rejectedAt?: string | null;
  submission?: string | null;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  rewardAmount?: number | null;
  transaction?: (number | null) | WalletTransaction;
  rejectionReason?: string | null;
  reviewedBy?: (number | null) | Admin;
  reviewedAt?: string | null;
  ip?: string | null;
  device?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * Each record is a playable game room. Create one record per difficulty (e.g. Sudoku Easy, Sudoku Hard) to give each its own reward and limits.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "games".
 */
export interface Game {
  id: number;
  name: string;
  slug: string;
  description: string;
  type: 'QUIZ' | 'SUDOKU' | 'MEMORY' | 'NUMBER_SEQUENCE' | 'MATH' | 'REACTION' | 'SPIN_WHEEL' | 'WINGO';
  /**
   * Drives question/puzzle difficulty. Quiz supports Easy–Hard; Sudoku supports Easy–Expert.
   */
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  icon?: (number | null) | Media;
  thumbnail?: (number | null) | Media;
  featured?: boolean | null;
  sortOrder?: number | null;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'DISABLED';
  /**
   * Stored in UTC. Pick the timezone the schedule is meant for (default Asia/Kolkata).
   */
  startsAt?: string | null;
  startsAt_tz?: SupportedTimezones;
  /**
   * Leave empty for no end.
   */
  endsAt?: string | null;
  endsAt_tz?: SupportedTimezones;
  reward?: {
    mode?: ('FIXED' | 'PER_SCORE' | 'TIERED') | null;
    /**
     * FIXED: paid amount · PER_SCORE: paid at 100% score.
     */
    amount?: number | null;
    /**
     * Minimum score (%) required to earn anything.
     */
    minScorePercent?: number | null;
    /**
     * The highest tier whose minimum the score reaches is paid.
     */
    tiers?:
      | {
          minScorePercent: number;
          /**
           * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
           */
          amount: number;
          id?: string | null;
        }[]
      | null;
  };
  /**
   * Sessions a user can start per day. 0 = unlimited.
   */
  maxAttemptsPerDay?: number | null;
  /**
   * Sessions per day that can pay a reward. 0 = unlimited.
   */
  dailyRewardedPlays?: number | null;
  /**
   * Wait time between two sessions of this game.
   */
  cooldownSeconds?: number | null;
  /**
   * Time allowed to finish a session before it expires.
   */
  durationSeconds?: number | null;
  /**
   * Only the settings relevant to the selected game type apply.
   */
  config?: {
    /**
     * Number of questions per session.
     */
    questionCount?: number | null;
    /**
     * Default time per question (quiz questions can override it).
     */
    secondsPerQuestion?: number | null;
    /**
     * Optional: only draw questions from this category.
     */
    category?: string | null;
    sudokuSource?: ('CMS_THEN_GENERATED' | 'CMS_ONLY' | 'GENERATED') | null;
    /**
     * Completions faster than this are rejected as implausible.
     */
    minSolveSeconds?: number | null;
    rows?: number | null;
    /**
     * rows × cols must be an even number.
     */
    cols?: number | null;
    mathOperations?: ('ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION' | 'PERCENTAGE' | 'MIXED')[] | null;
    rounds?: number | null;
    minDelayMs?: number | null;
    maxDelayMs?: number | null;
    /**
     * Each slice of the wheel. Weight controls how often it is picked (higher = more likely). Use amount 0 for a "Try again" slice.
     */
    segments?:
      | {
          /**
           * Shown on the wheel, e.g. "₹5" or "Try again".
           */
          label: string;
          /**
           * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
           */
          amount: number;
          /**
           * Relative odds. A weight of 2 lands twice as often as a weight of 1.
           */
          weight: number;
          /**
           * Optional hex color for this slice, e.g. #6D5DF6
           */
          color?: string | null;
          id?: string | null;
        }[]
      | null;
  };
  updatedAt: string;
  createdAt: string;
}
/**
 * Every play is persisted. Results are computed and validated on the server.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "game-sessions".
 */
export interface GameSession {
  id: number;
  sessionId: string;
  user: number | User;
  game: number | Game;
  status: 'STARTED' | 'COMPLETED' | 'EXPIRED' | 'REJECTED';
  startedAt: string;
  endedAt?: string | null;
  expiresAt: string;
  /**
   * Calendar day (in the site timezone) used for daily limits.
   */
  dayKey?: string | null;
  score?: number | null;
  maxScore?: number | null;
  scorePercent?: number | null;
  result?: ('WIN' | 'PARTIAL' | 'LOSE') | null;
  attempts?: number | null;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  rewardAmount?: number | null;
  transaction?: (number | null) | WalletTransaction;
  /**
   * Client-safe breakdown of questions / rounds.
   */
  rounds?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  rejectionReason?: string | null;
  /**
   * Server-side state (answers). Super admin only.
   */
  serverState?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  ip?: string | null;
  userAgent?: string | null;
  device?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "quiz-questions".
 */
export interface QuizQuestion {
  id: number;
  question: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  /**
   * Tick "Correct answer" on exactly one option. For True/False the options are set automatically.
   */
  options: {
    text: string;
    isCorrect?: boolean | null;
    id?: string | null;
  }[];
  /**
   * Shown to the user after they finish the quiz.
   */
  explanation?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category?: string | null;
  tags?: string[] | null;
  /**
   * Overrides the game default for this question.
   */
  timeLimitSeconds?: number | null;
  points: number;
  isActive?: boolean | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * Optional curated puzzles. Enter 81 characters row by row: digits 1-9, and 0 or . for an empty cell. Games can also generate puzzles automatically.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "sudoku-puzzles".
 */
export interface SudokuPuzzle {
  id: number;
  label: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  puzzle: string;
  solution: string;
  clueCount?: number | null;
  isActive?: boolean | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "campaigns".
 */
export interface Campaign {
  id: number;
  name: string;
  slug: string;
  description: string;
  banner?: (number | null) | Media;
  terms?: {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ('ltr' | 'rtl') | null;
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
      indent: number;
      version: number;
    };
    [k: string]: unknown;
  } | null;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  rewardAmount: number;
  rewardType?: ('CASH' | 'BONUS') | null;
  /**
   * All actions must be met (counted from the campaign start) before a user can claim.
   */
  requiredActions?:
    | {
        type:
          | 'TASKS_COMPLETED'
          | 'GAMES_PLAYED'
          | 'GAMES_WON'
          | 'REFERRALS_QUALIFIED'
          | 'AMOUNT_EARNED'
          | 'SPECIFIC_TASK'
          | 'SPECIFIC_GAME';
        /**
         * Count required. For "Amount earned" enter the amount in paise.
         */
        target: number;
        task?: (number | null) | Task;
        game?: (number | null) | Game;
        /**
         * Optional friendly label shown to users.
         */
        label?: string | null;
        id?: string | null;
      }[]
    | null;
  eligibility?: {
    minAccountAgeDays?: number | null;
    requireVerifiedAccount?: boolean | null;
    requirePayoutMethod?: boolean | null;
    /**
     * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
     */
    minLifetimeEarned?: number | null;
  };
  /**
   * Times one user can claim.
   */
  perUserLimit: number;
  /**
   * Maximum number of different users who can claim. 0 = unlimited.
   */
  userLimit?: number | null;
  /**
   * Maximum total claims across all users. 0 = unlimited.
   */
  globalLimit?: number | null;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'COMPLETED';
  /**
   * Stored in UTC. Pick the timezone the schedule is meant for (default Asia/Kolkata).
   */
  startsAt?: string | null;
  startsAt_tz?: SupportedTimezones;
  /**
   * Leave empty for no end.
   */
  endsAt?: string | null;
  endsAt_tz?: SupportedTimezones;
  featured?: boolean | null;
  sortOrder?: number | null;
  /**
   * Set once the "campaign started" notifications were sent.
   */
  startNotifiedAt?: string | null;
  /**
   * Set once the "ending soon" notifications were sent.
   */
  endingNotifiedAt?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "campaign-claims".
 */
export interface CampaignClaim {
  id: number;
  campaign: number | Campaign;
  user: number | User;
  claimNumber: number;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  rewardAmount?: number | null;
  transaction?: (number | null) | WalletTransaction;
  claimedAt: string;
  progress?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * A new sign-up with a referral code is bound to the highest-priority rule that is active at that moment. If none is active, the defaults in Reward settings apply.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "referral-rules".
 */
export interface ReferralRule {
  id: number;
  name: string;
  isActive?: boolean | null;
  /**
   * Higher priority wins when several rules are active.
   */
  priority?: number | null;
  /**
   * Optional: link this rule to a campaign for reporting.
   */
  campaign?: (number | null) | Campaign;
  /**
   * Stored in UTC. Pick the timezone the schedule is meant for (default Asia/Kolkata).
   */
  startsAt?: string | null;
  startsAt_tz?: SupportedTimezones;
  /**
   * Leave empty for no end.
   */
  endsAt?: string | null;
  endsAt_tz?: SupportedTimezones;
  /**
   * Paid to the person who referred.
   */
  referrerReward: number;
  /**
   * Optional welcome bonus paid to the new user when they qualify.
   */
  refereeReward?: number | null;
  qualification: 'REGISTRATION' | 'VERIFIED_ACCOUNT' | 'FIRST_TASK' | 'FIRST_GAME' | 'AMOUNT_EARNED';
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  qualificationAmount?: number | null;
  /**
   * Max rewarded referrals per referrer. 0 = unlimited.
   */
  perReferrerLimit?: number | null;
  /**
   * Max rewarded referrals under this rule. 0 = unlimited.
   */
  globalLimit?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * Set a PENDING referral to REJECTED to block a suspected fake referral. Payouts are made automatically by the platform.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "referrals".
 */
export interface Referral {
  id: number;
  referrer: number | User;
  referredUser: number | User;
  code: string;
  status: 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'REJECTED';
  rule?: (number | null) | ReferralRule;
  /**
   * Snapshot of the reward terms at registration.
   */
  terms?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  registeredAt: string;
  qualifiedAt?: string | null;
  rewardedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  referrerReward?: number | null;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  refereeReward?: number | null;
  referrerTransaction?: (number | null) | WalletTransaction;
  refereeTransaction?: (number | null) | WalletTransaction;
  updatedAt: string;
  createdAt: string;
}
/**
 * Workflow: PENDING → UNDER_REVIEW → APPROVED → PROCESSING → COMPLETED. Rejecting, failing or cancelling refunds the held funds automatically. Amounts can never be edited.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "withdrawals".
 */
export interface Withdrawal {
  id: number;
  user: number | User;
  wallet: number | Wallet;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  amount: number;
  currency: string;
  method: 'UPI' | 'BANK';
  payoutMethod?: (number | null) | PayoutMethod;
  /**
   * Masked destination for support staff.
   */
  payoutSummary?: string | null;
  payoutDetailsEncrypted?: string | null;
  /**
   * Decrypted destination — visible to finance admins only. Every view of this page should be treated as sensitive.
   */
  payoutDetails?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'CANCELLED';
  /**
   * Required when rejecting or failing. Shown to the user.
   */
  failureReason?: string | null;
  /**
   * Bank UTR / payout reference. Required to mark COMPLETED.
   */
  transactionReference?: string | null;
  /**
   * Internal note, never shown to the user.
   */
  adminNote?: string | null;
  requestedAt: string;
  reviewedAt?: string | null;
  processedAt?: string | null;
  completedAt?: string | null;
  rejectedAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  reviewedBy?: (number | null) | Admin;
  debitTransaction?: (number | null) | WalletTransaction;
  refundTransaction?: (number | null) | WalletTransaction;
  idempotencyKey: string;
  metadata?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payout-methods".
 */
export interface PayoutMethod {
  id: number;
  user: number | User;
  type: 'UPI' | 'BANK';
  label: string;
  holderName?: string | null;
  maskedDetails: string;
  ifsc?: string | null;
  bankName?: string | null;
  encryptedDetails: string;
  /**
   * Hash of the destination, used to detect the same account on several users.
   */
  fingerprint?: string | null;
  isDefault?: boolean | null;
  status?: ('ACTIVE' | 'REMOVED') | null;
  removedAt?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "banners".
 */
export interface Banner {
  id: number;
  title: string;
  description?: string | null;
  image: number | Media;
  ctaLabel?: string | null;
  /**
   * In-app path like /earn or /promotions, or a full https:// URL.
   */
  ctaUrl?: string | null;
  /**
   * Stored in UTC. Pick the timezone the schedule is meant for (default Asia/Kolkata).
   */
  startsAt?: string | null;
  startsAt_tz?: SupportedTimezones;
  /**
   * Leave empty for no end.
   */
  endsAt?: string | null;
  endsAt_tz?: SupportedTimezones;
  isActive?: boolean | null;
  sortOrder?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "announcements".
 */
export interface Announcement {
  id: number;
  title: string;
  body: string;
  severity?: ('INFO' | 'SUCCESS' | 'WARNING') | null;
  image?: (number | null) | Media;
  /**
   * Stored in UTC. Pick the timezone the schedule is meant for (default Asia/Kolkata).
   */
  startsAt?: string | null;
  startsAt_tz?: SupportedTimezones;
  /**
   * Leave empty for no end.
   */
  endsAt?: string | null;
  endsAt_tz?: SupportedTimezones;
  isActive?: boolean | null;
  isPinned?: boolean | null;
  publishedAt?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "notifications".
 */
export interface Notification {
  id: number;
  user: number | User;
  type:
    | 'REWARD_CREDITED'
    | 'TASK_COMPLETED'
    | 'GAME_REWARD'
    | 'CAMPAIGN_STARTED'
    | 'CAMPAIGN_ENDING'
    | 'WITHDRAWAL_REQUESTED'
    | 'WITHDRAWAL_APPROVED'
    | 'WITHDRAWAL_REJECTED'
    | 'WITHDRAWAL_COMPLETED'
    | 'REFERRAL_REWARDED'
    | 'SYSTEM';
  title: string;
  body?: string | null;
  data?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  readAt?: string | null;
  /**
   * Prevents duplicate notifications for the same event.
   */
  dedupeKey?: string | null;
  /**
   * Delivery status per channel (in-app now; email/push/Telegram later).
   */
  channels?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * Append-only record of sensitive operations.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "audit-logs".
 */
export interface AuditLog {
  id: number;
  admin?: (number | null) | Admin;
  actorLabel?: string | null;
  action:
    | 'USER_SUSPENDED'
    | 'USER_UNSUSPENDED'
    | 'USER_BLOCKED'
    | 'USER_STATUS_CHANGED'
    | 'REWARD_CREDITED'
    | 'REWARD_DEBITED'
    | 'TRANSACTION_REVERSED'
    | 'WITHDRAWAL_REQUESTED'
    | 'WITHDRAWAL_APPROVED'
    | 'WITHDRAWAL_REJECTED'
    | 'WITHDRAWAL_COMPLETED'
    | 'WITHDRAWAL_FAILED'
    | 'WITHDRAWAL_CANCELLED'
    | 'WITHDRAWAL_STATUS_CHANGED'
    | 'TASK_CREATED'
    | 'TASK_UPDATED'
    | 'TASK_DELETED'
    | 'TASK_COMPLETION_REVIEWED'
    | 'GAME_CREATED'
    | 'GAME_UPDATED'
    | 'GAME_DELETED'
    | 'CAMPAIGN_CREATED'
    | 'CAMPAIGN_UPDATED'
    | 'CAMPAIGN_DELETED'
    | 'SETTINGS_UPDATED'
    | 'CONTENT_UPDATED'
    | 'ADMIN_CREATED'
    | 'ADMIN_UPDATED'
    | 'WALLET_RECONCILED'
    | 'OTHER';
  collectionSlug?: string | null;
  documentId?: string | null;
  before?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  after?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  metadata?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  ip?: string | null;
  userAgent?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-kv".
 */
export interface PayloadKv {
  id: number;
  key: string;
  data:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-locked-documents".
 */
export interface PayloadLockedDocument {
  id: number;
  document?:
    | ({
        relationTo: 'admins';
        value: number | Admin;
      } | null)
    | ({
        relationTo: 'users';
        value: number | User;
      } | null)
    | ({
        relationTo: 'wallets';
        value: number | Wallet;
      } | null)
    | ({
        relationTo: 'wallet-transactions';
        value: number | WalletTransaction;
      } | null)
    | ({
        relationTo: 'wallet-adjustments';
        value: number | WalletAdjustment;
      } | null)
    | ({
        relationTo: 'tasks';
        value: number | Task;
      } | null)
    | ({
        relationTo: 'task-completions';
        value: number | TaskCompletion;
      } | null)
    | ({
        relationTo: 'games';
        value: number | Game;
      } | null)
    | ({
        relationTo: 'game-sessions';
        value: number | GameSession;
      } | null)
    | ({
        relationTo: 'quiz-questions';
        value: number | QuizQuestion;
      } | null)
    | ({
        relationTo: 'sudoku-puzzles';
        value: number | SudokuPuzzle;
      } | null)
    | ({
        relationTo: 'campaigns';
        value: number | Campaign;
      } | null)
    | ({
        relationTo: 'campaign-claims';
        value: number | CampaignClaim;
      } | null)
    | ({
        relationTo: 'referral-rules';
        value: number | ReferralRule;
      } | null)
    | ({
        relationTo: 'referrals';
        value: number | Referral;
      } | null)
    | ({
        relationTo: 'withdrawals';
        value: number | Withdrawal;
      } | null)
    | ({
        relationTo: 'payout-methods';
        value: number | PayoutMethod;
      } | null)
    | ({
        relationTo: 'banners';
        value: number | Banner;
      } | null)
    | ({
        relationTo: 'announcements';
        value: number | Announcement;
      } | null)
    | ({
        relationTo: 'notifications';
        value: number | Notification;
      } | null)
    | ({
        relationTo: 'media';
        value: number | Media;
      } | null)
    | ({
        relationTo: 'audit-logs';
        value: number | AuditLog;
      } | null);
  globalSlug?: string | null;
  user:
    | {
        relationTo: 'admins';
        value: number | Admin;
      }
    | {
        relationTo: 'users';
        value: number | User;
      };
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences".
 */
export interface PayloadPreference {
  id: number;
  user:
    | {
        relationTo: 'admins';
        value: number | Admin;
      }
    | {
        relationTo: 'users';
        value: number | User;
      };
  key?: string | null;
  value?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations".
 */
export interface PayloadMigration {
  id: number;
  name?: string | null;
  batch?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "admins_select".
 */
export interface AdminsSelect<T extends boolean = true> {
  name?: T;
  roles?: T;
  isActive?: T;
  lastLoginAt?: T;
  updatedAt?: T;
  createdAt?: T;
  email?: T;
  resetPasswordToken?: T;
  resetPasswordExpiration?: T;
  salt?: T;
  hash?: T;
  resetPasswordRequestedAt?: T;
  loginAttempts?: T;
  lockUntil?: T;
  sessions?:
    | T
    | {
        id?: T;
        createdAt?: T;
        expiresAt?: T;
      };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users_select".
 */
export interface UsersSelect<T extends boolean = true> {
  name?: T;
  phone?: T;
  status?: T;
  statusReason?: T;
  statusChangedAt?: T;
  referralCode?: T;
  timezone?: T;
  phoneVerified?: T;
  termsAcceptedAt?: T;
  registrationIp?: T;
  lastLoginAt?: T;
  lastLoginIp?: T;
  deletedAt?: T;
  updatedAt?: T;
  createdAt?: T;
  email?: T;
  resetPasswordToken?: T;
  resetPasswordExpiration?: T;
  salt?: T;
  hash?: T;
  resetPasswordRequestedAt?: T;
  loginAttempts?: T;
  lockUntil?: T;
  sessions?:
    | T
    | {
        id?: T;
        createdAt?: T;
        expiresAt?: T;
      };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "wallets_select".
 */
export interface WalletsSelect<T extends boolean = true> {
  user?: T;
  availableBalance?: T;
  pendingBalance?: T;
  lifetimeEarned?: T;
  lifetimeWithdrawn?: T;
  currency?: T;
  status?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "wallet-transactions_select".
 */
export interface WalletTransactionsSelect<T extends boolean = true> {
  user?: T;
  wallet?: T;
  type?: T;
  amount?: T;
  balanceBefore?: T;
  balanceAfter?: T;
  currency?: T;
  referenceType?: T;
  referenceId?: T;
  description?: T;
  status?: T;
  idempotencyKey?: T;
  reversalOf?: T;
  metadata?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "wallet-adjustments_select".
 */
export interface WalletAdjustmentsSelect<T extends boolean = true> {
  type?: T;
  user?: T;
  amount?: T;
  targetTransaction?: T;
  reason?: T;
  reference?: T;
  admin?: T;
  status?: T;
  appliedAt?: T;
  resultingTransaction?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "tasks_select".
 */
export interface TasksSelect<T extends boolean = true> {
  title?: T;
  slug?: T;
  description?: T;
  instructions?: T;
  icon?: T;
  rewardAmount?: T;
  rewardType?: T;
  perUserLimit?: T;
  perUserDailyLimit?: T;
  cooldownMinutes?: T;
  dailyLimit?: T;
  totalLimit?: T;
  status?: T;
  isActive?: T;
  startsAt?: T;
  startsAt_tz?: T;
  endsAt?: T;
  endsAt_tz?: T;
  publishedAt?: T;
  eligibility?:
    | T
    | {
        minAccountAgeDays?: T;
        requireVerifiedAccount?: T;
        requirePayoutMethod?: T;
        minLifetimeEarned?: T;
      };
  verification?:
    | T
    | {
        type?: T;
        timerSeconds?: T;
        answerCode?: T;
        submissionPrompt?: T;
      };
  featured?: T;
  priority?: T;
  sortOrder?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "task-completions_select".
 */
export interface TaskCompletionsSelect<T extends boolean = true> {
  task?: T;
  user?: T;
  attemptNumber?: T;
  status?: T;
  startedAt?: T;
  submittedAt?: T;
  completedAt?: T;
  rejectedAt?: T;
  submission?: T;
  rewardAmount?: T;
  transaction?: T;
  rejectionReason?: T;
  reviewedBy?: T;
  reviewedAt?: T;
  ip?: T;
  device?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "games_select".
 */
export interface GamesSelect<T extends boolean = true> {
  name?: T;
  slug?: T;
  description?: T;
  type?: T;
  difficulty?: T;
  icon?: T;
  thumbnail?: T;
  featured?: T;
  sortOrder?: T;
  status?: T;
  startsAt?: T;
  startsAt_tz?: T;
  endsAt?: T;
  endsAt_tz?: T;
  reward?:
    | T
    | {
        mode?: T;
        amount?: T;
        minScorePercent?: T;
        tiers?:
          | T
          | {
              minScorePercent?: T;
              amount?: T;
              id?: T;
            };
      };
  maxAttemptsPerDay?: T;
  dailyRewardedPlays?: T;
  cooldownSeconds?: T;
  durationSeconds?: T;
  config?:
    | T
    | {
        questionCount?: T;
        secondsPerQuestion?: T;
        category?: T;
        sudokuSource?: T;
        minSolveSeconds?: T;
        rows?: T;
        cols?: T;
        mathOperations?: T;
        rounds?: T;
        minDelayMs?: T;
        maxDelayMs?: T;
        segments?:
          | T
          | {
              label?: T;
              amount?: T;
              weight?: T;
              color?: T;
              id?: T;
            };
      };
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "game-sessions_select".
 */
export interface GameSessionsSelect<T extends boolean = true> {
  sessionId?: T;
  user?: T;
  game?: T;
  status?: T;
  startedAt?: T;
  endedAt?: T;
  expiresAt?: T;
  dayKey?: T;
  score?: T;
  maxScore?: T;
  scorePercent?: T;
  result?: T;
  attempts?: T;
  rewardAmount?: T;
  transaction?: T;
  rounds?: T;
  rejectionReason?: T;
  serverState?: T;
  ip?: T;
  userAgent?: T;
  device?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "quiz-questions_select".
 */
export interface QuizQuestionsSelect<T extends boolean = true> {
  question?: T;
  type?: T;
  options?:
    | T
    | {
        text?: T;
        isCorrect?: T;
        id?: T;
      };
  explanation?: T;
  difficulty?: T;
  category?: T;
  tags?: T;
  timeLimitSeconds?: T;
  points?: T;
  isActive?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "sudoku-puzzles_select".
 */
export interface SudokuPuzzlesSelect<T extends boolean = true> {
  label?: T;
  difficulty?: T;
  puzzle?: T;
  solution?: T;
  clueCount?: T;
  isActive?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "campaigns_select".
 */
export interface CampaignsSelect<T extends boolean = true> {
  name?: T;
  slug?: T;
  description?: T;
  banner?: T;
  terms?: T;
  rewardAmount?: T;
  rewardType?: T;
  requiredActions?:
    | T
    | {
        type?: T;
        target?: T;
        task?: T;
        game?: T;
        label?: T;
        id?: T;
      };
  eligibility?:
    | T
    | {
        minAccountAgeDays?: T;
        requireVerifiedAccount?: T;
        requirePayoutMethod?: T;
        minLifetimeEarned?: T;
      };
  perUserLimit?: T;
  userLimit?: T;
  globalLimit?: T;
  status?: T;
  startsAt?: T;
  startsAt_tz?: T;
  endsAt?: T;
  endsAt_tz?: T;
  featured?: T;
  sortOrder?: T;
  startNotifiedAt?: T;
  endingNotifiedAt?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "campaign-claims_select".
 */
export interface CampaignClaimsSelect<T extends boolean = true> {
  campaign?: T;
  user?: T;
  claimNumber?: T;
  rewardAmount?: T;
  transaction?: T;
  claimedAt?: T;
  progress?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "referral-rules_select".
 */
export interface ReferralRulesSelect<T extends boolean = true> {
  name?: T;
  isActive?: T;
  priority?: T;
  campaign?: T;
  startsAt?: T;
  startsAt_tz?: T;
  endsAt?: T;
  endsAt_tz?: T;
  referrerReward?: T;
  refereeReward?: T;
  qualification?: T;
  qualificationAmount?: T;
  perReferrerLimit?: T;
  globalLimit?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "referrals_select".
 */
export interface ReferralsSelect<T extends boolean = true> {
  referrer?: T;
  referredUser?: T;
  code?: T;
  status?: T;
  rule?: T;
  terms?: T;
  registeredAt?: T;
  qualifiedAt?: T;
  rewardedAt?: T;
  rejectedAt?: T;
  rejectionReason?: T;
  referrerReward?: T;
  refereeReward?: T;
  referrerTransaction?: T;
  refereeTransaction?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "withdrawals_select".
 */
export interface WithdrawalsSelect<T extends boolean = true> {
  user?: T;
  wallet?: T;
  amount?: T;
  currency?: T;
  method?: T;
  payoutMethod?: T;
  payoutSummary?: T;
  payoutDetailsEncrypted?: T;
  payoutDetails?: T;
  status?: T;
  failureReason?: T;
  transactionReference?: T;
  adminNote?: T;
  requestedAt?: T;
  reviewedAt?: T;
  processedAt?: T;
  completedAt?: T;
  rejectedAt?: T;
  failedAt?: T;
  cancelledAt?: T;
  reviewedBy?: T;
  debitTransaction?: T;
  refundTransaction?: T;
  idempotencyKey?: T;
  metadata?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payout-methods_select".
 */
export interface PayoutMethodsSelect<T extends boolean = true> {
  user?: T;
  type?: T;
  label?: T;
  holderName?: T;
  maskedDetails?: T;
  ifsc?: T;
  bankName?: T;
  encryptedDetails?: T;
  fingerprint?: T;
  isDefault?: T;
  status?: T;
  removedAt?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "banners_select".
 */
export interface BannersSelect<T extends boolean = true> {
  title?: T;
  description?: T;
  image?: T;
  ctaLabel?: T;
  ctaUrl?: T;
  startsAt?: T;
  startsAt_tz?: T;
  endsAt?: T;
  endsAt_tz?: T;
  isActive?: T;
  sortOrder?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "announcements_select".
 */
export interface AnnouncementsSelect<T extends boolean = true> {
  title?: T;
  body?: T;
  severity?: T;
  image?: T;
  startsAt?: T;
  startsAt_tz?: T;
  endsAt?: T;
  endsAt_tz?: T;
  isActive?: T;
  isPinned?: T;
  publishedAt?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "notifications_select".
 */
export interface NotificationsSelect<T extends boolean = true> {
  user?: T;
  type?: T;
  title?: T;
  body?: T;
  data?: T;
  readAt?: T;
  dedupeKey?: T;
  channels?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media_select".
 */
export interface MediaSelect<T extends boolean = true> {
  alt?: T;
  caption?: T;
  isActive?: T;
  _objectKey?: T;
  updatedAt?: T;
  createdAt?: T;
  url?: T;
  thumbnailURL?: T;
  filename?: T;
  mimeType?: T;
  filesize?: T;
  width?: T;
  height?: T;
  focalX?: T;
  focalY?: T;
  sizes?:
    | T
    | {
        thumbnail?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        card?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        banner?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
      };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "audit-logs_select".
 */
export interface AuditLogsSelect<T extends boolean = true> {
  admin?: T;
  actorLabel?: T;
  action?: T;
  collectionSlug?: T;
  documentId?: T;
  before?: T;
  after?: T;
  metadata?: T;
  ip?: T;
  userAgent?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-kv_select".
 */
export interface PayloadKvSelect<T extends boolean = true> {
  key?: T;
  data?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-locked-documents_select".
 */
export interface PayloadLockedDocumentsSelect<T extends boolean = true> {
  document?: T;
  globalSlug?: T;
  user?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences_select".
 */
export interface PayloadPreferencesSelect<T extends boolean = true> {
  user?: T;
  key?: T;
  value?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations_select".
 */
export interface PayloadMigrationsSelect<T extends boolean = true> {
  name?: T;
  batch?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "site-settings".
 */
export interface SiteSetting {
  id: number;
  appName: string;
  tagline?: string | null;
  logo?: (number | null) | Media;
  favicon?: (number | null) | Media;
  supportEmail?: string | null;
  supportPhone?: string | null;
  supportUrl?: string | null;
  /**
   * Used for daily limits/resets and for users who have not chosen a timezone.
   */
  defaultTimezone: string;
  /**
   * Amounts are stored in minor units (paise).
   */
  currency: 'INR';
  updatedAt?: string | null;
  createdAt?: string | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "reward-settings".
 */
export interface RewardSetting {
  id: number;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  minimumWithdrawal: number;
  /**
   * Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50
   */
  maximumWithdrawal: number;
  /**
   * Total a user may request per day (site timezone).
   */
  dailyWithdrawalLimit: number;
  /**
   * Requests a user may have in progress at once.
   */
  maxOpenWithdrawals: number;
  /**
   * Used when no active Referral rule exists.
   */
  defaultReferralReward?: number | null;
  defaultReferralQualification?:
    ('REGISTRATION' | 'VERIFIED_ACCOUNT' | 'FIRST_TASK' | 'FIRST_GAME' | 'AMOUNT_EARNED') | null;
  /**
   * Only used with "Amount earned".
   */
  defaultReferralQualificationAmount?: number | null;
  defaultReferralPerReferrerLimit?: number | null;
  /**
   * Suggested reward when creating a new game.
   */
  defaultGameReward?: number | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}
/**
 * Turn platform features on or off instantly.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "feature-settings".
 */
export interface FeatureSetting {
  id: number;
  gamesEnabled?: boolean | null;
  tasksEnabled?: boolean | null;
  campaignsEnabled?: boolean | null;
  referralsEnabled?: boolean | null;
  withdrawalsEnabled?: boolean | null;
  registrationEnabled?: boolean | null;
  /**
   * Shows a maintenance page to users. Admin panel stays available.
   */
  maintenanceMode?: boolean | null;
  maintenanceMessage?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "legal-settings".
 */
export interface LegalSetting {
  id: number;
  terms?: {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ('ltr' | 'rtl') | null;
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
      indent: number;
      version: number;
    };
    [k: string]: unknown;
  } | null;
  privacyPolicy?: {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ('ltr' | 'rtl') | null;
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
      indent: number;
      version: number;
    };
    [k: string]: unknown;
  } | null;
  refundPolicy?: {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ('ltr' | 'rtl') | null;
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
      indent: number;
      version: number;
    };
    [k: string]: unknown;
  } | null;
  responsibleUse?: {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ('ltr' | 'rtl') | null;
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
      indent: number;
      version: number;
    };
    [k: string]: unknown;
  } | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "site-settings_select".
 */
export interface SiteSettingsSelect<T extends boolean = true> {
  appName?: T;
  tagline?: T;
  logo?: T;
  favicon?: T;
  supportEmail?: T;
  supportPhone?: T;
  supportUrl?: T;
  defaultTimezone?: T;
  currency?: T;
  updatedAt?: T;
  createdAt?: T;
  globalType?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "reward-settings_select".
 */
export interface RewardSettingsSelect<T extends boolean = true> {
  minimumWithdrawal?: T;
  maximumWithdrawal?: T;
  dailyWithdrawalLimit?: T;
  maxOpenWithdrawals?: T;
  defaultReferralReward?: T;
  defaultReferralQualification?: T;
  defaultReferralQualificationAmount?: T;
  defaultReferralPerReferrerLimit?: T;
  defaultGameReward?: T;
  updatedAt?: T;
  createdAt?: T;
  globalType?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "feature-settings_select".
 */
export interface FeatureSettingsSelect<T extends boolean = true> {
  gamesEnabled?: T;
  tasksEnabled?: T;
  campaignsEnabled?: T;
  referralsEnabled?: T;
  withdrawalsEnabled?: T;
  registrationEnabled?: T;
  maintenanceMode?: T;
  maintenanceMessage?: T;
  updatedAt?: T;
  createdAt?: T;
  globalType?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "legal-settings_select".
 */
export interface LegalSettingsSelect<T extends boolean = true> {
  terms?: T;
  privacyPolicy?: T;
  refundPolicy?: T;
  responsibleUse?: T;
  updatedAt?: T;
  createdAt?: T;
  globalType?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "collections_widget".
 */
export interface CollectionsWidget {
  data?: {
    [k: string]: unknown;
  };
  width: 'full';
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "auth".
 */
export interface Auth {
  [k: string]: unknown;
}


declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}
```

src/payload.config.ts
```typescript
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { s3Storage } from '@payloadcms/storage-s3'
import sharp from 'sharp'

import { Admins } from './collections/Admins'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Wallets } from './collections/Wallets'
import { WalletTransactions } from './collections/WalletTransactions'
import { WalletAdjustments } from './collections/WalletAdjustments'
import { Tasks } from './collections/Tasks'
import { TaskCompletions } from './collections/TaskCompletions'
import { Games } from './collections/Games'
import { GameSessions } from './collections/GameSessions'
import { QuizQuestions } from './collections/QuizQuestions'
import { SudokuPuzzles } from './collections/SudokuPuzzles'
import { Campaigns } from './collections/Campaigns'
import { CampaignClaims } from './collections/CampaignClaims'
import { ReferralRules } from './collections/ReferralRules'
import { Referrals } from './collections/Referrals'
import { Withdrawals } from './collections/Withdrawals'
import { PayoutMethods } from './collections/PayoutMethods'
import { Banners } from './collections/Banners'
import { Announcements } from './collections/Announcements'
import { Notifications } from './collections/Notifications'
import { AuditLogs } from './collections/AuditLogs'
import { FeatureSettings, LegalSettings, RewardSettings, SiteSettings } from './globals'
import { DEFAULT_TIMEZONE } from './constants'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const s3Enabled = Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)
const smtpEnabled = Boolean(process.env.SMTP_HOST)

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: appUrl,
  cookiePrefix: 'rw-admin',
  cors: [appUrl],
  csrf: [appUrl],
  graphQL: { disable: true },
  admin: {
    user: Admins.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Rewards Admin' },
    components: {
      views: { dashboard: { Component: '/components/admin/Dashboard#Dashboard' } },
    },
    timezones: {
      defaultTimezone: DEFAULT_TIMEZONE,
      supportedTimezones: [
        { label: 'India (IST)', value: 'Asia/Kolkata' },
        { label: 'UTC', value: 'UTC' },
        { label: 'Dubai', value: 'Asia/Dubai' },
        { label: 'Singapore', value: 'Asia/Singapore' },
        { label: 'London', value: 'Europe/London' },
        { label: 'New York', value: 'America/New_York' },
        { label: 'Los Angeles', value: 'America/Los_Angeles' },
        { label: 'Sydney', value: 'Australia/Sydney' },
      ],
    },
  },
  collections: [
    Admins,
    Users,
    Wallets,
    WalletTransactions,
    WalletAdjustments,
    Tasks,
    TaskCompletions,
    Games,
    GameSessions,
    QuizQuestions,
    SudokuPuzzles,
    Campaigns,
    CampaignClaims,
    ReferralRules,
    Referrals,
    Withdrawals,
    PayoutMethods,
    Banners,
    Announcements,
    Notifications,
    Media,
    AuditLogs,
  ],
  globals: [SiteSettings, RewardSettings, FeatureSettings, LegalSettings],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '', max: 20, idleTimeoutMillis: 30_000 },
    // Dev: auto-sync the schema. Production: keep false and run `npm run migrate`.
    push: process.env.DB_PUSH === 'true',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  email: smtpEnabled
    ? nodemailerAdapter({
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'no-reply@example.com',
        defaultFromName: process.env.EMAIL_FROM_NAME || 'Rewards',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        },
      })
    : undefined,
  plugins: [
    ...(s3Enabled
      ? [
          s3Storage({
            collections: { media: true },
            bucket: process.env.S3_BUCKET!,
            config: {
              region: process.env.S3_REGION || 'auto',
              endpoint: process.env.S3_ENDPOINT || undefined,
              forcePathStyle: true,
              credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID!,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
              },
            },
          }),
        ]
      : []),
  ],
  upload: { limits: { fileSize: 5_000_000 } },
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})

```

src/services/audit.ts
```typescript
import type { Payload, PayloadRequest } from 'payload'
import type { AuditAction } from '@/constants'
import { getRequestMeta } from '@/lib/request-meta'

export interface AuditInput {
  payload: Payload
  /** Passing the current request joins its transaction and captures admin identity + ip/user-agent. */
  req?: Partial<PayloadRequest>
  action: AuditAction
  collection?: string
  documentId?: string | number | null
  before?: unknown
  after?: unknown
  /** Override the actor when there is no admin on the request (system / end-user initiated). */
  actorLabel?: string
  metadata?: Record<string, unknown>
}

/**
 * Append-only audit trail. The row is written on the same transaction as the operation it describes, so an
 * operation can never commit without its audit entry (or vice-versa).
 */
export async function logAudit(input: AuditInput) {
  const { payload, req } = input
  const user = req?.user as { id: number | string; collection?: string; email?: string } | null | undefined
  const admin = user?.collection === 'admins' ? user : null
  const meta = req?.headers ? getRequestMeta(req.headers) : undefined

  await payload.create({
    collection: 'audit-logs',
    overrideAccess: true,
    req: req as PayloadRequest | undefined,
    context: { auditWrite: true },
    data: {
      admin: admin ? (admin.id as number) : undefined,
      actorLabel: input.actorLabel ?? admin?.email ?? (user?.email ? `user:${user.email}` : 'system'),
      action: input.action,
      collectionSlug: input.collection,
      documentId: input.documentId != null ? String(input.documentId) : undefined,
      before: (input.before ?? null) as never,
      after: (input.after ?? null) as never,
      metadata: (input.metadata ?? null) as never,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    },
  })
}

```

src/services/campaign.ts
```typescript
import type { Payload, PayloadRequest } from 'payload'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import type { Campaign, User } from '@/payload-types'
import { assertEligible } from './eligibility'
import { creditWallet } from './wallet'
import { logAudit } from './audit'
import { notify } from './notification'
import { withFlag } from './context'

const campaignLockKey = (userId: number, campaignId: number) => `campaign:${userId}:${campaignId}`

export interface ActionProgress {
  type: string
  target: number
  current: number
  met: boolean
  label?: string
}

async function loadActiveCampaign(payload: Payload, id: number, req?: Partial<PayloadRequest>): Promise<Campaign> {
  const campaign = await payload.findByID({ collection: 'campaigns', id, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }).catch(() => null)
  if (!campaign || campaign.status !== 'ACTIVE') throw new AppError('NOT_AVAILABLE', 'This campaign is not currently active.')
  const now = new Date()
  if (campaign.startsAt && now < new Date(campaign.startsAt)) throw new AppError('NOT_AVAILABLE', 'This campaign has not started yet.')
  if (campaign.endsAt && now >= new Date(campaign.endsAt)) throw new AppError('NOT_AVAILABLE', 'This campaign has ended.')
  return campaign
}

/** Computes progress toward each required action, counted from the campaign's start (or creation if no start set). */
export async function computeCampaignProgress(payload: Payload, req: Partial<PayloadRequest> | undefined, campaign: Campaign, userId: number): Promise<ActionProgress[]> {
  const since = campaign.startsAt ?? campaign.createdAt
  const out: ActionProgress[] = []
  for (const action of campaign.requiredActions ?? []) {
    let current = 0
    const opts = { overrideAccess: true, req: req as PayloadRequest | undefined } as const
    switch (action.type) {
      case 'TASKS_COMPLETED': {
        const r = await payload.count({ collection: 'task-completions', where: { user: { equals: userId }, status: { equals: 'COMPLETED' }, completedAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
      case 'GAMES_PLAYED': {
        const r = await payload.count({ collection: 'game-sessions', where: { user: { equals: userId }, status: { equals: 'COMPLETED' }, createdAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
      case 'GAMES_WON': {
        const r = await payload.count({ collection: 'game-sessions', where: { user: { equals: userId }, result: { equals: 'WIN' }, createdAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
      case 'REFERRALS_QUALIFIED': {
        const r = await payload.count({ collection: 'referrals', where: { referrer: { equals: userId }, status: { in: ['QUALIFIED', 'REWARDED'] }, qualifiedAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
      case 'AMOUNT_EARNED': {
        const r = await payload.find({ collection: 'wallet-transactions', where: { user: { equals: userId }, createdAt: { greater_than_equal: since }, amount: { greater_than: 0 } }, limit: 1000, depth: 0, ...opts })
        current = r.docs.reduce((s, t) => s + Math.max(0, t.amount), 0)
        break
      }
      case 'SPECIFIC_TASK': {
        const taskId = typeof action.task === 'object' ? action.task?.id : action.task
        const r = await payload.count({ collection: 'task-completions', where: { user: { equals: userId }, task: { equals: taskId }, status: { equals: 'COMPLETED' }, completedAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
      case 'SPECIFIC_GAME': {
        const gameId = typeof action.game === 'object' ? action.game?.id : action.game
        const r = await payload.count({ collection: 'game-sessions', where: { user: { equals: userId }, game: { equals: gameId }, status: { equals: 'COMPLETED' }, createdAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
    }
    out.push({ type: action.type, target: action.target, current, met: current >= action.target, label: action.label ?? undefined })
  }
  return out
}

export interface ClaimCampaignInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  campaignId: number
}

export async function claimCampaign(i: ClaimCampaignInput) {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.campaignClaim, `${user.id}`)
  const campaign = await loadActiveCampaign(payload, i.campaignId, i.req)
  await assertEligible(payload, i.req, user, campaign.eligibility)

  return withTransaction(payload, i.req, async (r) => {
    await advisoryXactLock(payload, r, campaignLockKey(user.id, campaign.id))

    const mine = await payload.count({ collection: 'campaign-claims', where: { campaign: { equals: campaign.id }, user: { equals: user.id } }, overrideAccess: true, req: r })
    if (campaign.perUserLimit && mine.totalDocs >= campaign.perUserLimit) throw new AppError('LIMIT_REACHED', "You've already claimed this campaign.")

    if (campaign.userLimit) {
      const distinctUsers = await payload.find({ collection: 'campaign-claims', where: { campaign: { equals: campaign.id } }, limit: 0, depth: 0, overrideAccess: true, req: r })
      const uniqueUsers = new Set(distinctUsers.docs.map((c) => (typeof c.user === 'object' ? c.user.id : c.user)))
      if (!uniqueUsers.has(user.id) && uniqueUsers.size >= campaign.userLimit) throw new AppError('NOT_AVAILABLE', 'This campaign has reached its participant limit.')
    }
    if (campaign.globalLimit) {
      const total = await payload.count({ collection: 'campaign-claims', where: { campaign: { equals: campaign.id } }, overrideAccess: true, req: r })
      if (total.totalDocs >= campaign.globalLimit) throw new AppError('NOT_AVAILABLE', 'This campaign has reached its claim limit.')
    }

    const progress = await computeCampaignProgress(payload, r, campaign, user.id)
    if (progress.some((p) => !p.met)) throw new AppError('NOT_ELIGIBLE', 'Complete all the required actions before claiming.')

    const posted = await creditWallet({
      payload,
      req: r,
      userId: user.id,
      type: 'CAMPAIGN_REWARD',
      amount: campaign.rewardAmount,
      description: `Campaign reward — ${campaign.name}`,
      idempotencyKey: `campaign-claim:${campaign.id}:${user.id}:${mine.totalDocs + 1}`,
      referenceType: 'campaign',
      referenceId: campaign.id,
    })
    const claim = await withFlag(r, 'serviceWrite', () =>
      payload.create({
        collection: 'campaign-claims',
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { campaign: campaign.id, user: user.id, claimNumber: mine.totalDocs + 1, rewardAmount: campaign.rewardAmount, transaction: posted.transaction.id, claimedAt: new Date().toISOString(), progress: progress as never },
      }),
    )
    await logAudit({ payload, req: r, action: 'REWARD_CREDITED', collection: 'campaign-claims', documentId: claim.id, after: { campaignId: campaign.id, amount: campaign.rewardAmount } })
    await notify({ payload, req: r, userId: user.id, type: 'REWARD_CREDITED', title: 'Campaign reward claimed', body: `You earned a reward from "${campaign.name}".`, dedupeKey: `campaign-claim:${claim.id}:notif` })
    const { checkReferralQualification } = await import('./referral')
    await checkReferralQualification(payload, r, user.id, 'EARNED')
    return claim
  })
}

```

src/services/context.ts
```typescript
import type { PayloadRequest } from 'payload'

/**
 * Temporarily sets a request-context flag (e.g. `walletWrite`) while `fn` runs, then clears it. The flags are
 * the collection-level guards that stop anything other than the owning service from writing protected data.
 */
export async function withFlag<T>(req: Partial<PayloadRequest>, flag: string, fn: () => Promise<T>): Promise<T> {
  req.context = { ...(req.context ?? {}), [flag]: true }
  try {
    return await fn()
  } finally {
    if (req.context) delete req.context[flag]
  }
}

```

src/services/eligibility.ts
```typescript
import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { AppError } from '@/lib/errors'

export interface EligibilityRule {
  minAccountAgeDays?: number | null
  requireVerifiedAccount?: boolean | null
  requirePayoutMethod?: boolean | null
  minLifetimeEarned?: number | null
}

/** Shared eligibility checks used by Tasks and Campaigns. Throws AppError with a user-facing reason. */
export async function assertEligible(payload: Payload, req: Partial<PayloadRequest> | undefined, user: User, rule?: EligibilityRule | null) {
  const wasPendingVerification: boolean = user.status === 'PENDING_VERIFICATION'
  if (user.status !== 'ACTIVE') throw new AppError('ACCOUNT_RESTRICTED', 'Your account is not able to earn right now.')
  if (!rule) return
  if (rule.minAccountAgeDays) {
    const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000
    if (ageDays < rule.minAccountAgeDays) throw new AppError('NOT_ELIGIBLE', `Available once your account is ${rule.minAccountAgeDays} days old.`)
  }
  if (rule.requireVerifiedAccount && wasPendingVerification) throw new AppError('NOT_ELIGIBLE', 'Verify your email to unlock this.')
  if (rule.requirePayoutMethod) {
    const pm = await payload.count({ collection: 'payout-methods', where: { user: { equals: user.id }, status: { equals: 'ACTIVE' } }, overrideAccess: true, req: req as PayloadRequest | undefined })
    if (pm.totalDocs === 0) throw new AppError('NOT_ELIGIBLE', 'Add a payout method first.')
  }
  if (rule.minLifetimeEarned) {
    const wallet = await payload.find({ collection: 'wallets', where: { user: { equals: user.id } }, limit: 1, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined })
    if ((wallet.docs[0]?.lifetimeEarned ?? 0) < rule.minLifetimeEarned) throw new AppError('NOT_ELIGIBLE', 'You have not earned enough to unlock this yet.')
  }
}

```

src/services/game.ts
```typescript
import { randomUUID } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { getRequestMeta } from '@/lib/request-meta'
import { dayBounds } from '@/lib/time'
import { mulDivFloor } from '@/lib/money'
import type { Game, GameSession, User } from '@/payload-types'
import type { GameType } from '@/constants'
import { ENGINES } from '@/games/registry'
import { creditWallet } from './wallet'
import { logAudit } from './audit'
import { notify } from './notification'
import { withFlag } from './context'
import { getSettings } from './settings'

const gameLockKey = (userId: number, gameId: number) => `game:${userId}:${gameId}`

async function loadActiveGame(payload: Payload, id: number, req?: Partial<PayloadRequest>): Promise<Game> {
  const game = await payload.findByID({ collection: 'games', id, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }).catch(() => null)
  if (!game || game.status !== 'ACTIVE') throw new AppError('NOT_AVAILABLE', 'This game is not currently available.')
  const now = new Date()
  if (game.startsAt && now < new Date(game.startsAt)) throw new AppError('NOT_AVAILABLE', 'This game has not started yet.')
  if (game.endsAt && now >= new Date(game.endsAt)) throw new AppError('NOT_AVAILABLE', 'This game has ended.')
  return game
}

export interface StartGameInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  gameId: number
  headers: Headers
}

export interface StartGameResult {
  session: GameSession
  client: unknown
}

export async function startGameSession(i: StartGameInput): Promise<StartGameResult> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.gameStart, `${user.id}`)
  const game = await loadActiveGame(payload, i.gameId, i.req)
  if (user.status !== 'ACTIVE') throw new AppError('ACCOUNT_RESTRICTED', 'Your account cannot play right now.')

  const settings = await getSettings(payload)
  const { start, end } = dayBounds(new Date(), settings.site.defaultTimezone)

  return withTransaction(payload, i.req, async (r) => {
    await advisoryXactLock(payload, r, gameLockKey(user.id, game.id))

    const inProgress = await payload.find({ collection: 'game-sessions', where: { user: { equals: user.id }, game: { equals: game.id }, status: { equals: 'STARTED' } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    if (inProgress.docs[0] && new Date(inProgress.docs[0].expiresAt) > new Date()) {
      const engine = ENGINES[game.type as GameType]
      // Resume: re-derive the client view is not stored, so we simply let the client resume with what it has;
      // safer to expire and start fresh to avoid ambiguity.
      await withFlag(r, 'serviceWrite', () => payload.update({ collection: 'game-sessions', id: inProgress.docs[0]!.id, overrideAccess: true, depth: 0, req: r, data: { status: 'EXPIRED' } }))
      void engine
    }

    if (game.maxAttemptsPerDay) {
      const today = await payload.count({ collection: 'game-sessions', where: { user: { equals: user.id }, game: { equals: game.id }, createdAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() } }, overrideAccess: true, req: r })
      if (today.totalDocs >= game.maxAttemptsPerDay) throw new AppError('LIMIT_REACHED', "You've reached today's play limit for this game.")
    }
    if (game.cooldownSeconds) {
      const last = await payload.find({ collection: 'game-sessions', where: { user: { equals: user.id }, game: { equals: game.id } }, sort: '-startedAt', limit: 1, depth: 0, overrideAccess: true, req: r })
      const lastAt = last.docs[0]?.startedAt
      if (lastAt && Date.now() - new Date(lastAt).getTime() < game.cooldownSeconds * 1000) {
        throw new AppError('COOLDOWN', 'Please wait before playing again.', { retryAfterSeconds: game.cooldownSeconds })
      }
    }

    const engine = ENGINES[game.type as GameType]
    if (!engine) throw new AppError('INTERNAL', 'This game type is not supported yet.')
    const { client, server, maxScore } = await engine.start(payload, game)

    const meta = getRequestMeta(i.headers)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (game.durationSeconds ?? 180) * 1000)
    const sessionId = randomUUID()
    const dayKey = start.toISOString().slice(0, 10)

    const session = await withFlag(r, 'serviceWrite', () =>
      payload.create({
        collection: 'game-sessions',
        overrideAccess: true,
        depth: 0,
        req: r,
        data: {
          sessionId,
          user: user.id,
          game: game.id,
          status: 'STARTED',
          startedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          dayKey,
          maxScore,
          attempts: 1,
          serverState: server as never,
          ip: meta.ip,
          userAgent: meta.userAgent,
          device: meta.device,
        },
      }),
    )
    return { session, client }
  })
}

export interface SubmitGameInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  sessionId: string
  answer: unknown
}

export async function submitGameSession(i: SubmitGameInput): Promise<GameSession> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.gameComplete, `${user.id}`)

  return withTransaction(payload, i.req, async (r) => {
    const found = await payload.find({ collection: 'game-sessions', where: { sessionId: { equals: i.sessionId } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    const session = found.docs[0]
    const owner = session && (typeof session.user === 'object' ? (session.user as { id: number }).id : session.user)
    if (!session || owner !== user.id) throw new AppError('NOT_FOUND', 'Session not found.')
    if (session.status !== 'STARTED') throw new AppError('INVALID_STATE', 'This session has already been finalised.')

    const game = await payload.findByID({ collection: 'games', id: typeof session.game === 'object' ? session.game.id : session.game, depth: 0, overrideAccess: true, req: r })
    await advisoryXactLock(payload, r, gameLockKey(user.id, game.id))

    const now = new Date()
    if (now > new Date(session.expiresAt)) {
      await withFlag(r, 'serviceWrite', () => payload.update({ collection: 'game-sessions', id: session.id, overrideAccess: true, depth: 0, req: r, data: { status: 'EXPIRED', endedAt: now.toISOString() } }))
      throw new AppError('INVALID_STATE', 'This session expired. Start a new one.')
    }

    const engine = ENGINES[game.type as GameType]
    if (!engine) throw new AppError('INTERNAL', 'This game type is not supported yet.')
    const elapsedSeconds = (now.getTime() - new Date(session.startedAt).getTime()) / 1000
    const result = await engine.submit(payload, game, { server: session.serverState as never, payload: i.answer, elapsedSeconds })

    const scorePercent = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0
    const gameResult = result.rejectionReason ? 'LOSE' : scorePercent >= 100 ? 'WIN' : scorePercent > 0 ? 'PARTIAL' : 'LOSE'

    let rewardAmount = 0
    let rewardBlockedReason: string | null = null
    if (!result.rejectionReason) {
      const settings = await getSettings(payload)
      const { start, end } = dayBounds(now, settings.site.defaultTimezone)
      if (game.dailyRewardedPlays) {
        const rewardedToday = await payload.count({
          collection: 'game-sessions',
          where: { user: { equals: user.id }, game: { equals: game.id }, rewardAmount: { greater_than: 0 }, createdAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() } },
          overrideAccess: true,
          req: r,
        })
        if (rewardedToday.totalDocs >= game.dailyRewardedPlays) rewardBlockedReason = 'Daily rewarded-play limit reached.'
      }
      if (!rewardBlockedReason && scorePercent >= (game.reward?.minScorePercent ?? 0)) {
        rewardAmount = computeReward(game, scorePercent)
      }
    }

    let transactionId: number | undefined
    if (rewardAmount > 0) {
      const posted = await creditWallet({
        payload,
        req: r,
        userId: user.id,
        type: 'GAME_REWARD',
        amount: rewardAmount,
        description: `Game reward — ${game.name}`,
        idempotencyKey: `game-session:${session.id}`,
        referenceType: 'game-session',
        referenceId: session.id,
      })
      transactionId = posted.transaction.id
    }

    const updated = await withFlag(r, 'serviceWrite', () =>
      payload.update({
        collection: 'game-sessions',
        id: session.id,
        overrideAccess: true,
        depth: 0,
        req: r,
        data: {
          status: 'COMPLETED',
          endedAt: now.toISOString(),
          score: result.score,
          scorePercent,
          result: gameResult,
          rewardAmount,
          transaction: transactionId,
          rounds: result.rounds as never,
          rejectionReason: result.rejectionReason ?? rewardBlockedReason ?? undefined,
        },
      }),
    )

    if (rewardAmount > 0) {
      await notify({ payload, req: r, userId: user.id, type: 'GAME_REWARD', title: 'Game reward credited', body: `You earned a reward playing ${game.name}.`, dedupeKey: `game-session:${session.id}:notif` })
      const { checkReferralQualification } = await import('./referral')
      await checkReferralQualification(payload, r, user.id, 'GAME_COMPLETED')
      await checkReferralQualification(payload, r, user.id, 'EARNED')
    }
    if (result.rejectionReason) {
      await logAudit({ payload, req: r, action: 'OTHER', collection: 'game-sessions', documentId: session.id, after: { rejected: result.rejectionReason } })
    }
    return updated
  })
}

function computeReward(game: Game, scorePercent: number): number {
  const reward = game.reward
  if (!reward) return 0
  if (reward.mode === 'FIXED') return reward.amount ?? 0
  if (reward.mode === 'PER_SCORE') return mulDivFloor(reward.amount ?? 0, scorePercent, 100)
  if (reward.mode === 'TIERED') {
    const tiers = [...(reward.tiers ?? [])].sort((a, b) => b.minScorePercent - a.minScorePercent)
    const hit = tiers.find((t) => scorePercent >= t.minScorePercent)
    return hit?.amount ?? 0
  }
  return 0
}

```

src/services/notification.ts
```typescript
import type { Payload, PayloadRequest } from 'payload'
import type { NotificationType } from '@/constants'

export interface NotifyInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  userId: number
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
  /** Same key → at most one notification. */
  dedupeKey?: string
}

/** Delivery channels. Only in-app exists today; add email / push / Telegram adapters here later. */
export interface NotificationChannel {
  name: string
  deliver(n: { userId: number; type: NotificationType; title: string; body?: string; data?: Record<string, unknown> }): Promise<'SENT' | 'SKIPPED'>
}
const inApp: NotificationChannel = { name: 'in_app', deliver: async () => 'SENT' }
export const CHANNELS: NotificationChannel[] = [inApp]

/**
 * Creates an in-app notification. Never throws — a failed notification must not roll back a reward.
 * (Failures inside an open DB transaction are avoided by pre-checking the dedupe key instead of relying
 * on the unique constraint, which would abort the surrounding transaction.)
 */
export async function notify(input: NotifyInput): Promise<void> {
  const { payload, req } = input
  try {
    if (input.dedupeKey) {
      const existing = await payload.find({
        collection: 'notifications',
        where: { dedupeKey: { equals: input.dedupeKey } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req: req as PayloadRequest | undefined,
      })
      if (existing.docs.length) return
    }
    const channels: Record<string, string> = {}
    for (const ch of CHANNELS) channels[ch.name] = await ch.deliver({ userId: input.userId, type: input.type, title: input.title, body: input.body, data: input.data })
    await payload.create({
      collection: 'notifications',
      overrideAccess: true,
      req: req as PayloadRequest | undefined,
      data: {
        user: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data ?? null) as never,
        dedupeKey: input.dedupeKey,
        channels: channels as never,
      },
    })
  } catch (err) {
    console.error('[notify] failed:', (err as Error).message)
  }
}

```

src/services/payout-method.ts
```typescript
import type { Payload, PayloadRequest } from 'payload'
import { AppError } from '@/lib/errors'
import { encrypt, maskTail, maskUpi, sha256 } from '@/lib/crypto'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import type { PayoutMethodType } from '@/constants'
import type { PayoutMethod, User } from '@/payload-types'
import { withFlag } from './context'
import { logAudit } from './audit'

export interface AddPayoutMethodInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  type: PayoutMethodType
  label: string
  holderName?: string
  upiId?: string
  accountNumber?: string
  ifsc?: string
  bankName?: string
  makeDefault?: boolean
}

export async function addPayoutMethod(i: AddPayoutMethodInput): Promise<PayoutMethod> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.payoutMethod, `${user.id}`)

  let maskedDetails: string
  let fingerprintSource: string
  if (i.type === 'UPI') {
    if (!i.upiId || !/^[\w.+-]{2,}@[a-zA-Z]{2,}$/.test(i.upiId)) throw new AppError('VALIDATION_ERROR', 'Enter a valid UPI ID, e.g. name@bank.')
    maskedDetails = maskUpi(i.upiId)
    fingerprintSource = `UPI:${i.upiId.toLowerCase()}`
  } else {
    if (!i.accountNumber || !/^\d{6,20}$/.test(i.accountNumber)) throw new AppError('VALIDATION_ERROR', 'Enter a valid bank account number.')
    if (!i.ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(i.ifsc.toUpperCase())) throw new AppError('VALIDATION_ERROR', 'Enter a valid IFSC code.')
    maskedDetails = maskTail(i.accountNumber)
    fingerprintSource = `BANK:${i.accountNumber}:${i.ifsc.toUpperCase()}`
  }
  const fingerprint = sha256(fingerprintSource)

  const existingCount = await payload.count({ collection: 'payout-methods', where: { user: { equals: user.id }, status: { equals: 'ACTIVE' } }, overrideAccess: true, req: i.req as PayloadRequest | undefined })

  const encryptedDetails = encrypt(JSON.stringify({ upiId: i.upiId, accountNumber: i.accountNumber, ifsc: i.ifsc?.toUpperCase(), bankName: i.bankName, holderName: i.holderName }))

  const created = await withFlag(i.req ?? {}, 'serviceWrite', () =>
    payload.create({
      collection: 'payout-methods',
      overrideAccess: true,
      depth: 0,
      req: i.req as PayloadRequest | undefined,
      data: {
        user: user.id,
        type: i.type,
        label: i.label,
        holderName: i.holderName,
        maskedDetails,
        ifsc: i.ifsc?.toUpperCase(),
        bankName: i.bankName,
        encryptedDetails,
        fingerprint,
        isDefault: i.makeDefault ?? existingCount.totalDocs === 0,
        status: 'ACTIVE',
      },
    }),
  )

  if (created.isDefault) {
    await withFlag(i.req ?? {}, 'serviceWrite', async () => {
      const others = await payload.find({ collection: 'payout-methods', where: { user: { equals: user.id }, id: { not_equals: created.id }, isDefault: { equals: true } }, limit: 100, depth: 0, overrideAccess: true, req: i.req as PayloadRequest | undefined })
      for (const m of others.docs) await payload.update({ collection: 'payout-methods', id: m.id, overrideAccess: true, depth: 0, req: i.req as PayloadRequest | undefined, data: { isDefault: false } })
    })
  }

  await logAudit({ payload, req: i.req, action: 'OTHER', collection: 'payout-methods', documentId: created.id, actorLabel: `user:${user.email}`, after: { type: i.type, maskedDetails } })
  return created
}

export async function removePayoutMethod(payload: Payload, req: Partial<PayloadRequest> | undefined, user: User, id: number) {
  const method = await payload.findByID({ collection: 'payout-methods', id, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }).catch(() => null)
  const owner = method && (typeof method.user === 'object' ? method.user.id : method.user)
  if (!method || owner !== user.id) throw new AppError('NOT_FOUND', 'Payout method not found.')
  return withFlag(req ?? {}, 'serviceWrite', () =>
    payload.update({ collection: 'payout-methods', id, overrideAccess: true, depth: 0, req: req as PayloadRequest | undefined, data: { status: 'REMOVED', removedAt: new Date().toISOString(), isDefault: false } }),
  )
}

```

src/services/payout/index.ts
```typescript
import { manualProvider } from './manual'
import type { PayoutProvider } from './types'

const providers: Record<string, PayoutProvider> = { manual: manualProvider }

export function getPayoutProvider(): PayoutProvider {
  return providers[process.env.PAYOUT_PROVIDER || 'manual'] ?? manualProvider
}

export * from './types'

```

src/services/payout/manual.ts
```typescript
import type { PayoutProvider } from './types'

/** Default provider: the finance team pays out externally and records the reference in the admin panel. */
export const manualProvider: PayoutProvider = {
  name: 'manual',
  async payout(req) {
    return { status: 'INITIATED', message: `Awaiting manual payout of ${req.amount} ${req.currency} by the finance team.` }
  },
}

```

src/services/payout/types.ts
```typescript
export interface PayoutDestination {
  method: 'UPI' | 'BANK'
  upiId?: string
  accountNumber?: string
  ifsc?: string
  holderName?: string
  bankName?: string
}

export interface PayoutRequest {
  withdrawalId: number
  amount: number
  currency: string
  destination: PayoutDestination
}

export interface PayoutResult {
  status: 'INITIATED' | 'COMPLETED' | 'FAILED'
  providerReference?: string
  message?: string
}

/** Implement this to plug in a real payout provider (UPI/bank transfer API). */
export interface PayoutProvider {
  name: string
  payout(req: PayoutRequest): Promise<PayoutResult>
}

```

src/services/referral.ts
```typescript
import type { Payload, PayloadRequest } from 'payload'
import { AppError } from '@/lib/errors'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import type { Referral, ReferralRule, User } from '@/payload-types'
import { creditWallet } from './wallet'
import { logAudit } from './audit'
import { notify } from './notification'
import { withFlag } from './context'

const referralLockKey = (userId: number) => `referral:${userId}`

/** Picks the highest-priority active Referral rule at `now`, or null (defaults from Reward settings apply). */
async function resolveActiveRule(payload: Payload, now: Date, req?: Partial<PayloadRequest>): Promise<ReferralRule | null> {
  const res = await payload.find({
    collection: 'referral-rules',
    where: { isActive: { equals: true }, or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now.toISOString() } }] },
    sort: '-priority',
    limit: 50,
    depth: 0,
    overrideAccess: true,
    req: req as PayloadRequest | undefined,
  })
  const usable = res.docs.filter((r) => !r.endsAt || new Date(r.endsAt) > now)
  return usable[0] ?? null
}

export interface BindReferralInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  newUser: User
  code: string
}

/** Called during registration. Creates a PENDING Referral row bound to whichever rule is active right now. */
export async function bindReferral(i: BindReferralInput): Promise<Referral | null> {
  const { payload, newUser } = i
  const code = i.code.trim().toUpperCase()
  const referrer = await payload.find({ collection: 'users', where: { referralCode: { equals: code } }, limit: 1, depth: 0, overrideAccess: true })
  const referrerUser = referrer.docs[0]
  if (!referrerUser) return null
  if (referrerUser.id === newUser.id) return null

  const now = new Date()
  const rule = await resolveActiveRule(payload, now, i.req)
  const { getSettings } = await import('./settings')
  const settings = await getSettings(payload)

  const referrerReward = rule?.referrerReward ?? settings.reward.defaultReferralReward
  const refereeReward = rule?.refereeReward ?? 0
  const qualification = rule?.qualification ?? settings.reward.defaultReferralQualification
  const qualificationAmount = rule?.qualificationAmount ?? settings.reward.defaultReferralQualificationAmount
  const perReferrerLimit = rule?.perReferrerLimit ?? settings.reward.defaultReferralPerReferrerLimit

  if (perReferrerLimit && perReferrerLimit > 0) {
    const count = await payload.count({ collection: 'referrals', where: { referrer: { equals: referrerUser.id }, status: { not_equals: 'REJECTED' } }, overrideAccess: true })
    if (count.totalDocs >= perReferrerLimit) throw new AppError('LIMIT_REACHED', 'This referral code has reached its limit.')
  }
  if (rule?.globalLimit && rule.globalLimit > 0) {
    const count = await payload.count({ collection: 'referrals', where: { rule: { equals: rule.id }, status: { not_equals: 'REJECTED' } }, overrideAccess: true })
    if (count.totalDocs >= rule.globalLimit) throw new AppError('LIMIT_REACHED', 'This referral promotion has reached its limit.')
  }

  return withFlag(i.req ?? {}, 'serviceWrite', () =>
    payload.create({
      collection: 'referrals',
      overrideAccess: true,
      depth: 0,
      req: i.req as PayloadRequest | undefined,
      data: {
        referrer: referrerUser.id,
        referredUser: newUser.id,
        code,
        status: 'PENDING',
        rule: rule?.id,
        terms: { referrerReward, refereeReward, qualification, qualificationAmount } as never,
        registeredAt: now.toISOString(),
        referrerReward,
        refereeReward,
      },
    }),
  )
}

async function payOutReferral(payload: Payload, req: Partial<PayloadRequest> | undefined, referral: Referral) {
  const referrerId = typeof referral.referrer === 'object' ? referral.referrer.id : referral.referrer
  const referredId = typeof referral.referredUser === 'object' ? referral.referredUser.id : referral.referredUser
  const terms = (referral.terms ?? {}) as { referrerReward?: number; refereeReward?: number }
  const referrerReward = referral.referrerReward ?? terms.referrerReward ?? 0
  const refereeReward = referral.refereeReward ?? terms.refereeReward ?? 0

  return withTransaction(payload, req, async (r) => {
    await advisoryXactLock(payload, r, referralLockKey(referral.id))
    const fresh = await payload.findByID({ collection: 'referrals', id: referral.id, depth: 0, overrideAccess: true, req: r })
    if (fresh.status === 'REWARDED') return fresh
    if (fresh.status === 'REJECTED') return fresh

    let referrerTx: number | undefined
    let refereeTx: number | undefined
    if (referrerReward > 0) {
      const posted = await creditWallet({ payload, req: r, userId: referrerId, type: 'REFERRAL_REWARD', amount: referrerReward, description: 'Referral reward', idempotencyKey: `referral:${referral.id}:referrer` })
      referrerTx = posted.transaction.id
    }
    if (refereeReward > 0) {
      const posted = await creditWallet({ payload, req: r, userId: referredId, type: 'REFERRAL_REWARD', amount: refereeReward, description: 'Welcome bonus', idempotencyKey: `referral:${referral.id}:referee` })
      refereeTx = posted.transaction.id
    }

    const updated = await withFlag(r, 'serviceWrite', () =>
      payload.update({
        collection: 'referrals',
        id: referral.id,
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { status: 'REWARDED', rewardedAt: new Date().toISOString(), referrerTransaction: referrerTx, refereeTransaction: refereeTx },
      }),
    )
    await logAudit({ payload, req: r, action: 'REWARD_CREDITED', collection: 'referrals', documentId: referral.id, after: { referrerReward, refereeReward } })
    await notify({ payload, req: r, userId: referrerId, type: 'REFERRAL_REWARDED', title: 'Referral reward credited', body: `You earned a referral reward.`, dedupeKey: `referral:${referral.id}:referrer:notif` })
    return updated
  })
}

/**
 * Call whenever a referred user's status might newly satisfy their bound referral's qualification rule:
 * after registration (REGISTRATION), after email verification (VERIFIED_ACCOUNT), after their first
 * completed task/game (FIRST_TASK/FIRST_GAME), or after any wallet credit (AMOUNT_EARNED).
 */
export async function checkReferralQualification(payload: Payload, req: Partial<PayloadRequest> | undefined, referredUserId: number, event: 'REGISTRATION' | 'VERIFIED_ACCOUNT' | 'TASK_COMPLETED' | 'GAME_COMPLETED' | 'EARNED') {
  const found = await payload.find({ collection: 'referrals', where: { referredUser: { equals: referredUserId }, status: { equals: 'PENDING' } }, limit: 1, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined })
  const referral = found.docs[0]
  if (!referral) return
  const terms = (referral.terms ?? {}) as { qualification?: string; qualificationAmount?: number }
  const qualification = terms.qualification ?? 'FIRST_TASK'

  const satisfied =
    (qualification === 'REGISTRATION' && event === 'REGISTRATION') ||
    (qualification === 'VERIFIED_ACCOUNT' && event === 'VERIFIED_ACCOUNT') ||
    (qualification === 'FIRST_TASK' && event === 'TASK_COMPLETED') ||
    (qualification === 'FIRST_GAME' && event === 'GAME_COMPLETED') ||
    (qualification === 'AMOUNT_EARNED' && event === 'EARNED' && (await lifetimeEarnedAtLeast(payload, referredUserId, terms.qualificationAmount ?? 0)))
  if (!satisfied) return

  await withFlag(req ?? {}, 'serviceWrite', () =>
    payload.update({ collection: 'referrals', id: referral.id, overrideAccess: true, depth: 0, req: req as PayloadRequest | undefined, data: { status: 'QUALIFIED', qualifiedAt: new Date().toISOString() } }),
  )
  await payOutReferral(payload, req, referral)
}

async function lifetimeEarnedAtLeast(payload: Payload, userId: number, amount: number): Promise<boolean> {
  if (amount <= 0) return true
  const wallet = await payload.find({ collection: 'wallets', where: { user: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true })
  return (wallet.docs[0]?.lifetimeEarned ?? 0) >= amount
}

```

src/services/settings.ts
```typescript
import type { Payload } from 'payload'
import { CACHE, cached } from '@/lib/cache'
import { getPayloadClient } from '@/lib/payload'
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from '@/constants'

export interface AppSettings {
  site: { appName: string; tagline: string; supportEmail?: string | null; supportPhone?: string | null; supportUrl?: string | null; defaultTimezone: string; currency: string; logoUrl?: string | null }
  reward: {
    minimumWithdrawal: number
    maximumWithdrawal: number
    dailyWithdrawalLimit: number
    maxOpenWithdrawals: number
    defaultReferralReward: number
    defaultReferralQualification: string
    defaultReferralQualificationAmount: number
    defaultReferralPerReferrerLimit: number
  }
  features: {
    gamesEnabled: boolean
    tasksEnabled: boolean
    campaignsEnabled: boolean
    referralsEnabled: boolean
    withdrawalsEnabled: boolean
    registrationEnabled: boolean
    maintenanceMode: boolean
    maintenanceMessage: string
  }
}

async function load(payload: Payload): Promise<AppSettings> {
  const opts = { overrideAccess: true, depth: 1 } as const
  const [site, reward, features] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings', ...opts }),
    payload.findGlobal({ slug: 'reward-settings', ...opts }),
    payload.findGlobal({ slug: 'feature-settings', ...opts }),
  ])
  const logo = typeof site.logo === 'object' && site.logo ? site.logo.url : null
  return {
    site: {
      appName: site.appName || 'Rewards',
      tagline: site.tagline || '',
      supportEmail: site.supportEmail,
      supportPhone: site.supportPhone,
      supportUrl: site.supportUrl,
      defaultTimezone: site.defaultTimezone || DEFAULT_TIMEZONE,
      currency: site.currency || DEFAULT_CURRENCY,
      logoUrl: logo,
    },
    reward: {
      minimumWithdrawal: reward.minimumWithdrawal ?? 10000,
      maximumWithdrawal: reward.maximumWithdrawal ?? 1000000,
      dailyWithdrawalLimit: reward.dailyWithdrawalLimit ?? 2500000,
      maxOpenWithdrawals: reward.maxOpenWithdrawals ?? 1,
      defaultReferralReward: reward.defaultReferralReward ?? 1000,
      defaultReferralQualification: reward.defaultReferralQualification ?? 'FIRST_TASK',
      defaultReferralQualificationAmount: reward.defaultReferralQualificationAmount ?? 0,
      defaultReferralPerReferrerLimit: reward.defaultReferralPerReferrerLimit ?? 50,
    },
    features: {
      gamesEnabled: features.gamesEnabled ?? true,
      tasksEnabled: features.tasksEnabled ?? true,
      campaignsEnabled: features.campaignsEnabled ?? true,
      referralsEnabled: features.referralsEnabled ?? true,
      withdrawalsEnabled: features.withdrawalsEnabled ?? true,
      registrationEnabled: features.registrationEnabled ?? true,
      maintenanceMode: features.maintenanceMode ?? false,
      maintenanceMessage: features.maintenanceMessage || 'We are making improvements and will be back shortly.',
    },
  }
}

/** Settings are cached briefly in Redis and invalidated by the global's afterChange hook. */
export async function getSettings(payload?: Payload): Promise<AppSettings> {
  const p = payload ?? (await getPayloadClient())
  return cached(`${CACHE.settings}:app`, 60, () => load(p))
}

```

src/services/task.ts
```typescript
import type { Payload, PayloadRequest } from 'payload'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { getClientIp, getRequestMeta } from '@/lib/request-meta'
import { dayBounds } from '@/lib/time'
import type { Task, TaskCompletion, User } from '@/payload-types'
import { safeEqual } from '@/lib/crypto'
import { assertEligible } from './eligibility'
import { creditWallet } from './wallet'
import { logAudit } from './audit'
import { notify } from './notification'
import { withFlag } from './context'
import { getSettings } from './settings'

const taskLockKey = (userId: number, taskId: number) => `task:${userId}:${taskId}`

async function loadActiveTask(payload: Payload, taskId: number, req?: Partial<PayloadRequest>): Promise<Task> {
  const task = await payload.findByID({ collection: 'tasks', id: taskId, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }).catch(() => null)
  if (!task || !task.isActive || task.status !== 'ACTIVE') throw new AppError('NOT_AVAILABLE', 'This task is not currently available.')
  const now = new Date()
  if (task.startsAt && now < new Date(task.startsAt)) throw new AppError('NOT_AVAILABLE', 'This task has not started yet.')
  if (task.endsAt && now >= new Date(task.endsAt)) throw new AppError('NOT_AVAILABLE', 'This task has ended.')
  return task
}

async function enforceLimits(payload: Payload, task: Task, user: User, req?: Partial<PayloadRequest>) {
  if (task.perUserLimit) {
    const mine = await payload.count({ collection: 'task-completions', where: { task: { equals: task.id }, user: { equals: user.id }, status: { not_equals: 'REJECTED' } }, overrideAccess: true, req: req as PayloadRequest | undefined })
    if (mine.totalDocs >= task.perUserLimit) throw new AppError('LIMIT_REACHED', "You've reached the limit for this task.")
  }
  const settings = await getSettings(payload)
  const { start, end } = dayBounds(new Date(), settings.site.defaultTimezone)
  if (task.perUserDailyLimit) {
    const today = await payload.count({
      collection: 'task-completions',
      where: { task: { equals: task.id }, user: { equals: user.id }, status: { not_equals: 'REJECTED' }, startedAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() } },
      overrideAccess: true,
      req: req as PayloadRequest | undefined,
    })
    if (today.totalDocs >= task.perUserDailyLimit) throw new AppError('LIMIT_REACHED', "You've reached today's limit for this task.")
  }
  if (task.dailyLimit) {
    const today = await payload.count({
      collection: 'task-completions',
      where: { task: { equals: task.id }, status: { not_equals: 'REJECTED' }, startedAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() } },
      overrideAccess: true,
      req: req as PayloadRequest | undefined,
    })
    if (today.totalDocs >= task.dailyLimit) throw new AppError('NOT_AVAILABLE', 'This task has reached its daily capacity. Try again tomorrow.')
  }
  if (task.totalLimit) {
    const total = await payload.count({ collection: 'task-completions', where: { task: { equals: task.id }, status: { not_equals: 'REJECTED' } }, overrideAccess: true, req: req as PayloadRequest | undefined })
    if (total.totalDocs >= task.totalLimit) throw new AppError('NOT_AVAILABLE', 'This task is no longer available.')
  }
  if (task.cooldownMinutes) {
    const last = await payload.find({
      collection: 'task-completions',
      where: { task: { equals: task.id }, user: { equals: user.id } },
      sort: '-startedAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req: req as PayloadRequest | undefined,
    })
    const lastAt = last.docs[0]?.startedAt
    if (lastAt && Date.now() - new Date(lastAt).getTime() < task.cooldownMinutes * 60_000) {
      throw new AppError('COOLDOWN', 'Please wait before attempting this task again.', { retryAfterSeconds: task.cooldownMinutes * 60 })
    }
  }
}

export interface StartTaskInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  taskId: number
  headers: Headers
}

/** Starts (or resumes) an attempt. Server decides pass/fail — never trust a client-reported "done". */
export async function startTask(i: StartTaskInput): Promise<TaskCompletion> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.taskAction, `${user.id}`)
  const task = await loadActiveTask(payload, i.taskId, i.req)
  await assertEligible(payload, i.req, user, task.eligibility)

  return withTransaction(payload, i.req, async (r) => {
    await advisoryXactLock(payload, r, taskLockKey(user.id, task.id))
    const existingStarted = await payload.find({ collection: 'task-completions', where: { task: { equals: task.id }, user: { equals: user.id }, status: { equals: 'STARTED' } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    if (existingStarted.docs[0]) return existingStarted.docs[0]

    await enforceLimits(payload, task, user, r)
    const meta = getRequestMeta(i.headers)
    const attemptCount = await payload.count({ collection: 'task-completions', where: { task: { equals: task.id }, user: { equals: user.id } }, overrideAccess: true, req: r })
    return withFlag(r, 'serviceWrite', () =>
      payload.create({
        collection: 'task-completions',
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { task: task.id, user: user.id, attemptNumber: attemptCount.totalDocs + 1, status: 'STARTED', startedAt: new Date().toISOString(), ip: meta.ip, device: meta.device },
      }),
    )
  })
}

export interface CompleteTaskInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  completionId: number
  submission?: string
  answerCode?: string
}

/** Finalises an attempt per the task's verification type; MANUAL_REVIEW is left SUBMITTED for staff. */
export async function completeTask(i: CompleteTaskInput): Promise<TaskCompletion> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.taskAction, `${user.id}`)

  return withTransaction(payload, i.req, async (r) => {
    const completion = await payload.findByID({ collection: 'task-completions', id: i.completionId, depth: 0, overrideAccess: true, req: r }).catch(() => null)
    const completionUserId = completion && (typeof completion.user === 'object' ? completion.user.id : completion.user)
    if (!completion || completionUserId !== user.id) throw new AppError('NOT_FOUND', 'Attempt not found.')
    if (completion.status !== 'STARTED') throw new AppError('INVALID_STATE', 'This attempt has already been finalised.')

    const task = await payload.findByID({ collection: 'tasks', id: typeof completion.task === 'object' ? completion.task.id : completion.task, depth: 0, overrideAccess: true, req: r })
    await advisoryXactLock(payload, r, taskLockKey(user.id, task.id))

    const v = task.verification
    if (v?.type === 'TIMER') {
      const elapsed = (Date.now() - new Date(completion.startedAt).getTime()) / 1000
      if (elapsed < (v.timerSeconds ?? 0)) throw new AppError('INVALID_STATE', 'Please wait for the timer to finish before completing.')
    }
    if (v?.type === 'ANSWER_CODE') {
      if (!i.answerCode || !safeEqual(i.answerCode.trim().toLowerCase(), String(v.answerCode ?? '').trim().toLowerCase())) {
        throw new AppError('BAD_REQUEST', 'That code is not correct.')
      }
    }
    if ((v?.type === 'TEXT_SUBMISSION' || v?.type === 'MANUAL_REVIEW') && !i.submission?.trim()) {
      throw new AppError('BAD_REQUEST', 'Please provide the requested submission.')
    }

    const now = new Date().toISOString()
    if (v?.type === 'MANUAL_REVIEW') {
      return withFlag(r, 'serviceWrite', () =>
        payload.update({ collection: 'task-completions', id: completion.id, overrideAccess: true, depth: 0, req: r, data: { status: 'SUBMITTED', submittedAt: now, submission: i.submission } }),
      )
    }

    const posted = await creditWallet({
      payload,
      req: r,
      userId: user.id,
      type: 'TASK_REWARD',
      amount: task.rewardAmount,
      description: `Task reward — ${task.title}`,
      idempotencyKey: `task-completion:${completion.id}`,
      referenceType: 'task-completion',
      referenceId: completion.id,
    })
    const updated = await withFlag(r, 'serviceWrite', () =>
      payload.update({
        collection: 'task-completions',
        id: completion.id,
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { status: 'COMPLETED', submittedAt: now, completedAt: now, submission: i.submission, rewardAmount: task.rewardAmount, transaction: posted.transaction.id },
      }),
    )
    await afterTaskRewarded(payload, r, user.id, task, completion.id)
    return updated
  })
}

/** Called by the TaskCompletions collection hook once staff mark a manual-review submission COMPLETED. */
export async function approveSubmittedCompletion(i: { payload: Payload; req: Partial<PayloadRequest>; completionId: number }) {
  const { payload } = i
  return withTransaction(payload, i.req, async (r) => {
    const completion = await payload.findByID({ collection: 'task-completions', id: i.completionId, depth: 0, overrideAccess: true, req: r })
    const userId = typeof completion.user === 'object' ? completion.user.id : completion.user
    const task = await payload.findByID({ collection: 'tasks', id: typeof completion.task === 'object' ? completion.task.id : completion.task, depth: 0, overrideAccess: true, req: r })
    await advisoryXactLock(payload, r, taskLockKey(userId, task.id))

    const posted = await creditWallet({
      payload,
      req: r,
      userId,
      type: 'TASK_REWARD',
      amount: task.rewardAmount,
      description: `Task reward — ${task.title}`,
      idempotencyKey: `task-completion:${completion.id}`,
      referenceType: 'task-completion',
      referenceId: completion.id,
    })
    await withFlag(r, 'serviceWrite', () =>
      payload.update({ collection: 'task-completions', id: completion.id, overrideAccess: true, depth: 0, req: r, data: { completedAt: new Date().toISOString(), rewardAmount: task.rewardAmount, transaction: posted.transaction.id } }),
    )
    await logAudit({ payload, req: r, action: 'TASK_COMPLETION_REVIEWED', collection: 'task-completions', documentId: completion.id, after: { status: 'COMPLETED' } })
    await afterTaskRewarded(payload, r, userId, task, completion.id)
  })
}

async function afterTaskRewarded(payload: Payload, req: Partial<PayloadRequest>, userId: number, task: { title: string; rewardAmount: number }, completionId: number) {
  await notify({ payload, req, userId, type: 'TASK_COMPLETED', title: 'Task completed', body: `You earned a reward for "${task.title}".`, dedupeKey: `task-completion:${completionId}:notif` })
  const { checkReferralQualification } = await import('./referral')
  await checkReferralQualification(payload, req, userId, 'TASK_COMPLETED')
  await checkReferralQualification(payload, req, userId, 'EARNED')
}

```

src/services/user.ts
```typescript
import type { Payload, PayloadRequest } from 'payload'
import { randomUUID } from 'node:crypto'
import { AppError } from '@/lib/errors'
import { randomCode } from '@/lib/crypto'
import { getClientIp } from '@/lib/request-meta'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import type { User } from '@/payload-types'
import { logAudit } from './audit'
import { withFlag } from './context'

/** Generates a unique, human-friendly referral code (retries on the rare collision). */
export async function generateUniqueReferralCode(payload: Payload, req?: Partial<PayloadRequest>): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = randomCode(7)
    const existing = await payload.find({ collection: 'users', where: { referralCode: { equals: code } }, limit: 1, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined })
    if (existing.docs.length === 0) return code
  }
  throw new AppError('INTERNAL', 'Could not generate a unique referral code, please retry.')
}

export interface RegisterInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  headers: Headers
  email: string
  password: string
  name: string
  phone?: string
  referralCode?: string
  timezone?: string
}

/** Registers a user, optionally binding a referral, and returns the created record (no session yet). */
export async function registerUser(i: RegisterInput): Promise<User> {
  const { payload } = i
  const ip = getClientIp(i.headers)
  await enforceRateLimit(LIMITS.registerIp, ip, 'Too many sign-up attempts from this network. Please try again later.')

  const { getSettings } = await import('./settings')
  const settings = await getSettings(payload)
  if (!settings.features.registrationEnabled) throw new AppError('FEATURE_DISABLED', 'Registration is temporarily closed.')

  const email = i.email.trim().toLowerCase()
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true })
  if (existing.docs.length) throw new AppError('CONFLICT', 'An account with this email already exists.')

  const requireVerify = process.env.REQUIRE_EMAIL_VERIFICATION === 'true'
  const user = await payload.create({
    collection: 'users',
    overrideAccess: true,
    depth: 0,
    data: {
      email,
      password: i.password,
      name: i.name,
      phone: i.phone,
      timezone: i.timezone,
      status: requireVerify ? 'PENDING_VERIFICATION' : 'ACTIVE',
      _verified: !requireVerify,
      termsAcceptedAt: new Date().toISOString(),
      registrationIp: ip,
    } as never,
  })

  if (i.referralCode) {
    try {
      const { bindReferral } = await import('./referral')
      await bindReferral({ payload, req: i.req, newUser: user, code: i.referralCode })
    } catch (err) {
      // Registration must still succeed even if the referral code is invalid/expired.
      console.warn('[register] referral bind failed:', (err as Error).message)
    }
  }

  await logAudit({ payload, req: i.req, action: 'OTHER', collection: 'users', documentId: user.id, actorLabel: `user:${email}`, after: { event: 'REGISTERED' }, metadata: { ip } })
  return user
}

export async function recordLogin(payload: Payload, req: Partial<PayloadRequest>, userId: number, ip: string) {
  await withFlag(req, 'skipAudit', () =>
    payload.update({ collection: 'users', id: userId, overrideAccess: true, depth: 0, req: req as PayloadRequest, data: { lastLoginAt: new Date().toISOString(), lastLoginIp: ip } }),
  )
}

export const newIdempotencyKey = () => randomUUID()

```

src/services/wallet.ts
```typescript
import type { Payload, PayloadRequest } from 'payload'
import { CREDIT_EARNING_TYPES, DEFAULT_CURRENCY, type TransactionType } from '@/constants'
import type { Wallet, WalletAdjustment, WalletTransaction } from '@/payload-types'
import { advisoryXactLock, rawQuery, sql, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { assertPositiveMinor } from '@/lib/money'
import { logAudit } from './audit'
import { withFlag } from './context'
import { notify } from './notification'

type Req = Partial<PayloadRequest> | undefined

const walletLockKey = (userId: number | string) => `wallet:${userId}`

/** Finds or creates the user's wallet. Serialised with an advisory lock, so concurrent callers can't double-create. */
export async function ensureWallet(payload: Payload, userId: number, req?: Req): Promise<Wallet> {
  return withTransaction(payload, req, async (r) => {
    await advisoryXactLock(payload, r, walletLockKey(userId))
    const found = await payload.find({ collection: 'wallets', where: { user: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    if (found.docs[0]) return found.docs[0]
    return withFlag(r, 'walletWrite', () =>
      payload.create({
        collection: 'wallets',
        data: { user: userId, currency: DEFAULT_CURRENCY, availableBalance: 0, pendingBalance: 0, lifetimeEarned: 0, lifetimeWithdrawn: 0, status: 'ACTIVE' },
        depth: 0,
        overrideAccess: true,
        req: r,
      }),
    )
  })
}

export async function getWallet(payload: Payload, userId: number): Promise<Wallet> {
  const found = await payload.find({ collection: 'wallets', where: { user: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true })
  return found.docs[0] ?? (await ensureWallet(payload, userId))
}

interface PostEntry {
  payload: Payload
  req?: Req
  userId: number
  type: TransactionType
  /** Signed movement of availableBalance (never 0). */
  signedAmount: number
  earnedDelta?: number
  pendingDelta?: number
  description: string
  idempotencyKey: string
  referenceType?: string
  referenceId?: string | number
  metadata?: Record<string, unknown>
  reversalOf?: number
  /** Allow the entry even when the wallet is frozen (refunds, staff corrections). */
  ignoreFrozen?: boolean
}

export interface PostedEntry {
  transaction: WalletTransaction
  wallet: Wallet
  duplicate: boolean
}

/**
 * The single place where balances change. In ONE database transaction it:
 *   1. takes a per-wallet advisory lock (serialises concurrent balance changes),
 *   2. returns the existing row when the idempotency key was already used (safe retries),
 *   3. validates the new balances (never negative),
 *   4. appends an immutable ledger row and updates the wallet.
 */
async function postEntry(e: PostEntry): Promise<PostedEntry> {
  const { payload } = e
  if (!Number.isSafeInteger(e.signedAmount) || e.signedAmount === 0) throw new AppError('BAD_REQUEST', 'Invalid ledger amount')

  return withTransaction(payload, e.req, async (r) => {
    await advisoryXactLock(payload, r, walletLockKey(e.userId))

    const existing = await payload.find({ collection: 'wallet-transactions', where: { idempotencyKey: { equals: e.idempotencyKey } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    if (existing.docs[0]) {
      const tx = existing.docs[0]
      const owner = typeof tx.user === 'object' ? tx.user.id : tx.user
      if (owner !== e.userId || tx.type !== e.type || tx.amount !== e.signedAmount) {
        throw new AppError('CONFLICT', 'This request key was already used for a different operation.')
      }
      const wallet = await getWalletTx(payload, e.userId, r)
      return { transaction: tx, wallet, duplicate: true }
    }

    const wallet = await getWalletTx(payload, e.userId, r)
    if (wallet.status === 'FROZEN' && !e.ignoreFrozen) throw new AppError('ACCOUNT_RESTRICTED', 'This wallet is temporarily frozen. Please contact support.')

    const before = wallet.availableBalance ?? 0
    const after = before + e.signedAmount
    if (after < 0) throw new AppError('INSUFFICIENT_FUNDS', 'Insufficient balance.')
    const pending = (wallet.pendingBalance ?? 0) + (e.pendingDelta ?? 0)
    const earned = (wallet.lifetimeEarned ?? 0) + (e.earnedDelta ?? 0)
    if (pending < 0 || earned < 0) throw new AppError('INVALID_STATE', 'Wallet counters would become negative.')

    const transaction = await withFlag(r, 'ledgerWrite', () =>
      payload.create({
        collection: 'wallet-transactions',
        overrideAccess: true,
        depth: 0,
        req: r,
        data: {
          user: e.userId,
          wallet: wallet.id,
          type: e.type,
          amount: e.signedAmount,
          balanceBefore: before,
          balanceAfter: after,
          currency: wallet.currency ?? DEFAULT_CURRENCY,
          referenceType: e.referenceType,
          referenceId: e.referenceId != null ? String(e.referenceId) : undefined,
          description: e.description,
          status: 'COMPLETED',
          idempotencyKey: e.idempotencyKey,
          reversalOf: e.reversalOf,
          metadata: (e.metadata ?? null) as never,
        },
      }),
    )

    const updated = await withFlag(r, 'walletWrite', () =>
      payload.update({
        collection: 'wallets',
        id: wallet.id,
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { availableBalance: after, pendingBalance: pending, lifetimeEarned: earned },
      }),
    )
    return { transaction, wallet: updated, duplicate: false }
  })
}

async function getWalletTx(payload: Payload, userId: number, r: PayloadRequest): Promise<Wallet> {
  const found = await payload.find({ collection: 'wallets', where: { user: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true, req: r })
  if (found.docs[0]) return found.docs[0]
  return ensureWallet(payload, userId, r)
}

type CreditType = Extract<TransactionType, 'TASK_REWARD' | 'GAME_REWARD' | 'CAMPAIGN_REWARD' | 'REFERRAL_REWARD' | 'BONUS' | 'ADMIN_CREDIT'>

export interface CreditInput {
  payload: Payload
  req?: Req
  userId: number
  type: CreditType
  amount: number
  description: string
  idempotencyKey: string
  referenceType?: string
  referenceId?: string | number
  metadata?: Record<string, unknown>
}

export function creditWallet(i: CreditInput): Promise<PostedEntry> {
  assertPositiveMinor(i.amount)
  return postEntry({ ...i, signedAmount: i.amount, earnedDelta: i.amount })
}

export function debitForWithdrawal(i: { payload: Payload; req?: Req; userId: number; amount: number; withdrawalId: number; idempotencyKey: string }) {
  assertPositiveMinor(i.amount)
  return postEntry({
    payload: i.payload,
    req: i.req,
    userId: i.userId,
    type: 'WITHDRAWAL',
    signedAmount: -i.amount,
    pendingDelta: i.amount,
    description: 'Withdrawal request',
    idempotencyKey: i.idempotencyKey,
    referenceType: 'withdrawal',
    referenceId: i.withdrawalId,
  })
}

export function refundWithdrawal(i: { payload: Payload; req?: Req; userId: number; amount: number; withdrawalId: number; reason: string; idempotencyKey: string }) {
  assertPositiveMinor(i.amount)
  return postEntry({
    payload: i.payload,
    req: i.req,
    userId: i.userId,
    type: 'REFUND',
    signedAmount: i.amount,
    pendingDelta: -i.amount,
    description: `Withdrawal refunded — ${i.reason}`,
    idempotencyKey: i.idempotencyKey,
    referenceType: 'withdrawal',
    referenceId: i.withdrawalId,
    ignoreFrozen: true,
  })
}

/** Settles a completed payout: the held funds leave the wallet for good. No available-balance movement, so no ledger row. */
export async function settleWithdrawal(i: { payload: Payload; req?: Req; userId: number; amount: number }): Promise<Wallet> {
  const { payload } = i
  return withTransaction(payload, i.req, async (r) => {
    await advisoryXactLock(payload, r, walletLockKey(i.userId))
    const wallet = await getWalletTx(payload, i.userId, r)
    const pending = (wallet.pendingBalance ?? 0) - i.amount
    if (pending < 0) throw new AppError('INVALID_STATE', 'Held balance is lower than the withdrawal amount.')
    return withFlag(r, 'walletWrite', () =>
      payload.update({
        collection: 'wallets',
        id: wallet.id,
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { pendingBalance: pending, lifetimeWithdrawn: (wallet.lifetimeWithdrawn ?? 0) + i.amount },
      }),
    )
  })
}

export async function reverseTransaction(i: {
  payload: Payload
  req?: Req
  transactionId: number
  reason: string
}): Promise<PostedEntry & { original: WalletTransaction }> {
  const { payload } = i
  return withTransaction(payload, i.req, async (r) => {
    const original = await payload.findByID({ collection: 'wallet-transactions', id: i.transactionId, depth: 0, overrideAccess: true, req: r }).catch(() => null)
    if (!original) throw new AppError('NOT_FOUND', 'Transaction not found.')
    const userId = typeof original.user === 'object' ? original.user.id : original.user
    const type = original.type as TransactionType
    let earnedDelta = 0
    if (CREDIT_EARNING_TYPES.includes(type)) earnedDelta = -original.amount
    else if (type !== 'ADMIN_DEBIT') throw new AppError('INVALID_STATE', 'Only reward credits and admin debits can be reversed.')
    const posted = await postEntry({
      payload,
      req: r,
      userId,
      type: 'REVERSAL',
      signedAmount: -original.amount,
      earnedDelta,
      description: `Reversal of #${original.id} — ${i.reason}`,
      idempotencyKey: `reversal:${original.id}`,
      referenceType: 'wallet-transaction',
      referenceId: original.id,
      reversalOf: original.id,
      ignoreFrozen: true,
    })
    return { ...posted, original }
  })
}

/** Applies a staff wallet adjustment inside the same transaction as the adjustment record. */
export async function applyAdminAdjustment(i: { payload: Payload; req: Partial<PayloadRequest>; adjustment: WalletAdjustment }) {
  const { payload, req, adjustment } = i
  const reason = adjustment.reason
  let posted: PostedEntry
  let userId: number
  let amount: number
  let action: 'REWARD_CREDITED' | 'REWARD_DEBITED' | 'TRANSACTION_REVERSED'

  if (adjustment.type === 'REVERSAL') {
    const targetId = typeof adjustment.targetTransaction === 'object' ? adjustment.targetTransaction!.id : adjustment.targetTransaction!
    const res = await reverseTransaction({ payload, req, transactionId: targetId, reason })
    posted = res
    userId = typeof res.original.user === 'object' ? res.original.user.id : res.original.user
    amount = Math.abs(res.original.amount)
    action = 'TRANSACTION_REVERSED'
  } else {
    userId = typeof adjustment.user === 'object' ? adjustment.user!.id : (adjustment.user as number)
    amount = adjustment.amount as number
    assertPositiveMinor(amount)
    if (adjustment.type === 'CREDIT') {
      posted = await creditWallet({ payload, req, userId, type: 'ADMIN_CREDIT', amount, description: `Adjustment — ${reason}`, idempotencyKey: `adjustment:${adjustment.id}`, referenceType: 'wallet-adjustment', referenceId: adjustment.id })
      action = 'REWARD_CREDITED'
    } else {
      posted = await postEntry({ payload, req, userId, type: 'ADMIN_DEBIT', signedAmount: -amount, description: `Adjustment — ${reason}`, idempotencyKey: `adjustment:${adjustment.id}`, referenceType: 'wallet-adjustment', referenceId: adjustment.id, ignoreFrozen: true })
      action = 'REWARD_DEBITED'
    }
  }

  await withFlag(req, 'serviceWrite', () =>
    payload.update({
      collection: 'wallet-adjustments',
      id: adjustment.id,
      overrideAccess: true,
      depth: 0,
      req: req as PayloadRequest,
      data: { user: userId, amount, resultingTransaction: posted.transaction.id },
    }),
  )
  await logAudit({
    payload,
    req,
    action,
    collection: 'wallet-adjustments',
    documentId: adjustment.id,
    after: { userId, amount, type: adjustment.type, reason, reference: adjustment.reference, transactionId: posted.transaction.id },
  })
  await notify({
    payload,
    req,
    userId,
    type: 'SYSTEM',
    title: adjustment.type === 'CREDIT' ? 'Balance adjusted' : 'Wallet updated',
    body: adjustment.type === 'CREDIT' ? 'Support added funds to your wallet.' : 'A correction was applied to your wallet. Contact support if you have questions.',
    dedupeKey: `adjustment:${adjustment.id}`,
  })
}

export interface WalletMismatch {
  walletId: number
  userId: number
  field: 'availableBalance' | 'pendingBalance' | 'lifetimeWithdrawn'
  stored: number
  expected: number
}

/**
 * Integrity check: recomputes every balance from its source of truth and reports differences.
 *  available = SUM(ledger.amount) · pending = SUM(open withdrawals) · lifetimeWithdrawn = SUM(completed withdrawals)
 */
export async function reconcileWallets(payload: Payload, opts: { userId?: number } = {}): Promise<{ checked: number; mismatches: WalletMismatch[] }> {
  const filter = opts.userId ? sql`where w.user_id = ${opts.userId}` : sql``
  const rows = await rawQuery<{ id: number; user_id: number; available: string; pending: string; withdrawn: string; ledger_sum: string; open_sum: string; done_sum: string }>(
    payload,
    sql`
      select w.id, w.user_id,
             w.available_balance as available, w.pending_balance as pending, w.lifetime_withdrawn as withdrawn,
             coalesce((select sum(t.amount) from wallet_transactions t where t.user_id = w.user_id), 0) as ledger_sum,
             coalesce((select sum(x.amount) from withdrawals x where x.user_id = w.user_id and x.status in ('PENDING','UNDER_REVIEW','APPROVED','PROCESSING')), 0) as open_sum,
             coalesce((select sum(x.amount) from withdrawals x where x.user_id = w.user_id and x.status = 'COMPLETED'), 0) as done_sum
      from wallets w ${filter}`,
  )
  const mismatches: WalletMismatch[] = []
  for (const r of rows) {
    const check = (field: WalletMismatch['field'], stored: string, expected: string) => {
      if (Number(stored) !== Number(expected)) mismatches.push({ walletId: r.id, userId: r.user_id, field, stored: Number(stored), expected: Number(expected) })
    }
    check('availableBalance', r.available, r.ledger_sum)
    check('pendingBalance', r.pending, r.open_sum)
    check('lifetimeWithdrawn', r.withdrawn, r.done_sum)
  }
  return { checked: rows.length, mismatches }
}

```

src/services/withdrawal.ts
```typescript
import type { Payload, PayloadRequest } from 'payload'
import { randomUUID } from 'node:crypto'
import { OPEN_WITHDRAWAL_STATUSES, type WithdrawalStatus } from '@/constants'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { encrypt } from '@/lib/crypto'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { dayBounds } from '@/lib/time'
import type { PayoutMethod, User, Withdrawal } from '@/payload-types'
import { debitForWithdrawal, refundWithdrawal, settleWithdrawal } from './wallet'
import { logAudit } from './audit'
import { notify } from './notification'
import { withFlag } from './context'
import { getSettings } from './settings'

const walletLockKeyFor = (userId: number) => `wallet:${userId}`

const ALLOWED_TRANSITIONS: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  PENDING: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PROCESSING', 'FAILED', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  REJECTED: [],
  FAILED: [],
  CANCELLED: [],
}

export interface RequestWithdrawalInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  amount: number
  payoutMethodId: number
}

export async function requestWithdrawal(i: RequestWithdrawalInput): Promise<Withdrawal> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.withdrawal, `${user.id}`)
  const settings = await getSettings(payload)
  if (!settings.features.withdrawalsEnabled) throw new AppError('FEATURE_DISABLED', 'Withdrawals are temporarily disabled.')
  if (user.status !== 'ACTIVE') throw new AppError('ACCOUNT_RESTRICTED', 'Your account cannot withdraw right now.')
  if (i.amount < settings.reward.minimumWithdrawal) throw new AppError('BAD_REQUEST', `Minimum withdrawal is set by the platform.`, { details: { minimum: settings.reward.minimumWithdrawal } })
  if (i.amount > settings.reward.maximumWithdrawal) throw new AppError('BAD_REQUEST', `Amount exceeds the maximum allowed withdrawal.`, { details: { maximum: settings.reward.maximumWithdrawal } })

  const method = await payload.findByID({ collection: 'payout-methods', id: i.payoutMethodId, depth: 0, overrideAccess: true, req: i.req as PayloadRequest | undefined }).catch(() => null)
  const methodOwner = method && (typeof method.user === 'object' ? method.user.id : method.user)
  if (!method || methodOwner !== user.id || method.status !== 'ACTIVE') throw new AppError('BAD_REQUEST', 'Choose a valid payout method.')

  return withTransaction(payload, i.req, async (r) => {
    await advisoryXactLock(payload, r, walletLockKeyFor(user.id))

    const open = await payload.count({ collection: 'withdrawals', where: { user: { equals: user.id }, status: { in: [...OPEN_WITHDRAWAL_STATUSES] } }, overrideAccess: true, req: r })
    if (open.totalDocs >= settings.reward.maxOpenWithdrawals) throw new AppError('LIMIT_REACHED', 'You already have a withdrawal in progress.')

    const { start, end } = dayBounds(new Date(), settings.site.defaultTimezone)
    const today = await payload.find({ collection: 'withdrawals', where: { user: { equals: user.id }, createdAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() }, status: { not_in: ['REJECTED', 'CANCELLED'] } }, limit: 500, depth: 0, overrideAccess: true, req: r })
    const todayTotal = today.docs.reduce((s, w) => s + w.amount, 0)
    if (todayTotal + i.amount > settings.reward.dailyWithdrawalLimit) throw new AppError('LIMIT_REACHED', 'This would exceed your daily withdrawal limit.')

    const wallet = await payload.find({ collection: 'wallets', where: { user: { equals: user.id } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    const w = wallet.docs[0]
    if (!w || (w.availableBalance ?? 0) < i.amount) throw new AppError('INSUFFICIENT_FUNDS', 'Insufficient balance for this withdrawal.')

    const idempotencyKey = randomUUID()
    const withdrawal = await withFlag(r, 'serviceWrite', () =>
      payload.create({
        collection: 'withdrawals',
        overrideAccess: true,
        depth: 0,
        req: r,
        data: {
          user: user.id,
          wallet: w.id,
          amount: i.amount,
          currency: w.currency ?? 'INR',
          method: method.type,
          payoutMethod: method.id,
          payoutSummary: method.maskedDetails,
          payoutDetailsEncrypted: encrypt(JSON.stringify({ method: method.type, maskedDetails: method.maskedDetails, ifsc: method.ifsc, bankName: method.bankName })),
          status: 'PENDING',
          requestedAt: new Date().toISOString(),
          idempotencyKey,
        } as never,
      }),
    )
    const debit = await debitForWithdrawal({ payload, req: r, userId: user.id, amount: i.amount, withdrawalId: withdrawal.id, idempotencyKey: `withdrawal-hold:${withdrawal.id}` })
    const updated = await withFlag(r, 'serviceWrite', () =>
      payload.update({ collection: 'withdrawals', id: withdrawal.id, overrideAccess: true, depth: 0, req: r, data: { debitTransaction: debit.transaction.id } }),
    )
    await logAudit({ payload, req: r, action: 'WITHDRAWAL_REQUESTED', collection: 'withdrawals', documentId: withdrawal.id, after: { amount: i.amount, method: method.type } })
    await notify({ payload, req: r, userId: user.id, type: 'WITHDRAWAL_REQUESTED', title: 'Withdrawal requested', body: 'Your withdrawal request has been received and is under review.', dedupeKey: `withdrawal:${withdrawal.id}:requested` })
    return updated
  })
}

/** Runs inside the Withdrawals collection beforeChange hook: validates the transition and stamps timestamps. */
export async function prepareStatusChange(i: { data: Record<string, unknown>; originalDoc: Withdrawal; adminId: number }) {
  const from = i.originalDoc.status as WithdrawalStatus
  const to = (i.data.status as WithdrawalStatus) ?? from
  if (to === from) return i.data
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) throw new AppError('INVALID_STATE', `Cannot move a withdrawal from ${from} to ${to}.`)
  if ((to === 'REJECTED' || to === 'FAILED') && !i.data.failureReason && !i.originalDoc.failureReason) throw new AppError('BAD_REQUEST', 'Add a reason before rejecting or failing a withdrawal.')
  if (to === 'COMPLETED' && !i.data.transactionReference && !i.originalDoc.transactionReference) throw new AppError('BAD_REQUEST', 'Add the payout reference (bank UTR) before marking as completed.')

  const now = new Date().toISOString()
  i.data.reviewedBy = i.adminId
  if (to === 'UNDER_REVIEW' || to === 'APPROVED') i.data.reviewedAt = now
  if (to === 'PROCESSING') i.data.processedAt = now
  if (to === 'COMPLETED') i.data.completedAt = now
  if (to === 'REJECTED') i.data.rejectedAt = now
  if (to === 'FAILED') i.data.failedAt = now
  if (to === 'CANCELLED') i.data.cancelledAt = now
  return i.data
}

/** Runs inside the Withdrawals collection afterChange hook once the status actually changed. */
export async function applyStatusEffects(i: { payload: Payload; req?: Partial<PayloadRequest>; withdrawal: Withdrawal; from: WithdrawalStatus }) {
  const { payload, withdrawal } = i
  const to = withdrawal.status as WithdrawalStatus
  const userId = typeof withdrawal.user === 'object' ? withdrawal.user.id : withdrawal.user

  if (['REJECTED', 'FAILED', 'CANCELLED'].includes(to)) {
    const refund = await refundWithdrawal({ payload, req: i.req, userId, amount: withdrawal.amount, withdrawalId: withdrawal.id, reason: withdrawal.failureReason || to.toLowerCase(), idempotencyKey: `withdrawal-refund:${withdrawal.id}` })
    await withFlag(i.req ?? {}, 'serviceWrite', () =>
      payload.update({ collection: 'withdrawals', id: withdrawal.id, overrideAccess: true, depth: 0, req: i.req as PayloadRequest | undefined, data: { refundTransaction: refund.transaction.id } }),
    )
  } else if (to === 'COMPLETED') {
    await settleWithdrawal({ payload, req: i.req, userId, amount: withdrawal.amount })
    const { getPayoutProvider } = await import('./payout')
    void getPayoutProvider() // provider hook point for real integrations; manual mode just records the reference already entered by staff
  } else if (to === 'PROCESSING') {
    const method = typeof withdrawal.payoutMethod === 'object' ? withdrawal.payoutMethod : null
    const { getPayoutProvider } = await import('./payout')
    const provider = getPayoutProvider()
    try {
      await provider.payout({
        withdrawalId: withdrawal.id,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        destination: { method: withdrawal.method as 'UPI' | 'BANK', upiId: method?.type === 'UPI' ? method.maskedDetails : undefined, accountNumber: method?.type === 'BANK' ? method.maskedDetails : undefined, ifsc: method?.ifsc ?? undefined, holderName: method?.holderName ?? undefined, bankName: method?.bankName ?? undefined },
      })
    } catch (err) {
      console.error('[withdrawal] payout provider error:', (err as Error).message)
    }
  }

  const actionMap: Record<string, string> = {
    UNDER_REVIEW: 'WITHDRAWAL_STATUS_CHANGED',
    APPROVED: 'WITHDRAWAL_APPROVED',
    PROCESSING: 'WITHDRAWAL_STATUS_CHANGED',
    COMPLETED: 'WITHDRAWAL_COMPLETED',
    REJECTED: 'WITHDRAWAL_REJECTED',
    FAILED: 'WITHDRAWAL_FAILED',
    CANCELLED: 'WITHDRAWAL_CANCELLED',
  }
  await logAudit({ payload, req: i.req, action: (actionMap[to] ?? 'WITHDRAWAL_STATUS_CHANGED') as never, collection: 'withdrawals', documentId: withdrawal.id, after: { from: i.from, to } })

  const notifTypeMap: Record<string, string> = { APPROVED: 'WITHDRAWAL_APPROVED', REJECTED: 'WITHDRAWAL_REJECTED', COMPLETED: 'WITHDRAWAL_COMPLETED' }
  const notifType = notifTypeMap[to]
  if (notifType) {
    await notify({
      payload,
      req: i.req,
      userId,
      type: notifType as never,
      title: to === 'COMPLETED' ? 'Withdrawal completed' : to === 'APPROVED' ? 'Withdrawal approved' : 'Withdrawal update',
      body:
        to === 'COMPLETED'
          ? 'Your withdrawal has been paid out.'
          : to === 'APPROVED'
            ? 'Your withdrawal was approved and is being processed.'
            : `Your withdrawal was ${to.toLowerCase()}.${withdrawal.failureReason ? ` Reason: ${withdrawal.failureReason}` : ''}`,
      dedupeKey: `withdrawal:${withdrawal.id}:${to}`,
    })
  }
}

/** Cancels a withdrawal on behalf of the user, while it is still PENDING. */
export async function cancelWithdrawal(payload: Payload, req: Partial<PayloadRequest> | undefined, user: User, withdrawalId: number) {
  const withdrawal = await payload.findByID({ collection: 'withdrawals', id: withdrawalId, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }).catch(() => null)
  const owner = withdrawal && (typeof withdrawal.user === 'object' ? withdrawal.user.id : withdrawal.user)
  if (!withdrawal || owner !== user.id) throw new AppError('NOT_FOUND', 'Withdrawal not found.')
  if (withdrawal.status !== 'PENDING') throw new AppError('INVALID_STATE', 'Only a pending withdrawal can be cancelled.')
  return withFlag(req ?? {}, 'serviceWrite', () =>
    payload.update({ collection: 'withdrawals', id: withdrawalId, overrideAccess: true, depth: 0, req: req as PayloadRequest | undefined, data: { status: 'CANCELLED', cancelledAt: new Date().toISOString() } }),
  )
}

export function summarizeUpi(upi: PayoutMethod) {
  return upi.maskedDetails
}

```

src/utilities/api-error.ts
```typescript
import { APIError } from 'payload'
import { isAppError } from '@/lib/errors'

/** Run a service call inside a Payload hook and surface AppErrors as admin-friendly APIErrors. */
export async function asApiError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (isAppError(err)) throw new APIError(err.message, err.status)
    throw err
  }
}

```

src/utilities/diff.ts
```typescript
const IGNORED = new Set(['updatedAt', 'createdAt', 'sessions', 'salt', 'hash', 'loginAttempts', 'lockUntil', 'resetPasswordToken', 'resetPasswordExpiration', '_verificationToken', 'password', 'serverState'])

type Json = Record<string, unknown>

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Shallow-ish diff of two documents returning only changed top-level keys (relations flattened to ids). */
export function diffDocs(before: unknown, after: unknown): { before: Json; after: Json } {
  const b = isObj(before) ? before : {}
  const a = isObj(after) ? after : {}
  const outB: Json = {}
  const outA: Json = {}
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (IGNORED.has(key)) continue
    const bv = flatten(b[key])
    const av = flatten(a[key])
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      outB[key] = bv
      outA[key] = av
    }
  }
  return { before: outB, after: outA }
}

function flatten(v: unknown): unknown {
  if (isObj(v) && 'id' in v && Object.keys(v).length > 1 && !('blocks' in v)) return v.id
  if (Array.isArray(v)) return v.map(flatten)
  return v
}

/** Strip noise from a whole doc for create/delete snapshots. */
export function snapshot(doc: unknown): Json {
  const d = isObj(doc) ? doc : {}
  const out: Json = {}
  for (const [k, v] of Object.entries(d)) if (!IGNORED.has(k)) out[k] = flatten(v)
  return out
}

```

src/utilities/fields.ts
```typescript
import type { DateField, Field, NumberField, SelectField } from 'payload'
import { DEFAULT_TIMEZONE, toOptions } from '@/constants'

/** Money stored as integer minor units (paise). Rendered in the admin as rupees via <MoneyField />. */
export const moneyField = (name: string, overrides: Partial<NumberField> = {}): NumberField => {
  const { admin, ...rest } = overrides
  return {
    name,
    type: 'number',
    min: 0,
    defaultValue: 0,
    ...rest,
    admin: {
      step: 1,
      description: 'Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50',
      components: { Field: '/components/admin/MoneyField#MoneyField' },
      ...(admin ?? {}),
    },
    validate: (value: unknown) => {
      if (value === null || value === undefined) return true
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) return 'Amount must be a whole number of paise'
      return true
    },
  } as NumberField
}

export const signedMoneyField = (name: string, overrides: Partial<NumberField> = {}): NumberField => {
  const field = moneyField(name, overrides)
  return { ...field, min: undefined } as NumberField
}

export const schedule = (opts: { requiredStart?: boolean; label?: string } = {}): Field[] => [
  {
    name: 'startsAt',
    type: 'date',
    label: 'Starts at',
    index: true,
    required: opts.requiredStart ?? false,
    timezone: true,
    admin: {
      date: { pickerAppearance: 'dayAndTime' },
      description: `Stored in UTC. Pick the timezone the schedule is meant for (default ${DEFAULT_TIMEZONE}).`,
    },
  } as DateField,
  {
    name: 'endsAt',
    type: 'date',
    label: 'Ends at',
    index: true,
    timezone: true,
    admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Leave empty for no end.' },
  } as DateField,
]

export const selectField = <T extends readonly string[]>(
  name: string,
  values: T,
  overrides: Partial<SelectField> = {},
): SelectField => ({
  name,
  type: 'select',
  options: toOptions(values),
  ...overrides,
} as SelectField)

export const readOnlyAdmin = { readOnly: true } as const
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

```

