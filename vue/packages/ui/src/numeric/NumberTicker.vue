<script setup lang="ts">
import { computed,onMounted,onBeforeUnmount,ref } from 'vue'
const {value,pad=1,decimals=0,duration=.9,stagger=.04,startOnView=true,prefix='',suffix='',locale=false,format,blur=false,digitClassName} = defineProps<{
 value:number;pad?:number;decimals?:number;duration?:number;stagger?:number;startOnView?:boolean;prefix?:string;suffix?:string;locale?:boolean|string;format?:(value:number)=>string;blur?:boolean;digitClassName?:string
}>()
const text = computed(()=>format?.(value) ?? new Intl.NumberFormat(typeof locale==='string'?locale:'en-US',{useGrouping:!!locale,minimumIntegerDigits:Math.min(21,Math.max(1,pad)),minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(value))
const host=ref<HTMLElement>(), armed=ref(true), entered=ref(false)
let observer:IntersectionObserver|undefined, timer:ReturnType<typeof setTimeout>|undefined
function enter(){armed.value=true;observer?.disconnect();timer=setTimeout(()=>entered.value=true,1000*(duration+text.value.length*stagger))}
onMounted(()=>{if(!startOnView||matchMedia('(prefers-reduced-motion:reduce)').matches||!host.value||!('IntersectionObserver' in window)){enter();return} armed.value=false;observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))enter()});observer.observe(host.value)})
onBeforeUnmount(()=>{observer?.disconnect();clearTimeout(timer)})
</script>
<template><span ref="host" class="be-ticker"><span class="spoken">{{ prefix }}{{ text }}{{ suffix }}</span><span aria-hidden="true">{{ prefix }}<template v-for="(char,index) in text" :key="text.length-index"><span v-if="/\d/.test(char)" class="digit" :class="digitClassName"><span class="reserve">{{ char }}</span><span class="column" :style="{transform:`translateY(-${armed ? Number(char)*1.1 : 0}em)`,transitionDuration:`${duration}s`,transitionDelay:`${entered?0:index*stagger}s`}"><span v-for="digit in 10" :key="digit" :class="{soft:blur && armed && digit-1 !== Number(char)}">{{ digit-1 }}</span></span></span><template v-else>{{ char }}</template></template>{{ suffix }}</span></span></template>
<style scoped>.be-ticker{font-variant-numeric:tabular-nums}.spoken{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.digit{display:inline-block;position:relative;clip-path:inset(0);width:1ch;height:1.1em;line-height:1.1;text-align:center}.reserve{visibility:hidden}.column{position:absolute;inset:0 0 auto;display:grid;transition:transform .9s cubic-bezier(.16,1,.3,1)}.column>span{height:1.1em}.soft{filter:blur(.06em)}@media(prefers-reduced-motion:reduce){.column{transition:none!important}}</style>
