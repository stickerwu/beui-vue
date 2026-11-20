<script setup lang="ts">
import { computed, ref } from 'vue'
import { useValue } from '../agents/shared'
export interface MarketOrder {
  mode: 'buy' | 'sell'
  outcomeId: string
  amount: string
}
const props = withDefaults(defineProps<{
  outcomes?: { id: string, label: string, price: number }[]
  modelValue?: MarketOrder
  value?: MarketOrder
  defaultValue?: Partial<MarketOrder>
  authenticated?: boolean
  orderTypeLabel?: string
  balance?: number
  positions?: Record<string,number>
  quickAmounts?: number[]
  minTrade?: number
  labels?: Record<string,string>
}>(), {
  outcomes: () => [{ id:'up', label:'Up', price:.09 },{ id:'down', label:'Down', price:.91 }],
  authenticated:true, balance:500, positions:() => ({ up:24, down:16 }),
  quickAmounts:() => [10,50,100,500], minTrade:1,
})
const emit = defineEmits<{
  'update:modelValue': [value: MarketOrder]
  valueChange: [value: MarketOrder]
  trade: [order: MarketOrder, quote: { valid:boolean, amount:number, price:number, shares:number, payout:number, error?:string }]
  signIn: []
}>()
const { value: order, set } = useValue<MarketOrder>(() => props.modelValue ?? props.value, {
  mode:'buy', outcomeId:props.outcomes[0]?.id ?? '', amount:'', ...props.defaultValue,
}, value => { emit('update:modelValue',value); emit('valueChange',value) })
const filled = ref(false)
const maximum = computed(() => order.value.mode === 'buy' ? props.balance : props.positions[order.value.outcomeId] ?? 0)
const quote = computed(() => {
  const outcome = props.outcomes.find(item => item.id === order.value.outcomeId)
  const price = Math.max(.01,Math.min(.99,outcome?.price ?? 0))
  const amount = Number(order.value.amount) || 0
  const buying = order.value.mode === 'buy'
  const shares = buying ? amount / price : amount
  const payout = buying ? shares : shares * price
  let error: string | undefined
  if (!outcome || !Number.isFinite(amount) || amount <= 0) error = props.labels?.enterAmount ?? 'Enter an amount'
  else if (amount < props.minTrade) error = (props.labels?.minimum ?? 'Minimum {amount}').replace('{amount}',String(props.minTrade))
  else if (amount > maximum.value) error = buying ? props.labels?.insufficientBalance ?? 'Insufficient balance' : props.labels?.notEnoughShares ?? 'Not enough shares'
  return { valid:!error, amount, price, shares, payout, error }
})
function update(value: Partial<MarketOrder>) {
  filled.value = false
  set({ ...order.value, ...value })
}
function submit() {
  if (!props.authenticated) return emit('signIn')
  if (!quote.value.valid) return
  emit('trade', { ...order.value }, { ...quote.value })
  filled.value = true
}
</script>

<template>
  <form class="be-block be-block-panel be-block-stack" @submit.prevent="submit">
    <header class="be-block-row">
      <button v-for="mode in (['buy','sell'] as const)" :key="mode" type="button" class="be-block-button" :aria-pressed="order.mode === mode" @click="update({mode, amount:''})">{{ labels?.[mode] ?? (mode === 'buy' ? 'Buy' : 'Sell') }}</button>
      <span class="be-block-end be-block-muted">{{ orderTypeLabel ?? labels?.orderType ?? 'Market' }}</span>
    </header>
    <div class="be-block-row">
      <button v-for="outcome in outcomes" :key="outcome.id" type="button" class="be-block-button" :aria-pressed="order.outcomeId === outcome.id" @click="update({outcomeId:outcome.id})">{{ outcome.label }} · {{ Math.round(outcome.price * 100) }}¢</button>
    </div>
    <label>{{ order.mode === 'buy' ? labels?.amount ?? 'Amount' : labels?.shares ?? 'Shares' }}
      <input class="be-block-field" type="number" min="0" step="any" :value="order.amount" @input="update({amount:($event.target as HTMLInputElement).value})">
    </label>
    <div class="be-block-row">
      <button v-for="amount in quickAmounts" :key="amount" type="button" class="be-block-button" @click="update({amount:String((Number(order.amount) || 0) + amount)})">+{{ amount }}</button>
      <button type="button" class="be-block-button" @click="update({amount:String(maximum)})">{{ labels?.max ?? 'Max' }}</button>
    </div>
    <div class="be-block-row"><span>{{ order.mode === 'buy' ? labels?.toWin ?? 'To win' : labels?.toReceive ?? 'To receive' }}</span><strong class="be-block-end">${{ quote.payout.toFixed(2) }}</strong></div>
    <button class="be-block-button be-block-primary" :disabled="authenticated && !quote.valid">{{ authenticated ? quote.error ?? labels?.trade ?? 'Trade' : labels?.connect ?? 'Connect' }}</button>
    <output v-if="filled">{{ labels?.tradeFilled ?? 'Trade filled' }}</output>
  </form>
</template>
