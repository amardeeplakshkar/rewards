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
