<script setup lang="ts">
import { animate, useReducedMotion } from 'motion-v'
import { onBeforeUnmount } from 'vue'

const { to, offset = 0, duration, container } = defineProps<{ to: number | string | HTMLElement; offset?: number; duration?: number; container?: HTMLElement | null }>()
const reduce = useReducedMotion()
let cancel: (() => void) | undefined

function navigate() {
  cancel?.()
  const host = container ?? window
  const origin = container?.scrollTop ?? window.scrollY
  let target: number
  if (typeof to === 'number') target = to
  else {
    let element: Element | null
    if (typeof to === 'string') {
      try { element = (container ?? document).querySelector(to) } catch { return }
    } else element = to
    if (!element) return
    const containerTop = container ? container.getBoundingClientRect().top + container.clientTop : 0
    target = element.getBoundingClientRect().top - containerTop + origin
  }
  const top = target + offset
  if (!duration || duration <= 0 || reduce.value) {
    host.scrollTo({ top, behavior: reduce.value || duration === 0 ? 'instant' : 'smooth' })
    return
  }
  const motion = animate(origin, top, {
    duration, ease: time => Math.min(1, 1.001 - 2 ** (-10 * time)),
    onUpdate: next => host.scrollTo({ top: next, behavior: 'instant' }),
    onComplete: () => stop(),
  })
  function stop() {
    motion.stop()
    host.removeEventListener('wheel', stop)
    host.removeEventListener('touchstart', stop)
    cancel = undefined
  }
  host.addEventListener('wheel', stop, { passive: true })
  host.addEventListener('touchstart', stop, { passive: true })
  cancel = stop
}
onBeforeUnmount(() => cancel?.())
</script>
<template><button type="button" @click="navigate"><slot /></button></template>
