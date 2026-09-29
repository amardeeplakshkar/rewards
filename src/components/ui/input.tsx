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
