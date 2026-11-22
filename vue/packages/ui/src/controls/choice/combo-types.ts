import type { ChoiceOption } from '../types'
import type { comboboxMessages, multiSelectMessages } from './messages'

export type ComboFilter = (value: string, query: string, keywords: string[]) => boolean
export type ComboLabels = Partial<typeof multiSelectMessages & typeof comboboxMessages>
export type ComboStyle = Record<string, string | number>

/**
 * Options-driven shorthand shared by `Combobox` and `MultiSelect`. Everything below `options` only
 * applies when `options` is given; compose the parts (`ComboboxTrigger`, `ComboboxContent`, …) to
 * lay the field out yourself.
 */
export interface ComboOptionsProps {
  /** Render the field from a list of options instead of composing parts. */
  options?: readonly ChoiceOption[]
  /** Accessible name of the search input. */
  label?: string
  placeholder?: string
  /** Text shown when nothing matches. */
  empty?: string
  /** Accessible name of the list. */
  listLabel?: string
  side?: 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  avoidCollisions?: boolean
  /** Draw a divider between option groups. */
  groupSeparator?: boolean
  /** Show the search glyph in the input (always on for the single combobox). */
  showIcon?: boolean
  triggerStyle?: ComboStyle
  contentStyle?: ComboStyle
  listStyle?: ComboStyle
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
