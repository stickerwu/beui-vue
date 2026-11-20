<script setup lang="ts">
import { toRef,provide } from 'vue'
import { motion,useReducedMotion } from 'motion-v'
import { layoutSpring } from '../primitives/state'
import { viewKey } from './island-view'
const props=defineProps<{view:string|null,compact?:string}>()
provide(viewKey,toRef(()=>props.view))
const reduced=useReducedMotion()
</script>
<template><motion.div class="be-island" :data-view="view??'compact'" :layout="!reduced" :transition="layoutSpring"><div v-if="view===null" class="be-island-compact"><slot name="compact">{{ compact }}</slot></div><slot v-else :view="view" /></motion.div></template>
<style scoped>.be-island{display:grid;place-items:center;width:fit-content;max-width:100%;min-width:5rem;min-height:1.7rem;padding:.5rem 1rem;border-radius:1.7rem;background:#101010;color:white;overflow:hidden}.be-island:not([data-view=compact]){padding:1rem 1.15rem;border-radius:1.4rem}</style>
