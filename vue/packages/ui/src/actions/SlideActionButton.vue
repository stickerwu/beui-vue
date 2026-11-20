<script setup lang="ts">
import {ref,onBeforeUnmount} from 'vue'
const {threshold=.82,resetDelay=1200,completeLabel='Complete',label='Slide action',disabled=false}=defineProps<{
 threshold?:number;resetDelay?:number;completeLabel?:string;label?:string;disabled?:boolean
}>()
const emit=defineEmits<{complete:[]}>()
const host=ref<HTMLElement>(),thumb=ref<HTMLButtonElement>(),progress=ref(0),dragging=ref(false),done=ref(false)
let timer:ReturnType<typeof setTimeout>|undefined,active:number|undefined,start=0,distance=0
function complete(){
 if(disabled||done.value)return
 progress.value=1;done.value=true;emit('complete')
 if(resetDelay>=0)timer=setTimeout(()=>{done.value=false;progress.value=0},resetDelay)
}
function begin(event:PointerEvent){
 if(done.value||disabled||event.button!==0||active!==undefined||!host.value||!thumb.value)return
 distance=host.value.clientWidth-thumb.value.offsetWidth-12
 if(distance<=0)return
 start=event.clientX;active=event.pointerId;dragging.value=true;thumb.value.setPointerCapture(active)
}
function move(event:PointerEvent){
 if(event.pointerId===active)progress.value=Math.max(0,Math.min(1,(event.clientX-start)/distance))
}
function finish(event:PointerEvent){
 if(event.pointerId!==active)return
 active=undefined;dragging.value=false
 if(event.type==='pointerup'&&progress.value>=threshold)complete()
 else progress.value=0
}
onBeforeUnmount(()=>clearTimeout(timer))
</script>
<template><div ref="host" class="be-slide" :data-dragging="dragging" :style="{'--progress':progress}">
  <span class="fill"/><span class="label" aria-hidden="true" :style="{opacity:1-progress}"><slot>{{ label }}</slot></span>
  <span class="complete" role="status">{{ done ? completeLabel : '' }}</span>
  <button ref="thumb" type="button" :aria-label="label" :disabled="disabled" @keydown.space.prevent="!$event.repeat&&complete()" @keydown.enter.prevent="!$event.repeat&&complete()" @pointerdown="begin" @pointermove="move" @pointerup="finish" @pointercancel="finish" @lostpointercapture="finish">{{ done?'✓':'→' }}</button>
</div></template>
<style scoped>.be-slide{position:relative;width:min(100%,22rem);height:68px;box-sizing:border-box;overflow:hidden;border-radius:24px;background:var(--beui-muted);color:var(--beui-foreground)}.fill,.label,.complete{position:absolute;inset:0;display:grid;place-items:center}.fill{transform-origin:left;transform:scaleX(var(--progress));background:var(--beui-primary)}.label{padding-left:40px}.complete{color:var(--beui-primary-foreground)}button{position:absolute;top:6px;left:calc(6px + (100% - 68px)*var(--progress));width:56px;height:56px;border:0;border-radius:18px;background:var(--beui-primary);color:var(--beui-primary-foreground);font-size:1.4rem;touch-action:none;cursor:grab}.be-slide[data-dragging=false] :is(button,.fill){transition:left .25s ease-out,transform .25s ease-out}@media(prefers-reduced-motion:reduce){.be-slide :is(button,.fill){transition:none!important}}</style>
