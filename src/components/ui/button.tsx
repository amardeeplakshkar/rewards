import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper hover:bg-ink-soft',
        marigold: 'bg-marigold text-ink hover:bg-marigold-deep hover:text-paper',
        outline: 'border border-ink/15 bg-transparent text-ink hover:bg-ink/5',
        ghost: 'bg-transparent text-ink hover:bg-ink/5',
        danger: 'bg-coral text-paper hover:opacity-90',
      },
      size: {
        default: 'h-12 px-5 text-[15px]',
        sm: 'h-9 px-3.5 text-sm',
        lg: 'h-14 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'marigold', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'
