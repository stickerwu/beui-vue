<script setup lang="ts">
import { animate, motion, useMotionValue } from 'motion-v'
import { nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'
import SlideCard from './SlideCard.vue'
import {
  CARD_HEIGHT, CARD_WIDTH, CENTER_SCALE, CONTEXT, DETENT, GAP, INITIAL, LANDING_SPREAD, PITCH, SLIDE_EASE, SPIN_TILES, TAB_CLEARANCE, TAB_HEIGHT, TAIL,
  filler, positionOf, seeded, type ReelState, type Round,
} from './slide-reel'

/**
 * The strip of cards under the fixed edge tabs. A new round keeps the cards on screen (mid-slide
 * too), appends filler and the result, then slides to it. Cards that would beat `goal` carry a
 * pip, so wins read as they fly past.
 */
const props = defineProps<{
  round: Round | null
  goal: number
  duration: number
  reduce: boolean
  busy: boolean
  settled: boolean
  won: boolean | undefined
}>()
const emit = defineEmits<{ cross: []; settle: [round: Round] }>()

const reel = shallowRef<ReelState>(INITIAL)
const x = useMotionValue(INITIAL.rest)
let finished = 0
let under = INITIAL.landed
let controls: { stop: () => void } | undefined

watch(() => props.round, async (round) => {
  if (!round || round.id === reel.value.round?.id) return
  const current = Math.round((-x.get() - CARD_WIDTH / 2) / PITCH)
  const start = Math.max(0, current - CONTEXT)
  const kept = reel.value.tiles.slice(start, current + CONTEXT + 1)
  // Seeded by the result too, so each page load's first round differs.
  const rand = seeded(`${round.id}:${round.result}`)
  const landed = kept.length + SPIN_TILES
  const tiles = [...kept, ...filler(rand, SPIN_TILES, `${round.id}-a`), { id: `${round.id}-result`, multiplier: round.result }, ...filler(rand, TAIL, `${round.id}-b`)]
  const next: ReelState = { tiles, landed, round, from: x.get() + start * PITCH, to: positionOf(landed, (rand() - 0.5) * CARD_WIDTH * LANDING_SPREAD), rest: positionOf(landed) }
  controls?.stop()
  reel.value = next
  // Cards renumber with the render; the jump and the slide start once they have.
  await nextTick()
  if (reel.value !== next) return
  play(next)
})

function play(state: ReelState) {
  const played = state.round
  if (!played) return
  // Settles once per round.
  const finish = () => {
    if (finished === played.id) return
    finished = played.id
    emit('settle', played)
  }
  // The rebuilt strip renumbers the card under the tabs; sync the index first so the jump doesn't tick.
  under = Math.round((-state.from - CARD_WIDTH / 2) / PITCH)
  x.jump(state.from)
  if (props.reduce) {
    x.jump(state.rest)
    finish()
    return
  }
  controls = animate(x, state.to, {
    duration: props.duration,
    ease: SLIDE_EASE,
    onComplete: () => { controls = animate(x, state.rest, { ...DETENT, onComplete: finish }) },
  })
}

// A tick each time a new card reaches the center.
const stop = x.on('change', (value) => {
  const count = reel.value.tiles.length
  const index = Math.min(count - 1, Math.max(0, Math.round((-value - CARD_WIDTH / 2) / PITCH)))
  if (index === under) return
  under = index
  emit('cross')
})
onBeforeUnmount(() => { stop(); controls?.stop() })
</script>

<template>
  <div class="slide-reel" aria-hidden="true" :data-tone="won === true ? 'won' : won === false ? 'lost' : busy ? 'busy' : 'idle'"
    :style="{ minHeight: `${CARD_HEIGHT * CENTER_SCALE + 2 * (TAB_HEIGHT + TAB_CLEARANCE)}px` }">
    <!-- Cards fade out at the sides; the stage and its tabs don't. -->
    <div class="slide-reel-mask">
      <motion.div class="slide-reel-strip" :style="{ x, gap: `${GAP}px`, transformStyle: 'preserve-3d' }">
        <SlideCard v-for="(tile, index) in reel.tiles" :key="tile.id" :multiplier="tile.multiplier" :center="index * PITCH + CARD_WIDTH / 2" :x="x"
          :wins="tile.multiplier >= goal" :landed="settled && index === reel.landed" :dim="settled && index !== reel.landed" :reduce="reduce" />
      </motion.div>
    </div>
    <!-- After the strip, so they paint over cards turning out of the 3D plane. -->
    <svg v-for="side in ['top', 'bottom']" :key="side" class="slide-tab" :data-side="side" aria-hidden="true" viewBox="0 0 36 15" :style="{ height: `${TAB_HEIGHT}px` }">
      <path d="M0 0h36v2a2 2 0 0 1-2 2h-9.5l-5.2 9.4a1.5 1.5 0 0 1-2.6 0L11.5 4H2a2 2 0 0 1-2-2Z" />
    </svg>
  </div>
</template>

<style scoped>
.slide-reel { position: relative; flex: 1; box-sizing: border-box; overflow: hidden; border-radius: 12px; background: color-mix(in srgb, var(--beui-muted) 40%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--beui-border) 50%, transparent); color: color-mix(in srgb, var(--beui-foreground) 50%, transparent); transition: color .15s cubic-bezier(0, 0, .2, 1); }
.slide-reel[data-tone='won'], .slide-reel[data-tone='busy'] { color: var(--beui-primary); }
.slide-reel[data-tone='lost'] { color: #f43f5e; }
.slide-reel-mask { position: absolute; inset: 0; perspective: 900px; -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); }
.slide-reel-strip { position: absolute; top: 0; bottom: 0; left: 50%; display: flex; align-items: center; }
.slide-tab { position: absolute; left: 50%; width: 36px; margin-left: -18px; fill: currentColor; transition: color .15s cubic-bezier(0, 0, .2, 1); }
.slide-tab[data-side='top'] { top: 0; }
.slide-tab[data-side='bottom'] { bottom: 0; transform: rotate(180deg); }
</style>
