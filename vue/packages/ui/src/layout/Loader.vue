<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const loaderMessages = {
  label: 'Loading',
  /** The word the `scramble` variant resolves to. */
  scramble: 'LOADING',
}
export type LoaderMessages = typeof loaderMessages

export type LoaderVariant =
  | 'spinner'
  | 'dots'
  | 'bars'
  | 'dot-matrix'
  | 'dither'
  | 'ascii'
  | 'ascii-line'
  | 'ascii-braille'
  | 'ascii-blocks'
  | 'ascii-bounce'
  | 'morph'
  | 'comet'
  | 'scramble'
  | 'metaballs'
  | 'newton'
  | 'helix'
  | 'percent'

// Terminal-style frame sets — the loaders CLI AI agents cycle through.
export const ASCII_SETS: Record<string, readonly string[]> = {
  ascii: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  'ascii-line': ['|', '/', '-', '\\'],
  'ascii-braille': ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  'ascii-blocks': ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'],
  'ascii-bounce': ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
}

// Each shape is sampled at the same number of points and emitted as an SVG
// path with identical command structure, so motion tweens the `d` attribute
// point-to-point — a real morph, not a snap. (clip-path polygon strings don't
// interpolate reliably, which left the shapes broken.)
const MORPH_POINTS = 24
function ngonRadius(ang: number, n: number, phase = 0) {
  const seg = (2 * Math.PI) / n
  const a = ang - phase
  const local = (((a % seg) + seg) % seg) - seg / 2
  return Math.cos(Math.PI / n) / Math.cos(local)
}
function morphPath(radiusAt: (ang: number) => number) {
  const parts: string[] = []
  for (let i = 0; i < MORPH_POINTS; i++) {
    const ang = (i / MORPH_POINTS) * 2 * Math.PI - Math.PI / 2
    const r = Math.min(1.05, radiusAt(ang))
    const x = (50 + Math.cos(ang) * 46 * r).toFixed(2)
    const y = (50 + Math.sin(ang) * 46 * r).toFixed(2)
    parts.push(`${i === 0 ? 'M' : 'L'}${x} ${y}`)
  }
  return `${parts.join(' ')} Z`
}
const MORPH_PATHS = [
  morphPath(() => 1), // circle
  morphPath(a => ngonRadius(a, 4, Math.PI / 4)), // square
  morphPath(a => ngonRadius(a, 3)), // triangle
  morphPath(a => ngonRadius(a, 6)), // hexagon
  morphPath(a => ngonRadius(a, 4)), // diamond
]
// Each shape appears twice in a row so it fully forms and HOLDS before the
// next morph. Even keyframe spacing then alternates hold / morph segments.
const MORPH_SEQ = [...MORPH_PATHS.flatMap(path => [path, path]), MORPH_PATHS[0]!]
// Rotation and scale only change across the morph segments, staying put on the
// holds, so a settled shape sits still.
const MORPH_ROT = [0, 0, 72, 72, 144, 144, 216, 216, 288, 288, 360]
const MORPH_SCALE = [1, 1, 0.88, 0.88, 1, 1, 0.88, 0.88, 1, 1, 1]

// Ordered Bayer 4x4 matrix — the classic dithering threshold pattern. Cells
// light in this order, so the fill shimmers like a dissolving halftone.
const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const SCRAMBLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/*#@'
const COMET_TRAIL = [0, 1, 2, 3, 4, 5]
const NEWTON_BALLS = [0, 1, 2, 3, 4]
</script>

<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue'
import { easeInOut } from '../core/motion'

const { variant = 'spinner', size = 32, speed = 1, label: labelProp, scramble: scrambleProp, paused = false, labels } = defineProps<{
  /** Which animation to render. */
  variant?: LoaderVariant
  /** Base square size in px. Everything scales from this. */
  size?: number
  /** Seconds per animation cycle. */
  speed?: number
  /** Accessible label announced to screen readers. */
  label?: string
  /** The word the `scramble` variant resolves to. */
  scramble?: string
  /** Freeze the animation in place. */
  paused?: boolean
  labels?: Partial<LoaderMessages>
}>()

const reduce = useReducedMotion()
const t = computed(() => ({ ...loaderMessages, ...labels }))
const label = computed(() => labelProp ?? t.value.label)
const target = computed(() => scrambleProp ?? t.value.scramble)
const filterId = `be-loader-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

// Reduced motion keeps a calm opacity pulse and drops every transform. The template keys its root on the
// preference: it resolves after mount, and motion keeps the last value of a property a new `animate` stops
// naming (a bar frozen at 30% height), so the parts start over.
const REDUCED_PULSE = { opacity: [1, 0.4, 1] }
const reducedTransition = { duration: 1.4, ease: easeInOut, repeat: Infinity }

// --- Frame cycling (ASCII) and text cycling (scramble, percent) -----------
// One timer per instance, re-armed whenever its inputs change. `paused` stops
// the clock rather than the animation, so a paused loader resumes in place.
const frame = shallowRef(0)
const text = shallowRef(target.value)
const percent = shallowRef(0)
let timer: ReturnType<typeof setInterval> | undefined
function stop() {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
}
function intervalEvery(ms: number, step: () => void) {
  stop()
  if (paused || ms <= 0) return
  timer = setInterval(step, ms)
}

const asciiFrames = computed(() => ASCII_SETS[variant as string])

onMounted(() => {
  watch([() => variant, () => speed, reduce, () => paused, asciiFrames], () => {
    stop()
    frame.value = 0
    if (asciiFrames.value) {
      // Reduced motion slows the cycle rather than stopping it — it's a glyph
      // swap, not on-screen movement.
      const cycle = (reduce.value ? speed * 2.5 : speed) / asciiFrames.value.length
      intervalEvery(cycle * 1000, () => { frame.value = (frame.value + 1) % asciiFrames.value!.length })
      return
    }
    if (variant === 'scramble') {
      if (reduce.value) { text.value = target.value; return }
      let tick = 0
      const total = target.value.length + 4
      text.value = target.value
      intervalEvery((speed / Math.max(1, target.value.length)) * 1000 * 0.55, () => {
        const reveal = tick % total
        text.value = [...target.value]
          .map((letter, index) => (index < reveal ? letter : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)]))
          .join('')
        tick++
      })
      return
    }
    if (variant === 'percent') {
      const duration = (reduce.value ? speed * 2 : speed) * 1000
      let elapsed = 0
      percent.value = 0
      const tickMs = 40
      intervalEvery(tickMs, () => {
        elapsed += tickMs
        const next = Math.min(100, Math.round((elapsed / duration) * 100))
        percent.value = next
        if (next >= 100) elapsed = 0
      })
    }
  }, { immediate: true })
})
onBeforeUnmount(stop)

// --- Geometry -------------------------------------------------------------
const stroke = computed(() => Math.max(2, size * 0.09))
const spinnerRadius = computed(() => (size - stroke.value) / 2)
const dot = computed(() => size * 0.24)
const bar = computed(() => size * 0.16)
const matrixGap = computed(() => size * 0.14)
const matrixDot = computed(() => (size - matrixGap.value * 2) / 3)
const ditherGap = computed(() => Math.max(1, size * 0.05))
const ditherCell = computed(() => (size - ditherGap.value * 3) / 4)
const cometHead = computed(() => size * 0.2)
const cometRadius = computed(() => size / 2 - cometHead.value / 2)
const newtonDiameter = computed(() => size * 0.2)
const newtonOffset = computed(() => newtonDiameter.value * 1.1)
const helixRows = 7
const helixDot = computed(() => size * 0.14)
const helixAmp = computed(() => size * 0.32)

const spin = computed(() => (reduce.value ? REDUCED_PULSE : { rotate: 360 }))
const spinTransition = computed(() => (reduce.value ? reducedTransition : { duration: speed, ease: 'linear', repeat: Infinity }))
const pulse = (values: Record<string, unknown>, delay = 0) => ({
  animate: reduce.value ? { opacity: [0.4, 1, 0.4] } : values,
  transition: { duration: speed, ease: easeInOut, repeat: Infinity, delay },
})
</script>

<template>
  <span :key="reduce ? 'reduced' : 'full'" role="status" :aria-label="label" class="be-loader" :class="$attrs.class" :style="(($attrs.style as string) || undefined)">
    <!-- Spinner -->
    <motion.svg v-if="variant === 'spinner'" :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`"
      :animate="spin" :transition="spinTransition" aria-hidden="true">
      <circle :cx="size / 2" :cy="size / 2" :r="spinnerRadius" fill="none" stroke="currentColor" :stroke-opacity="0.2" :stroke-width="stroke" />
      <path :d="`M ${size / 2} ${size / 2 - spinnerRadius} A ${spinnerRadius} ${spinnerRadius} 0 0 1 ${size / 2 + spinnerRadius} ${size / 2}`"
        fill="none" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" />
    </motion.svg>

    <!-- Dots -->
    <span v-else-if="variant === 'dots'" class="be-loader-row" :style="{ gap: `${size * 0.14}px` }" aria-hidden="true">
      <motion.span v-for="index in 3" :key="index" class="be-loader-dot" :style="{ width: `${dot}px`, height: `${dot}px` }"
        :animate="(reduce ? { opacity: [0.4, 1, 0.4] } : { y: [0, -size * 0.3, 0], opacity: [0.5, 1, 0.5] })"
        :transition="{ duration: speed, ease: easeInOut, repeat: Infinity, delay: (index - 1) * speed * 0.16 }" />
    </span>

    <!-- Bars -->
    <span v-else-if="variant === 'bars'" class="be-loader-row" :style="{ gap: `${size * 0.1}px`, height: `${size}px` }" aria-hidden="true">
      <motion.span v-for="index in 4" :key="index" class="be-loader-bar"
        :style="{ width: `${bar}px`, height: `${size}px`, transformOrigin: '50% 100%' }"
        :animate="(reduce ? { opacity: [0.4, 1, 0.4] } : { scaleY: [0.3, 1, 0.3] })"
        :transition="{ duration: speed, ease: easeInOut, repeat: Infinity, delay: (index - 1) * speed * 0.12 }" />
    </span>

    <!-- Dot matrix -->
    <span v-else-if="variant === 'dot-matrix'" class="be-loader-grid" aria-hidden="true"
      :style="{ gap: `${matrixGap}px`, gridTemplateColumns: `repeat(3, ${matrixDot}px)` }">
      <motion.span v-for="cell in 9" :key="cell" class="be-loader-dot"
        :style="{ width: `${matrixDot}px`, height: `${matrixDot}px` }"
        :animate="(reduce ? { opacity: [0.3, 1, 0.3] } : { opacity: [0.2, 1, 0.2], scale: [0.7, 1, 0.7] })"
        :transition="{ duration: speed, ease: easeInOut, repeat: Infinity, delay: (((cell - 1) % 3) + Math.floor((cell - 1) / 3)) / 4 * speed }" />
    </span>

    <!-- Dither -->
    <span v-else-if="variant === 'dither'" class="be-loader-grid" aria-hidden="true"
      :style="{ gap: `${ditherGap}px`, gridTemplateColumns: `repeat(4, ${ditherCell}px)` }">
      <motion.span v-for="(order, index) in BAYER_4" :key="index" class="be-loader-cell"
        :style="{ width: `${ditherCell}px`, height: `${ditherCell}px` }"
        :animate="(reduce ? { opacity: [0.3, 1, 0.3] } : { opacity: [0.1, 1, 0.1] })"
        :transition="{ duration: speed, ease: easeInOut, repeat: Infinity, delay: (order / BAYER_4.length) * speed }" />
    </span>

    <!-- ASCII frame sets -->
    <span v-else-if="asciiFrames" class="be-loader-ascii" aria-hidden="true"
      :style="{ fontSize: `${size}px`, lineHeight: 1 }">{{ asciiFrames[frame % asciiFrames.length] }}</span>

    <!-- Morph -->
    <motion.svg v-else-if="variant === 'morph'" :width="size" :height="size" viewBox="0 0 100 100" role="img"
      :animate="(reduce ? { opacity: [1, 0.4, 1] } : { rotate: MORPH_ROT, scale: MORPH_SCALE })"
      :transition="(reduce ? { duration: 1.4, ease: easeInOut, repeat: Infinity } : { duration: speed * 5, ease: easeInOut, repeat: Infinity })">
      <title>{{ label }}</title>
      <motion.path fill="currentColor" :d="MORPH_PATHS[0]!"
        :initial="{ d: MORPH_PATHS[0] }" :animate="(reduce ? undefined : { d: MORPH_SEQ })"
        :transition="(reduce ? undefined : { duration: speed * 5, ease: easeInOut, repeat: Infinity })" />
    </motion.svg>

    <!-- Comet -->
    <span v-else-if="variant === 'comet'" class="be-loader-comet" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
      <motion.span class="be-loader-comet-spin" :animate="spin" :transition="spinTransition">
        <span v-for="index in COMET_TRAIL.length" :key="index" class="be-loader-comet-dot"
          :style="{
            width: `${cometHead * (1 - (index - 1) * 0.13)}px`,
            height: `${cometHead * (1 - (index - 1) * 0.13)}px`,
            marginLeft: `${-(cometHead * (1 - (index - 1) * 0.13)) / 2}px`,
            marginTop: `${-(cometHead * (1 - (index - 1) * 0.13)) / 2}px`,
            opacity: 1 - (index - 1) * 0.16,
            transform: `rotate(${-(index - 1) * 15}deg) translateY(${-cometRadius}px)`,
          }" />
      </motion.span>
    </span>

    <!-- Scramble -->
    <span v-else-if="variant === 'scramble'" class="be-loader-scramble" aria-hidden="true"
      :style="{ fontSize: `${size * 0.42}px` }">{{ text }}</span>

    <!-- Metaballs -->
    <svg v-else-if="variant === 'metaballs'" :width="size" :height="size" viewBox="0 0 100 100" role="img">
      <title>{{ label }}</title>
      <defs>
        <filter :id="filterId">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
        </filter>
      </defs>
      <g :filter="`url(#${filterId})`" fill="currentColor">
        <motion.circle cy="50" r="15" :initial="{ cx: reduce ? 40 : 30 }"
          :animate="(reduce ? { opacity: [0.4, 1, 0.4] } : { cx: [30, 70, 30] })"
          :transition="{ duration: speed * 1.6, ease: easeInOut, repeat: Infinity }" />
        <motion.circle cy="50" r="15" :initial="{ cx: reduce ? 60 : 70 }"
          :animate="(reduce ? { opacity: [0.4, 1, 0.4] } : { cx: [70, 30, 70] })"
          :transition="{ duration: speed * 1.6, ease: easeInOut, repeat: Infinity }" />
      </g>
    </svg>

    <!-- Newton's cradle -->
    <span v-else-if="variant === 'newton'" class="be-loader-row" :style="{ height: `${newtonDiameter}px` }" aria-hidden="true">
      <motion.span v-for="index in NEWTON_BALLS.length" :key="index" class="be-loader-dot"
        :style="{ width: `${newtonDiameter}px`, height: `${newtonDiameter}px` }"
        :animate="(reduce ? undefined : index === 1 ? { x: [0, -newtonOffset, 0, 0] } : index === 5 ? { x: [0, 0, newtonOffset, 0] } : undefined)"
        :transition="(reduce || (index !== 1 && index !== 5) ? undefined : {
          duration: speed * 1.5, ease: easeInOut, repeat: Infinity,
          times: index === 1 ? [0, 0.28, 0.5, 1] : [0, 0.5, 0.78, 1],
        })" />
    </span>

    <!-- Helix -->
    <span v-else-if="variant === 'helix'" class="be-loader-helix" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
      <span v-for="row in helixRows" :key="row">
        <motion.span class="be-loader-dot"
          :style="{ width: `${helixDot}px`, height: `${helixDot}px`, left: `${size / 2 - helixDot / 2}px`, top: `${((row - 1) / (helixRows - 1)) * (size - helixDot)}px` }"
          :animate="(reduce ? { opacity: [0.4, 1, 0.4] } : { x: [helixAmp, -helixAmp, helixAmp], scale: [1, 0.5, 1], opacity: [1, 0.45, 1] })"
          :transition="{ duration: speed, ease: easeInOut, repeat: Infinity, delay: ((row - 1) / helixRows) * speed }" />
        <motion.span class="be-loader-dot"
          :style="{ width: `${helixDot}px`, height: `${helixDot}px`, left: `${size / 2 - helixDot / 2}px`, top: `${((row - 1) / (helixRows - 1)) * (size - helixDot)}px` }"
          :animate="(reduce ? { opacity: [0.4, 1, 0.4] } : { x: [-helixAmp, helixAmp, -helixAmp], scale: [0.5, 1, 0.5], opacity: [0.45, 1, 0.45] })"
          :transition="{ duration: speed, ease: easeInOut, repeat: Infinity, delay: ((row - 1) / helixRows) * speed }" />
      </span>
    </span>

    <!-- Percent -->
    <span v-else-if="variant === 'percent'" class="be-loader-percent" aria-hidden="true"
      :style="{ gap: `${size * 0.14}px`, width: `${size * 1.4}px` }">
      <span class="be-loader-percent-text" :style="{ fontSize: `${size * 0.42}px`, lineHeight: 1 }">{{ percent }}%</span>
      <span class="be-loader-percent-track" :style="{ height: `${Math.max(3, size * 0.1)}px` }">
        <span class="be-loader-percent-fill" :style="{ width: `${percent}%` }" />
      </span>
    </span>

    <span class="be-loader-sr">{{ label }}</span>
  </span>
</template>

<style scoped>
.be-loader { display: inline-flex; align-items: center; justify-content: center; color: var(--beui-foreground); }
.be-loader-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.be-loader-row { display: flex; align-items: center; justify-content: center; }
.be-loader-dot { display: block; flex: none; border-radius: 50%; background: currentColor; }
.be-loader-bar { display: block; flex: none; border-radius: 99px; background: currentColor; }
.be-loader-grid { display: grid; }
.be-loader-cell { display: block; background: currentColor; }
.be-loader-ascii { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; white-space: pre; }
.be-loader-scramble { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-weight: 500; letter-spacing: .2em; font-variant-numeric: tabular-nums; white-space: pre; }
.be-loader-comet { position: relative; display: block; }
.be-loader-comet-spin { position: absolute; inset: 0; display: block; }
.be-loader-comet-dot { position: absolute; top: 50%; left: 50%; display: block; border-radius: 50%; background: currentColor; }
.be-loader-helix { position: relative; display: block; }
.be-loader-helix .be-loader-dot { position: absolute; }
.be-loader-percent { display: flex; flex-direction: column; align-items: center; }
.be-loader-percent-text { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-weight: 500; font-variant-numeric: tabular-nums; }
.be-loader-percent-track { display: block; width: 100%; overflow: hidden; border-radius: 99px; background: color-mix(in srgb, currentColor 15%, transparent); }
.be-loader-percent-fill { display: block; height: 100%; border-radius: 99px; background: currentColor; }
</style>
