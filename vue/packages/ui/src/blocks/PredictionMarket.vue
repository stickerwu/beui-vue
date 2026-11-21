<script setup lang="ts">
import { AnimatePresence, LayoutGroup, animate, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, useId, useTemplateRef } from 'vue'
import StatefulButton, { type ButtonState } from '../actions/StatefulButton.vue'
import { useValue } from '../agents/shared'
import { easeOut, tabsSpring } from '../core/motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import { formatMessage, predictionMarketMessages } from './messages'

export type PredictionMarketMode = 'buy' | 'sell'
export interface PredictionMarketOutcome { id: string, label: string, price: number }
export interface PredictionMarketOrderValue { mode: PredictionMarketMode, outcomeId: string, amount: string }
export interface PredictionMarketQuote { valid: boolean, amount: number, price: number, shares: number, payout: number, error?: string }
export interface PredictionMarketClassNames { root?: string, header?: string, tabs?: string, outcomes?: string, amount?: string, chips?: string, footer?: string, action?: string }

const props = withDefaults(defineProps<{
  outcomes?: PredictionMarketOutcome[]
  modelValue?: PredictionMarketOrderValue
  /** Alias of `modelValue`, kept from the original port. */
  value?: PredictionMarketOrderValue
  defaultValue?: Partial<PredictionMarketOrderValue>
  authenticated?: boolean
  orderTypeLabel?: string
  balance?: number
  positions?: Record<string, number>
  quickAmounts?: number[]
  minTrade?: number
  /** Override any built-in string. `{price}` fills `avgPrice`, `{amount}` fills `minimum`. */
  labels?: Partial<typeof predictionMarketMessages>
  className?: string
  classNames?: PredictionMarketClassNames
}>(), {
  outcomes: () => [{ id: 'up', label: 'Up', price: 0.09 }, { id: 'down', label: 'Down', price: 0.91 }],
  authenticated: true, balance: 500, positions: () => ({ up: 24, down: 16 }), quickAmounts: () => [10, 50, 100, 500], minTrade: 1,
})
const emit = defineEmits<{
  'update:modelValue': [value: PredictionMarketOrderValue]
  valueChange: [value: PredictionMarketOrderValue]
  trade: [order: PredictionMarketOrderValue, quote: PredictionMarketQuote]
  signIn: []
}>()

const MODES: PredictionMarketMode[] = ['buy', 'sell']
const t = computed(() => ({ ...predictionMarketMessages, ...props.labels }))
const inputId = useId()
const reduce = useReducedMotion()
const amountBox = useTemplateRef<HTMLElement>('amountBox')
const status = shallowRef<'idle' | 'placing' | 'filled'>('idle')
const shakeKey = shallowRef(0)
let timer: ReturnType<typeof setTimeout> | undefined

const { value: order, set: setOrder } = useValue<PredictionMarketOrderValue>(
  () => props.modelValue ?? props.value,
  { mode: props.defaultValue?.mode ?? 'buy', outcomeId: props.defaultValue?.outcomeId ?? props.outcomes[0]?.id ?? '', amount: props.defaultValue?.amount ?? '' },
  next => { emit('update:modelValue', next); emit('valueChange', next) },
)

function sanitizeAmount(value: string) {
  const [whole, ...decimalParts] = value.replace(/[^\d.]/g, '').split('.')
  if (decimalParts.length === 0) return whole
  return `${whole}.${decimalParts.join('').slice(0, 2)}`
}
const parseAmount = (value: string) => Number(value) || 0
function formatCurrency(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits }).format(value)
}
const formatCompactCurrency = (value: number) => value >= 100 ? formatCurrency(value, 0) : formatCurrency(value, value % 1 === 0 ? 0 : 2)
function formatCents(value: number) {
  const cents = value * 100
  return `${cents.toFixed(Number.isInteger(cents) ? 0 : 1)}¢`
}

const selectedOutcome = computed(() => props.outcomes.find(outcome => outcome.id === order.value.outcomeId) ?? props.outcomes[0])
const position = computed(() => props.positions[selectedOutcome.value.id] ?? 0)
const quote = computed<PredictionMarketQuote>(() => {
  const amount = parseAmount(order.value.amount)
  const price = Math.max(0.01, Math.min(0.99, selectedOutcome.value.price))
  const buying = order.value.mode === 'buy'
  const shares = buying ? amount / price : amount
  const payout = buying ? shares : amount * price
  if (amount <= 0) return { valid: false, amount, price, shares: 0, payout: 0, error: t.value.enterAmount }
  if (buying && amount < props.minTrade) return { valid: false, amount, price, shares, payout, error: formatMessage(t.value.minimum, { amount: formatCompactCurrency(props.minTrade) }) }
  if (buying && amount > props.balance) return { valid: false, amount, price, shares, payout, error: t.value.insufficientBalance }
  if (!buying && amount > position.value) return { valid: false, amount, price, shares, payout, error: t.value.notEnoughShares }
  return { valid: true, amount, price, shares, payout }
})

function setOrderValue(next: Partial<PredictionMarketOrderValue>) {
  clearTimeout(timer)
  status.value = 'idle'
  setOrder({ ...order.value, ...next })
}
function addAmount(increment: number) { setOrderValue({ amount: String(parseAmount(order.value.amount) + increment) }) }
function setMax() {
  if (order.value.mode === 'buy') setOrderValue({ amount: String(Math.floor(props.balance)) })
  else setOrderValue({ amount: position.value.toFixed(position.value % 1 === 0 ? 0 : 2) })
}
function submit() {
  if (!props.authenticated) { emit('signIn'); return }
  if (!quote.value.valid) {
    shakeKey.value += 1
    if (!reduce.value && amountBox.value) animate(amountBox.value, { x: [0, -5, 5, -3, 3, -1, 0] }, { duration: 0.38, ease: easeOut })
    return
  }
  status.value = 'placing'
  timer = setTimeout(() => {
    status.value = 'filled'
    emit('trade', { ...order.value }, { ...quote.value })
  }, 650)
}
onBeforeUnmount(() => clearTimeout(timer))

// Digits are keyed by character and occurrence so a typed digit rolls in without re-rolling its neighbours.
const displayValue = computed(() => order.value.amount || '0')
const chars = computed(() => {
  const seen = new Map<string, number>()
  return displayValue.value.split('').map(char => {
    const count = seen.get(char) ?? 0
    seen.set(char, count + 1)
    return { id: `${char}-${count}`, char }
  })
})
const sizeClass = computed(() => {
  const length = order.value.amount.replace(/\D/g, '').length
  return length >= 10 ? 'is-s3' : length >= 8 ? 'is-s2' : length >= 6 ? 'is-s1' : 'is-s0'
})
const payoutClass = computed(() => {
  const length = formatCurrency(quote.value.payout).length
  return length >= 16 ? 'is-p3' : length >= 13 ? 'is-p2' : length >= 10 ? 'is-p1' : 'is-p0'
})
const digitIn = computed(() => reduce.value ? { opacity: 0 } : { opacity: 0, y: 18, filter: 'blur(10px)' })
const digitSettled = computed(() => reduce.value ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' })
const digitOut = computed(() => reduce.value ? { opacity: 0 } : { opacity: 0, y: -14, filter: 'blur(10px)' })
const digitTransition = { duration: 0.18, ease: easeOut } as const

const actionState = computed<ButtonState>(() => status.value === 'placing' ? 'loading' : status.value === 'filled' ? 'success' : quote.value.valid ? 'idle' : 'error')
const amountLabel = computed(() => order.value.mode === 'buy' ? t.value.amount : t.value.shares)
const isNo = (outcome: PredictionMarketOutcome) => ['no', 'down'].includes(outcome.label.toLowerCase())
const indicatorTransition = computed(() => reduce.value ? { duration: 0 } : tabsSpring)

// Roving tab lists: arrows, Home and End move and select, like the original Tabs.
function onTabsKey(event: KeyboardEvent) {
  const list = event.currentTarget as HTMLElement
  const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'))
  const at = tabs.indexOf(event.target as HTMLButtonElement)
  if (at < 0) return
  const rtl = getComputedStyle(list).direction === 'rtl'
  const next = event.key === (rtl ? 'ArrowLeft' : 'ArrowRight') ? tabs[(at + 1) % tabs.length]
    : event.key === (rtl ? 'ArrowRight' : 'ArrowLeft') ? tabs[(at - 1 + tabs.length) % tabs.length]
      : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : null
  if (!next) return
  event.preventDefault()
  next.focus()
  next.click()
}
const modeGroup = useId()
const outcomeGroup = useId()
</script>

<template>
  <div class="be-pm" :class="[className, classNames?.root]">
    <div class="be-pm-header" :class="classNames?.header">
      <div class="be-pm-header-row">
        <LayoutGroup :id="modeGroup">
          <div role="tablist" class="be-pm-modes" :class="classNames?.tabs" @keydown="onTabsKey">
            <button
              v-for="mode in MODES" :key="mode" type="button" role="tab" class="be-pm-mode" :class="{ 'is-active': order.mode === mode }"
              :aria-selected="order.mode === mode" :tabindex="order.mode === mode ? 0 : -1" @click="setOrderValue({ mode, amount: '' })"
            >
              {{ t[mode] }}
              <motion.span v-if="order.mode === mode" layout :layout-id="`${modeGroup}-underline`" class="be-pm-underline" :transition="indicatorTransition" />
            </button>
          </div>
        </LayoutGroup>

        <button type="button" class="be-pm-order-type" :disabled="status === 'placing'">
          {{ orderTypeLabel ?? t.orderType }}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
    </div>

    <div class="be-pm-body">
      <LayoutGroup :id="outcomeGroup">
        <div role="tablist" class="be-pm-outcomes" :class="classNames?.outcomes" @keydown="onTabsKey">
          <div v-for="outcome in outcomes" :key="outcome.id" class="be-pm-outcome-cell">
            <motion.span
              v-if="outcome.id === selectedOutcome.id" layout :layout-id="`${outcomeGroup}-pill`" class="be-pm-pill" :class="isNo(outcome) ? 'is-no' : 'is-yes'"
              :style="{ borderRadius: '9999px' }" :transition="indicatorTransition"
            />
            <button
              type="button" role="tab" class="be-pm-outcome" :class="[isNo(outcome) ? 'is-no' : 'is-yes', { 'is-selected': outcome.id === selectedOutcome.id }]"
              :aria-selected="outcome.id === selectedOutcome.id" :tabindex="outcome.id === selectedOutcome.id ? 0 : -1" @click="setOrderValue({ outcomeId: outcome.id })"
            >{{ outcome.label }} {{ formatCents(outcome.price) }}</button>
          </div>
        </div>
      </LayoutGroup>

      <div ref="amountBox" class="be-pm-amount" :class="classNames?.amount">
        <div class="be-pm-amount-main">
          <label :for="inputId" class="be-pm-amount-label">{{ amountLabel }}</label>

          <div class="be-pm-amount-field">
            <div class="be-pm-amount-row">
              <span v-if="order.mode === 'buy'" aria-hidden="true" class="be-pm-dollar" :class="sizeClass">$</span>
              <div class="be-pm-input-wrap">
                <input
                  :id="inputId" class="be-pm-input" :class="sizeClass" :value="order.amount" :disabled="status === 'placing'" placeholder="0" inputmode="decimal"
                  :aria-label="amountLabel" autocomplete="off" :style="{ '--amount-chars': String(chars.length) }"
                  @input="setOrderValue({ amount: sanitizeAmount(($event.target as HTMLInputElement).value) })"
                >
                <div aria-hidden="true" class="be-pm-digits" :class="[sizeClass, { 'is-empty': !order.amount }]" :style="{ '--amount-chars': String(chars.length) }">
                  <AnimatePresence :initial="false" mode="popLayout">
                    <motion.span
                      v-for="item in chars" :key="item.id" :layout="reduce ? false : 'position'" class="be-pm-digit"
                      :initial="digitIn" :animate="digitSettled" :exit="digitOut" :transition="digitTransition"
                    >{{ item.char }}</motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="be-pm-chips" :class="classNames?.chips">
          <button v-for="amount in quickAmounts" :key="amount" type="button" class="be-pm-chip" :disabled="status === 'placing'" @click="addAmount(amount)">+{{ order.mode === 'buy' ? formatCompactCurrency(amount) : amount }}</button>
          <button type="button" class="be-pm-chip" :disabled="status === 'placing'" @click="setMax">{{ t.max }}</button>
        </div>
      </div>
    </div>

    <div v-if="authenticated" class="be-pm-footer" :class="classNames?.footer">
      <div class="be-pm-quote">
        <div class="be-pm-quote-copy">
          <div class="be-pm-quote-title">
            {{ order.mode === 'buy' ? t.toWin : t.toReceive }}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="be-pm-banknote"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
          </div>
          <p class="be-pm-avg">{{ formatMessage(t.avgPrice, { price: formatCents(quote.price) }) }}</p>
        </div>
        <div class="be-pm-payout" :class="payoutClass">
          <NumberTicker :value="quote.payout * 100" :start-on-view="false" :duration="0.45" :stagger="0" blur :format="cents => formatCurrency(cents / 100)" />
        </div>
      </div>

      <StatefulButton
        :state="actionState" variant="primary" size="lg" :press-scale="0.98" :loading-text="t.trading" :success-text="t.tradeFilled" :error-text="quote.error ?? t.enterAmount"
        class="be-pm-action" :class="classNames?.action" @click="submit"
      >{{ t.trade }}</StatefulButton>
    </div>
    <div v-else class="be-pm-connect">
      <StatefulButton state="idle" variant="primary" size="lg" :press-scale="0.98" class="be-pm-action is-connect" :class="classNames?.action" @click="submit">{{ t.connect }}</StatefulButton>
    </div>
  </div>
</template>

<style scoped>
.be-pm { box-sizing: border-box; width: 100%; max-width: 400px; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1.5rem; background: var(--beui-background); color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; text-align: start; }
.be-pm button { font-family: inherit; }
.be-pm-header { padding: 1rem 1rem 0; border-bottom: 1px solid color-mix(in srgb, var(--beui-border) 80%, transparent); }
.be-pm-header-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.be-pm-modes { display: inline-flex; flex: none; align-items: center; gap: 1.25rem; }
.be-pm-mode { position: relative; isolation: isolate; display: inline-flex; flex: none; align-items: center; min-height: 44px; margin: 0 0 -1px; padding: 0 0 .75rem; border: 0; background: transparent; color: var(--beui-muted-foreground); font-size: 1.5rem; line-height: 2rem; font-weight: 600; white-space: nowrap; cursor: pointer; transition: color .15s; }
.be-pm-mode.is-active { color: var(--beui-foreground); }
@media (hover: hover) { .be-pm-mode:hover { color: var(--beui-foreground); } }
.be-pm-mode:focus-visible, .be-pm-outcome:focus-visible, .be-pm-chip:focus-visible, .be-pm-order-type:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-pm-underline { position: absolute; right: 0; bottom: 0; left: 0; height: 2px; background: var(--beui-foreground); }
.be-pm-order-type { display: inline-flex; align-items: center; gap: .5rem; margin: 0 0 .75rem; padding: 0; border: 0; background: transparent; color: var(--beui-foreground); font-size: 1.25rem; line-height: 1.75rem; font-weight: 600; cursor: pointer; transition: opacity .15s; }
.be-pm-order-type:disabled { opacity: .5; }

.be-pm-body { padding: .75rem; }
.be-pm-body > * + * { margin-top: 1rem; }
.be-pm-outcomes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: center; gap: .5rem; width: 100%; box-sizing: border-box; padding: .375rem; border-radius: 9999px; background: var(--beui-card); }
.be-pm-outcome-cell { position: relative; flex: none; min-width: 0; }
.be-pm-pill { position: absolute; inset: 0; border-radius: 9999px; }
.be-pm-pill.is-yes { background: rgb(16 185 129 / .2); }
.be-pm-pill.is-no { background: rgb(239 68 68 / .1); }
:global(:is(.dark, [data-beui-theme='dark']) .be-pm-pill.is-no) { background: rgb(239 68 68 / .15); }
.be-pm-outcome { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 100%; height: 3.5rem; padding: 0; border: 0; border-radius: 1.35rem; background: transparent; font-size: 1rem; line-height: 1.5; font-weight: 600; white-space: nowrap; cursor: pointer; transition: color .15s, transform .1s; }
.be-pm-outcome:active { transform: scale(.99); }
.be-pm-outcome.is-yes { color: var(--beui-muted-foreground); }
.be-pm-outcome.is-no { color: rgb(252 165 165 / .55); }
/* The selected label is drawn over the pill in the primary foreground, as the original tab overlay does. */
.be-pm-outcome.is-selected { color: var(--beui-primary-foreground); }

.be-pm-amount { padding: 1rem; border-radius: 1.5rem; background: var(--beui-card); }
.be-pm-amount-main { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.25rem; min-height: 6rem; text-align: center; }
.be-pm-amount-label { margin-right: 1.5rem; font-size: 1.25rem; line-height: 1.75rem; font-weight: 500; color: var(--beui-foreground); }
.be-pm-amount-field { width: 100%; min-width: 0; }
.be-pm-amount-row { display: flex; align-items: center; justify-content: center; min-width: 0; overflow: hidden; }
.be-pm-dollar { flex: none; font-weight: 600; line-height: 1; letter-spacing: normal; color: color-mix(in srgb, var(--beui-muted-foreground) 65%, transparent); font-variant-numeric: tabular-nums; transition: font-size .2s; }
.be-pm-input-wrap { position: relative; flex: 0 1 auto; min-width: 0; }
.be-pm-input { box-sizing: content-box; display: block; width: calc((var(--amount-chars) + 1) * .62em); min-width: .8em; max-width: 260px; margin: 0; padding: 0; border: 0; background: transparent; text-align: left; font: inherit; font-weight: 600; line-height: 1; letter-spacing: normal; color: transparent; caret-color: var(--beui-foreground); outline: none; font-variant-numeric: tabular-nums; transition: font-size .2s; }
.be-pm-input::placeholder { color: transparent; }
.be-pm-input::selection { background: color-mix(in srgb, var(--beui-foreground) 10%, transparent); }
.be-pm-input:disabled { cursor: not-allowed; }
.be-pm-digits { position: absolute; inset: 0; display: flex; align-items: center; justify-content: flex-start; min-width: 0; overflow: hidden; pointer-events: none; font-weight: 600; line-height: 1; letter-spacing: normal; color: var(--beui-foreground); font-variant-numeric: tabular-nums; transition: font-size .2s; }
.be-pm-digits.is-empty { color: color-mix(in srgb, var(--beui-muted-foreground) 55%, transparent); }
.be-pm-digit { display: inline-block; min-width: .55em; text-align: center; will-change: transform, opacity, filter; }
.is-s0 { font-size: 3rem; } .is-s1 { font-size: 44px; } .is-s2 { font-size: 2.25rem; } .is-s3 { font-size: 1.875rem; }
@media (min-width: 640px) { .is-s0 { font-size: 3.75rem; } .is-s1 { font-size: 56px; } .is-s2 { font-size: 3rem; } .is-s3 { font-size: 2.25rem; } }

.be-pm-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem; margin-top: 2rem; }
.be-pm-chip { height: 2.25rem; padding: 0 .875rem; border: 0; border-radius: .75rem; background: var(--beui-background); color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; font-weight: 600; cursor: pointer; transition: background-color .15s, transform .15s; }
.be-pm-chip:active { transform: scale(.95); }
.be-pm-chip:disabled { pointer-events: none; opacity: .5; }

.be-pm-footer { padding: 1rem; border-top: 1px solid color-mix(in srgb, var(--beui-border) 80%, transparent); }
.be-pm-quote { display: flex; align-items: flex-end; justify-content: space-between; gap: .75rem; margin-bottom: 1rem; }
.be-pm-quote-copy { min-width: 0; flex: 0 1 auto; }
.be-pm-quote-title { display: flex; align-items: center; gap: .5rem; font-size: 1.25rem; line-height: 1.75rem; font-weight: 600; color: var(--beui-foreground); }
.be-pm-banknote { color: #10b981; }
.be-pm-avg { margin: 0; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-muted-foreground); }
.be-pm-payout { display: flex; justify-content: flex-end; flex: none; min-width: 0; margin-left: auto; white-space: nowrap; text-align: right; font-weight: 600; line-height: 1; letter-spacing: -.025em; color: #10b981; font-variant-numeric: tabular-nums; transition: font-size .2s; }
.be-pm-payout.is-p0 { font-size: 2.25rem; } .be-pm-payout.is-p1 { font-size: 1.875rem; } .be-pm-payout.is-p2 { font-size: 1.5rem; } .be-pm-payout.is-p3 { font-size: 1.25rem; }
@media (min-width: 640px) { .be-pm-payout.is-p3 { font-size: 1.5rem; } }
.be-pm-action { width: 100%; height: 3rem; border-radius: 1rem !important; font-size: 1rem; font-weight: 600; }
.be-pm-connect { padding: 0 1rem 1.25rem; }
.be-pm-action.is-connect { height: 3.5rem; }
</style>
