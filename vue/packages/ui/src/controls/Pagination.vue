<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { computed, useId } from 'vue'
import { tabsSpring } from '../core/motion'

const { totalPages, siblings = 1, boundaries = 1, disabled, label = 'Pagination' } = defineProps<{
  totalPages: number; siblings?: number; boundaries?: number; disabled?: boolean; label?: string
}>()
const value = defineModel<number>({ default: 1 })
const total = computed(() => Math.max(1, Math.floor(totalPages)))
const current = computed(() => Math.max(1, Math.min(total.value, Math.round(value.value))))
const jump = computed(() => Math.max(1, siblings * 2 + 1))
const uid = useId()
const reduce = useReducedMotion()
const pages = computed(() => {
  const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => index + from)
  const ends = Math.max(1, Math.floor(boundaries))
  const surround = Math.max(0, Math.floor(siblings))
  const maximum = ends * 2 + surround * 2 + 3
  if (total.value <= maximum) return range(1, total.value)
  const start = Math.min(Math.max(current.value - surround, ends + 2), total.value - ends - surround * 2 - 1)
  const end = Math.max(Math.min(current.value + surround, total.value - ends - 1), ends + surround * 2 + 2)
  return [...range(1, ends), start > ends + 2 ? 'back' : ends + 1, ...range(start, end), end < total.value - ends - 1 ? 'forward' : total.value - ends, ...range(total.value - ends + 1, total.value)]
})
function go(page: number) { value.value = Math.min(total.value, Math.max(1, page)) }
</script>
<template>
  <nav class="pages" :aria-label="label">
    <button type="button" aria-label="Previous page" :disabled="disabled || current <= 1" @click="go(current - 1)">‹</button>
    <button v-for="page in pages" :key="page" type="button" :aria-current="page === current ? 'page' : undefined" :disabled="disabled"
      :aria-label="typeof page === 'number' ? `Page ${page}` : `${page === 'back' ? 'Back' : 'Forward'} ${jump} pages`" @click="go(typeof page === 'number' ? page : current + (page === 'back' ? -jump : jump))">
      <motion.span v-if="page === current" class="pill" :layout-id="reduce ? undefined : uid" :transition="tabsSpring" /><span class="text">{{ typeof page === 'number' ? page : '…' }}</span>
    </button>
    <button type="button" aria-label="Next page" :disabled="disabled || current >= total" @click="go(current + 1)">›</button>
  </nav>
</template>
<style scoped>
.pages { display: flex; gap: .125rem; flex-wrap: wrap; justify-content: center; }
.pages button { display: grid; place-items: center; width: 2rem; height: 2rem; position: relative; border: 0; padding: 0; border-radius: 99px; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; cursor: pointer; font-variant-numeric: tabular-nums; }
.pages button:hover { background: var(--beui-muted); } .pages button:disabled { opacity: .4; cursor: default; } .pages button[aria-current] { color: var(--beui-primary-foreground); } .pill { position: absolute; inset: 0; background: var(--beui-primary); border-radius: inherit; } .text { position: relative; }
</style>
