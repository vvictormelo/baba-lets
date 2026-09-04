'use client'

import { useState, useEffect } from 'react'

interface DateInputProps {
  value: string // yyyy-mm-dd (formato interno)
  onChange: (value: string) => void // retorna yyyy-mm-dd
  className?: string
  required?: boolean
  placeholder?: string
}

function toDisplay(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function toISO(display: string): string {
  const clean = display.replace(/\D/g, '')
  if (clean.length < 8) return ''
  const d = clean.slice(0, 2)
  const m = clean.slice(2, 4)
  const y = clean.slice(4, 8)
  return `${y}-${m}-${d}`
}

function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  let result = ''
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += '/'
    result += digits[i]
  }
  return result
}

export function DateInput({ value, onChange, className = '', required, placeholder = 'dd/mm/aaaa' }: DateInputProps) {
  const [display, setDisplay] = useState(toDisplay(value))

  useEffect(() => {
    setDisplay(toDisplay(value))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = applyMask(e.target.value)
    setDisplay(masked)
    const iso = toISO(masked)
    if (iso) onChange(iso)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      required={required}
      maxLength={10}
    />
  )
}
