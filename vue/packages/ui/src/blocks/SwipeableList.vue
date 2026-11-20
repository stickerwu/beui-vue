<script setup lang="ts">
import { shallowRef } from 'vue'
import { useValue } from '../agents/shared'
type Action={id:string,label:string,tone?:string,disabled?:boolean,onClick?:()=>void}
type Side='left'|'right'
type Row={id:string,title?:string,description?:string,meta?:string,content?:string,leftActions?:Action[],rightActions?:Action[],disabled?:boolean}
type Reveal={id:string,side:Side}|null
const props=withDefaults(defineProps<{items:Row[],modelValue?:Reveal,value?:Reveal,defaultValue?:Reveal,actionWidth?:number,revealThreshold?:number,closeOnAction?:boolean}>(),{defaultValue:null,actionWidth:64,revealThreshold:36,closeOnAction:true})
const emit=defineEmits<{'update:modelValue':[value:Reveal],valueChange:[value:Reveal],action:[payload:{item:Row,action:Action,side:Side}]}>()
const {value:shown,set}=useValue<Reveal>(()=>props.modelValue!==undefined?props.modelValue:props.value,props.defaultValue,next=>{emit('update:modelValue',next);emit('valueChange',next)})
const start=shallowRef<{x:number,y:number}|null>(null)
function end(event:PointerEvent,item:Row){const origin=start.value;start.value=null;if(!origin||item.disabled)return;const dx=event.clientX-origin.x;if(Math.abs(dx)<props.revealThreshold||Math.abs(dx)<Math.abs(event.clientY-origin.y))return;const side=dx>0?'left':'right';if(item[side==='left'?'leftActions':'rightActions']?.length)set({id:item.id,side});else set(null)}
function actions(item:Row){return shown.value?.side==='left'?item.leftActions:item.rightActions}
function run(item:Row,action:Action){if(!shown.value||action.disabled)return;action.onClick?.();emit('action',{item,action,side:shown.value.side});if(props.closeOnAction)set(null)}
</script>
<template><ul class="be-block be-block-list" aria-label="Swipeable items"><li v-for="item in items" :key="item.id" class="be-swipe" @pointerdown="start={x:$event.clientX,y:$event.clientY}" @pointercancel="start=null" @pointerup="end($event,item)" @keydown.esc="set(null)"><div class="be-swipe-row"><div><slot name="item" :item="item"><strong>{{ item.title??item.content }}</strong><div class="be-block-muted">{{ item.description }}</div></slot></div><span class="be-block-muted be-block-end">{{ item.meta }}</span><button v-for="side in (['left','right'] as const)" v-show="item[side==='left'?'leftActions':'rightActions']?.length" :key="side" type="button" class="be-block-button" :disabled="item.disabled" :aria-label="`${side} actions for ${item.title??item.id}`" :aria-expanded="shown?.id===item.id&&shown.side===side" @click="set(shown?.id===item.id&&shown.side===side?null:{id:item.id,side})">{{ side==='left'?'‹':'›' }}</button></div><div v-if="shown?.id===item.id" class="be-block-row" :style="{justifyContent:shown.side==='right'?'end':'start'}"><button v-for="action in actions(item)" :key="action.id" type="button" class="be-block-button" :style="{minWidth:`${actionWidth}px`}" :disabled="action.disabled" @click="run(item,action)">{{ action.label }}</button></div></li></ul></template>
<style scoped>.be-swipe{touch-action:pan-y;overflow:hidden;border-bottom:1px solid var(--beui-border)}.be-swipe-row{display:flex;gap:.45rem;align-items:center;padding:.65rem .5rem}.be-swipe>.be-block-row{padding:.35rem;background:var(--beui-muted)}</style>
