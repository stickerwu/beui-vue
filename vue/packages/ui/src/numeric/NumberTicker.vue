<script lang="ts">
/**
 * English defaults for `NumberTicker`. The visible text is the formatted
 * number; the const exists so callers can supply a spoken form per locale.
 */
export const numberTickerMessages = {
  value: '{value}',
}

export type NumberTickerMessages = typeof numberTickerMessages
</script>

<script setup lang="ts">
import { useInView } from 'motion-v'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import TickColumn from './TickColumn.vue'

/** Height of one digit cell, in `em`. The rolling column repeats this ten times. */
const DIGIT_HEIGHT_EM = 1.1

const props = withDefaults(defineProps<{
  value: number
  /** Digits to pad to (left). */
  pad?: number
  /** Fraction digits to keep. The value is rounded before `format` runs. */
  decimals?: number
  /** Per-digit roll duration in seconds. */
  duration?: number
  /** Stagger between digits. */
  stagger?: number
  /** Render only after the element enters the viewport. */
  startOnView?: boolean
  prefix?: string
  suffix?: string
  /** Add a small blur during digit rolls. */
  blur?: boolean
  className?: string
  digitClassName?: string
  /** Locale group separators. `true` uses the runtime locale; a tag pins it. */
  locale?: boolean | string
  /** Custom formatter. */
  format?: (value: number) => string
}>(), { decimals: 0, duration: 0.9, stagger: 0.04, startOnView: true, blur: false })

const root = useTemplateRef<HTMLElement>('root')
const inView = useInView(root, { once: true, amount: 0.6 })
const armed = shallowRef(!props.startOnView)
const entered = shallowRef(false)
let enteredTimer: ReturnType<typeof setTimeout> | undefined

const text = computed(() => {
  const places = Math.max(0, Math.floor(props.decimals))
  const factor = 10 ** places
  // Round before formatting so `format` sees the same number the slots render.
  const rounded = Math.round(props.value * factor) / factor
  const formatted = props.format
    ? props.format(rounded)
    : props.locale
      ? rounded.toLocaleString(typeof props.locale === 'string' ? props.locale : undefined, {
          minimumFractionDigits: places,
          maximumFractionDigits: places,
        })
      : rounded.toFixed(places)
  return props.pad ? formatted.padStart(props.pad, '0') : formatted
})

// Key by place value (position from the right): a changing digit keeps its
// identity and rolls to the new value instead of remounting and replaying from
// 0. Growing numbers add glyphs on the left without re-keying the ones, tens
// and hundreds already on screen.
const glyphs = computed(() => {
  const chars = text.value.split('')
  return chars.map((char, index) => ({ char, id: `g-${chars.length - 1 - index}` }))
})

const readableText = computed(() => `${props.prefix ?? ''}${text.value}${props.suffix ?? ''}`)

watch(
  armed,
  value => {
    // Stagger is an entrance flourish. Once the reveal has played, value
    // changes roll every digit immediately — a per-digit delay on live updates
    // reads as lag.
    if (!value || entered.value) return
    clearTimeout(enteredTimer)
    enteredTimer = setTimeout(() => (entered.value = true), (props.duration + glyphs.value.length * props.stagger) * 1000)
  },
  { immediate: true },
)

watch(inView, value => {
  if (props.startOnView && value) armed.value = true
})

onBeforeUnmount(() => clearTimeout(enteredTimer))
</script>

<template>
  <span ref="root" class="be-ticker" :class="className">
    <span class="be-ticker-spoken">{{ readableText }}</span>
    <span aria-hidden="true" class="be-ticker-row">
      <span v-if="prefix">{{ prefix }}</span>
      <template v-for="(glyph, index) in glyphs" :key="glyph.id">
        <span v-if="!/\d/.test(glyph.char)" class="be-ticker-char">{{ glyph.char }}</span>
        <span
          v-else
          class="be-ticker-digit"
          :class="digitClassName"
          :style="{ height: `${DIGIT_HEIGHT_EM}em`, lineHeight: `${DIGIT_HEIGHT_EM}em`, width: '1ch' }"
        >
          <!-- The invisible in-flow digit gives the slot a real text baseline,
               so it lines up with surrounding text; clip-path clips the rolling
               column without moving that baseline the way overflow would. -->
          <span class="be-ticker-slot-text">{{ armed ? glyph.char : 0 }}</span>
          <TickColumn :digit="armed ? Number(glyph.char) : 0" :delay="entered ? 0 : index * stagger" :duration="duration" :blur="blur" />
        </span>
      </template>
      <span v-if="suffix">{{ suffix }}</span>
    </span>
  </span>
</template>

<style scoped>
.be-ticker { display: inline-flex; align-items: baseline; font-variant-numeric: tabular-nums; }
.be-ticker-spoken { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.be-ticker-row { display: inline-flex; align-items: baseline; }
.be-ticker-char { display: inline-block; }
.be-ticker-digit { position: relative; display: inline-block; flex: none; text-align: center; clip-path: inset(0); }
.be-ticker-slot-text { visibility: hidden; }
</style>
