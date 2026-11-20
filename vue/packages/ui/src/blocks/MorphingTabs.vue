<script setup lang="ts">
import FoldingTabs,{type FoldingTab} from './FoldingTabs.vue'
const props=defineProps<{items:FoldingTab[],modelValue?:string|null,value?:string|null,defaultValue?:string|null,ariaLabel?:string,onClose?:(id:string)=>void}>()
</script>
<template><FoldingTabs v-bind="props" morph><template v-if="$slots.panel" #panel="slotProps"><slot name="panel" v-bind="slotProps" /></template><template v-if="$slots.icon" #icon="slotProps"><slot name="icon" v-bind="slotProps" /></template></FoldingTabs></template>
