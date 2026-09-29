import type { DateField, Field, NumberField, SelectField } from 'payload'
import { DEFAULT_TIMEZONE, toOptions } from '@/constants'

/** Money stored as integer minor units (paise). Rendered in the admin as rupees via <MoneyField />. */
export const moneyField = (name: string, overrides: Partial<NumberField> = {}): NumberField => {
  const { admin, ...rest } = overrides
  return {
    name,
    type: 'number',
    min: 0,
    defaultValue: 0,
    ...rest,
    admin: {
      step: 1,
      description: 'Stored in paise (100 paise = ₹1). Type the rupee amount, e.g. 25.50',
      components: { Field: '/components/admin/MoneyField#MoneyField' },
      ...(admin ?? {}),
    },
    validate: (value: unknown) => {
      if (value === null || value === undefined) return true
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) return 'Amount must be a whole number of paise'
      return true
    },
  } as NumberField
}

export const signedMoneyField = (name: string, overrides: Partial<NumberField> = {}): NumberField => {
  const field = moneyField(name, overrides)
  return { ...field, min: undefined } as NumberField
}

export const schedule = (opts: { requiredStart?: boolean; label?: string } = {}): Field[] => [
  {
    name: 'startsAt',
    type: 'date',
    label: 'Starts at',
    index: true,
    required: opts.requiredStart ?? false,
    timezone: true,
    admin: {
      date: { pickerAppearance: 'dayAndTime' },
      description: `Stored in UTC. Pick the timezone the schedule is meant for (default ${DEFAULT_TIMEZONE}).`,
    },
  } as DateField,
  {
    name: 'endsAt',
    type: 'date',
    label: 'Ends at',
    index: true,
    timezone: true,
    admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Leave empty for no end.' },
  } as DateField,
]

export const selectField = <T extends readonly string[]>(
  name: string,
  values: T,
  overrides: Partial<SelectField> = {},
): SelectField => ({
  name,
  type: 'select',
  options: toOptions(values),
  ...overrides,
} as SelectField)

export const readOnlyAdmin = { readOnly: true } as const
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
