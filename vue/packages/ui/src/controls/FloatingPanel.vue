<script setup lang="ts">
import { nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

defineOptions({ inheritAttrs: false })
const { open, anchor, side = 'bottom', align = 'start', gap = 6, point, matchWidth, variant = 'slide', dismissBlur = false } = defineProps<{
  open: boolean
  anchor?: HTMLElement | null
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  gap?: number
  point?: { x: number; y: number }
  matchWidth?: boolean
  variant?: 'slide' | 'morph' | 'goo' | 'tip'
  dismissBlur?: boolean
}>()
const emit = defineEmits<{ dismiss: [reason: 'outside' | 'escape' | 'blur']; placed: [] }>()
const panel = useTemplateRef('panel')
const mounted = shallowRef(false)
const placement = shallowRef<Record<string,string>>({ visibility: 'hidden' })
const flippedSide = shallowRef(side)
onMounted(() => { mounted.value = true })

function place() {
  const target = panel.value
  if (!target || (!anchor && !point)) return
  const pad = 8
  const bounds = point ? new DOMRect(point.x, point.y, 0, 0) : anchor!.getBoundingClientRect()
  if (matchWidth) target.style.minWidth = `${Math.min(bounds.width, window.innerWidth - 2 * pad)}px`
  const width = target.offsetWidth
  const height = target.offsetHeight
  const space = { top: bounds.top, bottom: innerHeight - bounds.bottom, left: bounds.left, right: innerWidth - bounds.right }
  const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const
  const vertical = side === 'top' || side === 'bottom'
  const extent = vertical ? height : width
  const resolved = space[side] < extent + gap + pad && space[opposite[side]] > space[side] ? opposite[side] : side
  const alignOffset = (start: number, end: number, size: number) => align === 'center' ? (end + start - size) / 2 : align === 'end' ? end - size : start
  const x = vertical ? alignOffset(bounds.left, bounds.right, width) : resolved === 'left' ? bounds.left - width - gap : bounds.right + gap
  const y = !vertical ? alignOffset(bounds.top, bounds.bottom, height) : resolved === 'top' ? bounds.top - height - gap : bounds.bottom + gap
  flippedSide.value = resolved
  placement.value = {
    left: `${Math.max(pad, Math.min(x, innerWidth - width - pad))}px`,
    top: `${Math.max(pad, Math.min(y, innerHeight - height - pad))}px`,
    '--origin-x': vertical ? { start: '0%', center: '50%', end: '100%' }[align] : resolved === 'left' ? '100%' : '0%',
    '--origin-y': vertical ? resolved === 'top' ? '100%' : '0%' : '50%',
  }
}
watch([panel, () => anchor, () => point, () => side, () => align], (_, __, cleanup) => {
  if (!panel.value) { placement.value = { visibility: 'hidden' }; return }
  const target = panel.value
  place()
  emit('placed')
  const resize = new ResizeObserver(place)
  resize.observe(target)
  if (anchor) resize.observe(anchor)
  const contains = (event: Event) => event.composedPath().includes(target) || Boolean(anchor && event.composedPath().includes(anchor))
  function outside(event: PointerEvent) { if (!contains(event)) emit('dismiss', 'outside') }
  function key(event: KeyboardEvent) { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); emit('dismiss', 'escape') } }
  function blur(event: FocusEvent) { if (dismissBlur && !contains(event)) emit('dismiss', 'blur') }
  window.addEventListener('scroll', place, true)
  window.addEventListener('resize', place)
  document.addEventListener('pointerdown', outside, true)
  document.addEventListener('keydown', key)
  document.addEventListener('focusin', blur)
  cleanup(() => {
    resize.disconnect()
    window.removeEventListener('scroll', place, true)
    window.removeEventListener('resize', place)
    document.removeEventListener('pointerdown', outside, true)
    document.removeEventListener('keydown', key)
    document.removeEventListener('focusin', blur)
  })
}, { flush: 'post' })
defineExpose({ focus: () => nextTick(() => panel.value?.focus()) })
</script>
<template>
  <Teleport v-if="mounted" to="body"><div v-if="open" ref="panel" v-bind="$attrs" class="floating" :data-side="flippedSide" :data-variant="variant" :style="placement"><slot /></div></Teleport>
</template>
<style scoped>
.floating { position: fixed; box-sizing: border-box; z-index: 120; max-width: calc(100vw - 16px); max-height: calc(100dvh - 16px); overflow: auto; padding: .4rem; border: 1px solid var(--beui-border); background: var(--beui-card); color: var(--beui-foreground); border-radius: .85rem; box-shadow: 0 12px 32px -12px rgb(0 0 0 / .32); transform-origin: var(--origin-x) var(--origin-y); }
@media (prefers-reduced-motion: no-preference) {
  .floating { animation: panel-in .18s cubic-bezier(.16,1,.3,1); }
  .floating[data-variant=morph] { animation: clip-in .28s cubic-bezier(.16,1,.3,1); }
  .floating[data-variant=goo] { animation: goo-in .32s cubic-bezier(.16,1,.3,1); }
}
@keyframes panel-in { from { opacity: 0; transform: scale(.96) translateY(-3px); } }
@keyframes clip-in { from { clip-path: circle(2% at var(--origin-x) var(--origin-y)); } to { clip-path: circle(150% at var(--origin-x) var(--origin-y)); } }
@keyframes goo-in { from { opacity: .1; border-radius: 2rem; transform: scale(.42,.12); filter: blur(3px); } 65% { transform: scale(1.015,1.025); } }
</style>
