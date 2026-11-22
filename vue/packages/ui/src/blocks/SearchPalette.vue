<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch, type Component } from 'vue'
import { easeOut } from '../core/motion'
import PresenceGate from '../layout/PresenceGate.vue'
import { useOpenState } from '../primitives/state'
import { searchCommands } from './command-search'
import { commandPaletteMessages } from './messages'

export type SearchItem = {
  id: string
  label?: string
  /** Alias of `label`, kept for older call sites. */
  title?: string
  group?: string
  hint?: string
  description?: string
  keywords?: string[]
  /** A component rendered as the row's leading icon (or use the `icon` slot). */
  icon?: Component
  badge?: string
  disabled?: boolean
  onSelect?: () => void
}

const props = withDefaults(defineProps<{
  items: SearchItem[]
  open?: boolean
  defaultOpen?: boolean
  /** Opens with Cmd/Ctrl + this key. Default: "k" */
  shortcut?: string
  placeholder?: string
  emptyMessage?: string
  /** Renders the morphing-search trigger copy; set by `MorphingSearch`. */
  morph?: boolean
  iconOnly?: boolean
  /** Hide the built-in trigger button when the palette is opened from elsewhere. */
  noTrigger?: boolean
  /** Override any built-in string. `results` names items without a `group`. */
  labels?: Partial<typeof commandPaletteMessages>
}>(), { open: undefined, defaultOpen: false, shortcut: 'k' })

const emit = defineEmits<{
  'update:open': [value: boolean]
  openChange: [value: boolean]
  queryChange: [value: string]
  select: [item: SearchItem]
}>()

defineSlots<{
  trigger?(): unknown
  item?(props: { item: SearchItem }): unknown
  icon?(props: { item: SearchItem }): unknown
  badge?(props: { item: SearchItem }): unknown
}>()

// Opened via a keyboard shortcut many times a day — entrance must read as
// instant. Tight spring, even faster exit.
const PANEL_SPRING = { type: 'spring', stiffness: 560, damping: 40, mass: 0.5 } as const
// Tracks rapid arrow-key navigation — tighter than the layout spring so it
// never lags the active row.
const ACTIVE_SPRING = { type: 'spring', stiffness: 480, damping: 38 } as const

const t = computed(() => ({ ...commandPaletteMessages, ...props.labels }))
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
const reduce = useReducedMotion()
const uid = useId()

const query = shallowRef('')
const mounted = shallowRef(false)
const canTouch = shallowRef(false)
const input = useTemplateRef<HTMLInputElement>('input')
const list = useTemplateRef<HTMLElement>('list')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')

const labelOf = (item: SearchItem) => item.label ?? item.title ?? ''
const placeholder = computed(() => props.placeholder ?? (props.morph ? 'Search' : t.value.placeholder))
const emptyMessage = computed(() => props.emptyMessage ?? t.value.empty)

const filtered = computed(() => {
  const searchable = props.items.map(item => ({ item, label: labelOf(item), group: item.group, keywords: [item.description ?? '', ...(item.keywords ?? [])].filter(Boolean) }))
  return searchCommands(searchable, query.value).map(entry => entry.item)
})
// Reserve the icon column only when at least one item brings an icon.
const hasIcons = computed(() => props.items.some(item => item.icon))

// Grouping reorders the list, so the rendered order is not the filtered order
// whenever two groups interleave. Everything that has to agree on "which row"
// — the highlight, the ids, Enter, the scroll — reads this one array.
const grouped = computed(() => {
  const map = new Map<string, SearchItem[]>()
  for (const item of filtered.value) {
    const group = item.group ?? t.value.results
    const bucket = map.get(group) ?? []
    bucket.push(item)
    map.set(group, bucket)
  }
  return Array.from(map.entries())
})
const rows = computed(() => grouped.value.flatMap(([, entries]) => entries))
const rowIndex = computed(() => new Map(rows.value.map((item, index) => [item.id, index])))

/* ---- row cursor ----------------------------------------------------------- */
// The highlighted row is resolved during render, from the row's identity and the
// query it was placed under — never from a position, never in an effect.
type RowCursor = { id: string; query: string }
const cursor = shallowRef<RowCursor | null>(null)
function indexOfCursor(current: RowCursor | null) {
  if (current === null || current.query !== query.value) return -1
  return rows.value.findIndex(row => row.id === current.id)
}
const cursorRow = computed(() => indexOfCursor(cursor.value))
const active = computed(() => (cursorRow.value < 0 ? 0 : cursorRow.value))
// A cursor whose row has left the list is cleared, so rows that come back
// cannot revive a highlight the user has stopped aiming at.
watch(cursorRow, row => { if (cursor.value !== null && row < 0) cursor.value = null }, { flush: 'sync' })
function moveTo(id: string | null) {
  cursor.value = id === null ? null : { id, query: query.value }
}
function moveActive(direction: 1 | -1) {
  const last = rows.value.length - 1
  if (last < 0) return
  const at = Math.max(indexOfCursor(cursor.value), 0)
  const next = Math.min(Math.max(at + direction, 0), last)
  cursor.value = { id: rows.value[next]!.id, query: query.value }
}

// Opening starts a fresh session — an empty query, the highlight back at the top.
watch(open, isOpen => {
  if (!isOpen) return
  query.value = ''
  moveTo(null)
}, { flush: 'sync' })
watch(query, value => emit('queryChange', value))

/* ---- shortcut, scroll lock, focus ---------------------------------------- */
function onWindowKey(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === props.shortcut.toLowerCase()) {
    event.preventDefault()
    setOpen(!open.value)
    return
  }
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    setOpen(false)
  }
}

onMounted(() => {
  mounted.value = true
  window.addEventListener('keydown', onWindowKey)
  const media = window.matchMedia?.('(any-pointer: coarse)')
  const update = () => { canTouch.value = Boolean(media?.matches) || navigator.maxTouchPoints > 0 }
  update()
  media?.addEventListener?.('change', update)
  stopMedia = () => media?.removeEventListener?.('change', update)
})
let stopMedia: (() => void) | undefined
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKey)
  stopMedia?.()
})

watch(open, (isOpen, _previous, onCleanup) => {
  if (!isOpen) return
  const root = document.documentElement
  const previousRootOverflow = root.style.overflow
  const previousBodyOverflow = document.body.style.overflow
  root.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  const frame = requestAnimationFrame(() => input.value?.focus())
  onCleanup(() => {
    cancelAnimationFrame(frame)
    root.style.overflow = previousRootOverflow
    document.body.style.overflow = previousBodyOverflow
  })
}, { immediate: true, flush: 'post' })

watch([active, open], async () => {
  if (!open.value) return
  await nextTick()
  list.value?.querySelector<HTMLElement>(`[data-index="${active.value}"]`)?.scrollIntoView({ block: 'nearest' })
}, { flush: 'post' })

// Focus is handed back to whatever opened the palette (its own trigger, or an external button when
// `noTrigger` is used) once the dialog lets go of it.
let opener: HTMLElement | null = null
watch(open, (isOpen, wasOpen) => {
  if (isOpen && !wasOpen) {
    const current = document.activeElement
    opener = current instanceof HTMLElement && current !== document.body ? current : null
    return
  }
  if (wasOpen && !isOpen) {
    const target = opener?.isConnected ? opener : trigger.value
    opener = null
    const current = document.activeElement
    if (!current || current === document.body || current.closest('[role="dialog"]')) target?.focus()
  }
}, { flush: 'post' })

function select(item: SearchItem | undefined) {
  if (!item || item.disabled) return
  item.onSelect?.()
  emit('select', item)
  setOpen(false)
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  } else if (event.key === 'Enter') {
    if (event.isComposing || event.keyCode === 229) return
    event.preventDefault()
    select(rows.value[active.value])
  }
}
</script>

<template>
  <div v-if="!noTrigger" class="be-block">
    <button ref="trigger" type="button" class="be-block-button" :aria-label="morph ? 'Open search' : 'Open command palette'" aria-haspopup="dialog" @click="setOpen(true)">
      <slot name="trigger">⌕ <span v-if="!iconOnly">{{ morph ? 'Search' : 'Open command palette' }}</span> <kbd v-if="!iconOnly">⌘ {{ shortcut.toUpperCase() }}</kbd></slot>
    </button>
  </div>

  <!-- Portaled to <body> so ancestors with transforms, filters, or fixed
       positioning can't trap the overlay in their stacking context, and mounted
       only while open. The chrome is two fixed siblings: the backdrop spans the
       viewport edges and carries the scrim colour, and the layer positioning
       the panel is inset off every edge. Both hang off `PresenceGate`. -->
  <Teleport v-if="mounted" to="body">
    <AnimatePresence :initial="false">
      <PresenceGate v-if="open" key="backdrop" v-slot="{ gate }">
        <motion.button type="button" class="be-cp-backdrop" :aria-label="t.close"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: { duration: 0.12, ease: easeOut } }"
          :transition="{ duration: 0.18, ease: easeOut }" :inert="gate.inert" :style="gate.style" @click="setOpen(false)" />
      </PresenceGate>

      <PresenceGate v-if="open" key="panel-layer" v-slot="{ isPresent, gate }">
        <!-- The layer itself never takes pointer events, so it carries `inert` alone. -->
        <div class="be-cp-layer" :inert="!isPresent">
          <motion.div role="dialog" aria-modal="true" :aria-label="morph ? 'Search' : t.dialog" class="be-cp-panel"
            :initial="{ opacity: 0, y: reduce ? 0 : -8, scale: reduce ? 1 : 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: reduce ? 0 : -8, scale: reduce ? 1 : 0.97, transition: { duration: 0.12, ease: easeOut } }"
            :transition="reduce ? { duration: 0.1 } : PANEL_SPRING" :inert="gate.inert" :style="gate.style" @keydown="onKeyDown">
            <div class="be-cp-header">
              <svg class="be-cp-search" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input ref="input" v-model="query" class="be-cp-input" :class="{ 'is-touch': canTouch }" :placeholder="placeholder" role="combobox"
                aria-expanded="true" :aria-controls="`${uid}-list`" :aria-activedescendant="rows.length > 0 ? `${uid}-opt-${active}` : undefined"
                aria-autocomplete="list" :aria-label="morph ? 'Search' : t.dialog">
              <kbd class="be-cp-esc">ESC</kbd>
            </div>
            <div :id="`${uid}-list`" ref="list" role="listbox" :aria-label="t.list" class="be-cp-list">
              <div v-if="rows.length === 0" class="be-cp-empty">{{ emptyMessage }}</div>
              <template v-else>
                <div v-for="[group, entries] in grouped" :key="group" class="be-cp-group">
                  <div aria-hidden="true" class="be-cp-group-label">{{ group }}</div>
                  <button v-for="item in entries" :id="`${uid}-opt-${rowIndex.get(item.id)}`" :key="item.id" type="button" role="option"
                    class="be-cp-row" :class="{ 'is-active': rowIndex.get(item.id) === active }" :aria-selected="rowIndex.get(item.id) === active"
                    :aria-disabled="item.disabled || undefined" :data-index="rowIndex.get(item.id)" @mouseenter="moveTo(item.id)" @click="select(item)">
                    <motion.span v-if="rowIndex.get(item.id) === active" :layout-id="`${uid}-active`" class="be-cp-active"
                      :transition="reduce ? { duration: 0 } : ACTIVE_SPRING" />
                    <slot name="item" :item="item">
                      <span v-if="item.icon || $slots.icon" class="be-cp-icon" aria-hidden="true">
                        <slot name="icon" :item="item"><component :is="item.icon" /></slot>
                      </span>
                      <span v-else-if="hasIcons" class="be-cp-icon" aria-hidden="true" />
                      <span class="be-cp-label">{{ labelOf(item) }}</span>
                      <span v-if="item.badge || $slots.badge" class="be-cp-badge"><slot name="badge" :item="item">{{ item.badge }}</slot></span>
                      <kbd v-if="item.hint" class="be-cp-hint">{{ item.hint }}</kbd>
                    </slot>
                  </button>
                </div>
              </template>
            </div>
          </motion.div>
        </div>
      </PresenceGate>
    </AnimatePresence>
  </Teleport>
</template>

<style scoped>
.be-cp-backdrop { pointer-events: auto; position: fixed; inset: 0; z-index: 100; display: block; margin: 0; padding: 0; border: 0; cursor: default; background: color-mix(in srgb, var(--beui-background) 5%, transparent); -webkit-backdrop-filter: blur(12px) saturate(140%); backdrop-filter: blur(12px) saturate(140%); }
.be-cp-layer { pointer-events: none; position: fixed; inset: 18vh 1rem 1rem; z-index: 100; display: flex; align-items: flex-start; justify-content: center; }
.be-cp-panel { pointer-events: auto; box-sizing: border-box; width: 100%; max-width: 36rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); color: var(--beui-foreground); box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25); font-size: 1rem; line-height: 1.5; will-change: transform; }
.be-cp-header { display: flex; align-items: center; gap: .75rem; padding-inline: 1rem; border-bottom: 1px solid var(--beui-border); }
.be-cp-search { color: var(--beui-muted-foreground); width: 1rem; height: 1rem; flex: none; fill: none; stroke: var(--beui-muted-foreground); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.be-cp-input { box-sizing: border-box; height: 3rem; min-width: 0; flex: 1; margin: 0; padding: 0; border: 0; background: transparent; color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: calc(1.25 / .875); outline: none; }
.be-cp-input::placeholder { color: var(--beui-muted-foreground); opacity: 1; }
/* iOS zooms the page in on a focused field under 16px, and the zoom outlives the palette. */
.be-cp-input.is-touch { font-size: 1rem; line-height: 1.5rem; }
.be-cp-esc, .be-cp-hint { border: 1px solid var(--beui-border); border-radius: .25rem; background: var(--beui-background); padding: .125rem .375rem; font-family: var(--font-mono, "Geist Mono Variable", ui-monospace, monospace); font-size: 10px; color: var(--beui-muted-foreground); }
.be-cp-esc { display: none; }
@media (min-width: 640px) { .be-cp-esc { display: inline-block; } }
.be-cp-list { max-height: 60vh; overflow-y: auto; overscroll-behavior: contain; padding: .5rem; scrollbar-width: none; -ms-overflow-style: none; }
.be-cp-list::-webkit-scrollbar { display: none; }
.be-cp-empty { padding: 2rem; text-align: center; font-size: .875rem; line-height: calc(1.25 / .875); color: var(--beui-muted-foreground); }
.be-cp-group { margin-bottom: .25rem; }
.be-cp-group:last-child { margin-bottom: 0; }
.be-cp-group-label { padding: .375rem .5rem; font-size: 10px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--beui-muted-foreground); }
.be-cp-row { position: relative; isolation: isolate; display: flex; width: 100%; align-items: center; gap: .75rem; box-sizing: border-box; margin: 0; padding: .5rem; border: 0; border-radius: .375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; line-height: calc(1.25 / .875); text-align: left; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1); }
.be-cp-row.is-active { color: var(--beui-foreground); }
.be-cp-row[aria-disabled='true'] { opacity: .45; cursor: default; }
.be-cp-active { position: absolute; inset: 0; z-index: 0; border-radius: .375rem; background: var(--beui-muted); }
.be-cp-icon { position: relative; z-index: 10; display: inline-flex; width: 1rem; height: 1rem; flex: none; }
.be-cp-icon :deep(svg) { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.be-cp-label { position: relative; z-index: 10; min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-cp-badge { position: relative; z-index: 10; flex: none; }
.be-cp-hint { position: relative; z-index: 10; }
</style>
