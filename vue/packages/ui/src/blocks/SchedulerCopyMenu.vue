<script setup lang="ts">
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion-v'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut, pressSpring } from '../core/motion'
import SchedulerIconButton from './SchedulerIconButton.vue'
import SchedulerTip from './SchedulerTip.vue'
import { WEEKDAYS, weekdayLabel, type DayKey } from './scheduler-model'
import { formatMessage, type AvailabilitySchedulerMessages } from './messages'

// Copy this day's hours to other days: a morph popover with a day picker whose
// full-size panel reveals from the corner nearest the trigger on one spring,
// then retraces the same clip on close.
const props = defineProps<{
  from: DayKey
  fromLabel: string
  t: AvailabilitySchedulerMessages
  reduce: boolean
  locale?: string
}>()
const emit = defineEmits<{ apply: [targets: DayKey[]] }>()

// A non-bouncing spring reaches its rest within 260 ms; exits are faster.
const MORPH_ENTER = { type: 'spring', duration: 0.26, bounce: 0 } as const
const MORPH_EXIT = { duration: 0.2, ease: easeOut } as const
const RADIUS = 16
const SIDE_OFFSET = 8
const GUTTER = 12

const uid = useId()
const triggerId = `${uid}-trigger`
const contentId = `${uid}-content`
const root = useTemplateRef<HTMLElement>('root')
const content = useTemplateRef<{ $el?: HTMLElement } | HTMLElement>('content')

const open = shallowRef(false)
// The menu portal renders only on the client, after mount, so the first client
// render matches the server's empty slot.
const mounted = shallowRef(false)
onMounted(() => { mounted.value = true })
const exiting = shallowRef(false)
const copied = shallowRef(false)
const picked = shallowRef<Set<DayKey>>(new Set())
const present = computed(() => open.value || exiting.value)
let copiedTimer: number | undefined
let armFocus = false
let keyboardPress = false

const others = computed(() => WEEKDAYS.flatMap((day, index) => (day.key === props.from ? [] : [{ key: day.key, label: weekdayLabel(index, props.locale) }])))

function contentElement() {
  const reference = content.value
  return reference instanceof HTMLElement ? reference : reference?.$el ?? null
}

/* ---- open state ---------------------------------------------------------- */

function close() {
  open.value = false
  const focused = document.activeElement
  const node = contentElement()
  if (focused instanceof HTMLElement && node?.contains(focused)) root.value?.querySelector<HTMLElement>(`#${CSS.escape(triggerId)}`)?.focus()
}

function onTriggerKeyDown(event: KeyboardEvent) {
  keyboardPress = event.key === 'Enter' || event.key === ' '
}
function onTriggerPointerDown() { keyboardPress = false }
function onTriggerClick(event: MouseEvent) {
  // Enter and Space reach here as a click with `detail` 0 after their keydown
  // on this element. Only a keyboard open moves focus into the panel.
  armFocus = !open.value && keyboardPress && event.detail === 0
  keyboardPress = false
  if (open.value) close()
  else open.value = true
}

watch(open, (isOpen, _previous, onCleanup) => {
  if (!isOpen) return
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
  const onPointer = (event: PointerEvent) => {
    const target = event.target as Node
    if (root.value && !root.value.contains(target) && !contentElement()?.contains(target)) close()
  }
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer)
  onCleanup(() => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('pointerdown', onPointer)
  })
})

/* ---- positioning --------------------------------------------------------- */

type Layout = { trigger: { left: number; top: number; width: number; height: number }; content: { width: number; height: number } }
const layout = shallowRef<Layout | null>(null)

function measure() {
  const trigger = root.value
  const node = contentElement()
  if (!trigger || !node) return
  const rect = trigger.getBoundingClientRect()
  const next: Layout = {
    trigger: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    content: { width: node.offsetWidth, height: node.offsetHeight },
  }
  const a = layout.value
  if (a && a.trigger.left === next.trigger.left && a.trigger.top === next.trigger.top && a.trigger.width === next.trigger.width
    && a.trigger.height === next.trigger.height && a.content.width === next.content.width && a.content.height === next.content.height) return
  layout.value = next
}

const geometry = computed(() => {
  const l = layout.value
  if (!l) return { left: 0, top: 0, side: 'bottom' as const, maxHeight: undefined as number | undefined }
  const preferredLeft = l.trigger.left + l.trigger.width - l.content.width
  const below = Math.max(0, window.innerHeight - l.trigger.top - l.trigger.height - SIDE_OFFSET - GUTTER)
  const above = Math.max(0, l.trigger.top - SIDE_OFFSET - GUTTER)
  // Prefer the requested side, then use the roomier side when it cannot fit there.
  const side = l.content.height > below && above > below ? 'top' : 'bottom'
  return {
    left: Math.max(GUTTER, Math.min(preferredLeft, window.innerWidth - l.content.width - GUTTER)),
    top: side === 'bottom' ? l.trigger.top + l.trigger.height + SIDE_OFFSET : Math.max(GUTTER, l.trigger.top - l.content.height - SIDE_OFFSET),
    side,
    maxHeight: side === 'bottom' ? below : above,
  }
})

/* ---- the morph ------------------------------------------------------------ */

const progress = useMotionValue(0)
const fade = useMotionValue(props.reduce ? 0 : 1)
const clipPath = useTransform(progress, p => {
  const inset = 92 * (1 - p)
  const top = geometry.value.side === 'top' ? inset : 0
  const bottom = geometry.value.side === 'bottom' ? inset : 0
  return `inset(${top}% 0% ${bottom}% ${inset}% round ${RADIUS}px)`
})
const surfaceOpacity = useTransform(progress, [0, 0.15], [0, 1])

let animation: ReturnType<typeof animate> | undefined
const ready = computed(() => layout.value !== null)

watch(open, async isOpen => {
  animation?.stop()
  if (isOpen) {
    exiting.value = false
    layout.value = null
    progress.set(0)
    fade.set(props.reduce ? 0 : 1)
    await nextTick()
    measure()
    return
  }
  exiting.value = true
})

// The surface animates once it has been measured, and again on exit.
watch([ready, open, () => props.reduce], ([isReady, isOpen, reduced]) => {
  animation?.stop()
  if (!isReady) {
    if (!isOpen) exiting.value = false
    return
  }
  const settle = () => { if (!open.value) exiting.value = false }
  if (reduced) {
    progress.jump(1)
    animation = animate(fade, isOpen ? 1 : 0, { duration: 0.12, onComplete: settle })
  } else {
    animation = animate(progress, isOpen ? 1 : 0, { ...(isOpen ? MORPH_ENTER : MORPH_EXIT), onComplete: settle })
  }
}, { flush: 'post' })

// Keep the panel anchored while it is on screen.
watch(present, async (isPresent, _previous, onCleanup) => {
  if (!isPresent) return
  await nextTick()
  const trigger = root.value
  const node = contentElement()
  const observer = new ResizeObserver(measure)
  if (trigger) observer.observe(trigger)
  if (node) observer.observe(node)
  window.addEventListener('scroll', measure, true)
  window.addEventListener('resize', measure)
  onCleanup(() => {
    observer.disconnect()
    window.removeEventListener('scroll', measure, true)
    window.removeEventListener('resize', measure)
  })
}, { flush: 'post' })

// A keyboard open moves focus into the panel in the commit that makes it visible.
watch(layout, async value => {
  if (!value || !open.value || !armFocus) return
  armFocus = false
  await nextTick()
  const node = contentElement()
  if (!node) return
  const focusable = node.querySelector<HTMLElement>('button:not(:disabled), [tabindex]:not([tabindex="-1"])')
  ;(focusable ?? node).focus({ preventScroll: true })
})

/* ---- apply --------------------------------------------------------------- */

function toggle(key: DayKey) {
  const next = new Set(picked.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  picked.value = next
}

function apply(targets: DayKey[]) {
  if (!targets.length) return
  emit('apply', targets)
  close()
  picked.value = new Set()
  copied.value = true
  window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => { copied.value = false }, 1200)
}

onBeforeUnmount(() => {
  window.clearTimeout(copiedTimer)
  animation?.stop()
})

const iconInitial = computed(() => (props.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }))
</script>

<template>
  <div ref="root" class="sch-copy">
    <SchedulerTip :content="t.copyTimes">
      <SchedulerIconButton
        :id="triggerId"
        :label="formatMessage(t.copyDay, { day: fromLabel })"
        :reduce="reduce"
        :expanded="open"
        aria-haspopup="dialog"
        :aria-controls="open ? contentId : undefined"
        @keydown="onTriggerKeyDown"
        @pointerdown="onTriggerPointerDown"
        @click="onTriggerClick">
        <AnimatePresence mode="popLayout" :initial="false">
          <motion.span v-if="copied" key="done" class="sch-copy-icon is-done" :initial="iconInitial" :animate="{ opacity: 1, scale: 1 }" :exit="iconInitial" :transition="pressSpring">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          </motion.span>
          <motion.span v-else key="copy" class="sch-copy-icon" :initial="iconInitial" :animate="{ opacity: 1, scale: 1 }" :exit="iconInitial" :transition="pressSpring">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
          </motion.span>
        </AnimatePresence>
      </SchedulerIconButton>
    </SchedulerTip>

    <Teleport v-if="mounted" to="body">
      <motion.div
        v-if="present"
        data-morph-popover-portal=""
        class="sch-popover"
        :inert="!open"
        :style="{
          left: `${geometry.left}px`,
          top: `${geometry.top}px`,
          opacity: reduce ? fade : surfaceOpacity,
          pointerEvents: open ? 'auto' : 'none',
          visibility: layout ? 'visible' : 'hidden',
        }">
        <motion.div
          :id="contentId"
          ref="content"
          role="dialog"
          tabindex="-1"
          class="sch-popover-surface"
          :aria-labelledby="triggerId"
          :style="{
            clipPath: reduce ? undefined : clipPath,
            borderRadius: `${RADIUS}px`,
            maxHeight: layout && geometry.maxHeight !== undefined ? `${geometry.maxHeight}px` : undefined,
          }">
          <p class="sch-popover-heading">{{ t.copyTo }}</p>
          <div class="sch-popover-days">
            <label v-for="day in others" :key="day.key" class="sch-check-row">
              <motion.button
                type="button"
                role="checkbox"
                class="sch-check"
                :aria-checked="picked.has(day.key)"
                :data-state="picked.has(day.key) ? 'checked' : 'unchecked'"
                :while-press="reduce ? undefined : { scale: 0.92 }"
                :transition="pressSpring"
                @click.prevent="toggle(day.key)">
                <AnimatePresence :initial="false">
                  <motion.svg
                    v-if="picked.has(day.key)"
                    key="checked"
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
                    :initial="reduce ? { opacity: 1 } : { opacity: 0, scale: 0.5 }"
                    :animate="reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }"
                    :exit="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: 'blur(4px)' }"
                    :transition="reduce ? { duration: 0 } : { duration: 0.16, ease: easeOut }">
                    <motion.path
                      d="M5 13l4 4L19 7"
                      :initial="reduce ? { pathLength: 1 } : { pathLength: 0 }"
                      :animate="{ pathLength: 1 }"
                      :transition="reduce ? { duration: 0 } : { duration: 0.3, ease: easeOut, delay: 0.04 }" />
                  </motion.svg>
                </AnimatePresence>
              </motion.button>
              <span class="sch-check-label">{{ day.label }}</span>
            </label>
          </div>
          <div class="sch-popover-footer">
            <button type="button" class="sch-popover-every" @click="apply(others.map(day => day.key))">{{ t.everyDay }}</button>
            <button type="button" class="sch-popover-apply" :disabled="picked.size === 0" @click="apply([...picked])">{{ t.apply }}</button>
          </div>
        </motion.div>
      </motion.div>
    </Teleport>
  </div>
</template>

<style scoped>
.sch-copy { position: relative; display: inline-flex; }
.sch-copy-icon { display: flex; align-items: center; justify-content: center; }
.sch-copy-icon.is-done { color: var(--beui-foreground); }
.sch-copy-icon svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* A drop-shadow follows the clipped surface; box-shadow would be cut off by its own clip. */
.sch-popover { position: fixed; z-index: 9999; filter: drop-shadow(0 10px 18px rgb(0 0 0 / .14)); }
.sch-popover-surface { box-sizing: border-box; width: 13rem; padding: .5rem; overflow-x: hidden; overflow-y: auto; border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; outline: none; }
.sch-popover-surface:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.sch-popover-heading { margin: 0; padding: .375rem .5rem; font-size: .75rem; line-height: 1rem; font-weight: 500; color: var(--beui-muted-foreground); }
.sch-popover-days { display: flex; flex-direction: column; }
.sch-check-row { display: inline-flex; box-sizing: border-box; width: 100%; flex-direction: row-reverse; align-items: center; justify-content: space-between; gap: .75rem; padding: .375rem .5rem; border-radius: .5rem; cursor: pointer; transition: background-color .15s; }
.sch-check-row:hover { background: var(--beui-muted); }
.sch-check-label { min-width: 0; user-select: none; -webkit-user-select: none; color: var(--beui-foreground); }
.sch-check { display: inline-flex; box-sizing: border-box; width: 1rem; height: 1rem; flex: none; align-items: center; justify-content: center; margin: 0; padding: 0; border: 1px solid; border-radius: 5px; font: inherit; cursor: pointer; outline: none; transition: color .2s, background-color .2s, border-color .2s; }
.sch-check[data-state=unchecked] { border-color: var(--beui-border-strong, var(--border-strong, color-mix(in srgb, var(--beui-foreground) 14%, transparent))); background: var(--beui-background); color: transparent; }
.sch-check[data-state=checked] { border-color: var(--beui-primary); background: var(--beui-primary); color: var(--beui-primary-foreground); }
.sch-check:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.sch-popover-footer { display: flex; align-items: center; gap: .5rem; margin-top: .25rem; padding: .5rem .25rem 0; border-top: 1px solid var(--beui-border); }
.sch-popover-every, .sch-popover-apply { flex: 1 1 0%; margin: 0; padding: .375rem .5rem; border: 0; border-radius: .5rem; font: inherit; font-size: .75rem; line-height: 1rem; cursor: pointer; outline: none; }
.sch-popover-every { background: transparent; color: var(--beui-muted-foreground); font-weight: 500; transition: color .15s, background-color .15s; }
.sch-popover-every:hover, .sch-popover-every:focus-visible { background: var(--beui-muted); color: var(--beui-foreground); }
.sch-popover-apply { background: var(--beui-primary); color: var(--beui-primary-foreground); font-weight: 600; transition: opacity .15s; }
.sch-popover-apply:hover { opacity: .9; }
.sch-popover-apply:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.sch-popover-apply:disabled { opacity: .4; }
</style>
