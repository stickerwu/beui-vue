<script setup lang="ts">
import type Lenis from 'lenis'
import { useMotionValue } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onMounted, provide, shallowRef, useTemplateRef, watchEffect } from 'vue'
import { scrollKey, type SmoothScrollApi } from './scroll-context'

defineOptions({ inheritAttrs: false })
const { root = true, lerp = .1, duration = 1.2, orientation = 'vertical', wheelMultiplier = 1, touch = false } = defineProps<{
  /** Drive the page (window) when true, or a contained scroll area when false. */
  root?: boolean
  /** Smoothing factor; lower is smoother and heavier. */
  lerp?: number
  /** Wheel / programmatic ease duration in seconds. */
  duration?: number
  orientation?: 'horizontal' | 'vertical'
  /** Wheel scroll speed multiplier. */
  wheelMultiplier?: number
  /** Smooth touch scrolling. Off by default — native momentum is good on mobile. */
  touch?: boolean
}>()
defineSlots<{ default?: () => unknown }>()
const wrapper = useTemplateRef('wrapper')
const content = useTemplateRef('content')
const container = computed(() => !root && wrapper.value || undefined)
const reduce = useReducedMotion()
const progress = useMotionValue(0)
const velocity = useMotionValue(0)
const scrollY = useMotionValue(0)
const lenis = shallowRef<Lenis | null>(null)
let engine: Lenis | undefined
// Lenis' own expo-out curve: the canonical smooth-scroll easing. A (t) => number function,
// not a `core/motion` token, because tokens are bezier control points for the motion lib.
const easeScroll = (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t))
// Lenis loads lazily. A scroll asked for before it is ready waits for it, so the
// engine, created at the old position, cannot snap a native glide back.
let loading = false
let pending: [number | HTMLElement, { offset?: number; duration?: number; immediate?: boolean }] | undefined

const scrollTo: SmoothScrollApi['scrollTo'] = (target, options = {}) => {
  const source = container.value ?? window
  let element: number | HTMLElement | null
  if (typeof target === 'string') {
    try { element = (container.value ?? document).querySelector<HTMLElement>(target) } catch { return }
  } else element = target
  if (element === null) return
  if (engine) { engine.scrollTo(element, { ...options, immediate: options.immediate || reduce.value || false }); return }
  if (loading) { pending = [element, options]; return }
  const horizontal = orientation === 'horizontal'
  const current = container.value ? (horizontal ? container.value.scrollLeft : container.value.scrollTop) : (horizontal ? window.scrollX : window.scrollY)
  const axis = horizontal ? 'left' : 'top'
  const border = container.value ? (horizontal ? container.value.clientLeft : container.value.clientTop) : 0
  const position = typeof element === 'number' ? element : element.getBoundingClientRect()[axis] - (container.value?.getBoundingClientRect()[axis] ?? 0) - border + current
  source.scrollTo({ [axis]: position + (options.offset ?? 0), behavior: reduce.value || options.immediate ? 'instant' : 'smooth' })
}
provide(scrollKey, { container, lenis, progress, velocity, scrollY, scrollTo })
onMounted(() => watchEffect(cleanup => {
  const source = container.value ?? window
  const node = content.value
  const options = { lerp, duration, orientation, wheelMultiplier, smoothWheel: true, syncTouch: touch, easing: easeScroll, autoRaf: true }
  const horizontal = orientation === 'horizontal'
  let disposed = false
  let previous = performance.now()
  function sync() {
    const host = container.value ?? document.documentElement
    const offset = horizontal ? host.scrollLeft : host.scrollTop
    const maximum = horizontal ? host.scrollWidth - host.clientWidth : host.scrollHeight - host.clientHeight
    const now = performance.now()
    velocity.set((offset - scrollY.get()) * 16 / Math.max(1, now - previous))
    previous = now
    progress.set(maximum > 0 ? offset / maximum : 0)
    scrollY.set(offset)
  }
  sync()
  source.addEventListener('scroll', sync, { passive: true })
  if (!reduce.value && (root || node)) {
    loading = true
    void import('lenis').then(({ default: LenisEngine }) => {
      if (disposed) return
      engine = new LenisEngine({ ...options, wrapper: source, content: root ? document.documentElement : node! })
      lenis.value = engine
      engine.on('scroll', instance => { progress.set(instance.progress); scrollY.set(instance.scroll); velocity.set(instance.velocity) })
      source.removeEventListener('scroll', sync)
      loading = false
      const queued = pending
      pending = undefined
      if (queued) engine.scrollTo(queued[0], { ...queued[1], immediate: queued[1].immediate || reduce.value || false })
    }).catch(() => {
      // No engine: fall back to the native path, including a scroll that was waiting.
      loading = false
      const queued = pending
      pending = undefined
      if (queued) scrollTo(queued[0], queued[1])
    })
  }
  cleanup(() => { disposed = true; loading = false; pending = undefined; source.removeEventListener('scroll', sync); engine?.destroy(); engine = undefined; lenis.value = null })
}))
defineExpose({ progress, velocity, scrollY, scrollTo })
// Root mode drives the page itself, so the template renders no wrapper there: the slot is the page.
</script>
<template>
  <slot v-if="root" />
  <div v-else ref="wrapper" v-bind="$attrs"><div ref="content"><slot /></div></div>
</template>
