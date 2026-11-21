<script setup lang="ts">
import { animate, motion, useMotionValue, useTransform } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'
import type { TimeOption } from './scheduler-model'

// Time field: a select whose option list is capped, so the panel measures a
// small height and scrolls instead of unfolding all 48 options. One progress
// value drives the surface, gap, corners and chevron.
const props = defineProps<{
  value: string
  options: TimeOption[]
  open: boolean
}>()
const emit = defineEmits<{ 'update:value': [value: string]; 'update:open': [open: boolean] }>()

// A short spring suits the full reveal distance; each reader clamps its small
// internal overshoot, so all visible endpoints settle together.
const UNFOLD_SPRING = { type: 'spring', visualDuration: 0.2, bounce: 0.12 } as const
// Exits are faster than entrances: the panel folds back on a short ease.
const UNFOLD_EXIT = { duration: 0.2, ease: easeOut } as const
const RADIUS = 12
// How far the open panel sits from the trigger once it has pulled away.
const GAP = 8
// The surface starts as a thin lip flush against the trigger's edge.
const LIP = 8
const TYPEAHEAD_MS = 500
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const reduce = useReducedMotion()
const uid = useId()
const triggerId = `${uid}-trigger`
const listId = `${uid}-list`
const root = useTemplateRef<HTMLElement>('root')
const panel = useTemplateRef<{ $el?: HTMLElement } | HTMLElement>('panel')

const placement = shallowRef<'bottom' | 'top'>('bottom')
const height = shallowRef(0)
const exiting = shallowRef(false)
const present = computed(() => props.open || exiting.value)
const isTop = computed(() => placement.value === 'top')
const label = computed(() => props.options.find(option => option.value === props.value)?.label)

const progress = useMotionValue(props.open ? 1 : 0)

function panelElement() {
  const reference = panel.value
  return reference instanceof HTMLElement ? reference : reference?.$el ?? null
}

/* ---- the one progress value --------------------------------------------- */

const nearRadius = useTransform(progress, [0, 0.2, 0.4, 1], [RADIUS, 0, 0, RADIUS])
const chevron = useTransform(progress, p => (reduce.value ? (props.open ? 180 : 0) : Math.min(1, Math.max(0, p)) * 180))
const ready = () => height.value > 0 && !reduce.value
const detach = useTransform(progress, [0.4, 1], [0, 1])
const panelY = useTransform(detach, d => lerp(ready() ? (isTop.value ? GAP : -GAP) : 0, 0, d))
const panelNear = useTransform(detach, d => (ready() ? RADIUS * d : RADIUS))
const panelRadius = useTransform(panelNear, near => (isTop.value
  ? `${RADIUS}px ${RADIUS}px ${near}px ${near}px`
  : `${near}px ${near}px ${RADIUS}px ${RADIUS}px`))
const panelClip = useTransform([progress, panelNear], ([p, near]: number[]) => {
  if (!ready()) return 'none'
  // Clamp overshoot so the clip never extends into the trigger or exposes
  // overflowing children. At rest remove it so the native shadow is whole.
  const reveal = Math.min(1, Math.max(0, p))
  if (reveal === 1) return 'none'
  const hidden = Math.max(0, (height.value - LIP) * (1 - reveal))
  const inset = isTop.value ? `${hidden}px 0 0 0` : `0 0 ${hidden}px 0`
  const corners = isTop.value
    ? `${RADIUS}px ${RADIUS}px ${near}px ${near}px`
    : `${near}px ${near}px ${RADIUS}px ${RADIUS}px`
  return `inset(${inset} round ${corners})`
})
// The surface materialises over its first frames rather than popping in as a
// lip; with reduced motion the fade is the whole entrance.
const opacity = useTransform(progress, p => Math.min(1, Math.max(0, p / (reduce.value ? 1 : 0.12))))

const triggerStyle = computed(() => ({
  borderTopLeftRadius: reduce.value || !isTop.value ? RADIUS : nearRadius,
  borderTopRightRadius: reduce.value || !isTop.value ? RADIUS : nearRadius,
  borderBottomLeftRadius: reduce.value || isTop.value ? RADIUS : nearRadius,
  borderBottomRightRadius: reduce.value || isTop.value ? RADIUS : nearRadius,
}))
const panelStyle = computed(() => ({
  visibility: present.value ? undefined : 'hidden',
  maxHeight: present.value ? undefined : 0,
  borderWidth: present.value ? undefined : 0,
  y: panelY,
  clipPath: panelClip,
  borderRadius: panelRadius,
  opacity,
  pointerEvents: props.open ? 'auto' : 'none',
  marginTop: isTop.value ? 0 : GAP,
  marginBottom: isTop.value ? GAP : 0,
}))

/* ---- open / close -------------------------------------------------------- */

let animation: ReturnType<typeof animate> | undefined

watch(() => props.open, async (open, previous) => {
  animation?.stop()
  if (open) {
    exiting.value = false
    cursor.value = props.options.some(option => option.value === props.value) ? props.value : null
    // Measure the full-size panel (and flip upward when there isn't room below
    // and there's more above) before the reveal starts.
    await nextTick()
    const node = panelElement()
    const trigger = root.value?.querySelector<HTMLElement>('button')
    if (!node || !trigger || !props.open) return
    const rect = trigger.getBoundingClientRect()
    const h = node.offsetHeight
    const below = window.innerHeight - rect.bottom
    const above = rect.top
    placement.value = below < h + 16 && above > below ? 'top' : 'bottom'
    await nextTick()
    height.value = node.offsetHeight
    if (!props.open) return
    animation = animate(progress, 1, reduce.value ? { duration: 0.12 } : UNFOLD_SPRING)
    return
  }
  if (previous) exiting.value = true
  animation = animate(progress, 0, reduce.value ? { duration: 0.12 } : UNFOLD_EXIT)
  animation.then(() => { if (!props.open && progress.get() === 0) exiting.value = false })
})

// Keep the measured height current while the panel is on screen.
watch(present, (isPresent, _previous, onCleanup) => {
  if (!isPresent) return
  void nextTick(() => {
    const node = panelElement()
    if (!node) return
    const observer = new ResizeObserver(() => { height.value = node.offsetHeight })
    observer.observe(node)
    onCleanup(() => observer.disconnect())
  })
}, { flush: 'post' })

// The panel turns inert as it closes, which would drop focus held inside it on
// the page body. Hand it back to the trigger before that happens.
function close() {
  const trigger = root.value?.querySelector<HTMLElement>(`#${CSS.escape(triggerId)}`)
  if (root.value?.contains(document.activeElement) && document.activeElement !== trigger) trigger?.focus()
  emit('update:open', false)
}

function choose(value: string) {
  emit('update:value', value)
  close()
}

watch(() => props.open, (open, _previous, onCleanup) => {
  if (!open) return
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
  const onPointer = (event: PointerEvent) => {
    if (root.value && !root.value.contains(event.target as Node)) emit('update:open', false)
  }
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer)
  onCleanup(() => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('pointerdown', onPointer)
  })
}, { immediate: true })

/* ---- keyboard: the active option is resolved during render --------------- */

// The cursor holds the option's identity, not its position; a cursor whose row
// has left the list falls back to the first row.
const cursor = shallowRef<string | null>(null)
const activeIndex = computed(() => Math.max(props.options.findIndex(option => option.value === cursor.value), 0))
const activeId = computed(() => props.options[activeIndex.value]?.value)
let typed = { text: '', at: 0 }

function move(direction: 1 | -1) {
  const last = props.options.length - 1
  if (last < 0) return
  cursor.value = props.options[Math.min(Math.max(activeIndex.value + direction, 0), last)]!.value
}

function onListKeyDown(event: KeyboardEvent) {
  const { key } = event
  // Tab leaves the list from the trigger, so focus moves on to the control
  // after the select rather than into the closing panel.
  if (key === 'Tab') { close(); return }
  if (key === 'ArrowDown' || key === 'ArrowUp') {
    event.preventDefault()
    move(key === 'ArrowDown' ? 1 : -1)
  } else if (key === 'Home' || key === 'End') {
    event.preventDefault()
    const row = key === 'Home' ? props.options[0] : props.options[props.options.length - 1]
    if (row) cursor.value = row.value
  } else if (key.length === 1 && key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const now = Date.now()
    const text = now - typed.at < TYPEAHEAD_MS ? typed.text + key.toLowerCase() : key.toLowerCase()
    typed = { text, at: now }
    // A repeated single letter cycles through the options that start with it.
    const from = text.length === 1 ? activeIndex.value + 1 : activeIndex.value
    for (let step = 0; step < props.options.length; step += 1) {
      const row = props.options[(from + step) % props.options.length]!
      if (row.label.toLowerCase().startsWith(text)) { cursor.value = row.value; break }
    }
  }
}

function onTriggerKeyDown(event: KeyboardEvent) {
  if (!props.open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.preventDefault()
    emit('update:open', true)
  }
}

// DOM focus follows the active option while the list is open.
watch([() => props.open, activeId], async ([open, id]) => {
  if (!open || id === undefined) return
  await nextTick()
  const node = panelElement()
  const option = Array.from(node?.querySelectorAll<HTMLElement>('[data-listbox-id]') ?? []).find(element => element.dataset.listboxId === id)
  option?.focus({ preventScroll: false })
}, { flush: 'post' })

onBeforeUnmount(() => animation?.stop())
</script>

<template>
  <div ref="root" class="sch-select">
    <motion.button
      :id="triggerId"
      type="button"
      class="sch-select-trigger"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      :style="triggerStyle"
      @click="emit('update:open', !open)"
      @keydown="onTriggerKeyDown">
      <span class="sch-select-value">{{ label ?? 'Select' }}</span>
      <motion.span aria-hidden="true" class="sch-select-chevron" :style="{ rotate: chevron }">
        <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
      </motion.span>
    </motion.button>

    <motion.div
      :id="listId"
      ref="panel"
      role="listbox"
      class="sch-select-panel"
      :class="isTop ? 'is-top' : 'is-bottom'"
      :aria-labelledby="triggerId"
      :aria-hidden="!open"
      :inert="!open"
      :style="panelStyle"
      @keydown="onListKeyDown">
      <div class="sch-select-pad">
        <div class="sch-select-scroll">
          <template v-if="present">
            <motion.div
              v-for="option in options"
              :key="option.value"
              :initial="reduce ? false : { opacity: 0, y: -4 }"
              :animate="reduce ? undefined : open
                ? { opacity: 1, y: 0, transition: { duration: 0.12, ease: easeOut } }
                : { opacity: 0, y: -4, transition: { duration: 0.08, ease: easeOut } }">
              <button
                type="button"
                role="option"
                class="sch-select-item"
                :class="{ 'is-selected': option.value === value }"
                :aria-selected="option.value === value"
                :tabindex="activeId === option.value ? 0 : -1"
                :data-listbox-id="option.value"
                @click="choose(option.value)">
                {{ option.label }}
                <svg v-if="option.value === value" class="sch-select-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              </button>
            </motion.div>
          </template>
        </div>
      </div>
    </motion.div>
  </div>
</template>

<style scoped>
.sch-select { position: relative; width: 100%; font-size: .875rem; line-height: 1.25rem; font-variant-numeric: tabular-nums; }
.sch-select-trigger { position: relative; z-index: 10; display: flex; box-sizing: border-box; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .5rem .75rem; border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-variant-numeric: tabular-nums; text-align: left; cursor: pointer; outline: none; transition: color .15s, background-color .15s, border-color .15s, box-shadow .15s; }
.sch-select-trigger:hover { border-color: var(--beui-border-strong, var(--border-strong, color-mix(in srgb, var(--beui-foreground) 14%, transparent))); }
.sch-select-trigger:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.sch-select-trigger:disabled { pointer-events: none; opacity: .5; }
.sch-select-value { white-space: nowrap; color: var(--beui-foreground); }
.sch-select-chevron { display: inline-flex; color: var(--beui-muted-foreground); }
.sch-select-chevron svg, .sch-select-check { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.sch-select-panel { position: absolute; left: 0; right: 0; z-index: 20; box-sizing: border-box; overflow: hidden; border: 1px solid var(--beui-border); background: var(--beui-background); box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
.sch-select-panel.is-bottom { top: 100%; }
.sch-select-panel.is-top { bottom: 100%; }
.sch-select-pad { padding: .25rem; }
.sch-select-scroll { max-height: 14rem; overflow-y: auto; overscroll-behavior: contain; }
.sch-select-item { display: flex; box-sizing: border-box; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .375rem .625rem; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-variant-numeric: tabular-nums; text-align: left; cursor: pointer; outline: none; transition: color .15s, background-color .15s; }
.sch-select-item:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.sch-select-item:focus-visible { background: var(--beui-muted); }
.sch-select-item.is-selected { background: var(--beui-muted); color: var(--beui-foreground); }
.sch-select-item:disabled { pointer-events: none; opacity: .5; }
.sch-select-check { width: .875rem; height: .875rem; flex: none; }
</style>
