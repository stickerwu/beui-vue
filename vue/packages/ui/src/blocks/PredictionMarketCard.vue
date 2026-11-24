<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { Comment, computed, Fragment, shallowRef, useId, type VNode } from 'vue'
import { useValue } from '../agents/shared'
import FloatingPanel from '../controls/FloatingPanel.vue'
import { easeOut, pressSpring, swapSpring } from '../core/motion'
import { useMountedMedia } from '../core/mounted-media'
import { formatMessage, predictionMarketCardMessages } from './messages'

export interface PredictionMarketCardOutcome { id: string, label: string, probability: number, color?: string }
export interface PredictionMarketCardSelection { outcomeId: string, side: 'yes' | 'no' }

const props = withDefaults(defineProps<{
  title: string
  category?: string
  volume: string
  /** Chronological volume samples for the optional footer sparkline. */
  volumeHistory?: number[]
  /** A scheduled time or live match status. */
  status?: string
  live?: boolean
  /** Probability is between 0 and 1; `color` tints the compact probability line. */
  outcomes: PredictionMarketCardOutcome[]
  bookmarked?: boolean
  defaultBookmarked?: boolean
  labels?: Partial<typeof predictionMarketCardMessages>
  className?: string
}>(), { bookmarked: undefined, defaultBookmarked: false, live: false })
const emit = defineEmits<{
  'update:bookmarked': [value: boolean]
  bookmarkChange: [value: boolean]
  outcomeClick: [selection: PredictionMarketCardSelection]
}>()
const slots = defineSlots<{
  /** Round mark in the header. */
  icon?(): unknown
  /** Round mark beside an outcome. */
  'outcome-icon'?(props: { outcome: PredictionMarketCardOutcome }): unknown
}>()

// An outcome whose slot renders nothing (a `v-if` that is false) gets no empty circle.
const Nodes = (nodeProps: { nodes: VNode[] }) => nodeProps.nodes
function mark(outcome: PredictionMarketCardOutcome) {
  const output = slots['outcome-icon']?.({ outcome }) as VNode[] | undefined
  const rendered = output?.filter((node: VNode) => node.type !== Comment && !(node.type === Fragment && Array.isArray(node.children) && node.children.every((child: unknown) => (child as VNode).type === Comment)))
  return rendered?.length ? rendered : undefined
}

const t = computed(() => ({ ...predictionMarketCardMessages, ...props.labels }))
const titleId = useId()
const chartId = useId()
const reduce = useReducedMotion()
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
const { value: saved, set: setSaved } = useValue(() => props.bookmarked, props.defaultBookmarked, value => {
  emit('update:bookmarked', value)
  emit('bookmarkChange', value)
})

function probability(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
}
const chartPoints = computed(() => {
  const samples = props.volumeHistory?.filter(Number.isFinite) ?? []
  if (samples.length < 2) return null
  const low = Math.min(...samples)
  const range = Math.max(...samples) - low
  return samples.map((sample, index) => `${2 + (index / (samples.length - 1)) * 44},${18 - (range ? (sample - low) / range : 0.5) * 14}`).join(' ')
})

// Hover and keyboard focus swap an odds button's percentage for its action word.
const hovered = shallowRef<string | null>(null)
const focused = shallowRef<string | null>(null)
const showAction = (id: string) => (canHover.value && hovered.value === id) || focused.value === id
const cents = (outcome: PredictionMarketCardOutcome) => Math.round(probability(outcome.probability) * 100)
const oddsLabel = (outcome: PredictionMarketCardOutcome, index: number) => showAction(outcome.id)
  ? (index % 2 === 0 ? t.value.yes : t.value.no)
  : formatMessage(t.value.percent, { percent: cents(outcome) })

// Roll swap of the odds label, as `ActionSwapText` does in the original.
const ROLL_BLUR = 'blur(3px)'
const roll = {
  initial: { opacity: 0, y: '90%', filter: ROLL_BLUR },
  animate: { opacity: 1, y: '0%', filter: 'blur(0px)', transition: swapSpring },
  exit: { opacity: 0, y: '-90%', filter: ROLL_BLUR, transition: { duration: 0.14, ease: easeOut } },
}
const settled = { opacity: 1, filter: 'blur(0px)', y: 0 }

// Payout hint tooltip.
const payoutAnchors = shallowRef<Record<string, HTMLElement | null>>({})
const tipFor = shallowRef<string | null>(null)
let tipTimer: ReturnType<typeof setTimeout> | undefined
function showTip(id: string, wait = 0) {
  clearTimeout(tipTimer)
  if (wait) tipTimer = setTimeout(() => { tipFor.value = id }, wait)
  else tipFor.value = id
}
function hideTip(wait = 0) {
  clearTimeout(tipTimer)
  if (wait) tipTimer = setTimeout(() => { tipFor.value = null }, wait)
  else tipFor.value = null
}
</script>

<template>
  <article :aria-labelledby="titleId" class="be-pmc" :class="className">
    <header class="be-pmc-header">
      <div v-if="$slots.icon" aria-hidden="true" class="be-pmc-mark"><slot name="icon" /></div>
      <div class="be-pmc-heading">
        <h3 :id="titleId" class="be-pmc-title">{{ title }}</h3>
        <p class="be-pmc-meta">
          <span v-if="status" class="be-pmc-status" :class="{ 'is-live': live }"><span v-if="live" aria-hidden="true" class="be-pmc-live" />{{ status }}</span>
          <span v-if="status && category" aria-hidden="true">·</span>
          <span v-if="category">{{ category }}</span>
        </p>
      </div>
    </header>

    <div class="be-pmc-body">
      <div class="be-pmc-outcomes">
        <div v-for="(outcome, index) in outcomes" :key="outcome.id" class="be-pmc-outcome">
          <div class="be-pmc-row">
            <span v-if="mark(outcome)" aria-hidden="true" class="be-pmc-outcome-mark"><Nodes :nodes="mark(outcome)!" /></span>
            <span class="be-pmc-label">{{ outcome.label }}</span>
            <button
              :ref="el => { payoutAnchors[outcome.id] = el as HTMLElement | null }" type="button" class="be-pmc-payout"
              :aria-label="formatMessage(t.payoutFor, { outcome: outcome.label })"
              @pointerenter="(event: PointerEvent) => { if (event.pointerType === 'mouse') showTip(outcome.id, 350) }"
              @pointerleave="hideTip(160)"
              @focus="(event: FocusEvent) => { if ((event.currentTarget as HTMLElement).matches(':focus-visible')) showTip(outcome.id) }"
              @blur="hideTip()"
              @pointerup="(event: PointerEvent) => { if (event.pointerType === 'touch') tipFor === outcome.id ? hideTip() : showTip(outcome.id) }"
            >{{ probability(outcome.probability) > 0 ? `${(1 / probability(outcome.probability)).toFixed(1)}×` : '—' }}</button>
            <FloatingPanel
              :open="tipFor === outcome.id" :anchor="payoutAnchors[outcome.id]" side="top" align="center" :gap="5" variant="tip"
              class="be-pmc-tip" role="tooltip" @dismiss="hideTip()" @pointerenter="showTip(outcome.id)" @pointerleave="hideTip(120)"
            >{{ t.payoutHint }}</FloatingPanel>
            <motion.button
              type="button" class="be-pmc-odds" :class="index % 2 === 0 ? 'is-positive' : 'is-negative'"
              :aria-label="formatMessage(t.trade, { outcome: outcome.label, percent: cents(outcome) })"
              :while-press="reduce ? undefined : { scale: 0.96 }" :transition="pressSpring"
              @click="emit('outcomeClick', { outcomeId: outcome.id, side: 'yes' })"
              @pointerenter="(event: PointerEvent) => { if (event.pointerType !== 'touch') hovered = outcome.id }"
              @pointerleave="hovered = null"
              @focus="(event: FocusEvent) => { focused = (event.currentTarget as HTMLElement).matches(':focus-visible') ? outcome.id : null }"
              @blur="focused = null"
            >
              <span class="be-pmc-swap">
                <span aria-hidden="true" class="be-pmc-swap-sizer">{{ oddsLabel(outcome, index) }}</span>
                <AnimatePresence :initial="false">
                  <motion.span
                    :key="showAction(outcome.id) ? 'action' : String(cents(outcome))" class="be-pmc-swap-layer"
                    :initial="reduce ? false : roll.initial" :animate="reduce ? settled : roll.animate" :exit="reduce ? undefined : roll.exit"
                  >{{ oddsLabel(outcome, index) }}</motion.span>
                </AnimatePresence>
              </span>
            </motion.button>
          </div>
          <div aria-hidden="true" class="be-pmc-line">
            <motion.div
              class="be-pmc-line-fill" :initial="false" :animate="{ scaleX: probability(outcome.probability) }"
              :transition="reduce ? { duration: 0 } : { duration: 0.25, ease: easeOut }" :style="outcome.color ? { backgroundColor: outcome.color } : undefined"
            />
          </div>
        </div>
      </div>

      <footer class="be-pmc-footer">
        <svg v-if="chartPoints" aria-hidden="true" viewBox="0 0 48 22" class="be-pmc-chart" fill="none">
          <defs>
            <linearGradient :id="chartId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0.22" />
              <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
            </linearGradient>
          </defs>
          <polygon :points="`2,22 ${chartPoints} 46,22`" :fill="`url(#${chartId})`" />
          <polyline :points="chartPoints" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="be-pmc-volume">{{ formatMessage(t.volume, { volume }) }}</span>
        <motion.button
          type="button" class="be-pmc-bookmark" :class="{ 'is-saved': saved }" :aria-label="formatMessage(t.bookmark, { title })" :aria-pressed="saved"
          :while-press="reduce ? undefined : { scale: 0.85 }" :transition="pressSpring" @click="setSaved(!saved)"
        >
          <motion.span :animate="{ scale: saved && !reduce ? [1, 1.2, 1] : 1 }" :transition="{ duration: 0.22, ease: easeOut }" class="be-pmc-bookmark-icon">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z" /></svg>
          </motion.span>
        </motion.button>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.be-pmc { display: flex; flex-direction: column; box-sizing: border-box; width: 100%; height: 100%; min-width: 0; overflow: hidden; border-radius: 1.5rem; background: var(--beui-card); color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; text-align: start; }
.be-pmc-header { display: flex; flex: none; align-items: center; gap: .75rem; padding: .75rem 1rem; }
.be-pmc-mark { display: flex; flex: none; align-items: center; justify-content: center; box-sizing: border-box; width: 3rem; height: 3rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 9999px; background: var(--beui-background); color: var(--beui-foreground); }
.be-pmc-mark :deep(img) { display: block; width: 100%; height: 100%; }
.be-pmc-heading { min-width: 0; flex: 1; }
/* Explicit resets: a host stylesheet's heading and paragraph rules must not reshape the card. */
.be-pmc-title { margin: 0; padding: 0; border: 0; overflow-wrap: anywhere; font-family: var(--beui-font-display, inherit); font-size: 1rem; line-height: 1.375; font-weight: 500; letter-spacing: -.025em; color: inherit; }
.be-pmc-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .375rem; margin: .25rem 0 0; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.be-pmc-status { display: inline-flex; align-items: center; gap: .375rem; }
.be-pmc-status.is-live { color: oklch(64.5% .246 16.439); }
.be-pmc-live { width: .375rem; height: .375rem; border-radius: 9999px; background: currentColor; }

.be-pmc-body { display: flex; flex: 1; flex-direction: column; margin: 0 .5rem .5rem; padding: .75rem 1rem; border-radius: 1.5rem; background: var(--beui-background); }
.be-pmc-outcomes { display: flex; flex: 1; flex-direction: column; justify-content: center; gap: .75rem; }
.be-pmc-outcome > * + * { margin-top: .25rem; }
.be-pmc-row { display: flex; align-items: center; gap: .5rem; min-height: 2.5rem; }
.be-pmc-outcome-mark { display: flex; flex: none; align-items: center; justify-content: center; width: 2rem; height: 2rem; overflow: hidden; border-radius: 9999px; background: var(--beui-muted); }
.be-pmc-outcome-mark :deep(img) { display: block; width: 100%; height: 100%; }
.be-pmc-label { min-width: 0; flex: 1; overflow-wrap: anywhere; font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
.be-pmc-payout { flex: none; padding: .5rem 0; border: 0; border-radius: .375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; font-variant-numeric: tabular-nums; cursor: pointer; }
.be-pmc-payout:focus-visible, .be-pmc-bookmark:focus-visible { outline: 2px solid var(--beui-ring); }

.be-pmc-odds {
  --odds-ink: var(--beui-foreground); --odds-shadow: currentColor; --odds-border: var(--beui-border); --odds-bg: var(--beui-background); --odds-hover: var(--beui-muted);
  position: relative; display: flex; flex: none; align-items: center; justify-content: center; box-sizing: border-box; min-width: 4rem; min-height: 2.5rem; padding: 0 .75rem; overflow: hidden;
  border: 1px solid var(--odds-border); border-radius: .75rem; background: var(--odds-bg); color: var(--odds-ink); font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 600;
  box-shadow: 0 3px 0 var(--odds-shadow); cursor: pointer; transition: background-color .15s;
}
.be-pmc-odds.is-positive { --odds-ink: oklch(50.8% .118 165.612); --odds-shadow: oklch(69.6% .17 162.48 / .2); --odds-border: oklch(69.6% .17 162.48 / .25); --odds-bg: oklch(69.6% .17 162.48 / .1); --odds-hover: oklch(69.6% .17 162.48 / .15); }
.be-pmc-odds.is-negative { --odds-ink: oklch(51.4% .222 16.935); --odds-shadow: oklch(64.5% .246 16.439 / .2); --odds-border: oklch(64.5% .246 16.439 / .25); --odds-bg: oklch(64.5% .246 16.439 / .1); --odds-hover: oklch(64.5% .246 16.439 / .15); }
:global(:is(.dark, [data-beui-theme='dark']) .be-pmc-odds.is-positive) { --odds-ink: oklch(76.5% .177 163.223); }
:global(:is(.dark, [data-beui-theme='dark']) .be-pmc-odds.is-negative) { --odds-ink: oklch(71.2% .194 13.428); }
@media (hover: hover) { .be-pmc-odds:hover { background: var(--odds-hover); } }
.be-pmc-odds:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-pmc-swap { position: relative; display: inline-block; max-width: 100%; margin-block: -.08em; padding-block: .08em; white-space: nowrap; vertical-align: bottom; clip-path: inset(0 -999px); }
.be-pmc-swap-sizer { display: inline-block; visibility: hidden; white-space: nowrap; }
.be-pmc-swap-layer { position: absolute; top: .08em; left: 0; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; will-change: opacity, filter, transform; }

.be-pmc-line { box-sizing: border-box; width: 6rem; height: .125rem; overflow: hidden; border-radius: 9999px; }
.be-pmc-line-fill { width: 100%; height: 100%; transform-origin: left; border-radius: 9999px; background: oklch(84.5% .143 164.978 / .7); }
:global(:is(.dark, [data-beui-theme='dark']) .be-pmc-line-fill) { background: oklch(76.5% .177 163.223 / .4); }

.be-pmc-footer { display: flex; flex: none; align-items: center; gap: .5rem; margin-top: .5rem; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.be-pmc-chart { flex: none; width: 3rem; height: 1.25rem; color: oklch(69.6% .17 162.48); }
:global(:is(.dark, [data-beui-theme='dark']) .be-pmc-chart) { color: oklch(76.5% .177 163.223); }
.be-pmc-volume { flex: none; }
.be-pmc-bookmark { display: flex; flex: none; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; margin-left: auto; padding: 0; border: 0; border-radius: .75rem; background: transparent; color: inherit; cursor: pointer; transition: background-color .15s; }
.be-pmc-bookmark.is-saved { color: var(--beui-foreground); }
@media (hover: hover) { .be-pmc-bookmark:hover { background: var(--beui-muted); } }
.be-pmc-bookmark-icon { display: inline-flex; }
</style>

<style>
/* The tooltip is teleported to <body>, outside this component's scope. */
.be-pmc-tip.be-pmc-tip.be-pmc-tip { box-sizing: border-box; width: 11rem; padding: .25rem .625rem; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); color: var(--beui-foreground); font-size: .75rem; line-height: 1.625; font-weight: 500; text-align: center; white-space: normal; overflow: visible; box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
</style>
