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
