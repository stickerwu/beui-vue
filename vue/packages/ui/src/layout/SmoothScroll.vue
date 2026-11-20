<script setup lang="ts">
import type Lenis from 'lenis'
import { useMotionValue, useReducedMotion } from 'motion-v'
import { computed, onMounted, provide, useTemplateRef, watchEffect } from 'vue'
import { scrollKey, type SmoothScrollApi } from './scroll-context'

const { root = true, lerp = .1, duration = 1.2, orientation = 'vertical', wheelMultiplier = 1, touch = false } = defineProps<{
  root?: boolean; lerp?: number; duration?: number; orientation?: 'horizontal' | 'vertical'; wheelMultiplier?: number; touch?: boolean
}>()
const wrapper = useTemplateRef('wrapper')
const content = useTemplateRef('content')
const container = computed(() => !root && wrapper.value || undefined)
const reduce = useReducedMotion()
const progress = useMotionValue(0)
const velocity = useMotionValue(0)
const scrollY = useMotionValue(0)
let engine: Lenis | undefined

const scrollTo: SmoothScrollApi['scrollTo'] = (target, options = {}) => {
  const source = container.value ?? window
  let element: number | HTMLElement | null
  if (typeof target === 'string') {
    try { element = (container.value ?? document).querySelector<HTMLElement>(target) } catch { return }
  } else element = target
  if (element === null) return
  if (engine) { engine.scrollTo(element, { ...options, immediate: options.immediate || reduce.value || false }); return }
  const horizontal = orientation === 'horizontal'
  const current = container.value ? (horizontal ? container.value.scrollLeft : container.value.scrollTop) : (horizontal ? window.scrollX : window.scrollY)
  const axis = horizontal ? 'left' : 'top'
  const border = container.value ? (horizontal ? container.value.clientLeft : container.value.clientTop) : 0
  const position = typeof element === 'number' ? element : element.getBoundingClientRect()[axis] - (container.value?.getBoundingClientRect()[axis] ?? 0) - border + current
  source.scrollTo({ [axis]: position + (options.offset ?? 0), behavior: reduce.value || options.immediate ? 'instant' : 'smooth' })
}
provide(scrollKey, { container, progress, velocity, scrollY, scrollTo })
onMounted(() => watchEffect(cleanup => {
  const source = container.value ?? window
  const node = content.value
  const options = { lerp, duration, orientation, wheelMultiplier, syncTouch: touch, autoRaf: true }
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
  if (!reduce.value && node) void import('lenis').then(({ default: LenisEngine }) => {
    if (disposed) return
    engine = new LenisEngine({ ...options, wrapper: source, content: root ? document.documentElement : node })
    engine.on('scroll', instance => { progress.set(instance.progress); scrollY.set(instance.scroll); velocity.set(instance.velocity) })
    source.removeEventListener('scroll', sync)
  })
  cleanup(() => { disposed = true; source.removeEventListener('scroll', sync); engine?.destroy(); engine = undefined })
}))
defineExpose({ progress, velocity, scrollY, scrollTo })
</script>
<template><div ref="wrapper" :class="{ container: !root, horizontal: orientation === 'horizontal' }"><div ref="content"><slot /></div></div></template>
<style scoped>.container { position: relative; overflow: auto; overscroll-behavior: contain; scroll-behavior: auto; } .horizontal > div { display: flex; width: max-content; }</style>
