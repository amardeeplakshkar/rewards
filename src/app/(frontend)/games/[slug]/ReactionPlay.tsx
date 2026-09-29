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
