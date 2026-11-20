<script setup lang="ts">
import { computed } from 'vue'
import { useOpenState } from '../primitives/state'
const props=withDefaults(defineProps<{title:string,cardNumber:string,expiry:string,cvv:string,open?:boolean,defaultOpen?:boolean,detailsVisible?:boolean,defaultDetailsVisible?:boolean,disabled?:boolean,ariaLabel?:string,actionLabel?:string,onAction?:()=>void}>(),{open:undefined,defaultOpen:false,detailsVisible:undefined,defaultDetailsVisible:false})
const emit=defineEmits<{'update:open':[value:boolean],openChange:[value:boolean],'update:detailsVisible':[value:boolean],detailsVisibleChange:[value:boolean],click:[]}>()
const {open,setOpen}=useOpenState(()=>props.open,props.defaultOpen,next=>{emit('update:open',next);emit('openChange',next)})
const details=useOpenState(()=>props.detailsVisible,props.defaultDetailsVisible,next=>{emit('update:detailsVisible',next);emit('detailsVisibleChange',next)})
const lastFour=computed(()=>props.cardNumber.replace(/\s/g,'').slice(-4))
</script>
<template>
  <div class="be-block be-card-folder" :data-open="open"><button type="button" class="wallet-sleeve" :disabled="disabled" :aria-label="ariaLabel??`${open?'Close':'Open'} ${title}`" :aria-expanded="open" @click="setOpen(!open);emit('click')"><span class="wallet-face"><slot name="card"><strong>{{title}}</strong><small>•••• {{lastFour}}</small></slot></span><span class="wallet-front" /></button>
    <div v-if="open" class="be-block-panel be-block-stack"><strong>{{title}}</strong><div>{{details.open.value?cardNumber:`•••• •••• •••• ${lastFour}`}}</div><div class="be-block-muted">{{expiry}} · {{details.open.value?cvv:'•••'}}</div><div class="be-block-row"><button type="button" class="be-block-button" :aria-pressed="details.open.value" @click="details.setOpen(!details.open.value)">{{details.open.value?'Hide details':'Show details'}}</button><button v-if="onAction" class="be-block-button" type="button" @click="onAction">{{actionLabel??'Card actions'}}</button></div></div>
  </div>
</template>
<style scoped>.be-card-folder{display:grid;gap:1rem;width:min(100%,20rem)}.wallet-sleeve{position:relative;margin:2.5rem auto 0;width:14rem;height:8rem;border:0;background:none;cursor:pointer}.wallet-face,.wallet-front{position:absolute;inset:0;border-radius:.85rem;box-shadow:0 3px 12px #0003}.wallet-face{box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;align-items:start;padding:1rem;background:linear-gradient(125deg,#343942,#101317);color:white;transition:transform .3s}.wallet-front{inset:35% -.2rem -.2rem;background:linear-gradient(160deg,#966548,#654531);transition:transform .3s;transform-origin:bottom}.be-card-folder[data-open=true] .wallet-face{transform:translateY(-1.7rem) rotate(-3deg)}.be-card-folder[data-open=true] .wallet-front{transform:scaleY(.32)}@media(prefers-reduced-motion:reduce){.wallet-face,.wallet-front{transition:none}}</style>
