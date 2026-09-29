import React from 'react'
import { cn } from '@/lib/cn'

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('rounded-card border border-[#F5B82E]/15 bg-[#0E1726] text-slate-100 shadow-[0_12px_30px_rgba(5,7,12,0.35)]', className)} {...props} />
)
