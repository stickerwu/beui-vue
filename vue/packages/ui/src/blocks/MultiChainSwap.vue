<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { easeOut, pressSpring } from '../core/motion'
import { formatMessage, swapMessages } from './messages'
import SwapField from './SwapField.vue'
import SwapIcon from './SwapIcon.vue'
import SwapTokenPicker from './SwapTokenPicker.vue'
import { formatAmount, isValidAddress, swapChains, swapTokens, truncateAddress, type SwapChain, type SwapToken, type SwapTokenSide } from './swap-assets'

const props = withDefaults(defineProps<{
  chains?: SwapChain[]
  tokens?: SwapToken[]
  defaultFromId?: string
  defaultToId?: string
  /** Override any built-in string. */
  labels?: Partial<typeof swapMessages>
  className?: string
}>(), { chains: () => swapChains, tokens: () => swapTokens, defaultFromId: 'eth-eth', defaultToId: 'sol-sol' })

const emit = defineEmits<{ swap: [quote: { fromId: string; toId: string; amount: number; receive: number; destination: string }] }>()

const reduce = useReducedMotion()
const t = computed(() => ({ ...swapMessages, ...props.labels }))

const fromId = shallowRef(props.defaultFromId)
const toId = shallowRef(props.defaultToId)
const amount = shallowRef('1')
const flipRotation = shallowRef(0)
const quoting = shallowRef(false)
const picking = shallowRef<SwapTokenSide | null>(null)
const showDestination = shallowRef(false)
const destination = shallowRef('')

function findToken(id: string) {
  const token = props.tokens.find(item => item.id === id)
  if (!token) throw new Error(`Unknown token id: ${id}`)
  return token
}
function findChain(id: string) {
  const chain = props.chains.find(item => item.id === id)
  if (!chain) throw new Error(`Unknown chain id: ${id}`)
  return chain
}

const from = computed(() => findToken(fromId.value))
const to = computed(() => findToken(toId.value))
const fromChain = computed(() => findChain(from.value.chainId))
const toChain = computed(() => findChain(to.value.chainId))

const numericAmount = computed(() => Number(amount.value) || 0)
const rate = computed(() => (!from.value.usd || !to.value.usd ? 1 : from.value.usd / to.value.usd))
const toAmount = computed(() => numericAmount.value * rate.value)

// A new amount or pair requotes: the receive side blurs while the quote settles.
watch([numericAmount, fromId, toId], (_values, _previous, onCleanup) => {
  if (numericAmount.value === 0) {
    quoting.value = false
    return
  }
  quoting.value = true
  const timer = setTimeout(() => { quoting.value = false }, 450)
  onCleanup(() => clearTimeout(timer))
}, { immediate: true })

function flip() {
  flipRotation.value += 180
  const previous = fromId.value
  fromId.value = toId.value
  toId.value = previous
}

function pickToken(id: string) {
  if (!picking.value) return
  if (picking.value === 'from') {
    if (id === toId.value) toId.value = fromId.value
    fromId.value = id
  } else {
    if (id === fromId.value) fromId.value = toId.value
    toId.value = id
  }
  picking.value = null
}

// Action button
const noAmount = computed(() => numericAmount.value <= 0)
const overBalance = computed(() => from.value.balance !== undefined && numericAmount.value > from.value.balance)
const validDestination = computed(() => Boolean(destination.value) && isValidAddress(destination.value))
const actionLabel = computed(() => (noAmount.value
  ? t.value.enterAmount
  : overBalance.value
    ? formatMessage(t.value.insufficient, { symbol: from.value.symbol })
    : validDestination.value
      ? formatMessage(t.value.swapAndSend, { address: truncateAddress(destination.value) })
      : formatMessage(t.value.swapTokens, { from: from.value.symbol, to: to.value.symbol })))
const actionDisabled = computed(() => noAmount.value || overBalance.value)

function submit() {
  emit('swap', { fromId: fromId.value, toId: toId.value, amount: numericAmount.value, receive: toAmount.value, destination: destination.value })
}

// Destination row
const addressInput = useTemplateRef<HTMLInputElement>('addressInput')
const hasAddress = computed(() => destination.value.length > 0)
function toggleDestination() {
  if (showDestination.value) destination.value = ''
  showDestination.value = !showDestination.value
}
watch(showDestination, async shown => {
  if (!shown) return
  await nextTick()
  requestAnimationFrame(() => addressInput.value?.focus({ preventScroll: true }))
})

const dotTransition = { duration: 0.14, ease: easeOut } as const
</script>

<template>
  <div class="be-swap" :class="className">
    <div class="be-swap-header">
      <span class="be-swap-title">{{ t.title }}</span>
      <button type="button" class="be-swap-settings" :aria-label="t.settings"><SwapIcon name="settings" /></button>
    </div>

    <div class="be-swap-body">
      <SwapField side="from" :token="from" :chain="fromChain" :amount="amount" editable :quoting="false" :text="t" @amount="amount = $event" @open-picker="picking = 'from'" />

      <div class="be-swap-flip-row">
        <motion.button type="button" class="be-swap-flip" :aria-label="t.reverse" :while-press="reduce ? undefined : { scale: 0.9 }"
          :animate="reduce ? undefined : { rotate: flipRotation }" :transition="{ type: 'spring', stiffness: 380, damping: 26, mass: 0.6 }" @click="flip">
          <SwapIcon name="arrow-down-up" />
        </motion.button>
      </div>

      <SwapField side="to" :token="to" :chain="toChain" :amount="toAmount > 0 ? formatAmount(toAmount) : ''" :editable="false" :quoting="quoting" :text="t" @open-picker="picking = 'to'" />

      <div class="be-swap-quote">
        <span class="be-swap-quote-label">{{ t.rate }}</span>
        <span class="be-swap-quote-value">
          <SwapIcon v-if="quoting" name="loader" class="be-swap-quote-spinner" />
          <template v-else>1 {{ from.symbol }} ≈ {{ formatAmount(rate) }} {{ to.symbol }}</template>
        </span>
        <span class="be-swap-quote-label">{{ t.networkFee }}</span>
        <span class="be-swap-quote-value">${{ (0.42).toFixed(2) }}</span>
        <span class="be-swap-quote-label">{{ t.slippage }}</span>
        <span class="be-swap-quote-value">{{ (0.5).toFixed(2) }}%</span>
        <span class="be-swap-quote-label">{{ t.eta }}</span>
        <span class="be-swap-quote-value is-plain">≈ 24s</span>
      </div>

      <div class="be-swap-dest">
        <button type="button" class="be-swap-dest-toggle" :aria-expanded="showDestination" @click="toggleDestination">
          <span class="be-swap-dest-title">
            <SwapIcon name="send" />
            <span>{{ showDestination && hasAddress && validDestination ? formatMessage(t.sendTo, { address: truncateAddress(destination) }) : t.sendToOther }}</span>
          </span>
          <motion.span :animate="reduce ? {} : { rotate: showDestination ? 180 : 0 }" :transition="{ duration: 0.2, ease: easeOut }" class="be-swap-dest-chevron">
            <SwapIcon name="chevron-down" />
          </motion.span>
        </button>

        <AnimatePresence>
          <motion.div v-if="showDestination" key="dest-input" :initial="reduce ? { opacity: 0 } : { height: 0, opacity: 0 }"
            :animate="reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }" :exit="reduce ? { opacity: 0 } : { height: 0, opacity: 0 }"
            :transition="{ duration: 0.22, ease: easeOut }" class="be-swap-dest-panel">
            <div class="be-swap-dest-inner">
              <div class="be-swap-dest-box" :class="{ 'is-invalid': hasAddress && !validDestination }">
                <input ref="addressInput" class="be-swap-dest-input" :value="destination" :placeholder="t.addressPlaceholder" :aria-label="t.sendToOther" spellcheck="false"
                  @input="destination = ($event.target as HTMLInputElement).value.trim()">
                <AnimatePresence mode="wait">
                  <motion.span v-if="hasAddress && validDestination" key="check" :initial="{ opacity: 0, scale: 0.7 }" :animate="{ opacity: 1, scale: 1 }"
                    :exit="{ opacity: 0, scale: 0.7 }" :transition="dotTransition" class="be-swap-dest-check">
                    <SwapIcon name="check" />
                  </motion.span>
                  <motion.button v-else-if="hasAddress" key="clear" type="button" :aria-label="t.clearAddress" :initial="{ opacity: 0, scale: 0.7 }"
                    :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.7 }" :transition="dotTransition" class="be-swap-dest-clear" @click="destination = ''">
                    <SwapIcon name="x" />
                  </motion.button>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.button type="button" class="be-swap-action" :while-press="actionDisabled || reduce ? undefined : { scale: 0.97 }" :transition="pressSpring"
        :disabled="actionDisabled" @click="submit">
        <AnimatePresence mode="wait" :initial="false">
          <motion.span :key="actionLabel" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.14, ease: easeOut }">{{ actionLabel }}</motion.span>
        </AnimatePresence>
      </motion.button>
    </div>

    <SwapTokenPicker :open="picking !== null" :side="picking" :chains="chains" :tokens="tokens" :selected-id="picking === 'from' ? fromId : toId" :reduce="Boolean(reduce)" :text="t"
      @pick="pickToken" @close="picking = null" />
  </div>
</template>

<style scoped>
.be-swap { position: relative; isolation: isolate; box-sizing: border-box; width: 100%; max-width: 420px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--beui-border) 20%, transparent); border-radius: 1.5rem; background: var(--beui-card); color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; text-align: left; }
.be-swap button { font-family: inherit; }
.be-swap-header { display: flex; height: 3rem; align-items: center; justify-content: space-between; padding: 0 .75rem; border-bottom: 1px solid color-mix(in srgb, var(--beui-border) 50%, transparent); }
.be-swap-title { padding: 0 .5rem; font-size: .875rem; line-height: 1.25rem; font-weight: 600; letter-spacing: -.025em; color: var(--beui-foreground); }
.be-swap-settings { display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; transition: transform .15s, background-color .15s, color .15s; }
.be-swap-settings :deep(.be-swap-icon) { width: 1rem; height: 1rem; }
.be-swap-settings:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-swap-settings:active { transform: scale(.97); }
.be-swap-body { display: flex; flex-direction: column; gap: .375rem; padding: 1rem; }
.be-swap-flip-row { position: relative; z-index: 1; display: flex; justify-content: center; margin-block: -1rem; }
.be-swap-flip { display: inline-flex; box-sizing: border-box; width: 2.25rem; height: 2.25rem; align-items: center; justify-content: center; margin: 0; padding: 0; border: 3px solid var(--beui-card); border-radius: 9999px; background: var(--beui-muted); color: var(--beui-foreground); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); cursor: pointer; }
.be-swap-flip :deep(.be-swap-icon) { width: .875rem; height: .875rem; }
.be-swap-quote { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .375rem 1rem; margin-top: .75rem; padding: .625rem .875rem; border: 1px solid color-mix(in srgb, var(--beui-border) 50%, transparent); border-radius: .75rem; background: color-mix(in srgb, var(--beui-background) 40%, transparent); font-size: 11px; line-height: 1.5; }
.be-swap-quote-label { color: var(--beui-muted-foreground); }
.be-swap-quote-value { text-align: right; font-variant-numeric: tabular-nums; color: var(--beui-foreground); }
.be-swap-quote-value.is-plain { font-variant-numeric: normal; }
.be-swap-quote-spinner { display: inline-block; width: .75rem; height: .75rem; margin-left: auto; vertical-align: baseline; color: var(--beui-muted-foreground); animation: be-swap-spin 1s linear infinite; }
.be-swap-dest { margin-top: .25rem; overflow: hidden; border: 1px solid color-mix(in srgb, var(--beui-border) 50%, transparent); border-radius: .75rem; background: color-mix(in srgb, var(--beui-background) 40%, transparent); }
.be-swap-dest-toggle { display: flex; box-sizing: border-box; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .625rem .875rem; border: 0; background: transparent; color: var(--beui-muted-foreground); font-size: 12px; line-height: 1.5; text-align: left; cursor: pointer; transition: color .15s; }
.be-swap-dest-toggle:hover { color: var(--beui-foreground); }
.be-swap-dest-title { display: flex; align-items: center; gap: .5rem; }
.be-swap-dest-title :deep(.be-swap-icon), .be-swap-dest-chevron :deep(.be-swap-icon) { width: .875rem; height: .875rem; }
.be-swap-dest-chevron { display: inline-flex; }
.be-swap-dest-panel { overflow: hidden; }
.be-swap-dest-inner { padding: .625rem .875rem .75rem; border-top: 1px solid color-mix(in srgb, var(--beui-border) 50%, transparent); }
.be-swap-dest-box { display: flex; align-items: center; gap: .5rem; padding: .5rem .625rem; border: 1px solid var(--beui-border); border-radius: .5rem; transition: border-color .15s; }
.be-swap-dest-box.is-invalid { border-color: color-mix(in srgb, var(--beui-destructive) 40%, transparent); }
.be-swap-dest-input { min-width: 0; flex: 1 1 0%; margin: 0; padding: 0; border: 0; outline: none; background: transparent; color: var(--beui-foreground); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; }
.be-swap-dest-input::placeholder { color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); opacity: 1; }
.be-swap-dest-check { display: inline-flex; flex: none; color: var(--beui-primary); }
.be-swap-dest-clear { display: inline-flex; flex: none; margin: 0; padding: 0; border: 0; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; transition: color .15s; }
.be-swap-dest-clear:hover { color: var(--beui-foreground); }
.be-swap-dest-check :deep(.be-swap-icon), .be-swap-dest-clear :deep(.be-swap-icon) { width: .875rem; height: .875rem; }
.be-swap-action { display: inline-flex; box-sizing: border-box; width: 100%; height: 3rem; align-items: center; justify-content: center; margin: .75rem 0 0; padding: 0; border: 0; border-radius: 1rem; background: var(--beui-primary); color: var(--beui-primary-foreground); font-size: .875rem; line-height: 1.25rem; font-weight: 600; cursor: pointer; transition: background-color .15s, color .15s; }
.be-swap-action:hover:not(:disabled) { background: color-mix(in srgb, var(--beui-primary) 90%, transparent); }
.be-swap-action:disabled { background: var(--beui-muted); color: var(--beui-muted-foreground); cursor: not-allowed; }
.be-swap button:focus-visible, .be-swap-dest-toggle:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-swap-dest-input:focus-visible { outline: none; }
@keyframes be-swap-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .be-swap-quote-spinner { animation-duration: 2s; } }
</style>
