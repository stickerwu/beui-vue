<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useValue } from '../agents/shared'
interface Account { id:string, name:string, address:string }
const props = withDefaults(defineProps<{
  accounts:Account[]
  accountId?:string
  defaultAccountId?:string
  balance:number
  balancePrefix?:string
  defaultChange?:number
  defaultBalanceHidden?:boolean
  searchPlaceholder?:string
  searchRecent?:string[]
  hasNotifications?:boolean
}>(), {balancePrefix:'$',defaultChange:0,searchRecent:() => []})
const emit = defineEmits<{
  'update:accountId':[id:string], accountChange:[id:string], send:[], deposit:[], swap:[], buy:[],
  searchChange:[query:string], searchSubmit:[query:string], notifications:[]
}>()
const {value:selected,set} = useValue(() => props.accountId,props.defaultAccountId ?? props.accounts[0]?.id ?? '',id => {
  emit('update:accountId',id)
  emit('accountChange',id)
})
const account = computed(() => props.accounts.find(item => item.id === selected.value))
const hidden = ref(props.defaultBalanceHidden)
const change = ref(props.defaultChange)
const searching = ref(false)
const query = ref('')
const input = ref<HTMLInputElement>()
const trigger = ref<HTMLButtonElement>()
watch(() => props.balance,(current,previous) => { change.value = current - previous })
watch(query,value => emit('searchChange',value))
async function toggleSearch(open:boolean) {
  searching.value = open
  await nextTick()
  if (open) input.value?.focus()
  else trigger.value?.focus()
}
function submit(value:string) {
  if (!value.trim()) return
  emit('searchSubmit',value.trim())
  toggleSearch(false)
}
const actions = [
  {label:'Send',icon:'↑',run:() => emit('send')}, {label:'Deposit',icon:'↓',run:() => emit('deposit')},
  {label:'Swap',icon:'⇄',run:() => emit('swap')}, {label:'Buy',icon:'+',run:() => emit('buy')},
]
</script>

<template>
  <section class="be-block be-block-panel be-block-stack wallet" aria-label="Wallet">
    <header class="be-block-row"><slot name="avatar" :account="account" /><select class="be-block-button" aria-label="Wallet account" :value="selected" @change="set(($event.target as HTMLSelectElement).value)"><option v-for="item in accounts" :key="item.id" :value="item.id">{{ item.name }}</option></select>
      <button ref="trigger" type="button" class="be-block-button be-block-end" aria-label="Search wallet" :aria-expanded="searching" @click="toggleSearch(!searching)">⌕</button>
      <button type="button" class="be-block-button" :aria-label="hasNotifications ? 'Unread notifications' : 'Notifications'" @click="emit('notifications')">{{ hasNotifications ? '●' : '○' }}</button>
    </header>
    <form v-if="searching" class="be-block-stack" @keydown.esc.prevent="toggleSearch(false)" @submit.prevent="submit(query)">
      <input ref="input" v-model="query" class="be-block-field" type="search" :placeholder="searchPlaceholder ?? 'Search wallet'" aria-label="Search wallet">
      <div class="be-block-row"><button v-for="term in searchRecent" :key="term" type="button" class="be-block-button" @click="submit(term)">{{ term }}</button></div>
    </form>
    <template v-else>
      <small class="be-block-muted">{{ account?.address }}</small>
      <div class="be-block-row"><b class="balance">{{ hidden ? '••••••' : balancePrefix+balance.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) }}</b>
        <button type="button" class="be-block-button" :aria-label="hidden ? 'Show balance' : 'Hide balance'" @click="hidden=!hidden">◉</button>
      </div>
      <span v-if="!hidden && change" class="be-block-muted">{{ change > 0 ? '+' : '−' }}{{ balancePrefix }}{{ Math.abs(change).toFixed(2) }}</span>
      <div class="actions"><button v-for="action in actions" :key="action.label" type="button" class="be-block-button" @click="action.run"><b aria-hidden="true">{{ action.icon }}</b>{{ action.label }}</button></div>
    </template>
  </section>
</template>

<style scoped>
.balance { font-size:clamp(1.7rem,5vw,2.5rem); font-variant-numeric:tabular-nums; letter-spacing:-.05em; }
.actions { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.4rem; }
.actions button { display:grid; padding:.5rem .1rem; }
.actions b { font-size:1.1rem; }
</style>
