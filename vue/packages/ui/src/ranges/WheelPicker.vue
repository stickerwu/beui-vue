<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,onMounted,ref,useId,watch} from 'vue'

const {options,defaultValue,visibleCount=5,itemHeight=36,disabled=false,label='Options'} = defineProps<{
 options: (string|{label:string;value:string})[]
 defaultValue?: string
 visibleCount?: number
 itemHeight?: number
 disabled?: boolean
 label?:string
}>()
const model = defineModel<string>()
const emit = defineEmits<{valueChange:[value:string]}>()
const items = computed(()=>options.map(item=>typeof item==='string'?{value:item,label:item}:item))
const selection = computed(()=>items.value.findIndex(item=>item.value===(model.value??defaultValue??items.value[0]?.value)))
const count = computed(()=>Math.max(1,Math.floor(visibleCount / 2)*2+1))
const height = computed(()=>Math.max(1,itemHeight))
const id=useId(), scroller=ref<HTMLElement>()
let frame=0
function choose(index:number){
 const item=items.value[Math.max(0,Math.min(index,items.value.length-1))]
 if(!item||disabled||model.value===item.value)return
 model.value=item.value
 emit('valueChange',item.value)
}
function align(){scroller.value?.scrollTo({top:Math.max(0,selection.value)*height.value,behavior:'instant'})}
function scroll(){
 if(!scroller.value||disabled)return
 cancelAnimationFrame(frame)
 frame=requestAnimationFrame(()=>{if(scroller.value)choose(Math.round(scroller.value.scrollTop/height.value))})
}
function key(event:KeyboardEvent){
 const offsets:Record<string,number>={ArrowDown:1,ArrowUp:-1,PageDown:count.value,PageUp:-count.value}
 if(event.key==='Home')choose(0)
 else if(event.key==='End')choose(items.value.length-1)
 else if(event.key in offsets)choose(selection.value+offsets[event.key])
 else return
 event.preventDefault()
}
watch([selection,height],()=>nextTick(()=>{if(scroller.value&&Math.abs(scroller.value.scrollTop/height.value-selection.value)>.51)align()}))
onMounted(align)
onBeforeUnmount(()=>cancelAnimationFrame(frame))
</script>
<template><div class="be-wheel" :style="{'--item':`${height}px`,'--visible':count,'--pad':`${(count-1)*height/2}px`}">
  <div ref="scroller" class="scroller" role="listbox" :aria-label="label" :aria-activedescendant="selection>=0?`${id}-${selection}`:undefined" :aria-disabled="disabled||undefined" :tabindex="disabled?-1:0" @keydown="key" @scroll="scroll">
    <div v-for="(option,index) in items" :id="`${id}-${index}`" :key="option.value" role="option" :aria-selected="index===selection" @click="choose(index)">{{ option.label }}</div>
  </div>
</div></template>
<style scoped>
.be-wheel{position:relative;width:max-content;min-width:9rem;text-align:center;font-variant-numeric:tabular-nums;color:var(--beui-foreground)}.be-wheel::before{content:'';position:absolute;inset:50% 0 auto;height:var(--item);translate:0 -50%;border-radius:.6rem;background:var(--beui-muted)}.scroller{position:relative;box-sizing:border-box;height:calc(var(--visible)*var(--item));padding:var(--pad) .75rem;overflow-y:auto;overscroll-behavior:contain;scroll-snap-type:y mandatory;scrollbar-width:none;mask-image:linear-gradient(transparent,#000 25% 75%,transparent)}.scroller[aria-disabled=true]{overflow:hidden;opacity:.5}.scroller>div{height:var(--item);line-height:var(--item);scroll-snap-align:center;opacity:.55;cursor:pointer}.scroller>[aria-selected=true]{opacity:1;font-weight:600}
</style>
