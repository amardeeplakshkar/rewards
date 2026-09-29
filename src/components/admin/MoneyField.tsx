'use client'
import React, { useEffect, useState } from 'react'
import { FieldLabel, useField } from '@payloadcms/ui'
import type { NumberFieldClientProps } from 'payload'

const toDecimal = (minor: number) => {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/**
 * Admin editor for money fields. Staff type rupees ("25.50"); the value stored in the database is always
 * an integer number of paise (2550). Parsing is string based — no floating point.
 */
export const MoneyField: React.FC<NumberFieldClientProps> = (props) => {
  const { field, path, readOnly, validate } = props
  const { value, setValue, showError, errorMessage } = useField<number | null>({ path, validate: validate as never })
  const [text, setText] = useState<string>('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(typeof value === 'number' ? toDecimal(value) : '')
  }, [value, focused])

  const onChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, '')
    if (!/^\d*\.?\d{0,2}$/.test(cleaned)) return
    setText(cleaned)
    if (cleaned === '' || cleaned === '.') return setValue(null)
    const [w = '0', f = ''] = cleaned.split('.')
    setValue(Number(w || '0') * 100 + Number(f.padEnd(2, '0')))
  }

  const description = (field.admin as { description?: string } | undefined)?.description
  const box: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: `1px solid ${showError ? 'var(--theme-error-500)' : 'var(--theme-elevation-150)'}`,
    background: 'var(--theme-input-bg)',
    borderRadius: 'var(--style-radius-s)',
    padding: '0 12px',
    height: 40,
  }

  return (
    <div className="field-type number" style={{ marginBottom: 'var(--base)' }}>
      <FieldLabel label={field.label} path={path} required={field.required} />
      <div style={box}>
        <span style={{ opacity: 0.6 }}>₹</span>
        <input
          inputMode="decimal"
          value={text}
          disabled={Boolean(readOnly)}
          placeholder="0.00"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, border: 0, outline: 0, background: 'transparent', color: 'inherit', font: 'inherit' }}
        />
        <span style={{ opacity: 0.5, fontSize: 12, whiteSpace: 'nowrap' }}>{typeof value === 'number' ? `${value.toLocaleString('en-IN')} paise` : ''}</span>
      </div>
      {showError && errorMessage ? <div style={{ color: 'var(--theme-error-500)', fontSize: 13, marginTop: 4 }}>{errorMessage}</div> : null}
      {description ? <div style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>{description}</div> : null}
    </div>
  )
}
