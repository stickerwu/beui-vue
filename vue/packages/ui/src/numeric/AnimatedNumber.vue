<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,watch} from 'vue'
const {value,duration=1.2,startOnView=true,format=(number:number)=>Math.round(number).toLocaleString('en-US')}=defineProps<{value:number;duration?:number;startOnView?:boolean;format?:(value:number)=>string}>()
const shown=ref(value),host=ref<HTMLElement>(); let active=false, frame=0, observer:IntersectionObserver|undefined
function play(target:number){cancelAnimationFrame(frame);if(matchMedia('(prefers-reduced-motion:reduce)').matches||duration<=0){shown.value=target;return}const start=performance.now(),initial=shown.value;function tick(now:number){const progress=Math.min(1,(now-start)/(duration*1000));shown.value=initial+(target-initial)*(1-(1-progress)**3);if(progress<1)frame=requestAnimationFrame(tick)}frame=requestAnimationFrame(tick)}
function enter(){active=true;observer?.disconnect();play(value)}
onMounted(()=>{shown.value=0;if(startOnView&&host.value&&'IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion:reduce)').matches){observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))enter()});observer.observe(host.value)}else enter()})
watch(()=>value,next=>{if(active)play(next)});onBeforeUnmount(()=>{observer?.disconnect();cancelAnimationFrame(frame)})
</script>
<template><span ref="host" style="font-variant-numeric:tabular-nums">{{ format(shown) }}</span></template>
