<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref} from 'vue'
type Theme='light'|'dark'
const theme=defineModel<Theme>('theme')
const {variant='rectangle',start='bottom-up'}=defineProps<{variant?:'rectangle'|'circle'|'circle-blur'|'blinds';start?:'bottom-up'|'center'|'top-left'|'top-right'|'bottom-left'|'bottom-right'}>()
const current=ref<Theme>('light'), dark=computed(()=>(theme.value??current.value)==='dark')
const origins={'bottom-up':'50% 100%',center:'50% 50%','top-left':'0 0','top-right':'100% 0','bottom-left':'0 100%','bottom-right':'100% 100%'}
const insets={'bottom-up':'100% 0 0 0',center:'50%','top-left':'0 100% 100% 0','top-right':'0 0 100% 100%','bottom-left':'100% 100% 0 0','bottom-right':'100% 0 0 100%'}
let observer:MutationObserver|undefined
onMounted(()=>{
 const root=document.documentElement
 function sync(){current.value=root.classList.contains('dark')?'dark':'light'}
 sync();observer=new MutationObserver(sync);observer.observe(root,{attributes:true,attributeFilter:['class']})
})
onBeforeUnmount(()=>observer?.disconnect())
function toggle(){
 const root=document.documentElement, next=dark.value?'light':'dark'
 const apply=()=>{theme.value=next;current.value=next;root.classList.toggle('dark',next==='dark')}
 if(!document.startViewTransition||matchMedia('(prefers-reduced-motion:reduce)').matches){apply();return}
 const transition=document.startViewTransition(apply)
 transition.ready.then(()=>{
  const initial=variant==='rectangle'?`inset(${insets[start]})`:`circle(0 at ${origins[start]})`
  const final=variant==='rectangle'?'inset(0)':`circle(150vmax at ${origins[start]})`
  const frames=variant==='blinds'?[{maskSize:'100% 0%'},{maskSize:'100% 100%'}]:[{clipPath:initial,filter:variant==='circle-blur'?'blur(12px)':'none'},{clipPath:final,filter:'none'}]
  root.animate(variant==='blinds'?frames.map(frame=>({...frame,maskImage:'repeating-linear-gradient(0deg,#000 0 9%,transparent 9% 10%)'})):frames,{duration:variant==='rectangle'?400:700,easing:'ease-out',pseudoElement:'::view-transition-new(root)'})
 }).catch(()=>{})
}
</script>
<template><button type="button" class="be-theme" :aria-label="dark?'Switch to light mode':'Switch to dark mode'" @click="toggle"><slot :dark="dark">{{ dark?'☾':'☀' }}</slot></button></template>
<style scoped>.be-theme{display:inline-grid;place-items:center;border:1px solid var(--beui-border);border-radius:50%;width:2.5rem;height:2.5rem;color:var(--beui-foreground);background:var(--beui-card);cursor:pointer;font-size:1.25rem}</style>
