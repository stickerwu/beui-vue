<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { useId } from 'vue'
interface Item { id: string; label: string; href?: string; disabled?: boolean }
const { items, label = 'Navigation' } = defineProps<{ items: readonly Item[]; label?: string }>()
const value = defineModel<string>()
const uid = useId()
const reduce = useReducedMotion()
</script>
<template><nav :aria-label="label" class="bounce"><component :is="item.href ? 'a' : 'button'" v-for="item in items" :key="item.id" :href="item.href" :type="item.href ? undefined : 'button'" :disabled="item.disabled" :aria-current="value === item.id ? 'page' : undefined" @click="!item.disabled && (value = item.id)">
  <motion.span v-if="value === item.id" class="dot" :layout-id="reduce ? undefined : uid" :transition="{ type: 'spring', stiffness: 380, damping: 18 }" />{{ item.label }}
</component></nav></template>
<style scoped>.bounce { display: grid; gap: .18rem; } .bounce :is(a,button) { position: relative; min-height: 2.25rem; padding: .45rem .8rem .45rem 1.5rem; border: 0; border-radius: .45rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; text-align: start; cursor: pointer; text-decoration: none; } .bounce [aria-current] { color: var(--beui-foreground); } .dot { position: absolute; left: .45rem; top: calc(50% - 3px); width: 6px; height: 6px; border-radius: 50%; background: var(--beui-primary); }</style>
