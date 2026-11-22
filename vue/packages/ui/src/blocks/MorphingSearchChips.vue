<script setup lang="ts">
import { AnimatePresence, motion, mountedStates } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onBeforeUpdate, onMounted, shallowRef, useId, useSlots, useTemplateRef, watch } from 'vue'
import { easeOut, layoutSpring, swapSpring } from '../core/motion'
import { formatMessage, morphingSearchChipsMessages } from './messages'

type Row = { id: string; label: string; kind: 'query' | 'recent' | 'suggestion' }
type Side = 'top' | 'bottom'

const props = withDefaults(defineProps<{
  /** Active filters shown as chips inside the bar. */
  chips?: string[]
  defaultChips?: string[]
  /** Text in the field. */
  query?: string
  defaultQuery?: string
  /** Recent searches, newest first. */
  recents?: string[]
  defaultRecents?: string[]
  /** Persist uncontrolled recents in localStorage under this key. */
  storageKey?: string
  /** How many recent searches to keep. */
  maxRecents?: number
  /** Terms offered while typing. */
  suggestions?: string[]
  /**
   * How suggestions match the query. Default: case-insensitive substring.
   * Pass `false` when `suggestions` already arrive filtered, e.g. from a server.
   */
  filter?: ((term: string, query: string) => boolean) | false
  /** How many matches to list under the typed query. */
  maxSuggestions?: number
  /** Suggestions are being fetched. */
  loading?: boolean
  /** Most chips allowed at once. */
  maxChips?: number
  /** Clean a term before it becomes a chip; return null to reject it. */
  normalize?: (term: string) => string | null
  /** Shown when the field is empty and there are no recent searches. */
  emptyState?: string
  /** Which way the surface grows. "auto" grows up unless there is no room. */
  side?: Side | 'auto'
  open?: boolean
  defaultOpen?: boolean
  disabled?: boolean
  /** Submit each chip with a form under this name. */
  name?: string
  placeholder?: string
  /** Accessible name for the search field. */
  label?: string
  className?: string
  /** Override any built-in string. */
  labels?: Partial<typeof morphingSearchChipsMessages>
}>(), {
  defaultChips: () => [],
  defaultQuery: '',
  defaultRecents: () => [],
  suggestions: () => [],
  maxRecents: 5,
  // `undefined`, not `false`: the `filter` type admits `false`, so an absent prop would be cast to it.
  filter: undefined,
  maxSuggestions: 6,
  side: 'top',
  // `undefined`, not `false`: an absent boolean prop is cast to `false`, which
  // would read as an always-closed controlled surface.
  open: undefined,
  defaultOpen: false,
  loading: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:chips': [chips: string[]]
  chipsChange: [chips: string[]]
  'update:query': [query: string]
  queryChange: [query: string]
  'update:recents': [recents: string[]]
  recentsChange: [recents: string[]]
  'update:open': [open: boolean]
  openChange: [open: boolean]
  /** Emitted on Enter when no suggestion is highlighted. */
  search: [query: string, chips: string[]]
}>()

defineSlots<{ actions?(): unknown; empty?(): unknown }>()

// The panel's glass grows out of the bar on a spring with a little give: the
// shared tokens are critically damped, and this one is meant to land with a
// soft overshoot, so it stays local. It folds back faster than it grew.
const SPRING_MORPH = { type: 'spring', stiffness: 380, damping: 28, mass: 0.8 } as const
const MORPH_ENTER = { ...SPRING_MORPH, opacity: { duration: 0.1 } }
const MORPH_EXIT = { type: 'spring', stiffness: 520, damping: 40, mass: 0.6, opacity: { duration: 0.12, delay: 0.1 } } as const
// The pill the panel starts from and returns to: centred, and tucked halfway
// behind the bar (across the 8px gap) so it emerges from the bar's edge.
const SEED = { width: 112, height: 40 }
const SEED_TUCK = 28
// Content fades in once the shape has mostly arrived and leaves before it goes.
const CONTENT_IN = { duration: 0.18, ease: easeOut, delay: 0.12 } as const
const CONTENT_OUT = { duration: 0.08, ease: easeOut } as const
// Chips arrive on a soft spring with a touch of blur and leave on a short tween,
// faster than they came.
const CHIP_HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' }
const CHIP_SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const CHIP_ENTER = { ...swapSpring, opacity: { duration: 0.16 }, filter: { duration: 0.2 } } as const
const CHIP_EXIT = { duration: 0.16, ease: easeOut } as const
// Half the 56px bar: a pill, and the panel shares its corners.
const SURFACE_RADIUS = 28
// Room the panel wants above the bar before "auto" sends it below instead.
const PANEL_ROOM = 320

const slots = useSlots()
const reduce = useReducedMotion()
const uid = useId()
const root = useTemplateRef<HTMLElement>('root')
// The field and the two measured layers are `motion` components, so their refs
// are component instances: the DOM node is `$el`.
const field = useTemplateRef<{ $el?: HTMLInputElement }>('field')
const chipsRow = useTemplateRef<HTMLElement>('chipsRow')
const contentEl = useTemplateRef<{ $el?: HTMLElement }>('contentEl')
const rowsEl = useTemplateRef<{ $el?: HTMLElement }>('rowsEl')
const inputElement = () => field.value?.$el ?? (field.value as unknown as HTMLInputElement | null)
function elementOf(value: { $el?: HTMLElement } | HTMLElement | null | undefined): HTMLElement | null {
  if (!value) return null
  return (value as { $el?: HTMLElement }).$el ?? (value as HTMLElement)
}
const listId = `${uid}-list`
const hintId = `${uid}-hint`
const optionId = (index: number) => `${uid}-option-${index}`

const text = computed(() => ({ ...morphingSearchChipsMessages, ...props.labels }))
const placeholder = computed(() => props.placeholder ?? text.value.placeholder)
const label = computed(() => props.label ?? text.value.label)

/* ---- controllable state -------------------------------------------------- */

const localChips = shallowRef<string[]>([...props.defaultChips])
const localQuery = shallowRef(props.defaultQuery)
const localRecents = shallowRef<string[]>([...props.defaultRecents])
const localOpen = shallowRef(props.defaultOpen)

const chips = computed(() => props.chips ?? localChips.value)
const query = computed(() => props.query ?? localQuery.value)
const recents = computed(() => props.recents ?? localRecents.value)
const openState = computed(() => props.open ?? localOpen.value)
const open = computed(() => openState.value && !props.disabled)

function setChips(next: string[]) {
  if (props.chips === undefined) localChips.value = next
  emit('update:chips', next); emit('chipsChange', next)
}
function setQuery(next: string) {
  if (props.query === undefined) localQuery.value = next
  emit('update:query', next); emit('queryChange', next)
}
function setRecents(next: string[]) {
  if (props.recents === undefined) {
    localRecents.value = next
    persist(next)
  }
  emit('update:recents', next); emit('recentsChange', next)
}
function setOpen(next: boolean) {
  if (props.open === undefined) localOpen.value = next
  emit('update:open', next); emit('openChange', next)
}

/* ---- recents persistence ------------------------------------------------- */

const persistKey = computed(() => (props.storageKey && props.recents === undefined ? props.storageKey : null))
function persist(list: string[]) {
  const key = persistKey.value
  if (!key || typeof window === 'undefined') return
  try { window.localStorage.setItem(key, JSON.stringify(list)) } catch { /* Full or blocked store: keep this session's recents in memory. */ }
}
function restoreRecents() {
  const key = persistKey.value
  if (!key) return
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? 'null')
    if (Array.isArray(stored)) {
      localRecents.value = stored.filter((term): term is string => typeof term === 'string').slice(0, props.maxRecents)
    }
  } catch { /* Storage can be blocked or hold something else; recents simply start empty. */ }
}

/* ---- announcements ------------------------------------------------------- */

const announcement = shallowRef({ text: '', count: 0 })
function announce(message: string) { announcement.value = { text: message, count: announcement.value.count + 1 } }

/* ---- rows ---------------------------------------------------------------- */

const sameTerm = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
const contains = (term: string, query: string) => term.toLowerCase().includes(query.toLowerCase())

const markedChip = shallowRef<string | null>(null)
// A chip the keyboard has marked for removal, held by identity. Cleared rather
// than ignored once it leaves, so the same term added back is not born marked.
const marked = computed(() => (markedChip.value !== null && chips.value.includes(markedChip.value) ? markedChip.value : null))
watch([marked, markedChip], () => { if (markedChip.value !== null && marked.value === null) markedChip.value = null })

const trimmed = computed(() => query.value.trim())
const rows = computed<Row[]>(() => {
  if (!trimmed.value) return recents.value.map(term => ({ id: `recent:${term}`, label: term, kind: 'recent' as const }))
  const seen = new Set([trimmed.value.toLowerCase(), ...chips.value.map(chip => chip.toLowerCase())])
  const matches: Row[] = []
  const pools: { kind: 'recent' | 'suggestion'; pool: string[]; match: (term: string, value: string) => boolean }[] = [
    { kind: 'recent', pool: recents.value, match: contains },
    { kind: 'suggestion', pool: props.suggestions, match: props.filter === false ? () => true : (props.filter ?? contains) },
  ]
  for (const { kind, pool, match } of pools) {
    for (const term of pool) {
      const key = term.toLowerCase()
      if (seen.has(key) || !match(term, trimmed.value)) continue
      seen.add(key)
      matches.push({ id: `${kind}:${term}`, label: term, kind })
    }
  }
  return [{ id: `query:${trimmed.value}`, label: trimmed.value, kind: 'query' }, ...matches.slice(0, props.maxSuggestions)]
})

// The roving highlight is the row's identity stamped with the query it was
// placed under: a list that swapped its rows cannot hand Enter to a row nobody
// chose, and a stale cursor is cleared rather than kept for a row that returns.
type Cursor = { id: string; query: string } | null
const cursor = shallowRef<Cursor>(null)
const cursorIndex = computed(() => {
  if (!cursor.value || cursor.value.query !== trimmed.value) return -1
  return rows.value.findIndex(row => row.id === cursor.value!.id)
})
watch(cursorIndex, index => { if (cursor.value !== null && index < 0) cursor.value = null })
const activeIndex = computed(() => (cursorIndex.value < 0 ? 0 : cursorIndex.value))
const activeRow = computed(() => rows.value[activeIndex.value])

function moveTo(id: string | null) { cursor.value = id === null ? null : { id, query: trimmed.value } }
function moveActive(direction: 1 | -1) {
  const last = rows.value.length - 1
  if (last < 0) return
  const at = Math.max(cursorIndex.value, 0)
  const next = Math.min(Math.max(at + direction, 0), last)
  cursor.value = { id: rows.value[next]!.id, query: trimmed.value }
}

const showList = computed(() => rows.value.length > 0)
const hasEmptyState = computed(() => Boolean(props.emptyState) || Boolean(slots.empty))
// Nothing to say means nothing to grow for: the bar still widens on focus.
const hasPanel = computed(() => showList.value || Boolean(props.loading) || (!trimmed.value && hasEmptyState.value))
const panelOpen = computed(() => open.value && hasPanel.value)
const activeOptionId = computed(() => (panelOpen.value && showList.value ? optionId(activeIndex.value) : undefined))

// A fresh session each time the panel opens: the highlight starts at the top.
watch(() => open.value, (isOpen, was) => {
  if (isOpen && !was) { moveTo(null); panelFloor.value = 0 }
}, { flush: 'sync' })

/* ---- the glass ----------------------------------------------------------- */

const panelSize = shallowRef({ width: 0, height: 0 })
// The tallest the panel has been since it opened. Typing can grow the card but
// never shrink it; each new session starts from its own content again.
const panelFloor = shallowRef(0)
const placed = shallowRef<Side>(props.side === 'bottom' ? 'bottom' : 'top')
const rtl = shallowRef(false)

let panelObserver: ResizeObserver | undefined
let rowsObserver: ResizeObserver | undefined

watch(contentEl, raw => {
  const element = elementOf(raw)
  panelObserver?.disconnect()
  panelObserver = undefined
  if (!element || typeof ResizeObserver === 'undefined') return
  const read = () => { panelSize.value = { width: element.offsetWidth, height: element.offsetHeight } }
  read()
  panelObserver = new ResizeObserver(read)
  panelObserver.observe(element)
}, { flush: 'post' })
watch(rowsEl, raw => {
  const element = elementOf(raw)
  rowsObserver?.disconnect()
  rowsObserver = undefined
  if (!element || typeof ResizeObserver === 'undefined') return
  // The wrapper's padding adds 16px around the rows.
  const read = () => { panelFloor.value = Math.max(panelFloor.value, element.offsetHeight + 16) }
  read()
  rowsObserver = new ResizeObserver(read)
  rowsObserver.observe(element)
}, { flush: 'post' })

// "auto" picks a side as the panel opens and keeps it until it closes.
watch(panelOpen, isOpen => {
  if (!isOpen || typeof window === 'undefined') return
  if (props.side !== 'auto') { placed.value = props.side; return }
  const rect = root.value?.getBoundingClientRect()
  if (!rect) return
  const above = rect.top
  const below = window.innerHeight - rect.bottom
  placed.value = above < PANEL_ROOM && below > above ? 'bottom' : 'top'
})

const below = computed(() => placed.value === 'bottom')
const seed = computed(() => ({ ...SEED, y: below.value ? -SEED_TUCK : SEED_TUCK }))
const layoutTransition = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))

// Direction decides which way chips unroll and which arrow walks back into
// them.
onMounted(() => {
  if (root.value) rtl.value = getComputedStyle(root.value).direction === 'rtl'
})

// A chip added past the visible edge of a crowded row scrolls into view.
watch(() => chips.value.length, (length, previous) => {
  const row = chipsRow.value
  if (!row || length <= previous || row.scrollWidth <= row.clientWidth) return
  row.scrollTo({ left: rtl.value ? -row.scrollWidth : row.scrollWidth, behavior: reduce.value ? 'auto' : 'smooth' })
})

// Arrow keys can walk past the visible rows of a capped list.
watch(activeOptionId, id => {
  if (id) document.getElementById(id)?.scrollIntoView({ block: 'nearest' })
})

/* ---- mutations ----------------------------------------------------------- */

const full = computed(() => props.maxChips !== undefined && chips.value.length >= props.maxChips)

function addChip(term: string) {
  const value = props.normalize ? props.normalize(term) : term.trim()
  if (!value) return
  const exists = chips.value.some(chip => sameTerm(chip, value))
  if (!exists && full.value) {
    announce(formatMessage(text.value.filterLimit, { max: props.maxChips ?? 0 }))
    return
  }
  if (!exists) {
    setChips([...chips.value, value])
    announce(formatMessage(text.value.filterAdded, { term: value }))
  }
  setRecents([value, ...recents.value.filter(recent => !sameTerm(recent, value))].slice(0, props.maxRecents))
  setQuery('')
}

function removeChip(term: string) {
  setChips(chips.value.filter(chip => chip !== term))
  announce(formatMessage(text.value.filterRemoved, { term }))
  inputElement()?.focus()
}

function removeRecent(term: string) {
  setRecents(recents.value.filter(recent => recent !== term))
  announce(formatMessage(text.value.recentRemoved, { term }))
}

function clearRecents() {
  setRecents([])
  announce(text.value.recentsCleared)
  inputElement()?.focus()
}

// Steps the marked chip from the one it is on now, inside the update, so two
// presses in one batch move two chips.
function stepMark(direction: 1 | -1) {
  const list = chips.value
  if (list.length === 0) { markedChip.value = null; return }
  const at = markedChip.value === null ? list.length : list.indexOf(markedChip.value)
  const next = at + direction
  markedChip.value = next >= list.length ? null : list[Math.max(next, 0)] ?? null
}

/* ---- keyboard ------------------------------------------------------------ */

function onKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLInputElement
  // An input method is still composing; Enter and arrows belong to it.
  if ((event as KeyboardEvent & { isComposing?: boolean }).isComposing || event.keyCode === 229) return
  const atStart = target.selectionStart === 0 && target.selectionEnd === 0
  const back = rtl.value ? 'ArrowRight' : 'ArrowLeft'
  const forward = rtl.value ? 'ArrowLeft' : 'ArrowRight'

  if (marked.value !== null) {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      const term = marked.value
      markedChip.value = null
      removeChip(term)
      return
    }
    if (event.key === back || event.key === forward) {
      event.preventDefault()
      stepMark(event.key === back ? -1 : 1)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      markedChip.value = null
      return
    }
    markedChip.value = null
  }

  if (event.key === 'Escape' && query.value !== '') {
    // Clear before closing: one press undoes typing, the next leaves.
    event.preventDefault()
    event.stopPropagation()
    setQuery('')
    return
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) setOpen(true)
    else moveActive(event.key === 'ArrowDown' ? 1 : -1)
    return
  }
  if (event.key === 'Enter') {
    if (panelOpen.value && activeRow.value) {
      event.preventDefault()
      addChip(activeRow.value.label)
      return
    }
    const term = query.value.trim()
    if (term) {
      setRecents([term, ...recents.value.filter(recent => !sameTerm(recent, term))].slice(0, props.maxRecents))
    }
    emit('search', term, chips.value)
    return
  }
  if (event.key === 'Delete' && panelOpen.value && activeRow.value?.kind === 'recent') {
    event.preventDefault()
    removeRecent(activeRow.value.label)
    return
  }
  if (event.key === 'Backspace' && atStart && chips.value.length > 0) {
    // Mark first, remove on the second press: one stray key never loses a filter.
    event.preventDefault()
    const last = chips.value[chips.value.length - 1]!
    markedChip.value = last
    announce(formatMessage(text.value.filterMarked, { term: last }))
    return
  }
  if (event.key === back && atStart && chips.value.length > 0) {
    event.preventDefault()
    stepMark(-1)
  }
}

// A press anywhere on the bar that is not its own control lands in the field.
function onBarPointerDown(event: PointerEvent) {
  const target = event.target as Element | null
  if (props.disabled || target?.closest('button, input, a')) return
  event.preventDefault()
  inputElement()?.focus()
  setOpen(true)
}

function onFieldInput(event: Event) {
  setQuery((event.target as HTMLInputElement).value)
  if (!open.value) setOpen(true)
}

/* ---- dismissal ----------------------------------------------------------- */

function close() { setOpen(false) }
function onRootFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null
  if (next && root.value?.contains(next)) return
  markedChip.value = null
  close()
}

function onDocumentKey(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  setOpen(false)
}
function onDocumentPointer(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target || root.value?.contains(target)) return
  setOpen(false)
}
// A pointerdown outside the widget is a dismissal, in the capture phase so no
// handler in between can hide it; Escape closes too.
watch(open, isOpen => {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', onDocumentKey)
  document.removeEventListener('pointerdown', onDocumentPointer, true)
  if (!isOpen) return
  document.addEventListener('keydown', onDocumentKey)
  document.addEventListener('pointerdown', onDocumentPointer, true)
}, { immediate: true })

onMounted(() => { restoreRecents() })
onBeforeUnmount(() => {
  panelObserver?.disconnect()
  rowsObserver?.disconnect()
  document.removeEventListener('keydown', onDocumentKey)
  document.removeEventListener('pointerdown', onDocumentPointer, true)
})

/* ---- rendering helpers --------------------------------------------------- */

// The typed query is bolded inside a matching row, exactly where it occurs.
const renderedRows = computed(() => rows.value.map(row => {
  const value = trimmed.value
  const at = row.kind === 'query' || !value ? -1 : row.label.toLowerCase().indexOf(value.toLowerCase())
  return at < 0
    ? { row, before: row.label, match: '', after: '' }
    : { row, before: row.label.slice(0, at), match: row.label.slice(at, at + value.length), after: row.label.slice(at + value.length) }
}))

const glassStyle = computed(() => ({ borderRadius: `${SURFACE_RADIUS}px`, x: '-50%' }))
const glassEnter = computed(() => (reduce.value ? { opacity: 0 } : { ...seed.value, opacity: 0 }))
const glassActive = computed(() => ({ width: panelSize.value.width || SEED.width, height: panelSize.value.height || SEED.height, y: 0, opacity: 1 }))
const glassExit = computed(() => (reduce.value ? { opacity: 0, transition: { duration: 0.12 } } : { ...seed.value, opacity: 0, transition: MORPH_EXIT }))
const contentStyle = computed(() => (panelFloor.value ? { minHeight: `${panelFloor.value}px` } : undefined))
const contentInitial = computed(() => ({ opacity: 0, y: reduce.value ? 0 : below.value ? -6 : 6 }))
const contentActive = computed(() => (reduce.value ? { opacity: 1, y: 0, transition: { duration: 0.15 } } : { opacity: 1, y: 0, transition: CONTENT_IN }))
// React measures every layout box before any of the commit's DOM changes. A
// motion component here measures in its own beforeUpdate, which Vue only runs
// when its props change and after the siblings before it have already patched,
// so the field would never glide aside as a chip arrives. Measuring the bar,
// the chips and the field from this component's beforeUpdate restores that.
onBeforeUpdate(() => {
  const el = root.value
  if (!el || reduce.value) return
  for (const node of el.querySelectorAll<HTMLElement>('.chips-bar, .chip, .chips-field')) {
    const state = mountedStates.get(node)
    if (state && !state.isExiting) state.getSnapshot(true)
  }
})
const fieldStyle = computed(() => (open.value ? undefined : { width: `${Math.max(placeholder.value.length, 6) + 2}ch` }))
const chipOrigin = computed(() => (rtl.value ? 'right center' : 'left center'))
const rowsLabel = computed(() => (trimmed.value ? text.value.suggestions : text.value.recentSearches))
</script>

<template>
  <div ref="root" class="chips" :class="className" :data-disabled="disabled || undefined" @focusout="onRootFocusOut">
    <AnimatePresence>
      <div v-if="panelOpen" key="panel" class="chips-panel-wrap" :class="below ? 'is-below' : 'is-above'">
        <!-- The card's glass starts as a small pill on the bar's edge and springs
             out to the size of what it holds, then back on close. Width and
             height animate rather than scale so the corners stay true. -->
        <motion.div aria-hidden="true" class="chips-glass" :initial="glassEnter" :animate="glassActive" :exit="glassExit"
          :transition="reduce ? { duration: 0 } : MORPH_ENTER" :style="glassStyle" />
        <!-- Content waits for the shape to arrive and leaves before it goes. -->
        <motion.div ref="contentEl" class="chips-content" :initial="contentInitial" :animate="contentActive"
          :exit="{ opacity: 0, transition: CONTENT_OUT }" :style="contentStyle">
          <div ref="rowsEl">
            <div class="chips-head">
              <span class="chips-heading">{{ trimmed ? text.suggestions : text.recent }}</span>
              <button v-if="!trimmed && recents.length > 0" type="button" class="chips-clear" @click="clearRecents">{{ text.clear }}</button>
            </div>
            <div v-if="showList" :id="listId" role="listbox" :aria-label="rowsLabel" :aria-busy="loading || undefined" class="chips-list">
              <div v-for="({ row, before, match, after }, index) in renderedRows" :id="optionId(index)" :key="row.id" role="option" :aria-selected="index === activeIndex"
                class="chips-option" @pointerdown="event => event.preventDefault()" @pointermove="moveTo(row.id)" @click="addChip(row.label)">
                <motion.span v-if="index === activeIndex" class="chips-active" :layout-id="`${uid}-active`" :transition="layoutTransition" />
                <svg v-if="row.kind === 'recent'" class="chips-glyph" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
                <svg v-else class="chips-glyph" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="m16 16 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
                <span class="chips-option-label">{{ before }}<strong v-if="match">{{ match }}</strong>{{ after }}</span>
                <span v-if="row.kind === 'recent'" aria-hidden="true" class="chips-option-remove" @click="event => { event.stopPropagation(); removeRecent(row.label) }">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
                </span>
              </div>
            </div>
            <div v-else-if="!trimmed" class="chips-empty">
              <slot name="empty">{{ emptyState }}</slot>
            </div>
            <div v-if="loading" class="chips-loading">
              <svg class="chips-spinner" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-8-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
              {{ text.searching }}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>

    <motion.div class="chips-bar" :data-open="open || undefined" :layout="!reduce" :transition="layoutTransition"
      :style="{ borderRadius: `${SURFACE_RADIUS}px` }" @pointerdown="onBarPointerDown">
      <svg class="chips-search" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.7" /><path d="m16 16 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" /></svg>
      <div ref="chipsRow" class="chips-row" :data-filled="chips.length > 0 || undefined">
        <AnimatePresence :initial="false" mode="popLayout">
          <motion.span v-for="chip in chips" :key="chip" class="chip" :data-marked="marked === chip || undefined" :layout="reduce ? false : 'position'"
            :initial="reduce ? { opacity: 0 } : CHIP_HIDDEN" :animate="reduce ? { opacity: 1 } : CHIP_SHOWN"
            :exit="reduce ? { opacity: 0, transition: { duration: 0.1 } } : { ...CHIP_HIDDEN, transition: CHIP_EXIT }"
            :transition="reduce ? { duration: 0.12 } : CHIP_ENTER" :style="{ transformOrigin: chipOrigin }">
            <span class="chip-label" :title="chip">{{ chip }}</span>
            <button type="button" class="chip-remove" :disabled="disabled" :aria-label="formatMessage(text.removeFilter, { term: chip })" @click="removeChip(chip)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </motion.span>
        </AnimatePresence>
      </div>
      <motion.input ref="field" type="text" role="combobox" :aria-label="label" :aria-expanded="panelOpen"
        :aria-controls="panelOpen && showList ? listId : undefined" aria-autocomplete="list" :aria-activedescendant="activeOptionId"
        :aria-describedby="hintId" autocomplete="off" :spellcheck="false" enterkeyhint="search" :disabled="disabled"
        :value="query" :placeholder="placeholder" :layout="reduce ? false : 'position'" :transition="layoutTransition"
        :style="fieldStyle" class="chips-field" @input="onFieldInput" @focus="setOpen(true)" @click="setOpen(true)" @keydown="onKeyDown" />
      <div v-if="$slots.actions" class="chips-actions"><slot name="actions" /></div>
    </motion.div>

    <template v-if="name">
      <input v-for="chip in chips" :key="chip" type="hidden" :name="name" :value="chip">
    </template>
    <span :id="hintId" class="chips-sr">{{ text.hint }}</span>
    <span aria-live="polite" class="chips-sr">{{ announcement.text }}{{ announcement.count % 2 ? ' ' : '' }}</span>
  </div>
</template>

<style scoped>
.chips { position: relative; display: flex; justify-content: center; width: 100%; max-width: 36rem; height: 3.5rem; }
.chips[data-disabled] { opacity: .6; }

/* Glass: a thin tint of the page colour over a saturated blur, a hairline
   edge, a top highlight and a soft drop. */
.chips-glass, .chips-bar {
  border: 1px solid color-mix(in srgb, var(--beui-foreground) 8%, transparent);
  background: color-mix(in srgb, var(--beui-background) 55%, transparent);
  backdrop-filter: blur(20px) saturate(1.6);
  box-shadow: inset 0 1px 0 0 rgb(255 255 255 / .06), 0 24px 60px -24px rgb(0 0 0 / .45);
}
.chips-panel-wrap { position: absolute; inset-inline: 0; z-index: 10; }
.chips-panel-wrap.is-below { top: 100%; margin-top: .5rem; }
.chips-panel-wrap.is-above { bottom: 100%; margin-bottom: .5rem; }
.chips-glass { pointer-events: none; position: absolute; left: 50%; }
.chips-panel-wrap.is-below .chips-glass { top: 0; }
.chips-panel-wrap.is-above .chips-glass { bottom: 0; }
.chips-content { position: relative; padding: .5rem; }
.chips-head { display: flex; align-items: center; justify-content: space-between; height: 2.25rem; padding-inline: .75rem; }
.chips-heading { color: var(--beui-muted-foreground); font-size: .75rem; line-height: calc(1 / .75); font-weight: 500; }
.chips-clear { padding: .125rem .375rem; border: 0; border-radius: .375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; line-height: calc(1 / .75); cursor: pointer; outline: none; transition: color .15s cubic-bezier(.4, 0, .2, 1); }
.chips-clear:hover { color: var(--beui-foreground); }
.chips-clear:focus-visible { outline: 2px solid var(--beui-ring); }
.chips-list { max-height: min(20rem, 45vh); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
.chips-option { position: relative; display: flex; align-items: center; gap: .75rem; height: 2.75rem; padding-inline: .75rem; border-radius: 1rem; color: var(--beui-foreground); font-size: .875rem; line-height: calc(1.25 / .875); cursor: pointer; }
.chips-active { position: absolute; inset: 0; border-radius: 1rem; background: color-mix(in srgb, var(--beui-foreground) 6%, transparent); }
.chips-glyph { position: relative; width: 1rem; height: 1rem; flex: none; color: var(--beui-muted-foreground); }
.chips-option-label { position: relative; min-width: 0; flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.chips-option-label strong { font-weight: 600; }
.chips-option-remove { position: relative; display: grid; place-items: center; width: 1.75rem; height: 1.75rem; flex: none; border-radius: 50%; color: var(--beui-muted-foreground); transition: background-color .15s cubic-bezier(.4, 0, .2, 1), color .15s cubic-bezier(.4, 0, .2, 1); }
.chips-option-remove svg { width: .875rem; height: .875rem; }
.chips-option-remove:hover { background: color-mix(in srgb, var(--beui-foreground) 10%, transparent); color: var(--beui-foreground); }
.chips-empty { padding: .25rem .75rem .5rem; color: var(--beui-muted-foreground); font-size: .875rem; line-height: calc(1.25 / .875); }
.chips-loading { display: flex; align-items: center; gap: .75rem; height: 2.75rem; padding-inline: .75rem; color: var(--beui-muted-foreground); font-size: .875rem; line-height: calc(1.25 / .875); }
.chips-spinner { width: 1rem; height: 1rem; }
@media (prefers-reduced-motion: no-preference) { .chips-spinner { animation: chips-spin 1s linear infinite; } }
@keyframes chips-spin { to { transform: rotate(360deg); } }

.chips-bar { position: relative; z-index: 20; display: flex; align-items: center; gap: .5rem; height: 3.5rem; min-width: 0; width: fit-content; max-width: 100%; padding-inline-start: 1rem; padding-inline-end: 1rem; cursor: text; }
.chips-bar[data-open] { width: 100%; }
.chips-bar:has(.chips-actions) { padding-inline-end: .5rem; }
.chips[data-disabled] .chips-bar { cursor: not-allowed; }
.chips-search { width: 1.25rem; height: 1.25rem; flex: none; color: var(--beui-muted-foreground); }
.chips-row { position: relative; display: flex; align-items: center; gap: .375rem; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.chips-row[data-filled] { margin-inline: -.375rem; padding-inline: .75rem; mask-image: linear-gradient(to right, transparent, #000 12px, #000 calc(100% - 12px), transparent); }
.chip { display: flex; align-items: center; gap: .25rem; height: 2.25rem; flex: none; padding-inline-start: .75rem; padding-inline-end: .25rem; border-radius: 999px; background: color-mix(in srgb, var(--beui-foreground) 7%, transparent); color: var(--beui-foreground); font-size: .875rem; line-height: calc(1.25 / .875); transition: background-color .15s cubic-bezier(.4, 0, .2, 1), box-shadow .15s cubic-bezier(.4, 0, .2, 1); }
/* Inset: the chip fills its scrolling row, which clips anything drawn outside it. */
.chip[data-marked] { background: color-mix(in srgb, var(--beui-foreground) 12%, transparent); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 40%, transparent); }
.chip-label { max-width: 10rem; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.chip-remove { display: grid; place-items: center; width: 1.75rem; height: 1.75rem; flex: none; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: background-color .15s cubic-bezier(.4, 0, .2, 1), color .15s cubic-bezier(.4, 0, .2, 1); }
.chip-remove svg { width: .875rem; height: .875rem; }
.chip-remove:hover { background: color-mix(in srgb, var(--beui-foreground) 10%, transparent); color: var(--beui-foreground); }
.chip-remove:focus-visible { outline: 2px solid var(--beui-ring); }
.chip-remove:disabled { pointer-events: none; }
.chips-field { height: 2.25rem; min-width: 6rem; margin: 0; padding: 0; border: 0; background: transparent; color: var(--beui-foreground); font: inherit; font-size: 1rem; outline: none; text-overflow: ellipsis; }
.chips-field::placeholder { color: var(--beui-muted-foreground); }
.chips-field:disabled { cursor: not-allowed; }
.chips-bar[data-open] .chips-field { flex: 1; }
.chips-actions { display: flex; flex: none; align-items: center; gap: .25rem; }
.chips-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; border: 0; clip: rect(0, 0, 0, 0); white-space: nowrap; }
</style>
