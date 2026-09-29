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
