<script setup lang="ts">
import { computed, nextTick, shallowRef, useId, watch } from 'vue'
import { useValue } from '../agents/shared'
export type FoldingTab={id:string,label:string,icon?:string,content?:string,disabled?:boolean}
const props=withDefaults(defineProps<{items:FoldingTab[],modelValue?:string|null,value?:string|null,defaultValue?:string|null,morph?:boolean,ariaLabel?:string,onClose?:(id:string)=>void}>(),{defaultValue:null})
const emit=defineEmits<{'update:modelValue':[value:string|null],valueChange:[value:string|null],orderChange:[ids:string[]]}>()
const {value:current,set}=useValue<string|null>(()=>props.modelValue!==undefined?props.modelValue:props.value,props.defaultValue,next=>{emit('update:modelValue',next);emit('valueChange',next)})
const id=useId()
const order=shallowRef(props.items.map(item=>item.id))
const sorted=computed(()=>order.value.map(key=>props.items.find(item=>item.id===key)).filter((item):item is FoldingTab=>!!item))
const chosen=computed(()=>props.items.find(item=>item.id===current.value))
const dragging=shallowRef<string|null>(null)
watch(()=>props.items.map(item=>item.id),next=>{order.value=[...order.value.filter(key=>next.includes(key)),...next.filter(key=>!order.value.includes(key))]})
function reorder(from:string|null,to:string){if(!props.morph||!from||from===to)return;const next=order.value.filter(item=>item!==from);next.splice(order.value.indexOf(to),0,from);order.value=next;emit('orderChange',next)}
async function keydown(event:KeyboardEvent,item:FoldingTab){
  const enabled=sorted.value.filter(tab=>!tab.disabled)
  const index=enabled.findIndex(tab=>tab.id===item.id)
  const delta=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0
  if(!delta&&!['Home','End','Escape','Delete'].includes(event.key))return
  event.preventDefault()
  if(event.key==='Escape'){set(null);return}
  if(event.key==='Delete'){props.onClose?.(item.id);return}
  const next=enabled[event.key==='Home'?0:event.key==='End'?enabled.length-1:(index+delta+enabled.length)%enabled.length]
  if(!next)return
  if(event.altKey&&delta){reorder(item.id,next.id);return}
  set(next.id);await nextTick();document.getElementById(`${id}-${next.id}`)?.focus()
}
</script>
<template><div class="be-block be-fold-tabs" :class="{morph}"><div v-if="chosen" role="tabpanel" :id="`${id}-panel`" :aria-labelledby="`${id}-${chosen.id}`" tabindex="0" class="be-fold-panel"><slot name="panel" :item="chosen">{{ chosen.content }}</slot></div><div role="tablist" :aria-label="ariaLabel??'Tabs'" class="be-fold-rail"><div v-for="item in sorted" :key="item.id" role="presentation" class="be-block-row"><button :id="`${id}-${item.id}`" type="button" class="be-block-button" role="tab" :aria-selected="current===item.id" :aria-label="item.label" :aria-controls="current===item.id?`${id}-panel`:undefined" :disabled="item.disabled" :tabindex="(current??sorted.find(entry=>!entry.disabled)?.id)===item.id?0:-1" :draggable="morph" @dragstart="dragging=item.id" @dragover.prevent @drop.prevent="reorder(dragging,item.id);dragging=null" @click="set(current===item.id?null:item.id)" @keydown="keydown($event,item)"><slot name="icon" :item="item">{{ item.icon??item.label.slice(0,1) }}</slot><span v-if="morph||current===item.id">{{ item.label }}</span></button><button v-if="morph&&onClose" type="button" class="be-block-button" :aria-label="`Close ${item.label}`" @click="onClose(item.id)">×</button></div></div></div></template>
<style scoped>.be-fold-tabs{display:grid;gap:.5rem;width:fit-content;max-width:100%}.be-fold-tabs.morph{display:flex;flex-direction:column-reverse}.be-fold-rail{display:flex;gap:.2rem;overflow:auto;padding:.25rem;border:1px solid var(--beui-border);border-radius:1rem}.be-fold-rail button{border:0;white-space:nowrap}.be-fold-panel{min-width:10rem;padding:1rem;border:1px solid var(--beui-border);border-radius:1rem;animation:be-fold-panel .18s ease-out}@keyframes be-fold-panel{from{opacity:0;transform:translateY(4px)}}@media(prefers-reduced-motion:reduce){.be-fold-panel{animation:none}}</style>
