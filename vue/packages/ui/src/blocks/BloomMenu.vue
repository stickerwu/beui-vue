<script setup lang="ts">
import { nextTick,shallowRef,useId } from 'vue'
type Item={label:string,icon?:string,disabled?:boolean}
const props=withDefaults(defineProps<{items?:Item[]}>(),{items:()=>['Doc','Board','Table','Folder','Reminder','Link'].map(label=>({label}))})
const emit=defineEmits<{select:[label:string]}>()
const open=shallowRef(false)
const id=useId()
const trigger=shallowRef<HTMLButtonElement|null>(null)
async function toggle(next:boolean){open.value=next;await nextTick();if(next)document.getElementById(`${id}-${props.items.findIndex(item=>!item.disabled)}`)?.focus();else trigger.value?.focus()}
function focusAt(start:number,direction:number){for(let offset=1;offset<=props.items.length;offset++){const target=(start+offset*direction+props.items.length*2)%props.items.length;if(!props.items[target].disabled){document.getElementById(`${id}-${target}`)?.focus();break}}}
function place(index:number){const angle=Math.PI*(index/Math.max(1,props.items.length-1));return {left:`${50-Math.cos(angle)*39}%`,bottom:`${2.2+Math.sin(angle)*6.2}rem`}}
</script>
<template><div class="be-block be-bloom" @keydown.esc="toggle(false)"><div v-if="open" :id="id" role="menu" aria-label="Create"><button v-for="(item,index) in items" :key="item.label" :id="`${id}-${index}`" type="button" class="be-block-button" role="menuitem" :disabled="item.disabled" :style="place(index)" @keydown.right.prevent="focusAt(index,1)" @keydown.left.prevent="focusAt(index,-1)" @keydown.down.prevent="focusAt(index,1)" @keydown.up.prevent="focusAt(index,-1)" @click="emit('select',item.label);toggle(false)">{{ item.icon }} {{ item.label }}</button></div><button ref="trigger" type="button" class="be-block-button be-block-primary" aria-haspopup="menu" :aria-expanded="open" :aria-controls="open?id:undefined" @click="toggle(!open)">{{ open?'Close menu':'Create' }}</button></div></template>
<style scoped>.be-bloom{position:relative;display:flex;align-items:flex-end;justify-content:center;min-height:12rem;max-width:25rem}.be-bloom [role=menuitem]{position:absolute;transform:translateX(-50%);border-radius:999px;font-size:.75rem;animation:be-bloom-in .22s ease-out}@keyframes be-bloom-in{from{opacity:0;translate:0 8px;scale:.9}}@media(prefers-reduced-motion:reduce){.be-bloom [role=menuitem]{animation:none}}</style>
