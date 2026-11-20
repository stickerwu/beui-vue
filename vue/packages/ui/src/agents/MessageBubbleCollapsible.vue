<script setup lang="ts">
import { useId } from 'vue'
import { useOpenState } from '../primitives/state'
const props = withDefaults(defineProps<{ open?: boolean, defaultOpen?: boolean, collapsedLines?: number, moreLabel?: string, lessLabel?: string, contentClassName?: string, triggerClassName?: string }>(), { open: undefined, defaultOpen: false, collapsedLines: 3, moreLabel: 'Show more', lessLabel: 'Show less' })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
const id = useId()
</script>
<template><div><div :id="id" :class="[contentClassName, { 'be-bubble-clamped': !open }]" :style="{ '--be-bubble-lines': collapsedLines }"><slot /></div><button class="be-agent-button" :class="triggerClassName" type="button" :aria-expanded="open" :aria-controls="id" @click="setOpen(!open)">{{ open ? lessLabel : moreLabel }} <span aria-hidden="true">⌄</span></button></div></template>
<style scoped>.be-bubble-clamped { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:var(--be-bubble-lines); overflow:hidden; }</style>
