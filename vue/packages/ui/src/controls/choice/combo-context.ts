import { computed, inject, provide, shallowRef, useId, watch, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue'
import { useReducedMotion } from '../../core/reduced-motion'
import { defaultFilter, type ComboFilter, type ComboLabels } from './combo-types'
import { comboboxMessages, multiSelectMessages } from './messages'
import { useActiveOption } from './use-active-option'

/** One `ComboboxItem` / `MultiSelectItem` as the root knows it. */
export interface ComboItemRecord {
  value: string
  label: string
  keywords: string[]
  disabled: boolean
  groupId: string | null
  id: string
  el: () => HTMLElement | null | undefined
}

export type ComboMessageKey = keyof typeof multiSelectMessages | keyof typeof comboboxMessages

export interface ComboContext {
  /** `multi-select` for tags, `combobox` for the single field. Names data attributes. */
  kind: 'combobox' | 'multi-select'
  multiple: boolean
  open: ComputedRef<boolean>
  setOpen: (open: boolean, restoreFocus?: boolean) => void
  values: ComputedRef<string[]>
  /** The first selected value (the only one for a single combobox). */
  value: ComputedRef<string | undefined>
  /** `select` for a single combobox (and closes), `toggle` for a multi-select. */
  choose: (value: string) => void
  remove: (value: string) => void
  query: ComputedRef<string>
  setQuery: (query: string) => void
  /** The option the list points at, resolved during render. */
  activeValue: ComputedRef<string | null>
  setActiveValue: (value: string | null) => void
  moveActive: (direction: 1 | -1 | 'first' | 'last') => void
  chooseActive: () => void
  registerItem: (item: ComboItemRecord) => void
  unregisterItem: (value: string) => void
  labelFor: (value: string | undefined) => string | undefined
  isVisible: (value: string) => boolean
  hasVisibleItems: (groupId: string) => boolean
  visibleCount: ComputedRef<number>
  activeItemId: ComputedRef<string | undefined>
  triggerId: string
  listId: string
  inputId: string
  disabled: ComputedRef<boolean>
  reduce: ComputedRef<boolean>
  triggerEl: ShallowRef<HTMLElement | null>
  contentEl: ShallowRef<HTMLElement | null>
  inputEl: ShallowRef<HTMLInputElement | null>
  activeLayoutId: string
  t: (key: ComboMessageKey, vars?: Record<string, string>) => string
}

export const COMBO_KEY: InjectionKey<ComboContext> = Symbol('beui-combo')
export const COMBO_GROUP_KEY: InjectionKey<string> = Symbol('beui-combo-group')

export function useComboContext(component: string) {
  const context = inject(COMBO_KEY, null)
  if (!context) throw new Error(`${component} must be used within <Combobox> or <MultiSelect>`)
  return context
}

interface RootSource {
  kind: 'combobox' | 'multi-select'
  props: {
    modelValue?: string | string[]
    defaultValue?: string | string[]
    open?: boolean
    defaultOpen?: boolean
    query?: string
    defaultQuery?: string
    filter?: ComboFilter
    disabled?: boolean
    labels?: ComboLabels
  }
  emit: (event: 'update:modelValue' | 'update:open' | 'update:query', payload: never) => void
}

/**
 * The engine behind `Combobox` and `MultiSelect` (ports of `components/motion/combobox/context.tsx`
 * and `multi-select/context.tsx`): value / open / query are each controlled when their prop is
 * given and uncontrolled otherwise, items register themselves, and the active row is derived during
 * render. Provides the context to the parts.
 */
export function useComboRoot({ kind, props, emit }: RootSource) {
  const multiple = kind === 'multi-select'
  const messages = computed(() => ({ ...(multiple ? multiSelectMessages : comboboxMessages), ...props.labels }) as Record<string, string>)
  const t: ComboContext['t'] = (key, vars) => {
    let text = messages.value[key] ?? ''
    for (const [name, replacement] of Object.entries(vars ?? {})) text = text.replace(`{${name}}`, replacement)
    return text
  }
  const reduce = useReducedMotion()
  const uid = useId()
  const rootEl = shallowRef<HTMLElement | null>(null)
  const triggerEl = shallowRef<HTMLElement | null>(null)
  const contentEl = shallowRef<HTMLElement | null>(null)
  const inputEl = shallowRef<HTMLInputElement | null>(null)

  const internalValue = shallowRef<string | string[] | undefined>(props.defaultValue ?? (multiple ? [] : undefined))
  const internalOpen = shallowRef(props.defaultOpen ?? false)
  const internalQuery = shallowRef(props.defaultQuery ?? '')
  const items = shallowRef<Map<string, ComboItemRecord>>(new Map())
  const filter = computed(() => props.filter ?? defaultFilter)
  const disabled = computed(() => props.disabled ?? false)

  const values = computed<string[]>(() => {
    const current = props.modelValue !== undefined ? props.modelValue : internalValue.value
    return Array.isArray(current) ? current : current === undefined ? [] : [current]
  })
  const value = computed(() => values.value[0])
  const open = computed(() => props.open !== undefined ? props.open : internalOpen.value)
  const query = computed(() => props.query !== undefined ? props.query : internalQuery.value)

  function focusInput() { requestAnimationFrame(() => inputEl.value?.focus({ preventScroll: true })) }
  function setQuery(next: string) {
    if (props.query === undefined) internalQuery.value = next
    emit('update:query', next as never)
  }
  function setOpen(next: boolean, restoreFocus = false) {
    if (disabled.value && next) return
    if (next !== open.value) {
      if (props.open === undefined) internalOpen.value = next
      emit('update:open', next as never)
    }
    if (!next) setQuery('')
    if (restoreFocus) focusInput()
  }
  function commit(next: string[]) {
    const out = multiple ? next : next[0]
    if (props.modelValue === undefined) internalValue.value = out
    emit('update:modelValue', out as never)
  }

  function registerItem(item: ComboItemRecord) {
    const existing = items.value.get(item.value)
    if (
      existing && existing.label === item.label && existing.disabled === item.disabled && existing.id === item.id
      && existing.el === item.el && existing.groupId === item.groupId && existing.keywords.join('\u0000') === item.keywords.join('\u0000')
    ) return
    const next = new Map(items.value)
    next.set(item.value, item)
    items.value = next
  }
  function unregisterItem(itemValue: string) {
    if (!items.value.has(itemValue)) return
    const next = new Map(items.value)
    next.delete(itemValue)
    items.value = next
  }

  // The query the list filters by. Closing clears `query`, but the panel is still on screen for its exit,
  // so it keeps filtering by the query it was open with rather than repopulating mid-collapse.
  const openQuery = shallowRef(query.value)
  watch([open, query], () => { if (open.value && openQuery.value !== query.value) openQuery.value = query.value }, { flush: 'sync', immediate: true })
  const listQuery = computed(() => open.value ? query.value : openQuery.value)
  const visibleItems = computed(() => Array.from(items.value.values()).filter(item => filter.value(item.value, listQuery.value, [item.label, ...item.keywords])))
  const enabledVisible = computed(() => visibleItems.value.filter(item => !item.disabled))
  const visibleValues = computed(() => new Set(visibleItems.value.map(item => item.value)))
  const visibleGroupIds = computed(() => new Set(visibleItems.value.map(item => item.groupId)))
  const visibleCount = computed(() => visibleItems.value.length)

  const { activeValue, setActiveValue, moveActive } = useActiveOption({ open, query: listQuery, value, enabledItems: enabledVisible })
  const activeItemId = computed(() => activeValue.value ? items.value.get(activeValue.value)?.id : undefined)

  function choose(next: string) {
    if (items.value.get(next)?.disabled) return
    if (multiple) {
      commit(values.value.includes(next) ? values.value.filter(item => item !== next) : [...values.value, next])
      setQuery('')
      focusInput()
    } else {
      commit([next])
      setOpen(false, true)
    }
  }
  function remove(next: string) {
    if (values.value.includes(next)) commit(values.value.filter(item => item !== next))
  }
  function chooseActive() { if (activeValue.value) choose(activeValue.value) }

  // Focus the input on open; keep the active row inside the scroller.
  watch(open, (isOpen, _, onCleanup) => {
    if (!isOpen || typeof window === 'undefined') return
    const frame = requestAnimationFrame(() => inputEl.value?.focus({ preventScroll: true }))
    onCleanup(() => cancelAnimationFrame(frame))
  }, { immediate: true })
  watch([activeValue, items, open], () => {
    if (!activeValue.value || !open.value) return
    const item = items.value.get(activeValue.value)?.el()
    const list = item?.closest<HTMLElement>("[role='listbox']")
    if (!item || !list) return
    const itemRect = item.getBoundingClientRect()
    const listRect = list.getBoundingClientRect()
    if (itemRect.top < listRect.top) list.scrollTop -= listRect.top - itemRect.top
    else if (itemRect.bottom > listRect.bottom) list.scrollTop += itemRect.bottom - listRect.bottom
  }, { flush: 'post' })

  // Dismiss on outside press, outside focus and Escape while open.
  watch(open, (isOpen, _, onCleanup) => {
    if (!isOpen || typeof window === 'undefined') return
    const inside = (target: Node) => rootEl.value?.contains(target) || contentEl.value?.contains(target)
    const onPointerDown = (event: PointerEvent) => { if (!inside(event.target as Node)) setOpen(false) }
    const onFocusIn = (event: FocusEvent) => { if (!inside(event.target as Node)) setOpen(false) }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true) } }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('keydown', onKeyDown)
    onCleanup(() => { window.removeEventListener('pointerdown', onPointerDown); window.removeEventListener('focusin', onFocusIn); window.removeEventListener('keydown', onKeyDown) })
  }, { immediate: true })

  const context: ComboContext = {
    kind, multiple, open, setOpen, values, value, choose, remove, query, setQuery,
    activeValue, setActiveValue, moveActive, chooseActive, registerItem, unregisterItem,
    labelFor: itemValue => itemValue === undefined ? undefined : items.value.get(itemValue)?.label,
    isVisible: itemValue => !listQuery.value.trim() || visibleValues.value.has(itemValue),
    hasVisibleItems: groupId => visibleGroupIds.value.has(groupId),
    visibleCount, activeItemId, triggerId: `${uid}-trigger`, listId: `${uid}-list`, inputId: `${uid}-input`,
    disabled, reduce, triggerEl, contentEl, inputEl, activeLayoutId: `${uid}-active`, t,
  }
  provide(COMBO_KEY, context)
  return { context, rootEl }
}
