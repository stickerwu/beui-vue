<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue'
import { easeOut } from '../core/motion'
import { useVisibility } from './in-view'

const { text, as = 'span', split = 'word', stagger = .09, delay = 0, blur = 12, yOffset = '40%', spring, once = true, whileInView = false } = defineProps<{
  text: string | readonly string[]; as?: string; split?: 'word' | 'char'; stagger?: number; delay?: number; blur?: number; yOffset?: number | string
  spring?: { stiffness?: number; damping?: number; mass?: number }; once?: boolean; whileInView?: boolean
}>()
const root = useTemplateRef<HTMLElement>('root')
const seen = useVisibility(root, () => ({ once, amount: .4 }))
const mounted = shallowRef(false)
onMounted(() => { mounted.value = true })
const reduce = useReducedMotion()
const lines = computed(() => typeof text === 'string' ? [text] : text)
const groups = computed(() => {
  let index = 0
  return lines.value.map(line => (line.match(/\S+\s*|\s+/g) ?? []).map(word => (split === 'char' ? Array.from(word) : [word]).map(value => ({ value, index: index++ }))))
})
const shown = { opacity: 1, y: 0, filter: 'blur(0px)' }
const hidden = computed(() => ({ opacity: 0, y: yOffset, filter: `blur(${Math.min(10, Math.max(0, blur))}px)` }))
function transition(index: number) {
  if (reduce.value) return { duration: 0 }
  const wait = delay + index * stagger
  return { y: { type: 'spring' as const, stiffness: 140, damping: 26, mass: 1.2, ...spring, delay: wait }, opacity: { duration: .7, ease: easeOut, delay: wait }, filter: { duration: .9, ease: easeOut, delay: wait } }
}
</script>
<template>
  <component :is="as" ref="root" class="reveal"><span class="accessible">{{ lines.join(' ') }}</span>
    <span v-for="(line, lineIndex) in groups" :key="`${lineIndex}-${lines[lineIndex]}`" class="line" aria-hidden="true">
      <span v-for="(group, groupIndex) in line" :key="groupIndex" class="word">
        <motion.span v-for="unit in group" :key="unit.index" class="unit" :initial="reduce ? false : hidden" :animate="reduce || (mounted && (!whileInView || seen)) ? shown : hidden" :transition="transition(unit.index)">{{ unit.value }}</motion.span>
      </span>
    </span><slot />
  </component>
</template>
<style scoped>
.reveal, .line { display: block; } .word, .unit { display: inline-block; white-space: pre; }
.accessible { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); overflow: hidden; }
@media (prefers-reduced-motion: reduce) { .unit { opacity: 1 !important; transform: none !important; filter: none !important; } }
</style>
