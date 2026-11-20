<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'

const { open, label, kind = 'center', origin, size } = defineProps<{
  open: boolean
  label: string
  kind?: 'center' | 'left' | 'right' | 'sheet' | 'viewer'
  origin?: DOMRect
  size?: string
}>()
const emit = defineEmits<{ close: [] }>()
const dialog = useTemplateRef('dialog')
let pressedBackdrop = false

function outside(event: PointerEvent | MouseEvent) {
  const bounds = dialog.value?.getBoundingClientRect()
  if (!bounds || event.target !== dialog.value) return false
  return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
}
function press(event: PointerEvent) { pressedBackdrop = outside(event) }
onMounted(() => {
  watch(() => open, async visible => {
    await nextTick()
    const element = dialog.value
    if (!element) return
    if (!visible) { if (element.open) element.close(); return }
    if (element.open) return
    element.showModal()
    if (!origin || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const target = element.getBoundingClientRect()
    const x = origin.left + origin.width / 2 - target.left - target.width / 2
    const y = origin.top + origin.height / 2 - target.top - target.height / 2
    element.animate([
      { opacity: .4, transform: `translate(${x}px,${y}px) scale(${origin.width / target.width},${origin.height / target.height})`, borderRadius: '2rem' },
      { opacity: 1, transform: 'none' },
    ], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' })
  }, { immediate: true, flush: 'post' })
})
</script>
<template>
  <dialog ref="dialog" :aria-label="label" class="surface" :data-kind="kind" :style="{ '--sheet-height': size }" @cancel.prevent="emit('close')"
    @pointerdown="press" @click="pressedBackdrop && outside($event) && emit('close')">
    <slot v-if="open" />
  </dialog>
</template>
<style scoped>
.surface { box-sizing: border-box; padding: 1.5rem; width: min(27rem, calc(100vw - 2rem)); max-height: 88dvh; outline: none; border: 1px solid var(--beui-border); border-radius: 1.35rem; background: var(--beui-card); color: var(--beui-foreground); box-shadow: 0 24px 80px rgb(0 0 0 / .23); }
.surface::backdrop { background: rgb(0 0 0 / .37); backdrop-filter: blur(3px); }
.surface:is([data-kind=left],[data-kind=right]) { position: fixed; top: 0; bottom: 0; height: 100dvh; max-height: 100dvh; width: min(24rem, 90vw); max-width: 100%; border-radius: 0; }
.surface[data-kind=left] { margin: 0 auto 0 0; } .surface[data-kind=right] { margin: 0 0 0 auto; }
.surface[data-kind=sheet] { position: fixed; inset: auto 0 0; height: var(--sheet-height, 45dvh); width: min(100%, 38rem); margin: 0 auto; max-height: 96dvh; border-radius: 1.5rem 1.5rem 0 0; padding-top: .5rem; overscroll-behavior: contain; }
.surface[data-kind=viewer] { width: min(62rem, 95vw); background: var(--beui-background); }
@media (prefers-reduced-motion: no-preference) {
  .surface[open] { animation: surface-in .24s cubic-bezier(.16,1,.3,1); }
  .surface[open][data-kind=left] { animation: left-in .35s cubic-bezier(.16,1,.3,1); }
  .surface[open][data-kind=right] { animation: right-in .35s cubic-bezier(.16,1,.3,1); }
  .surface[open][data-kind=sheet] { animation: sheet-in .35s cubic-bezier(.16,1,.3,1); }
}
@keyframes surface-in { from { opacity: 0; transform: translateY(8px) scale(.96); } }
@keyframes left-in { from { transform: translateX(-100%); } } @keyframes right-in { from { transform: translateX(100%); } }
@keyframes sheet-in { from { transform: translateY(100%); } }
</style>
