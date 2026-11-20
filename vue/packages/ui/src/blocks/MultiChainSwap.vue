<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { swapChains, swapTokens, type SwapChain, type SwapToken } from './swap-assets'
const props = withDefaults(defineProps<{
  chains?: SwapChain[], tokens?: SwapToken[], defaultFromId?: string, defaultToId?: string,
  labels?: Record<string,string>
}>(), { chains:() => swapChains, tokens:() => swapTokens, defaultFromId:'eth-eth', defaultToId:'sol-sol' })
const emit = defineEmits<{ swap:[quote:{ fromId:string,toId:string,amount:number,receive:number,destination:string }] }>()
const fromId = ref(props.defaultFromId)
const toId = ref(props.defaultToId)
const amount = ref('1')
const destination = ref('')
const showDestination = ref(false)
const side = ref<'from'|'to'>('from')
const chain = ref('')
const query = ref('')
const dialog = ref<HTMLDialogElement>()
const quoting = ref(false)
const receipt = ref(false)
const from = computed(() => props.tokens.find(token => token.id === fromId.value) ?? props.tokens[0])
const to = computed(() => props.tokens.find(token => token.id === toId.value) ?? props.tokens[1] ?? props.tokens[0])
const rate = computed(() => from.value?.usd && to.value?.usd ? from.value.usd / to.value.usd : 1)
const receive = computed(() => (Number(amount.value) || 0) * rate.value)
const choices = computed(() => props.tokens.filter(token => (!chain.value || token.chainId === chain.value) && `${token.symbol} ${token.name} ${token.address ?? ''}`.toLowerCase().includes(query.value.trim().toLowerCase())))
const valid = computed(() => !!from.value && !!to.value && Number(amount.value) > 0 && Number(amount.value) <= (from.value.balance ?? Infinity) && from.value.id !== to.value.id)
watch([amount, fromId, toId],(_current,_previous,cleanup) => {
  quoting.value = true
  receipt.value = false
  const timeout = setTimeout(() => { quoting.value = false },280)
  cleanup(() => clearTimeout(timeout))
})
function openPicker(next:'from'|'to') {
  side.value = next
  query.value = ''
  chain.value = ''
  dialog.value?.showModal()
}
function flip() {
  const previous = from.value?.id
  if (!to.value || !previous) return
  amount.value = String(Number(receive.value.toFixed(6)))
  fromId.value = to.value.id
  toId.value = previous
}
function choose(id:string) {
  if (side.value === 'from' && id === to.value?.id || side.value === 'to' && id === from.value?.id) flip()
  else if (side.value === 'from') fromId.value = id
  else toId.value = id
  dialog.value?.close()
}
function submit() {
  if (!valid.value || quoting.value || !from.value || !to.value) return
  emit('swap',{fromId:from.value.id,toId:to.value.id,amount:Number(amount.value),receive:receive.value,destination:destination.value})
  receipt.value = true
}
</script>

<template>
  <section class="be-block be-block-panel be-block-stack" aria-label="Multi-chain swap">
    <strong>{{ labels?.title ?? 'Swap' }}</strong>
    <div v-if="from" class="asset be-block-stack"><span class="be-block-muted">{{ labels?.from ?? 'You pay' }}</span>
      <div class="be-block-row"><input v-model="amount" type="number" step="any" min="0" class="amount" aria-label="Payment amount"><button type="button" class="be-block-button" aria-label="Choose payment token" @click="openPicker('from')">{{ from.symbol }} ⌄</button></div>
      <small>{{ labels?.balance ?? 'Balance' }} · {{ from.balance ?? 0 }} <button type="button" @click="amount=String(from.balance ?? 0)">Max</button></small>
    </div>
    <button type="button" class="be-block-button flip" aria-label="Flip tokens" @click="flip">⇅</button>
    <div v-if="to" class="asset be-block-stack"><span class="be-block-muted">{{ labels?.to ?? 'You receive' }}</span>
      <div class="be-block-row"><output class="amount">{{ Number(receive.toFixed(6)) }}</output><button type="button" class="be-block-button" aria-label="Choose receiving token" @click="openPicker('to')">{{ to.symbol }} ⌄</button></div>
      <small>{{ labels?.balance ?? 'Balance' }} · {{ to.balance ?? 0 }}</small>
    </div>
    <small v-if="from && to" aria-live="polite">{{ quoting ? 'Updating quote…' : `1 ${from.symbol} ≈ ${Number(rate.toFixed(6))} ${to.symbol}` }}</small>
    <button type="button" class="be-block-button" :aria-expanded="showDestination" @click="showDestination=!showDestination">{{ labels?.destination ?? 'Destination address' }}</button>
    <input v-if="showDestination" v-model="destination" class="be-block-field" aria-label="Destination address">
    <button type="button" class="be-block-button be-block-primary" :disabled="!valid || quoting" @click="submit">{{ labels?.swap ?? 'Swap' }}</button>
    <output v-if="receipt">Swap preview confirmed</output>
    <dialog ref="dialog" class="be-block-dialog" aria-label="Choose token">
      <section class="be-block-stack">
        <header class="be-block-row"><strong>Choose token</strong><button type="button" class="be-block-button be-block-end" aria-label="Close token picker" @click="dialog?.close()">×</button></header>
        <input v-model="query" autofocus type="search" class="be-block-field" aria-label="Search tokens" placeholder="Search tokens">
        <select v-model="chain" class="be-block-field" aria-label="Network"><option value="">All networks</option><option v-for="network in chains" :key="network.id" :value="network.id">{{ network.name }}</option></select>
        <div class="token-list"><button v-for="token in choices" :key="token.id" type="button" class="be-block-button" @click="choose(token.id)"><strong>{{ token.symbol }}</strong>{{ token.name }}<small class="be-block-end">{{ token.chainId }}</small></button><p v-if="!choices.length">No tokens found</p></div>
      </section>
    </dialog>
  </section>
</template>

<style scoped>
.asset { padding:.75rem; background:var(--beui-muted); border-radius:.75rem; }
.amount { flex:1; min-width:0; width:5rem; background:transparent; color:inherit; border:0; font-size:1.7rem; }
.flip { justify-self:center; margin:-.6rem 0; z-index:1; }
.token-list { display:grid; gap:.35rem; max-height:45vh; overflow:auto; }
small button { text-decoration:underline; }
</style>
