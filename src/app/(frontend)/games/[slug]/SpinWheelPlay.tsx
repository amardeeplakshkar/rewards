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