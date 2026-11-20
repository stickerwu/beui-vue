<script setup lang="ts">
import SearchPalette, { type SearchItem } from './SearchPalette.vue'
const props = withDefaults(defineProps<{ items:SearchItem[], shortcut?:string, placeholder?:string, iconOnly?:boolean, emptyMessage?:string, open?:boolean, defaultOpen?:boolean }>(), { open:undefined })
</script>
<template><SearchPalette v-bind="props" morph><template v-if="$slots.item" #item="slotProps"><slot name="item" v-bind="slotProps" /></template></SearchPalette></template>
