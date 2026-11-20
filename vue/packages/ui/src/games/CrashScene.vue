<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{ design: 'flight' | 'balloon' | 'tower'; value: number; crashed: boolean; running: boolean }>()
const fillId = useId()
const position = computed(() => {
  const growth = Math.log(Math.max(1, props.value))
  const advance = 1 - Math.exp(-growth * 2)
  return { x: 26 + 325 * advance, y: 223 - 164 * advance, advance }
})
const curve = computed(() => `M22 226 Q${position.value.x * .68 + 8} 226 ${position.value.x} ${position.value.y}`)
const blocks = computed(() => Array.from({ length: 5 + Math.min(7, Math.floor(position.value.advance * 10)) }, (_, index) => ({
  x: 164 + Math.sin(index * 1.7) * 4, y: 226 - index * 15, fill: ['#7b62d7', '#a78bfa', '#c4b5fd', '#9474e5'][index % 4],
})))
</script>

<template>
  <svg viewBox="0 0 400 252" class="crash-scene" :class="{ crashed, running }" aria-hidden="true">
    <defs><linearGradient :id="fillId" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#9e83ff" stop-opacity=".35" /><stop offset="1" stop-color="#9e83ff" stop-opacity="0" /></linearGradient></defs>
    <template v-if="design === 'flight'">
      <line v-for="row in 4" :key="row" x1="18" x2="382" :y1="28 + row * 49" :y2="28 + row * 49" stroke="currentColor" opacity=".08" stroke-dasharray="3 4" />
      <circle v-for="star in 23" :key="star" :cx="(star * 97) % 395" :cy="(star * 53) % 208 + 12" r="1" fill="currentColor" opacity=".25" />
      <path :d="`${curve} L${position.x} 226 Z`" :fill="`url(#${fillId})`" /><path :d="curve" fill="none" stroke="#8b5cf6" stroke-width="3" />
      <g :transform="`translate(${position.x} ${position.y})`"><g class="vehicle"><path d="M-14 -3L16 -13L5 11L0 2Z" fill="#b59aff" stroke="#6d4cbd" stroke-width="1.5" /><path d="M0 2L16 -13L-3 6Z" fill="#7256be" /></g></g>
    </template>
    <template v-else-if="design === 'balloon'">
      <g fill="currentColor" opacity=".08"><path d="M14 176q10-17 24-9q7-24 27-17q19 1 20 20q17-1 19 12H14Z" /><path d="M271 62q10-11 20-7q7-16 20-12q15 1 17 15q11-1 15 8h-72Z" /></g>
      <path d="M0 236Q56 190 123 221Q235 164 291 203Q348 182 400 215V252H0Z" fill="#b5a3dc" opacity=".38" />
      <g :transform="`translate(202 ${140 - position.advance * 65})`"><g class="vehicle"><path d="M0 -54C-54 -54 -52 -14 -27 15L-14 30H14L27 15C52 -14 54 -54 0 -54Z" fill="#9d76e6" /><path d="M0 -54C-22 -48 -26 -19 -9 30H9C25 -19 22 -48 0 -54Z" fill="#d1b9ff" /><path d="M-13 29L-8 44M13 29L8 44" stroke="#6f5777" stroke-width="2" /><rect x="-10" y="42" width="20" height="14" rx="3" fill="#bc8b64" /></g></g>
    </template>
    <template v-else>
      <path d="M30 242H370" stroke="currentColor" opacity=".2" />
      <g v-for="(block, index) in blocks" :key="index" :transform="`translate(${block.x} ${block.y})`"><rect class="brick" :style="{ '--tilt': `${(index % 2 ? -1 : 1) * index * 5}deg` }" width="74" height="14" rx="2" :fill="block.fill" /><path d="M0 0L9 -5H83L74 0Z" :fill="block.fill" opacity=".7" /></g>
      <g v-if="!crashed" class="crane"><path d="M40 18H226V35M202 34V54" stroke="currentColor" opacity=".4" fill="none" /><rect x="164" y="53" width="74" height="14" rx="2" fill="#9a83da" /></g>
    </template>
  </svg>
</template>

<style scoped>
.crash-scene { display: block; width: 100%; height: auto; }
@media (prefers-reduced-motion: no-preference) {
  .crashed .vehicle { transform-box: fill-box; transform-origin: center; animation: drop 500ms ease-in both; }
  .crashed .brick { transform-box: fill-box; transform-origin: center; transform: rotate(var(--tilt)); transition: transform .4s; }
  .running .crane { animation: sway 1.6s ease-in-out infinite alternate; }
}
@keyframes drop { to { transform: translateY(34px) rotate(55deg); opacity: .2; } }
@keyframes sway { to { transform: translateX(20px); } }
</style>
