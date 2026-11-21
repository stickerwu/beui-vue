<script setup lang="ts">
import { h, onBeforeUnmount, ref, watch } from 'vue'
import { motion } from 'motion-v'
import { ButtonBase, DynamicIsland, DynamicIslandView, NumberTicker, useReducedMotion } from 'beui-vue'

type IslandViewId = 'call' | 'timer' | 'music' | null

const view = ref<IslandViewId>(null)
const seconds = ref(154)
const reduce = useReducedMotion()
const BAR_DELAYS = [0, 0.18, 0.09, 0.27]

// Lucide glyphs, as the original preview uses.
const glyph = (markup: string) => () => h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', innerHTML: markup })
const Music = glyph('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>')
const Phone = glyph('<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>')
const PhoneOff = glyph('<path d="M10.1 13.9a14 14 0 0 0 3.732 2.668 1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2 18 18 0 0 1-12.728-5.272"/><path d="M22 2 2 22"/><path d="M4.76 13.582A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 .244.473"/>')
const Timer = glyph('<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>')

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

let clock: number | undefined
watch(view, (current, _previous, onCleanup) => {
  if (current !== 'timer') return
  clock = window.setInterval(() => { seconds.value = seconds.value > 0 ? seconds.value - 1 : 0 }, 1000)
  onCleanup(() => window.clearInterval(clock))
})
onBeforeUnmount(() => window.clearInterval(clock))

function startTimer() {
  seconds.value = 154
  view.value = 'timer'
}
</script>

<template>
  <div class="island-demo">
    <!-- Fixed-height, top-aligned zone: the island stays pinned at the top like
         under a notch and unfurls downward into reserved space. -->
    <div class="island-zone">
      <DynamicIsland :view="view">
        <template #compact>
          <span class="dot" />
          <span>9:41</span>
        </template>

        <DynamicIslandView id="call" class-name="gap-4">
          <div class="call-copy">
            <span class="eyebrow">Incoming call</span>
            <span class="call-name">Saurabh</span>
          </div>
          <div class="call-actions">
            <button type="button" aria-label="Decline" class="round decline" @click="view = null"><PhoneOff /></button>
            <button type="button" aria-label="Accept" class="round accept" @click="view = null"><Phone /></button>
          </div>
        </DynamicIslandView>

        <DynamicIslandView id="timer" class-name="gap-3">
          <Timer class="timer-icon" />
          <span class="eyebrow">Timer</span>
          <NumberTicker :value="seconds" :format="formatClock" :start-on-view="false" :duration="0.5" class-name="timer-value" />
        </DynamicIslandView>

        <DynamicIslandView id="music" class-name="gap-3">
          <span class="art"><Music /></span>
          <div class="track">
            <span class="track-name">Midnight City</span>
            <span class="track-artist">M83</span>
          </div>
          <span class="bars" aria-hidden="true">
            <motion.span v-for="delay in BAR_DELAYS" :key="delay" class="bar" :style="{ scaleY: 0.6 }"
              :animate="reduce ? undefined : { scaleY: [0.4, 1, 0.55, 0.9, 0.4] }"
              :transition="{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay }" />
          </span>
        </DynamicIslandView>
      </DynamicIsland>
    </div>

    <div class="island-buttons">
      <ButtonBase size="sm" variant="secondary" @click="view = 'call'">Call</ButtonBase>
      <ButtonBase size="sm" variant="secondary" @click="startTimer">Timer</ButtonBase>
      <ButtonBase size="sm" variant="secondary" @click="view = 'music'">Music</ButtonBase>
      <ButtonBase size="sm" variant="ghost" @click="view = null">Dismiss</ButtonBase>
    </div>
  </div>
</template>

<style scoped>
.island-demo { --success: var(--beui-success, oklch(70% 0.18 155)); --warning: var(--beui-warning, oklch(78% 0.18 75)); display: flex; width: 100%; flex-direction: column; align-items: center; gap: 1rem; }
.island-zone { display: flex; width: 100%; height: 8rem; align-items: flex-start; justify-content: center; padding-top: .5rem; box-sizing: border-box; }
.island-buttons { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem; }
.dot { width: .375rem; height: .375rem; border-radius: 9999px; background: var(--success); }
:deep(.gap-3) { gap: .75rem; }
:deep(.gap-4) { gap: 1rem; }
.eyebrow { font-size: 10px; line-height: 1.42857; letter-spacing: .05em; text-transform: uppercase; opacity: .6; }
.call-copy, .track { display: flex; flex-direction: column; }
.call-name { font-size: .875rem; line-height: 1.25rem; font-weight: 600; }
.call-actions { display: flex; align-items: center; gap: .5rem; }
.round { display: flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 9999px; color: #fff; cursor: pointer; }
.decline { background: oklch(62% 0.22 25); }
.accept { background: var(--success); }
.round :deep(svg), .timer-icon :deep(svg), .art :deep(svg), .timer-icon { width: .875rem; height: .875rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.timer-icon { width: 1rem; height: 1rem; color: var(--warning); }
.timer-value { font-size: .875rem; line-height: 1.25rem; font-weight: 600; }
.art { display: flex; width: 1.75rem; height: 1.75rem; align-items: center; justify-content: center; border-radius: .5rem; background: color-mix(in srgb, var(--beui-background) 15%, transparent); }
.track { text-align: left; }
.track-name { font-size: .75rem; line-height: 1.25; font-weight: 600; }
.track-artist { font-size: 10px; line-height: 1.42857; opacity: .6; }
.bars { display: flex; height: 1rem; align-items: flex-end; gap: .125rem; }
.bar { display: block; width: .125rem; height: 100%; transform-origin: bottom; border-radius: 9999px; background: var(--success); }
</style>
