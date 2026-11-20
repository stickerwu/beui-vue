<script setup lang="ts" generic="Item">
import {computed,onBeforeUnmount,onMounted,shallowRef,watch} from 'vue'
const props=withDefaults(defineProps<{items:readonly Item[],getItemKey:(item:Item,index:number)=>string|number,onLoadMore:()=>void|Promise<void>,hasMore:boolean,loading?:boolean,error?:string,onRetry?:()=>void,estimateSize?:(item:Item,index:number)=>number,minColumnWidth?:number,maxColumns?:number,gap?:number,prefetch?:number,ariaLabel?:string,emptyState?:string,endState?:string}>(),{minColumnWidth:180,maxColumns:5,gap:12,prefetch:160})
const root=shallowRef<HTMLElement|null>(null)
const tail=shallowRef<HTMLElement|null>(null)
const width=shallowRef(0)
const pending=shallowRef(false)
const failure=shallowRef(false)
let lastLength=-1
let resize:ResizeObserver|undefined
let observer:IntersectionObserver|undefined
const columns=computed(()=>{
  const count=Math.max(1,Math.min(props.maxColumns,Math.floor((width.value+props.gap)/(props.minColumnWidth+props.gap))))
  const result=Array.from({length:count},()=>({height:0,entries:[] as {item:Item,index:number}[]}))
  props.items.forEach((item,index)=>{const column=result.reduce((best,current)=>best.height<=current.height?best:current);column.entries.push({item,index});column.height+=(props.estimateSize?.(item,index)??1)+props.gap})
  return result
})
async function load(manual=false){if(!props.hasMore||pending.value||props.loading||props.error||(!manual&&lastLength===props.items.length))return;lastLength=props.items.length;failure.value=false;pending.value=true;try{await props.onLoadMore()}catch{failure.value=true}finally{pending.value=false}}
function observe(){if(!tail.value||!root.value)return;observer?.disconnect();observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))load()},{root:root.value,rootMargin:`${props.prefetch}px`});observer.observe(tail.value)}
watch(()=>props.items.length,()=>observe(),{flush:'post'})
onMounted(()=>{resize=new ResizeObserver(([entry])=>{width.value=entry.contentRect.width});if(root.value)resize.observe(root.value);observe()})
onBeforeUnmount(()=>{resize?.disconnect();observer?.disconnect()})
</script>
<template><section ref="root" class="be-block be-masonry" :aria-label="ariaLabel??'Masonry gallery'" :aria-busy="pending||loading"><div class="be-masonry-cols" :style="{gap:`${gap}px`}"><div v-for="(column,index) in columns" :key="index" :style="{gap:`${gap}px`}"><div v-for="entry in column.entries" :key="getItemKey(entry.item,entry.index)"><slot :item="entry.item" :index="entry.index" /></div></div></div><div ref="tail"><p v-if="!items.length&&!loading">{{ emptyState??'No items' }}</p><button v-if="error||failure" class="be-block-button" type="button" @click="onRetry?onRetry():load(true)">Retry</button><button v-else-if="hasMore" type="button" class="be-block-button" :disabled="pending||loading" @click="load(true)">{{ pending||loading?'Loading…':'Load more' }}</button><span v-else role="status">{{ endState??'End of results' }}</span></div></section></template>
<style scoped>.be-masonry{max-height:28rem;overflow:auto}.be-masonry-cols{display:flex;align-items:flex-start}.be-masonry-cols>div{flex:1;min-width:0;display:grid}.be-masonry>div:last-child{padding:.75rem;text-align:center}</style>
