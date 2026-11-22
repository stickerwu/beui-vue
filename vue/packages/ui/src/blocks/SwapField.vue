<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, useId } from 'vue'
import { easeOut } from '../core/motion'
import SwapIcon from './SwapIcon.vue'
import SwapTokenDot from './SwapTokenDot.vue'
import { formatAmount, sanitizeAmount, type SwapChain, type SwapToken, type SwapTokenSide } from './swap-assets'
import type { swapMessages } from './messages'

const props = defineProps<{
  side: SwapTokenSide
  token: SwapToken
  chain: SwapChain
  amount: string
  editable: boolean
  quoting: boolean
  text: typeof swapMessages
}>()
const emit = defineEmits<{ amount: [value: string]; openPicker: [] }>()

const id = useId()
const reduce = useReducedMotion()
const usdValue = computed(() => (Number(props.amount) || 0) * (props.token.usd ?? 0))
</script>

<template>
  <div class="be-swap-field">
    <label :for="id" class="be-swap-field-label">{{ side === 'from' ? text.youPay : text.youGet }}</label>

    <div class="be-swap-field-row">
      <div class="be-swap-field-value">
        <input v-if="editable" :id="id" class="be-swap-field-input" inputmode="decimal" :value="amount" placeholder="0"
          @input="emit('amount', sanitizeAmount(($event.target as HTMLInputElement).value))">
        <div v-else class="be-swap-field-output">
          <motion.span :animate="{ opacity: quoting ? 0.55 : 1, filter: quoting ? 'blur(2px)' : 'blur(0px)' }" :transition="{ duration: 0.18, ease: easeOut }"
            class="be-swap-field-amount">{{ amount || '0' }}</motion.span>
          <AnimatePresence>
            <motion.span v-if="quoting" :initial="{ opacity: 0, scale: reduce ? 1 : 0.85 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: reduce ? 1 : 0.85 }"
              :transition="{ duration: 0.14, ease: easeOut }" class="be-swap-field-spinner">
              <SwapIcon name="loader" class="be-swap-spin" />
            </motion.span>
          </AnimatePresence>
        </div>
        <p class="be-swap-field-usd">≈ ${{ formatAmount(usdValue, 2) }}</p>
      </div>

      <button type="button" class="be-swap-token-button" @click="emit('openPicker')">
        <SwapTokenDot :token="token" :chain="chain" />
        <span>{{ token.symbol }}</span>
        <SwapIcon name="chevron-down" class="be-swap-field-chevron" />
      </button>
    </div>

    <div class="be-swap-field-foot">
      <span class="be-swap-field-balance">
        <SwapIcon name="wallet" class="be-swap-field-wallet" />
        <span class="be-swap-tabular">{{ token.balance ? formatAmount(token.balance) : '0.00' }}</span>
        <span>· {{ chain.name }}</span>
      </span>
      <button v-if="side === 'from' && token.balance" type="button" class="be-swap-max" @click="emit('amount', String(token.balance))">{{ text.max }}</button>
    </div>
  </div>
</template>

<style scoped>
.be-swap-field { position: relative; box-sizing: border-box; padding: .875rem; border: 1px solid color-mix(in srgb, var(--beui-border) 50%, transparent); border-radius: 1rem; background: color-mix(in srgb, var(--beui-background) 40%, transparent); }
.be-swap-field-label { display: block; margin-bottom: .5rem; font-size: 11px; line-height: 1.5; font-weight: 500; letter-spacing: .05em; text-transform: uppercase; color: var(--beui-muted-foreground); }
.be-swap-field-row { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.be-swap-field-value { min-width: 0; flex: 1 1 0%; }
.be-swap-field-input { display: block; width: 100%; box-sizing: border-box; margin: 0; padding: 0; border: 0; outline: none; background: transparent; color: var(--beui-foreground); font: inherit; font-size: 1.5rem; line-height: 2rem; font-weight: 600; letter-spacing: -.025em; font-variant-numeric: tabular-nums; }
.be-swap-field-input::placeholder { color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); opacity: 1; }
.be-swap-field-output { display: flex; height: 2.25rem; align-items: center; gap: .5rem; font-size: 1.5rem; line-height: 2rem; font-weight: 600; letter-spacing: -.025em; font-variant-numeric: tabular-nums; }
.be-swap-field-amount { color: var(--beui-foreground); }
.be-swap-field-spinner { display: inline-flex; }
.be-swap-field-spinner .be-swap-spin, .be-swap-spin { width: 1rem; height: 1rem; color: var(--beui-muted-foreground); animation: be-swap-spin 1s linear infinite; }
.be-swap-field-usd { margin: .25rem 0 0; font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.be-swap-token-button { display: inline-flex; box-sizing: border-box; height: 2.5rem; flex: none; align-items: center; gap: .5rem; margin: 0; padding: 0 .625rem 0 .25rem; border: 1px solid var(--beui-border); border-radius: 9999px; background: var(--beui-card); color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 600; cursor: pointer; transition: transform .15s; }
.be-swap-token-button:active { transform: scale(.97); }
.be-swap-field-chevron { width: .875rem; height: .875rem; color: var(--beui-muted-foreground); }
.be-swap-field-foot { display: flex; align-items: center; justify-content: space-between; margin-top: .5rem; font-size: 11px; line-height: 1.5; color: var(--beui-muted-foreground); }
.be-swap-field-balance { display: inline-flex; align-items: center; gap: .25rem; }
.be-swap-field-wallet { width: .75rem; height: .75rem; }
.be-swap-tabular { font-variant-numeric: tabular-nums; }
.be-swap-max { margin: 0; padding: .125rem .375rem; border: 0; border-radius: .25rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 10px; line-height: 1.5; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; cursor: pointer; transition: color .15s, background-color .15s; }
.be-swap-max:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-swap-token-button:focus-visible, .be-swap-max:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-swap-field-input:focus-visible { outline: none; }
@keyframes be-swap-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .be-swap-spin, .be-swap-field-spinner .be-swap-spin { animation-duration: 2s; } }
</style>
