<script setup lang="ts">
import { useOpenState } from '../primitives/state'
import type { BlockAction } from './ExpandableActionBar.vue'
const props=withDefaults(defineProps<{primaryActions:BlockAction[],overflowActions:BlockAction[],expanded?:boolean,defaultExpanded?:boolean,collapseOnAction?:boolean,openLabel?:string,closeLabel?:string}>(),{expanded:undefined,defaultExpanded:false,collapseOnAction:true})
const emit=defineEmits<{'update:expanded':[value:boolean],expandedChange:[value:boolean],action:[item:BlockAction]}>()
const {open,setOpen}=useOpenState(()=>props.expanded,props.defaultExpanded,next=>{emit('update:expanded',next);emit('expandedChange',next)})
function run(item:BlockAction){if(item.disabled)return;item.onClick?.();emit('action',item);if(props.collapseOnAction)setOpen(false)}
</script>
<template><div class="be-block be-block-row" role="toolbar" aria-label="Actions" @keydown.esc="setOpen(false)"><button v-for="item in [...primaryActions,...(open?overflowActions:[])]" :key="item.id" type="button" class="be-block-button" :disabled="item.disabled" :aria-label="item.ariaLabel??item.label" @click="run(item)"><slot name="action" :item="item">{{ item.icon }} {{ item.label }}</slot></button><button v-if="overflowActions.length" type="button" class="be-block-button" :aria-expanded="open" :aria-label="open?(closeLabel??'Fewer actions'):(openLabel??'More actions')" @click="setOpen(!open)">{{ open?'×':'…' }}</button></div></template>
