import type { ChoiceOption } from '../types'
import type { comboboxMessages, multiSelectMessages } from './messages'

export type ComboFilter = (value: string, query: string, keywords: string[]) => boolean

export interface ComboFieldProps {
  options: readonly ChoiceOption[]
  multiple?: boolean
  modelValue?: string | string[]
  defaultValue?: string | string[]
  open?: boolean
  defaultOpen?: boolean
  query?: string
  defaultQuery?: string
  filter?: ComboFilter
  disabled?: boolean
  name?: string
  /** Accessible name of the search input. */
  label?: string
  placeholder?: string
  /** Text shown when nothing matches. */
  empty?: string
  /** Accessible name of the list. */
  listLabel?: string
  labels?: Partial<typeof multiSelectMessages & typeof comboboxMessages>
  side?: 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  avoidCollisions?: boolean
  /** Draw a divider between option groups. */
  groupSeparator?: boolean
  /** Show the search glyph in the input (always on for the single combobox). */
  showIcon?: boolean
  triggerStyle?: Record<string, string | number>
  contentStyle?: Record<string, string | number>
  listStyle?: Record<string, string | number>
}

export const defaultFilter: ComboFilter = (value, query, keywords) => {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return true
  const haystack = [value, ...keywords].join(' ').toLocaleLowerCase()
  let index = 0
  for (const character of haystack) {
    if (character === needle[index]) index += 1
    if (index === needle.length) return true
  }
  return false
}
