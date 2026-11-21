<script lang="ts">
/** One cell of the bloom menu. `label` is both the id shown and the `select` payload. */
export type BloomMenuItem = {
  label: string
  /** Optional glyph; the built-in icons are used for the default labels. */
  icon?: string
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'
import { bloomMenuMessages } from './messages'

const props = withDefaults(defineProps<{
  items?: readonly BloomMenuItem[]
  className?: string
  labels?: Partial<typeof bloomMenuMessages>
}>(), {
  items: () => [
    { label: 'Doc' },
    { label: 'Board' },
    { label: 'Table' },
    { label: 'Folder' },
    { label: 'Reminder' },
    { label: 'Link' },
  ],
})

const emit = defineEmits<{ select: [label: string] }>()

const text = computed(() => ({ ...bloomMenuMessages, ...props.labels }))

// Default items keep their English label as the id and `select` value; only the
// visible text is translated.
const ITEM_MESSAGE: Record<string, keyof typeof bloomMenuMessages> = {
  Doc: 'doc',
  Board: 'board',
  Table: 'table',
  Folder: 'folder',
  Reminder: 'reminder',
  Link: 'link',
}

// Folder-open feel: a touch of overshoot as the panel expands, kept subtle.
const SPRING_FOLDER = { type: 'spring', stiffness: 300, damping: 32, mass: 0.9 } as const
const COLS = 3

const reduce = useReducedMotion()
const layoutId = useId()
const menuId = useId()
const root = useTemplateRef<HTMLElement>('root')
// `motion.button` renders a component, so its ref is the instance: `$el` is the
// DOM node focus has to go back to.
const trigger = useTemplateRef<{ $el?: HTMLButtonElement }>('trigger')
const itemRefs = new Map<string, HTMLButtonElement>()
// Set when the menu closes holding focus: the trigger is unmounted while open,
// so focus can only go back once it has mounted again.
let restoreFocus = false

const open = shallowRef(false)

// The roving tab stop, resolved during render. Opening starts on the first item;
// arrow keys walk the grid from there.
const rows = computed(() => props.items.filter(item => !item.disabled))
const cursorId = shallowRef<string | null>(null)
// A stale cursor is cleared rather than ignored, so a row that comes back cannot
// revive a highlight the user has stopped aiming at.
watch(rows, next => {
  if (cursorId.value !== null && !next.some(row => row.label === cursorId.value)) cursorId.value = null
}, { flush: 'sync' })
const activeIndex = computed(() => {
  if (cursorId.value === null) return 0
  const at = rows.value.findIndex(row => row.label === cursorId.value)
  return at < 0 ? 0 : at
})
const activeId = computed(() => rows.value[activeIndex.value]?.label)

function moveTo(label: string | null) { cursorId.value = label }

watch(open, isOpen => { if (isOpen) moveTo(null) }, { immediate: true })

function close(returnFocusOnClose: boolean) {
  if (returnFocusOnClose && root.value?.contains(document.activeElement)) restoreFocus = true
  open.value = false
}

// Item focus follows the cursor while the panel is open; on close, focus goes
// back to the trigger, which only exists again after this render has committed.
watch([open, activeId], ([isOpen, id]) => {
  if (isOpen) {
    if (id !== undefined) itemRefs.get(id)?.focus({ preventScroll: true })
    return
  }
  if (!restoreFocus) return
  restoreFocus = false
  trigger.value?.$el?.focus()
}, { flush: 'post' })

function onGridKeyDown(event: KeyboardEvent) {
  const last = rows.value.length - 1
  const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }
  let next: number | null = null
  if (event.key in step) {
    const target = activeIndex.value + step[event.key]!
    next = target < 0 || target > last ? activeIndex.value : target
  } else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = last
  if (next === null) return
  event.preventDefault()
  const row = rows.value[next]
  if (row) moveTo(row.label)
}

function onTriggerKeyDown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  open.value = true
}

// Focus leaving the open menu closes it, as a click outside does.
function onPanelFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && !root.value?.contains(next)) close(false)
}

function outside(event: PointerEvent) {
  if (event.target instanceof Node && root.value?.contains(event.target)) return
  open.value = false
}
function escape(event: KeyboardEvent) { if (event.key === 'Escape') close(true) }

watch(open, isOpen => {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', escape)
  window.removeEventListener('pointerdown', outside)
  if (!isOpen) return
  window.addEventListener('keydown', escape)
  window.addEventListener('pointerdown', outside)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', escape)
  window.removeEventListener('pointerdown', outside)
})

function setItemRef(label: string, element: unknown) {
  const node = element as HTMLButtonElement | null
  if (node) itemRefs.set(label, node)
  else itemRefs.delete(label)
}

function choose(item: BloomMenuItem) {
  if (item.disabled) return
  emit('select', item.label)
  close(true)
}

function cellLabel(item: BloomMenuItem) {
  const key = ITEM_MESSAGE[item.label]
  return key ? text.value[key] : item.label
}

function gridPosition(index: number) {
  const cols = COLS
  const rowCount = Math.ceil(props.items.length / cols)
  const col = index % cols
  const row = Math.floor(index / cols)
  // Radial stagger: delay each item by its distance from the grid centre, so the
  // four corners animate together and the open reads centre-out.
  const dist = Math.hypot(col - (cols - 1) / 2, row - (rowCount - 1) / 2)
  return { col, row, rowCount, delay: 0.1 + dist * 0.07 }
}

// Lucide-equivalent outline glyphs for the default labels.
const GLYPHS: Record<string, string> = {
  Doc: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Zm0 0v5h5M16 13H8M16 17H8M10 9H8',
  Board: 'M4 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM15 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM4 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1ZM15 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z',
  Table: 'M12 3v18M3 9h18M3 15h18M3 3h18v18H3z',
  Folder: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2ZM2 10h20',
  Reminder: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 20a2 2 0 0 0 4 0',
  Link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
}

const morph = computed(() => (reduce.value ? { duration: 0.15 } : SPRING_FOLDER))
const irisInitial = computed(() => (reduce.value ? false : { clipPath: 'inset(45% 34% 45% 34%)' }))
const irisTransition = computed(() => ({ delay: reduce.value ? 0 : 0.08, duration: 0.45, ease: easeOut }))
const bodyTransition = computed(() => ({ delay: reduce.value ? 0 : 0.12, duration: 0.2 }))
const itemInitial = computed(() => (reduce.value ? { opacity: 0 } : { opacity: 0, scale: 0.85, filter: 'blur(6px)' }))
</script>

<template>
  <div ref="root" class="bloom" :class="className">
    <!-- spacer fixes the anchor to the trigger size -->
    <div class="bloom-spacer" aria-hidden="true" />

    <!-- Centering box sized to the open panel: `place-items: center` only centres
         an item that fits its cell, so the cell is as wide as the panel. A fixed
         size per viewport keeps the -translate centring from drifting, and both
         states share its centre, so the morph grows from the middle outward. -->
    <div class="bloom-stage">
      <AnimatePresence :initial="false" mode="popLayout">
        <motion.div
          v-if="open"
          key="panel"
          :layout-id="layoutId"
          :transition="morph"
          :style="{ borderRadius: '16px' }"
          class="bloom-panel"
          @focusout="onPanelFocusOut">
          <motion.div layout :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="bodyTransition">
            <div class="bloom-header">
              <span :id="`${menuId}-label`" class="bloom-title">{{ text.create }}</span>
              <button type="button" class="bloom-close" :aria-label="text.close" @click="close(true)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </div>

            <motion.div
              :id="menuId"
              role="menu"
              :aria-labelledby="`${menuId}-label`"
              class="bloom-grid"
              :initial="irisInitial"
              :animate="{ clipPath: 'inset(0% 0% 0% 0%)' }"
              :transition="irisTransition"
              @keydown="onGridKeyDown">
              <button
                v-for="(item, index) in items"
                :key="item.label"
                :ref="element => setItemRef(item.label, element)"
                type="button"
                role="menuitem"
                :tabindex="item.label === activeId ? 0 : -1"
                :disabled="item.disabled"
                class="bloom-cell"
                :class="{ 'is-divider-right': gridPosition(index).col !== COLS - 1, 'is-divider-bottom': gridPosition(index).row < gridPosition(index).rowCount - 1 }"
                @focus="moveTo(item.label)"
                @click="choose(item)">
                <motion.span
                  class="bloom-cell-inner"
                  :initial="itemInitial"
                  :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)' }"
                  :transition="{ delay: reduce ? 0 : gridPosition(index).delay, type: 'spring', stiffness: 440, damping: 34 }">
                  <slot name="icon" :item="item" :index="index">
                    <svg v-if="GLYPHS[item.label]" class="bloom-glyph" viewBox="0 0 24 24" aria-hidden="true"><path :d="GLYPHS[item.label]" /></svg>
                    <span v-else-if="item.icon" class="bloom-glyph" aria-hidden="true">{{ item.icon }}</span>
                  </slot>
                  <span class="bloom-label">{{ cellLabel(item) }}</span>
                </motion.span>
              </button>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.button
          v-else
          key="trigger"
          ref="trigger"
          type="button"
          :layout-id="layoutId"
          :transition="morph"
          :style="{ borderRadius: '16px' }"
          class="bloom-trigger"
          aria-haspopup="menu"
          :aria-expanded="false"
          :while-press="reduce ? undefined : { scale: 0.97 }"
          @click="open = true"
          @keydown="onTriggerKeyDown">
          <!-- its own `layout` counter-scales the label, so it stays crisp while
               the button box morphs -->
          <motion.span layout class="bloom-trigger-inner">
            {{ text.create }}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          </motion.span>
        </motion.button>
      </AnimatePresence>
    </div>
  </div>
</template>

<style scoped>
.bloom { position: relative; display: inline-flex; color: var(--beui-foreground); }
.bloom-spacer { width: 9rem; height: 2.75rem; }

.bloom-stage {
  pointer-events: none;
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 30;
  display: grid;
  place-items: center;
  width: min(86vw, 420px);
  height: 300px;
  translate: -50% -50%;
}
.bloom-stage > * { pointer-events: auto; }

.bloom-panel {
  width: min(86vw, 420px);
  overflow: hidden;
  border: 1px solid var(--beui-border);
  background: var(--beui-card);
}

.bloom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .75rem 1rem;
  border-bottom: 1px solid var(--beui-border);
}
.bloom-title { font-size: .875rem; font-weight: 500; color: var(--beui-muted-foreground); }
.bloom-close {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: .125rem;
  background: transparent;
  color: var(--beui-muted-foreground);
  cursor: pointer;
  transition: color .15s;
}
.bloom-close:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--beui-ring); }
.bloom-close:hover { color: var(--beui-foreground); }
.bloom-close svg { width: 1rem; height: 1rem; }

.bloom-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }

/* Static cell with hairline borders (no animated fill), so the grid lines never
   flicker as items stagger in. Only the inner content animates. */
.bloom-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem .75rem;
  border: 0;
  background: transparent;
  color: var(--beui-muted-foreground);
  font: inherit;
  outline: none;
  cursor: pointer;
  transition: color .15s;
}
.bloom-cell.is-divider-right { border-inline-end: 1px solid var(--beui-border); }
.bloom-cell.is-divider-bottom { border-block-end: 1px solid var(--beui-border); }
.bloom-cell:hover { color: var(--beui-foreground); }
.bloom-cell:disabled { cursor: default; opacity: .5; }
.bloom-cell:focus-visible { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }

.bloom-cell-inner { display: flex; flex-direction: column; align-items: center; gap: .5rem; will-change: transform, opacity, filter; }
.bloom-glyph { width: 1.25rem; height: 1.25rem; }
span.bloom-glyph { display: grid; place-items: center; font-size: 1.25rem; line-height: 1; }
.bloom-glyph path { fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.bloom-label { font-size: .875rem; font-weight: 500; }

.bloom-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 9rem;
  height: 2.75rem;
  border: 1px solid var(--beui-border);
  background: var(--beui-card);
  color: var(--beui-foreground);
  font: inherit;
  font-size: .875rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
}
.bloom-trigger:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--beui-ring); }
.bloom-trigger-inner { display: inline-flex; align-items: center; gap: .5rem; white-space: nowrap; }
.bloom-trigger-inner svg { width: 1rem; height: 1rem; }
</style>
