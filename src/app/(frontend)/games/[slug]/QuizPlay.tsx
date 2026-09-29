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
