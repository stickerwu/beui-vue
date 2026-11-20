<script setup lang="ts">
import { computed } from 'vue'

const { direction = 'left', speed = 30, pauseOnHover = true, gap = '1rem', fade = true, paused = false } = defineProps<{
  direction?: 'left' | 'right' | 'up' | 'down'; speed?: number; pauseOnHover?: boolean; gap?: string; fade?: boolean; paused?: boolean
}>()
const vertical = computed(() => direction === 'up' || direction === 'down')
</script>
<template>
  <div class="marquee" :data-vertical="vertical" :data-fade="fade" :data-pause-hover="pauseOnHover" :data-paused="paused" :style="{ '--gap': gap, '--duration': `${Math.max(.01, speed)}s`, '--direction': direction === 'right' || direction === 'down' ? 'reverse' : 'normal' }">
    <div v-for="track in 2" :key="track" class="track" data-marquee-track :aria-hidden="track === 2 || undefined" :inert="track === 2"><slot /></div>
  </div>
</template>
<style scoped>
.marquee, .track { display: flex; gap: var(--gap); } .marquee { overflow: hidden; } .track { align-items: center; flex: none; justify-content: space-around; min-width: 100%; }
.track :slotted(*) { flex-shrink: 0; }
.marquee[data-vertical=true], .marquee[data-vertical=true] .track { flex-direction: column; }
.marquee[data-vertical=true] .track { min-width: auto; min-height: 100%; }
.marquee[data-fade=true] { mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent); }
.marquee[data-vertical=true][data-fade=true] { mask-image: linear-gradient(to bottom, transparent, black 12%, black 88%, transparent); }
@media (prefers-reduced-motion: no-preference) {
  .track { animation: marquee-left var(--duration) linear infinite var(--direction); }
  .marquee[data-vertical=true] .track { animation-name: marquee-up; }
}
.marquee[data-paused=true] .track, .marquee:focus-within .track { animation-play-state: paused; }
@media (hover: hover) { .marquee[data-pause-hover=true]:hover .track { animation-play-state: paused; } }
@keyframes marquee-left { to { transform: translateX(calc(-100% - var(--gap))); } }
@keyframes marquee-up { to { transform: translateY(calc(-100% - var(--gap))); } }
@media (prefers-reduced-motion: reduce) { .marquee { overflow: auto; mask-image: none !important; } .track[inert] { display: none; } }
</style>
