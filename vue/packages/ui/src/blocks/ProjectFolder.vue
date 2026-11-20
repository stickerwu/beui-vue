<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { useOpenState } from '../primitives/state'
const props = withDefaults(defineProps<{title:string,description?:string,previews?:{id:string,content?:string}[],count?:number,itemLabel?:string,open?:boolean,defaultOpen?:boolean,expanded?:boolean,defaultExpanded?:boolean,disabled?:boolean,ariaLabel?:string}>(), {previews:()=>[],open:undefined,expanded:undefined,defaultOpen:false,defaultExpanded:false})
const emit = defineEmits<{'update:open':[value:boolean],openChange:[value:boolean],'update:expanded':[value:boolean],expandedChange:[value:boolean],click:[]}>()
const {open,setOpen} = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open',next); emit('openChange',next) })
const expansion = useOpenState(() => props.expanded, props.defaultExpanded, next => {emit('update:expanded',next);emit('expandedChange',next)})
const dialog = shallowRef<HTMLDialogElement|null>(null)
watch([expansion.open,dialog], ([show,node]) => {
  if (show && node && !node.open) node.showModal()
  else if (!show && node?.open) node.close()
},{flush:'post'})
function activate() { emit('click'); setOpen(true); expansion.setOpen(true) }
function close() { expansion.setOpen(false); setOpen(false) }
</script>
<template>
  <div class="be-block be-folder">
    <button class="folder-trigger" type="button" :aria-label="ariaLabel??title" :aria-expanded="expansion.open.value" :disabled="disabled" @pointerenter="$event.pointerType==='mouse' && setOpen(true)" @pointerleave="!expansion.open.value && setOpen(false)" @focus="setOpen(true)" @blur="!expansion.open.value && setOpen(false)" @click="activate">
      <span class="folder-art" :data-open="open"><i v-for="(preview,index) in previews.slice(0,5)" :key="preview.id" :style="{'--n':index}"><slot name="preview" :preview="preview">{{preview.content}}</slot></i><b /></span>
      <strong>{{title}}</strong><small>{{description??'Updated recently'}} · {{count??previews.length}} {{itemLabel??'file'}}{{(count??previews.length)===1?'':'s'}}</small>
    </button>
    <dialog ref="dialog" class="be-block-dialog" :aria-label="title" @cancel.prevent="close"><div class="be-block-row"><strong>{{title}}</strong><button class="be-block-button be-block-end" type="button" :aria-label="`Close ${title}`" @click="close">×</button></div><div class="gallery"><div v-for="preview in previews" :key="preview.id" class="be-block-panel"><slot name="preview" :preview="preview">{{preview.content}}</slot></div></div></dialog>
  </div>
</template>
<style scoped>
.folder-trigger{display:grid;justify-items:center;gap:.5rem;cursor:pointer}.folder-trigger small{color:var(--beui-muted-foreground)}.folder-art{position:relative;display:block;width:10rem;height:7rem;background:#dca44b;border-radius:.6rem .9rem .9rem .9rem;margin-top:1.5rem}.folder-art:before{content:'';position:absolute;bottom:96%;left:0;width:40%;height:.6rem;background:inherit;border-radius:.5rem .6rem 0 0}.folder-art i,.folder-art b{position:absolute;border-radius:.5rem}.folder-art i{inset:10% 10% 5%;background:var(--beui-background);box-shadow:0 0 0 1px #0002;font:600 .7rem system-ui;padding:.5rem;transition:transform .25s;transform:rotate(calc((var(--n) - 1)*4deg));overflow:hidden}.folder-art[data-open=true] i{transform:translateY(calc(-12px - var(--n)*5px)) rotate(calc((var(--n) - 1)*8deg))}.folder-art b{inset:30% 0 0;background:linear-gradient(#f3c878,#eab35b);transform-origin:bottom;transition:transform .24s}.folder-art[data-open=true] b{transform:perspective(160px) rotateX(-17deg)}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:.5rem;margin-top:1rem}@media(prefers-reduced-motion:reduce){.folder-art i,.folder-art b{transition:none}}
</style>
