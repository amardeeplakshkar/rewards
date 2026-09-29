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
