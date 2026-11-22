<script setup lang="ts">
import { motion, useMotionValue, useTransform } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { selectActiveKey, useSelectContext } from './select-context'
import { useChoiceListbox } from './use-listbox'

const RADIUS = 12
// How far the open panel sits from the trigger once it has pulled away.
const GAP = 8
// The surface starts as a thin lip flush against the trigger's edge.
const LIP = 8
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

defineSlots<{ default?: () => unknown }>()

const ctx = useSelectContext('SelectContent')
const { open, progress, reduce } = ctx
const panel = useTemplateRef<{ $el: HTMLElement }>('panel')
const panelEl = computed(() => panel.value?.$el ?? null)
const height = shallowRef(0)
const { activeId, onKeyDown } = useChoiceListbox({ open, rows: ctx.rows, selected: ctx.value, list: panelEl })
provide(selectActiveKey, activeId)

// Keep descendants laid out while hidden: display:none resets nested scrollers in Chromium. Collapse only the
// hidden outer footprint after exit so it cannot extend page scrolling. Opening restores the full box before
// measurement or focus; neither layout change is animated.
const exiting = shallowRef(false)
watch(open, isOpen => { if (!isOpen) exiting.value = true }, { flush: 'sync' })
const present = computed(() => open.value || exiting.value)
let stop: (() => void) | undefined
onMounted(() => {
  stop = progress.on('animationComplete', () => { if (progress.get() === 0) exiting.value = false })
})
onBeforeUnmount(() => stop?.())

// Measure the panel while it is on screen.
watch([panelEl, present], (_, __, onCleanup) => {
  const node = panelEl.value
  if (!node || !present.value) return
  const measure = () => { height.value = node.offsetHeight }
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(node)
  onCleanup(() => observer.disconnect())
}, { flush: 'post', immediate: true })

// On open, flip upward when there isn't room below and there's more above.
watch(open, isOpen => {
  if (!isOpen) return
  const trigger = document.getElementById(ctx.triggerId)
  const node = panelEl.value
  if (!trigger || !node) return
  const rect = trigger.getBoundingClientRect()
  const below = innerHeight - rect.bottom
  const above = rect.top
  ctx.placement.value = below < node.offsetHeight + 16 && above > below ? 'top' : 'bottom'
}, { flush: 'post' })

const isTop = computed(() => ctx.placement.value === 'top')
const ready = computed(() => height.value > 0 && !reduce.value)

// Reveal a full-size panel from its near edge. No ancestor scales the list, so rows, borders and shadow keep
// their natural thickness. The clip and corner writes can paint; only the gap uses a transform. All read one
// progress value, with no animated layout properties. The measured height and the placement are motion values
// too, so a value derived from them re-evaluates the moment they change instead of at the next progress tick.
const readyValue = useMotionValue(ready.value ? 1 : 0)
const topValue = useMotionValue(isTop.value ? 1 : 0)
const heightValue = useMotionValue(height.value)
watch(ready, value => readyValue.set(value ? 1 : 0), { flush: 'sync' })
watch(isTop, value => topValue.set(value ? 1 : 0), { flush: 'sync' })
watch(height, value => heightValue.set(value), { flush: 'sync' })
const detach = useTransform(progress, [0.4, 1], [0, 1])
const y = useTransform([detach, readyValue, topValue] as const, ([d, isReady, top]: number[]) => lerp(isReady ? (top ? GAP : -GAP) : 0, 0, d))
const nearRadius = useTransform([detach, readyValue] as const, ([d, isReady]: number[]) => isReady ? RADIUS * d : RADIUS)
const borderRadius = useTransform([nearRadius, topValue] as const, ([near, top]: number[]) => top ? `${RADIUS}px ${RADIUS}px ${near}px ${near}px` : `${near}px ${near}px ${RADIUS}px ${RADIUS}px`)
const clipPath = useTransform([progress, nearRadius, readyValue, topValue, heightValue] as const, ([p, near, isReady, top, full]: number[]) => {
  if (!isReady) return 'none'
  // Clamp overshoot so the clip never extends into the trigger or exposes overflowing children. At rest remove
  // it so the native shadow is whole.
  const reveal = Math.min(1, Math.max(0, p))
  if (reveal === 1) return 'none'
  const hidden = Math.max(0, (full - LIP) * (1 - reveal))
  const inset = top ? `${hidden}px 0 0 0` : `0 0 ${hidden}px 0`
  const corners = top ? `${RADIUS}px ${RADIUS}px ${near}px ${near}px` : `${near}px ${near}px ${RADIUS}px ${RADIUS}px`
  return `inset(${inset} round ${corners})`
})
// The surface materialises over its first frames rather than popping in as a lip; with reduced motion the fade
// is the whole entrance.
const opacity = useTransform(progress, p => Math.min(1, Math.max(0, reduce.value ? p : p / 0.12)))
const style = computed(() => ({
  visibility: present.value ? undefined : 'hidden',
  maxHeight: present.value ? undefined : 0,
  borderWidth: present.value ? undefined : 0,
  y, clipPath, borderRadius, opacity,
  pointerEvents: open.value ? 'auto' : 'none',
  marginTop: isTop.value ? 0 : `${GAP}px`,
  marginBottom: isTop.value ? `${GAP}px` : 0,
}) as never)

function onPanelKey(event: KeyboardEvent) {
  // Tab leaves the list from the trigger, so focus moves on to the control after the select rather than into
  // the closing panel.
  if (event.key === 'Tab') ctx.close()
  else onKeyDown(event)
}
</script>

<template>
  <!-- Flush against the trigger, then separates into its own rounded pill; sits above or below depending on available space. -->
  <motion.div
    :id="ctx.listId" ref="panel" role="listbox" class="be-select-panel" :class="{ 'is-top': isTop }" :aria-label="ctx.label.value"
    :aria-labelledby="ctx.label.value ? undefined : ctx.triggerId" :aria-hidden="!open" :inert="(open ? undefined : '') as never"
    :style="style" @keydown="onPanelKey"
  >
    <!-- Reduced motion has no row travel: the rows rest in their shown state, whatever the panel does. -->
    <motion.div :initial="false" :animate="open || reduce ? 'show' : 'hidden'" class="be-select-list">
      <slot />
    </motion.div>
  </motion.div>
</template>

<style scoped>
.be-select-panel { position: absolute; left: 0; right: 0; top: 100%; z-index: 20; box-sizing: border-box; overflow: hidden; border: 1px solid var(--beui-border); background: var(--beui-background); box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
.be-select-panel.is-top { top: auto; bottom: 100%; }
.be-select-list { box-sizing: border-box; padding: .25rem; }
</style>
