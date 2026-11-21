<script setup lang="ts">
import { animate, useInView } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'

const props = withDefaults(defineProps<{
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
  startOnView?: boolean
}>(), {
  duration: 1.2,
  startOnView: true,
  format: (n: number) => Math.round(n).toLocaleString(),
})

const target = useTemplateRef<HTMLElement>('target')
const inView = useInView(target, { once: true, amount: .6 })
const reduce = useReducedMotion()
const display = shallowRef(0)
// Tween from wherever the last run settled, so a value change counts up from
// the shown number instead of restarting at zero.
let from = 0
let controls: ReturnType<typeof animate> | undefined

function run() {
  controls?.stop()
  if (props.startOnView && !inView.value) return
  if (reduce.value) {
    from = props.value
    display.value = props.value
    return
  }
  controls = animate(from, props.value, {
    duration: props.duration,
    ease: easeOut,
    onUpdate: value => (display.value = value),
  })
  from = props.value
}

watch([() => props.value, () => props.duration, inView, () => props.startOnView, reduce], run, { immediate: true })
onBeforeUnmount(() => controls?.stop())
</script>

<template>
  <span ref="target" class="be-animated-number" :class="className">{{ format(display) }}</span>
</template>

<style scoped>
.be-animated-number { font-variant-numeric: tabular-nums; }
</style>
