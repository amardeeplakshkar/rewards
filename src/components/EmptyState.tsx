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
