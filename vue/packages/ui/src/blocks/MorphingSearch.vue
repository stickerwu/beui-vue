<script lang="ts">
import type { Component } from 'vue'

export type MorphingSearchItem = {
  id: string
  title: string
  description?: string
  keywords?: string[]
  /** A component rendered as the row's leading icon (or use the `icon` slot). */
  icon?: Component
  onSelect?: () => void
}

type RowCursor = { id: string; query: string }

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable
    || target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
}
</script>

<script setup lang="ts">
import { AnimatePresence, LayoutGroup, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut, layoutSpring } from '../core/motion'
import { morphingSearchMessages } from './messages'

const props = withDefaults(defineProps<{
  items: readonly MorphingSearchItem[]
  placeholder?: string
  /** Single key that opens the search from anywhere outside a field. Pass an empty string for none. */
  shortcut?: string
  /** Render the closed trigger as a compact search icon. */
  iconOnly?: boolean
  emptyMessage?: string
  open?: boolean
  defaultOpen?: boolean
  /** Override any built-in string. */
  labels?: Partial<typeof morphingSearchMessages>
  className?: string
}>(), { shortcut: 'f', iconOnly: false, open: undefined, defaultOpen: false })

const emit = defineEmits<{
  'update:open': [value: boolean]
  openChange: [value: boolean]
  queryChange: [query: string]
  select: [item: MorphingSearchItem]
}>()

defineSlots<{
  /** Replaces a row's leading icon. */
  icon?(props: { item: MorphingSearchItem }): unknown
  /** Replaces a row's title and description. */
  item?(props: { item: MorphingSearchItem; active: boolean; index: number }): unknown
}>()

// Keeps the Wallet Card feel with a little more time to read the morph.
const SEARCH_MORPH = { type: 'spring', duration: 0.58, bounce: 0.22 } as const
// Keep the spring on the shell, but unfold complex clip-path values with the
// same progressive tween as Morph Popover so the content never snaps ahead.
const SEARCH_CLIP_TRANSITION = { duration: 0.32, ease: easeOut } as const

const LIST_VARIANTS = {
  closed: { opacity: 0, transform: 'translateY(6px)', transition: { duration: 0.16, delay: 0.18, ease: easeOut } },
  open: { opacity: 1, transform: 'translateY(0px)', transition: { duration: 0.16, ease: easeOut } },
}

const t = computed(() => ({ ...morphingSearchMessages, ...props.labels }))
const placeholder = computed(() => props.placeholder ?? t.value.placeholder)
const emptyMessage = computed(() => props.emptyMessage ?? t.value.empty)

const reduceMotion = useReducedMotion()
const reduce = computed(() => Boolean(reduceMotion.value))
const uid = `be-morphing-search-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

const internalOpen = shallowRef(props.defaultOpen)
const open = computed(() => props.open ?? internalOpen.value)
const query = shallowRef('')
const mounted = shallowRef(false)
const backgroundScrollLocked = shallowRef(props.defaultOpen)
const anchorRect = shallowRef({ top: 16, left: 16, width: 288 })

const anchor = useTemplateRef<HTMLElement>('anchor')
const trigger = useTemplateRef<{ $el?: HTMLElement } | HTMLElement>('trigger')
const input = useTemplateRef<HTMLInputElement>('input')
const dialog = useTemplateRef<{ $el?: HTMLElement } | HTMLElement>('dialog')
const list = useTemplateRef<{ $el?: HTMLElement } | HTMLElement>('list')
let previousFocus: HTMLElement | null = null
let wasOpen = open.value

const transition = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))
const morphTransition = computed(() => (reduce.value ? { duration: 0 } : SEARCH_MORPH))
const clipTransition = computed(() => (reduce.value ? { duration: 0 } : { clipPath: SEARCH_CLIP_TRANSITION, opacity: SEARCH_MORPH }))

function elementOf(reference: { $el?: HTMLElement } | HTMLElement | null) {
  if (reference instanceof HTMLElement) return reference
  return reference?.$el instanceof HTMLElement ? reference.$el : null
}

function setOpen(next: boolean) {
  if (props.open === undefined) internalOpen.value = next
  emit('update:open', next)
  emit('openChange', next)
}

function measureAnchor() {
  const rect = anchor.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return
  const current = anchorRect.value
  if (current.top === rect.top && current.left === rect.left && current.width === rect.width) return
  anchorRect.value = { top: rect.top, left: rect.left, width: rect.width }
}

function openSearch() {
  measureAnchor()
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  setOpen(true)
}

const filteredItems = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return props.items
  return props.items.filter(item => [item.title, item.description ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase().includes(needle))
})

/* ---- the highlighted row ------------------------------------------------- */
// Resolved while rendering, never in an effect. The cursor holds the row's id
// stamped with the query it was placed under, so a stale one drops itself.

const cursor = shallowRef<RowCursor | null>(null)

function indexOfCursor(rows: readonly { id: string }[], currentQuery: string, current: RowCursor | null) {
  if (current === null || current.query !== currentQuery) return -1
  return rows.findIndex(row => row.id === current.id)
}

const cursorRow = computed(() => indexOfCursor(filteredItems.value, query.value, cursor.value))
const activeIndex = computed(() => (cursorRow.value < 0 ? 0 : cursorRow.value))
// A cursor whose row has left is cleared rather than ignored, so rows that
// come back cannot revive it.
watch(cursorRow, row => { if (cursor.value !== null && row < 0) cursor.value = null }, { flush: 'sync' })

function moveTo(id: string | null) {
  cursor.value = id === null ? null : { id, query: query.value }
}

function moveActive(direction: 1 | -1) {
  const rows = filteredItems.value
  const last = rows.length - 1
  if (last < 0) return
  const at = Math.max(indexOfCursor(rows, query.value, cursor.value), 0)
  const next = Math.min(Math.max(at + direction, 0), last)
  cursor.value = { id: rows[next]!.id, query: query.value }
}

function updateQuery(next: string) {
  query.value = next
  emit('queryChange', next)
}

function closeSearch() {
  updateQuery('')
  setOpen(false)
}

function selectItem(item: MorphingSearchItem) {
  item.onSelect?.()
  emit('select', item)
  closeSearch()
}

/* ---- lifecycle ----------------------------------------------------------- */

watch(open, isOpen => { if (isOpen) backgroundScrollLocked.value = true }, { immediate: true })

// A fresh session starts in the render that opens: empty query, highlight on top.
watch(open, isOpen => {
  if (!isOpen) return
  query.value = ''
  moveTo(null)
}, { flush: 'sync' })

// Telling the consumer is a side effect, so it waits for the commit.
watch(open, (isOpen, _previous, onCleanup) => {
  if (isOpen) {
    emit('queryChange', '')
    const frame = requestAnimationFrame(() => input.value?.focus())
    onCleanup(() => cancelAnimationFrame(frame))
  } else if (wasOpen) {
    const frame = requestAnimationFrame(() => {
      const target = previousFocus?.isConnected ? previousFocus : elementOf(trigger.value)
      target?.focus()
    })
    onCleanup(() => cancelAnimationFrame(frame))
  }
  wasOpen = isOpen
}, { flush: 'post' })

watch([activeIndex, open], () => {
  if (!open.value) return
  elementOf(list.value)?.querySelector<HTMLElement>(`[data-index="${activeIndex.value}"]`)?.scrollIntoView({ block: 'nearest' })
}, { flush: 'post' })

function onWindowKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    closeSearch()
    return
  }
  if (!open.value && props.shortcut && event.key.toLowerCase() === props.shortcut.toLowerCase() && !event.repeat
    && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !isEditableTarget(event.target)) {
    event.preventDefault()
    openSearch()
  }
}

function preventBackground(event: Event) {
  const target = event.target
  if (target instanceof Node && elementOf(list.value)?.contains(target)) return
  event.preventDefault()
}

let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  mounted.value = true
  measureAnchor()
  if (anchor.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measureAnchor)
    resizeObserver.observe(anchor.value)
  }
  window.addEventListener('resize', measureAnchor)
  document.addEventListener('scroll', measureAnchor, true)
  window.visualViewport?.addEventListener('resize', measureAnchor)
  window.visualViewport?.addEventListener('scroll', measureAnchor)
  window.addEventListener('keydown', onWindowKeyDown)
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', measureAnchor)
  document.removeEventListener('scroll', measureAnchor, true)
  window.visualViewport?.removeEventListener('resize', measureAnchor)
  window.visualViewport?.removeEventListener('scroll', measureAnchor)
  window.removeEventListener('keydown', onWindowKeyDown)
})

watch(backgroundScrollLocked, (locked, _previous, onCleanup) => {
  if (!locked) return
  document.addEventListener('wheel', preventBackground, { passive: false })
  document.addEventListener('touchmove', preventBackground, { passive: false })
  onCleanup(() => {
    document.removeEventListener('wheel', preventBackground)
    document.removeEventListener('touchmove', preventBackground)
  })
}, { immediate: true })

function onDialogKeyDown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
    return
  }
  if (event.key === 'Enter') {
    if (event.isComposing || event.keyCode === 229) return
    event.preventDefault()
    const item = filteredItems.value[activeIndex.value]
    if (item) selectItem(item)
    return
  }
  const root = elementOf(dialog.value)
  if (event.key !== 'Tab' || !root) return
  const focusable = Array.from(root.querySelectorAll<HTMLElement>('input, button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const shellLayoutId = `${uid}-shell`
const listboxId = `${uid}-results`
const panelWidth = computed(() => (mounted.value
  ? Math.max(anchorRect.value.width, Math.min(448, window.innerWidth - anchorRect.value.left - 16))
  : anchorRect.value.width))
const resultsHeight = computed(() => (mounted.value
  ? Math.max(96, Math.min(288, window.innerHeight - anchorRect.value.top - 80))
  : 288))
const collapsedContentClip = computed(() => `inset(0px ${Math.max(0, panelWidth.value - anchorRect.value.width)}px ${resultsHeight.value}px 0px round 12px)`)
const expandedContentClip = 'inset(0px 0px 0px 0px round 12px)'
const positionStyle = computed(() => ({ top: `${anchorRect.value.top}px`, left: `${anchorRect.value.left}px`, width: `${panelWidth.value}px` }))
</script>

<template>
  <LayoutGroup :id="uid">
    <div ref="anchor" class="be-msearch-anchor" :class="[iconOnly ? 'is-icon' : 'is-field', className]">
      <motion.button
        v-if="!open"
        ref="trigger"
        :layout-id="shellLayoutId"
        type="button"
        aria-haspopup="dialog"
        aria-expanded="false"
        :aria-label="placeholder"
        class="be-msearch-trigger"
        :class="iconOnly ? 'is-icon' : 'is-field'"
        :transition="morphTransition"
        @click="openSearch" />
      <motion.div
        aria-hidden="true"
        class="be-msearch-face"
        :class="[iconOnly ? 'is-icon' : 'is-field', { 'is-locked': backgroundScrollLocked }]"
        :initial="false"
        :animate="{ opacity: open ? 0 : 1 }"
        :transition="reduce ? { duration: 0 } : { duration: 0.1, delay: open ? 0.1 : 0.12, ease: easeOut }">
        <svg viewBox="0 0 24 24" class="be-msearch-icon"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <template v-if="!iconOnly">
          <span class="be-msearch-placeholder">{{ placeholder }}</span>
          <kbd v-if="shortcut" class="be-msearch-kbd is-key">{{ shortcut.toUpperCase() }}</kbd>
        </template>
      </motion.div>
    </div>

    <Teleport v-if="mounted" to="body">
      <div :aria-hidden="!open" :inert="!open" class="be-msearch-layer">
        <AnimatePresence :initial="false" mode="popLayout" @exit-complete="backgroundScrollLocked = false">
          <motion.div v-if="open" key="morphing-search-overlay" class="be-msearch-overlay">
            <button type="button" :aria-label="t.close" class="be-msearch-catcher" @click="closeSearch" />

            <motion.div
              :layout-id="shellLayoutId"
              aria-hidden="true"
              class="be-msearch-shell"
              :style="{ ...positionStyle, height: `${48 + resultsHeight}px` }"
              :transition="morphTransition" />

            <motion.div
              ref="dialog"
              role="dialog"
              aria-modal="true"
              :aria-label="t.dialog"
              class="be-msearch-dialog"
              :initial="reduce ? false : { opacity: 0, clipPath: collapsedContentClip }"
              :animate="{ opacity: 1, clipPath: expandedContentClip }"
              :exit="{ opacity: 0, clipPath: collapsedContentClip, transition: clipTransition }"
              :transition="clipTransition"
              :style="positionStyle"
              @keydown="onDialogKeyDown">
              <div class="be-msearch-header" :class="iconOnly ? 'is-icon' : 'is-field'">
                <span class="be-msearch-lead"><svg viewBox="0 0 24 24" class="be-msearch-icon"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg></span>
                <div class="be-msearch-input-wrap">
                  <input
                    ref="input"
                    :value="query"
                    role="combobox"
                    :aria-label="placeholder"
                    aria-expanded="true"
                    :aria-controls="listboxId"
                    aria-autocomplete="list"
                    :aria-activedescendant="filteredItems.length > 0 ? `${uid}-option-${activeIndex}` : undefined"
                    :placeholder="placeholder"
                    class="be-msearch-input"
                    @input="updateQuery(($event.target as HTMLInputElement).value)">
                </div>
                <kbd class="be-msearch-kbd">Esc</kbd>
              </div>

              <motion.div
                ref="list"
                :id="listboxId"
                role="listbox"
                :aria-label="t.results"
                class="be-msearch-list"
                :transition="reduce ? { duration: 0 } : undefined"
                :variants="reduce ? undefined : LIST_VARIANTS"
                :initial="reduce ? { opacity: 1, transform: 'translateY(0px)' } : 'closed'"
                :animate="reduce ? { opacity: 1, transform: 'translateY(0px)' } : 'open'"
                :exit="reduce ? undefined : 'closed'"
                :style="{ maxHeight: `${resultsHeight}px` }">
                <template v-if="filteredItems.length > 0">
                  <button
                    v-for="(item, index) in filteredItems"
                    :id="`${uid}-option-${index}`"
                    :key="item.id"
                    type="button"
                    role="option"
                    :aria-selected="index === activeIndex"
                    :data-index="index"
                    class="be-msearch-option"
                    @mousemove="index !== activeIndex && moveTo(item.id)"
                    @focus="moveTo(item.id)"
                    @click="selectItem(item)">
                    <motion.span v-if="index === activeIndex" :layout-id="`${uid}-active-result`" class="be-msearch-active" :transition="transition" />
                    <span v-if="item.icon || $slots.icon" class="be-msearch-option-icon">
                      <slot name="icon" :item="item"><component :is="item.icon" /></slot>
                    </span>
                    <slot name="item" :item="item" :active="index === activeIndex" :index="index">
                      <span class="be-msearch-copy">
                        <span class="be-msearch-title">{{ item.title }}</span>
                        <span v-if="item.description" class="be-msearch-description">{{ item.description }}</span>
                      </span>
                    </slot>
                  </button>
                </template>
                <p v-else class="be-msearch-empty">{{ emptyMessage }}</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Teleport>
  </LayoutGroup>
</template>

<style scoped>
.be-msearch-anchor { --ms-border: var(--beui-border); --ms-border-strong: var(--beui-border-strong, color-mix(in srgb, var(--beui-foreground) 13%, transparent)); position: relative; box-sizing: border-box; color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; }
.be-msearch-anchor.is-icon { width: 3rem; height: 3rem; }
.be-msearch-anchor.is-field { width: 18rem; max-width: 100%; height: 3rem; }

.be-msearch-trigger { --ms-stroke: var(--ms-border); display: flex; box-sizing: border-box; width: 100%; height: 100%; align-items: center; margin: 0; padding: 0; border: 0; border-radius: .75rem; background: color-mix(in srgb, var(--beui-background) 60%, transparent); box-shadow: inset 0 0 0 1px var(--ms-stroke); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); text-align: left; outline: none; }
.be-msearch-trigger.is-icon { cursor: pointer; justify-content: center; }
.be-msearch-trigger.is-field { cursor: text; padding-inline: .875rem; }
.be-msearch-trigger:hover { --ms-stroke: var(--ms-border-strong); }
.be-msearch-trigger:focus-visible { box-shadow: inset 0 0 0 1px var(--ms-stroke), 0 0 0 2px var(--beui-ring); }

.be-msearch-face { pointer-events: none; position: absolute; inset: 0; display: flex; align-items: center; }
.be-msearch-face.is-field { gap: .625rem; padding-inline: .875rem; }
.be-msearch-face.is-icon { justify-content: center; }
.be-msearch-face.is-locked { z-index: 120; }
.be-msearch-icon { width: 1rem; height: 1rem; flex: none; fill: none; stroke: var(--beui-muted-foreground); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.be-msearch-placeholder { min-width: 0; flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.be-msearch-kbd { display: flex; height: 1.75rem; flex: none; align-items: center; box-sizing: border-box; padding-inline: .5rem; border: 1px solid var(--ms-border); border-radius: .375rem; font: inherit; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.be-msearch-kbd.is-key { min-width: 1.75rem; justify-content: center; }

.be-msearch-layer { pointer-events: none; position: fixed; left: 0; top: 0; z-index: 110; width: 0; height: 0; color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; }
.be-msearch-overlay { position: fixed; left: 0; top: 0; width: 0; height: 0; }
.be-msearch-catcher { pointer-events: auto; position: fixed; inset: 0; margin: 0; padding: 0; border: 0; background: transparent; cursor: default; }
.be-msearch-shell { position: fixed; z-index: 10; box-sizing: border-box; border-radius: .75rem; background: color-mix(in srgb, var(--beui-background) 90%, transparent); box-shadow: inset 0 0 0 1px var(--beui-border); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
.be-msearch-dialog { --ms-border: var(--beui-border); pointer-events: auto; position: fixed; z-index: 20; box-sizing: border-box; overflow: hidden; border-radius: .75rem; }
.be-msearch-header { display: flex; box-sizing: border-box; height: 3rem; align-items: center; gap: .625rem; border-bottom: 1px solid var(--beui-border); }
.be-msearch-header.is-icon { padding-inline: 1rem; }
.be-msearch-header.is-field { padding-inline: .875rem; }
.be-msearch-lead { flex: none; display: inline-flex; }
.be-msearch-input-wrap { display: flex; height: 2.5rem; min-width: 0; flex: 1 1 0%; align-items: center; }
.be-msearch-input { width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: transparent; color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; outline: none; }
.be-msearch-input::placeholder { color: var(--beui-muted-foreground); opacity: 1; }
.be-msearch-list { box-sizing: border-box; overflow-y: auto; overscroll-behavior: contain; padding: .5rem; }
.be-msearch-option { position: relative; display: flex; box-sizing: border-box; width: 100%; align-items: center; gap: .625rem; margin: 0; padding: .625rem .75rem; border: 0; border-radius: .5rem; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; outline: none; }
.be-msearch-option:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.be-msearch-active { position: absolute; inset: 0; border-radius: .5rem; background: color-mix(in srgb, var(--beui-foreground) 5%, transparent); }
.be-msearch-option-icon { position: relative; display: inline-flex; width: 1rem; height: 1rem; flex: none; color: var(--beui-muted-foreground); }
.be-msearch-option-icon :deep(svg) { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.be-msearch-copy { position: relative; min-width: 0; }
.be-msearch-title, .be-msearch-description { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-msearch-title { font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.be-msearch-description { font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.be-msearch-empty { margin: 0; padding: 2rem .75rem; text-align: center; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
</style>
