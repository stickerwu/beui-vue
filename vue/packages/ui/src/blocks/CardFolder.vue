<script setup lang="ts">
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, watch } from 'vue'
import { easeInOut, easeOut, layoutSpring, pressSpring } from '../core/motion'
import DigitSwap from '../numeric/DigitSwap.vue'
import { useOpenState } from '../primitives/state'
import { cardFolderMessages, formatMessage } from './messages'

/**
 * A landscape card tucked into an animated folder sleeve. Pressing the folder
 * lifts the card forward while the purse compresses into its bottom seam; a
 * separate privacy control reveals its number and CVV.
 */
const props = withDefaults(defineProps<{
  title: string
  cardNumber: string
  expiry: string
  cvv: string
  open?: boolean
  defaultOpen?: boolean
  detailsVisible?: boolean
  defaultDetailsVisible?: boolean
  disabled?: boolean
  ariaLabel?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  cardClassName?: string
  /** Override any built-in string. `{title}`, `{lastFour}` and `{expiry}` fill `open`, `close` and `actions`. */
  labels?: Partial<typeof cardFolderMessages>
}>(), { open: undefined, defaultOpen: false, detailsVisible: undefined, defaultDetailsVisible: false, disabled: false })

const emit = defineEmits<{
  'update:open': [value: boolean]
  openChange: [value: boolean]
  'update:detailsVisible': [value: boolean]
  detailsVisibleChange: [value: boolean]
  click: []
}>()

defineSlots<{
  /** The card artwork tucked into the sleeve. */
  card?(): unknown
}>()

// The two purse layers collapse as one material surface after the card starts
// moving, then reverse immediately so closing feels like the card is caught.
const PURSE_MORPH_TRANSITION = { duration: 0.28, ease: easeInOut } as const
const PURSE_REDUCED_TRANSITION = { duration: 0.16, ease: easeOut } as const

const reduce = useReducedMotion()
const t = computed(() => ({ ...cardFolderMessages, ...props.labels }))

const { open: isOpen, setOpen } = useOpenState(
  () => props.open,
  props.defaultOpen,
  next => { emit('update:open', next); emit('openChange', next) },
  () => props.disabled,
)
const details = useOpenState(
  () => props.detailsVisible,
  props.defaultDetailsVisible,
  next => { emit('update:detailsVisible', next); emit('detailsVisibleChange', next) },
  () => props.disabled,
)
const areDetailsVisible = details.open

const normalizedCardNumber = computed(() => props.cardNumber.replace(/\D/g, ''))
const visibleLastFour = computed(() => normalizedCardNumber.value.slice(-4).padStart(4, '•'))
const revealedCardNumber = computed(() => normalizedCardNumber.value.match(/.{1,4}/g)?.join(' ') ?? visibleLastFour.value)
const maskedCvv = computed(() => '•'.repeat(Math.max(3, props.cvv.length)))
const defaultAriaLabel = computed(() => formatMessage(isOpen.value ? t.value.close : t.value.open, {
  title: props.title,
  lastFour: visibleLastFour.value,
  expiry: props.expiry,
}))

const progress = useMotionValue(isOpen.value ? 1 : 0)
const cardTransform = useTransform(progress, value => {
  const bounded = Math.min(1, Math.max(0, value))
  const lift = Math.sin(Math.PI * bounded)
  return `translateY(${-8 * lift}%) scale(${1 + 0.01 * lift})`
})
const backTransform = useTransform(progress, [0, 1], ['translateY(0%) scaleY(1)', 'translateY(18%) scaleY(0.18)'])
const frontTransform = useTransform(progress, [0, 1], ['translateY(0%) rotateX(0deg)', 'translateY(18%) rotateX(-72deg)'])
const purseOpacity = useTransform(progress, [0, 0.76, 1], [1, 1, 0])

watch([isOpen, reduce], ([open, reduced], _previous, onCleanup) => {
  const controls = animate(progress, open ? 1 : 0, reduced ? { duration: 0 } : PURSE_MORPH_TRANSITION)
  onCleanup(() => controls.stop())
}, { immediate: true })
onBeforeUnmount(() => progress.stop?.())

const backStyle = computed(() => (reduce.value ? undefined : { opacity: purseOpacity, transform: backTransform }))
const cardStyle = computed(() => (reduce.value ? undefined : { transform: cardTransform }))
const frontStyle = computed(() => (reduce.value ? undefined : { opacity: purseOpacity, transform: frontTransform }))
const tapScale = computed(() => (reduce.value || props.disabled ? undefined : { scale: 0.96 }))

function handleClick() {
  setOpen(!isOpen.value)
  emit('click')
}
function toggleDetails() {
  details.setOpen(!areDetailsVisible.value)
}

const iconInitial = computed(() => (reduce.value ? { opacity: 0 } : { opacity: 0, scale: 0.25, filter: 'blur(4px)' }))
const iconExit = iconInitial
const iconTransition = computed(() => (reduce.value ? { duration: 0.12 } : { type: 'spring', duration: 0.3, bounce: 0 } as const))
</script>

<template>
  <div class="be-card-folder" :class="className" :data-open="isOpen ? 'true' : 'false'" :data-details-visible="areDetailsVisible ? 'true' : 'false'">
    <motion.button
      type="button"
      class="be-card-folder-trigger"
      :disabled="disabled"
      :aria-label="ariaLabel ?? defaultAriaLabel"
      :aria-expanded="isOpen"
      :while-press="tapScale"
      :transition="reduce ? { duration: 0 } : pressSpring"
      @click="handleClick">
      <motion.span
        data-slot="card-folder-back"
        aria-hidden="true"
        class="be-card-folder-back"
        :initial="false"
        :animate="reduce ? { opacity: isOpen ? 0 : 1 } : undefined"
        :transition="PURSE_REDUCED_TRANSITION"
        :style="backStyle" />

      <motion.span
        aria-hidden="true"
        class="be-card-folder-card"
        :class="cardClassName"
        :initial="false"
        :animate="reduce ? { transform: 'translateY(0%) scale(1)' } : undefined"
        :style="cardStyle">
        <slot name="card">
          <span class="be-card-folder-fallback"><strong>{{ title }}</strong><small>•••• {{ visibleLastFour }}</small></span>
        </slot>
      </motion.span>
    </motion.button>

    <motion.span
      class="be-card-folder-front"
      :aria-hidden="isOpen"
      :inert="isOpen"
      :initial="false"
      :animate="reduce ? { opacity: isOpen ? 0 : 1 } : undefined"
      :transition="PURSE_REDUCED_TRANSITION"
      :style="frontStyle">
      <svg aria-hidden="true" viewBox="0 0 384 110" preserveAspectRatio="none" class="be-card-folder-purse">
        <path
          d="M0 17C15 7 31 4 49 4H87C110 4 126 17 144 32L158 44C176 59 206 59 225 43L240 30C257 16 271 4 295 4H335C354 4 370 8 384 18V94C384 103 377 110 368 110H16C7 110 0 103 0 94Z"
          fill="var(--beui-background)"
          stroke="var(--beui-foreground)"
          stroke-opacity="0.12"
          vector-effect="non-scaling-stroke" />
        <path
          d="M10 21C22 13 35 11 51 11H85C105 11 120 23 137 37L153 50C175 68 208 68 231 49L246 36C262 23 275 11 297 11H333C350 11 363 14 374 22V89C374 97 369 101 360 101H24C15 101 10 96 10 89Z"
          fill="none"
          stroke="var(--beui-foreground)"
          stroke-dasharray="5 5"
          stroke-linecap="round"
          stroke-opacity="0.22"
          vector-effect="non-scaling-stroke" />
      </svg>

      <span class="be-card-folder-content">
        <span class="be-card-folder-top">
          <motion.button
            type="button"
            class="be-card-folder-eye"
            :class="{ 'is-open': isOpen }"
            :disabled="disabled"
            :tabindex="isOpen ? -1 : undefined"
            :aria-label="areDetailsVisible ? t.hideDetails : t.showDetails"
            :aria-pressed="areDetailsVisible"
            :while-press="tapScale"
            :transition="reduce ? { duration: 0.12 } : pressSpring"
            @click="toggleDetails">
            <AnimatePresence :initial="false" mode="popLayout">
              <motion.span
                :key="areDetailsVisible ? 'hide' : 'show'"
                class="be-card-folder-eye-icon"
                :initial="iconInitial"
                :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)' }"
                :exit="iconExit"
                :transition="iconTransition">
                <svg v-if="areDetailsVisible" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                  <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                  <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                  <path d="m2 2 20 20" />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <span class="be-card-folder-meta">
            <span class="be-card-folder-field">
              <span class="be-card-folder-label">{{ t.expiry }}</span>
              <span class="be-card-folder-value">{{ expiry }}</span>
            </span>
            <span class="be-card-folder-field">
              <span class="be-card-folder-label">{{ t.cvv }}</span>
              <DigitSwap :value="areDetailsVisible ? cvv : maskedCvv" :animation-key="areDetailsVisible ? 'revealed' : 'masked'"
                :direction="areDetailsVisible ? 'up' : 'down'" class-name="be-card-folder-value" />
            </span>
          </span>
        </span>
        <span class="be-card-folder-bottom">
          <span class="be-card-folder-title">{{ title }}</span>
          <DigitSwap :value="areDetailsVisible ? revealedCardNumber : `•••• •••• •••• ${visibleLastFour}`"
            :animation-key="areDetailsVisible ? 'revealed' : 'masked'" :direction="areDetailsVisible ? 'up' : 'down'" :suffix-length="4"
            :glyph-class-name="areDetailsVisible ? 'be-card-folder-ink' : 'be-card-folder-muted'" suffix-class-name="be-card-folder-ink"
            class-name="be-card-folder-number" />
        </span>
      </span>
    </motion.span>

    <motion.button
      v-if="onAction"
      type="button"
      class="be-card-folder-action"
      :disabled="disabled"
      :aria-label="actionLabel ?? formatMessage(t.actions, { title })"
      :animate="{ y: isOpen && !reduce ? -14 : 0 }"
      :while-press="tapScale"
      :transition="reduce ? { duration: 0 } : layoutSpring"
      @click="onAction">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
      </svg>
    </motion.button>
  </div>
</template>

<style scoped>
.be-card-folder { --cf-line: color-mix(in srgb, var(--beui-foreground) 10%, transparent); position: relative; box-sizing: border-box; width: 24rem; max-width: 100%; aspect-ratio: 1029 / 592; user-select: none; -webkit-user-select: none; perspective: 1200px; color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; }
.be-card-folder-trigger, .be-card-folder-eye, .be-card-folder-action { margin: 0; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.be-card-folder-trigger:disabled, .be-card-folder-eye:disabled, .be-card-folder-action:disabled { cursor: not-allowed; opacity: .5; }
.be-card-folder-trigger { position: absolute; inset: 0; display: block; border-radius: 1rem; text-align: left; outline: none; }
.be-card-folder-trigger:focus-visible { box-shadow: 0 0 0 4px var(--beui-background), 0 0 0 6px var(--beui-ring); }
.be-card-folder-back { position: absolute; inset: 10% 0 0; border: 1px solid var(--cf-line); border-radius: 1rem; background: var(--beui-background); transform-origin: center bottom; }
.be-card-folder-card { position: absolute; left: 4.7%; right: 4.7%; top: 0; z-index: 10; aspect-ratio: 1.586 / 1; overflow: hidden; border: 1px solid var(--cf-line); border-radius: .75rem; background: var(--beui-background); transform-origin: center bottom; will-change: transform; }
.be-card-folder-fallback { display: flex; height: 100%; flex-direction: column; justify-content: space-between; box-sizing: border-box; padding: 1rem; background: linear-gradient(135deg, #383a38, #111211); color: #fff; }
.be-card-folder-fallback small { opacity: .65; }
.be-card-folder-front { pointer-events: none; position: absolute; inset: 50% 0 0; z-index: 20; backface-visibility: hidden; transform-origin: center bottom; }
.be-card-folder-purse { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.be-card-folder-content { position: absolute; inset: 0 5%; z-index: 10; display: flex; min-width: 0; flex-direction: column; justify-content: space-between; padding-block: 1rem; }
.be-card-folder-top { display: flex; align-items: flex-start; justify-content: space-between; padding-right: .5rem; }
.be-card-folder-eye { position: relative; z-index: 30; display: flex; width: 2.5rem; height: 2.5rem; flex: none; align-items: center; justify-content: center; border-radius: 9999px; color: var(--beui-muted-foreground); outline: none; pointer-events: auto; transition: color .15s; }
.be-card-folder-eye.is-open { pointer-events: none; }
.be-card-folder-eye:hover:not(:disabled) { color: var(--beui-foreground); }
.be-card-folder-eye:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.be-card-folder-eye-icon { display: flex; align-items: center; justify-content: center; }
.be-card-folder-eye svg, .be-card-folder-action svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.be-card-folder-meta { display: flex; flex: none; align-items: flex-end; gap: .875rem; padding-top: .5rem; }
.be-card-folder-field { display: flex; flex-direction: column; gap: .125rem; }
.be-card-folder-label { font-size: 9px; line-height: 1rem; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: color-mix(in srgb, var(--beui-muted-foreground) 65%, transparent); }
.be-card-folder-value { font-size: .75rem; line-height: 1rem; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--beui-foreground); }
.be-card-folder-bottom { display: flex; min-width: 0; align-items: baseline; justify-content: space-between; gap: 1rem; }
.be-card-folder-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 1.125rem; line-height: 1.25; font-weight: 500; color: var(--beui-foreground); }
.be-card-folder-number { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono, ui-monospace, monospace); font-size: .75rem; line-height: 1rem; letter-spacing: .08em; font-variant-numeric: tabular-nums; }
.be-card-folder :deep(.be-card-folder-muted) { color: var(--beui-muted-foreground); }
.be-card-folder :deep(.be-card-folder-ink) { color: var(--beui-foreground); }
.be-card-folder-action { position: absolute; right: 2.6%; top: 10%; z-index: 10; display: flex; width: 2.5rem; height: 2.5rem; translate: 0 -50%; align-items: center; justify-content: center; border-radius: 9999px; color: rgb(255 255 255 / .65); outline: none; transition: color .15s, background-color .15s; }
.be-card-folder-action:hover:not(:disabled) { background: rgb(255 255 255 / .1); color: #fff; }
.be-card-folder-action:focus-visible { box-shadow: 0 0 0 2px #fff; }
</style>
