<script setup lang="ts">
import {computed,useId} from 'vue'
import {useOpenState} from '../primitives/state'
const props=withDefaults(defineProps<{items:{id:string,title:string,description?:string,trailing?:string}[],expanded?:boolean,defaultExpanded?:boolean,maxVisible?:number,collapsedLabel?:string,expandedLabel?:string,emptyLabel?:string,onViewAll?:()=>void}>(),{expanded:undefined,defaultExpanded:false,maxVisible:3})
const emit=defineEmits<{'update:expanded':[value:boolean],expandedChange:[value:boolean]}>()
const {open,setOpen}=useOpenState(()=>props.expanded,props.defaultExpanded,next=>{emit('update:expanded',next);emit('expandedChange',next)})
const visible=computed(()=>open.value?props.items:props.items.slice(0,Math.max(1,props.maxVisible)))
const id=useId()
</script>
<template><div class="be-block be-block-stack"><ol :id="id" class="be-block-list be-notices" :class="{expanded:open}"><li v-for="(item,index) in visible" :key="item.id" class="be-block-panel" :aria-hidden="!open&&index>0||undefined" :style="{'--index':index,zIndex:visible.length-index}"><slot name="item" :item="item"><strong>{{ item.title }}</strong><span class="be-block-muted">{{ item.description }}</span><small v-if="item.trailing">{{ item.trailing }}</small></slot></li></ol><span v-if="!items.length">{{ emptyLabel??'No notifications' }}</span><div v-else class="be-block-row"><button type="button" class="be-block-button" :aria-controls="id" :aria-expanded="open" @click="setOpen(!open)">{{ open?(expandedLabel??'Collapse'):(collapsedLabel??`${items.length} notifications`) }}</button><button v-if="onViewAll" type="button" class="be-block-button" @click="onViewAll">View all</button></div></div></template>
<style scoped>.be-notices{display:grid;gap:.5rem;isolation:isolate}.be-notices:not(.expanded){padding-bottom:1rem}.be-notices li{display:grid;transition:transform .22s}.be-notices:not(.expanded) li{grid-area:1/1;transform:translateY(calc(var(--index)*8px)) scale(calc(1 - var(--index)*.04));transform-origin:bottom}@media(prefers-reduced-motion:reduce){.be-notices li{transition:none}}</style>
