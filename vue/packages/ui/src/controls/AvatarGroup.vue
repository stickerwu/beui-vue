<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { computed, ref, shallowRef } from 'vue'
import { pressSpring } from '../core/motion'

interface Member { id: string; name: string; src?: string }
const { members, max = 4, size = 'md', label = 'Members' } = defineProps<{ members: readonly Member[]; max?: number; size?: 'sm' | 'md' | 'lg'; label?: string }>()
const expanded = defineModel<boolean>('expanded', { default: false })
const hover = shallowRef<number | null>(null)
const failed = ref(new Set<string>())
const limit = computed(() => Math.max(1, Math.floor(max)))
const shown = computed(() => expanded.value ? members : members.slice(0, limit.value))
const reduce = useReducedMotion()
function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts.length > 1 ? `${parts[0]![0]}${parts[parts.length - 1]![0]}` : parts[0]!.slice(0, 2)).toUpperCase() || '?'
}
function offset(index: number) { return reduce.value || hover.value === null ? {} : { x: Math.sign(index - hover.value) * 5, y: index === hover.value ? -3 : 0, scale: index === hover.value ? 1.06 : 1 } }
</script>
<template><ul :aria-label="label" class="avatars" :data-size="size" @pointerleave="hover = null">
  <motion.li v-for="(member, index) in shown" :key="member.id" class="entry" :layout="!reduce" :animate="hover === null ? { x: 0, y: 0, scale: 1 } : offset(index)" :transition="pressSpring" :style="{ zIndex: hover === index ? shown.length + 1 : index }" @pointerenter="event => { if (event.pointerType === 'mouse') hover = index }">
    <span class="avatar" :aria-label="member.name" role="img"><img v-if="member.src && !failed.has(member.src)" :src="member.src" alt="" @error="failed.add(member.src!)" /><span v-else aria-hidden="true">{{ initials(member.name) }}</span></span>
    <span v-if="hover === index" class="tip" aria-hidden="true">{{ member.name }}</span>
  </motion.li>
  <li v-if="members.length > limit" class="entry" :style="{ zIndex: shown.length }"><button class="avatar count" type="button" :aria-expanded="expanded" :aria-label="expanded ? 'Show fewer members' : `Show ${members.length - limit} more members`" @click="expanded = !expanded">{{ expanded ? '−' : `+${members.length - limit}` }}</button></li>
</ul></template>
<style scoped>.avatars { --diameter: 36px; display: flex; align-items: center; flex-wrap: wrap; list-style: none; padding: 0; margin: 0; } .avatars[data-size=lg] { --diameter: 44px; } .avatars[data-size=sm] { --diameter: 28px; } .entry { margin: 0; position: relative; } .entry + .entry { margin-inline-start: calc(var(--diameter) * -.22); } .avatar { display: grid; place-items: center; box-sizing: border-box; width: var(--diameter); height: var(--diameter); border: 2px solid var(--beui-background); border-radius: 50%; overflow: hidden; color: var(--beui-muted-foreground); background: var(--beui-card); font-size: .75rem; font-weight: 600; } .avatar img { width: 100%; height: 100%; object-fit: cover; } .count { background: var(--beui-foreground); color: var(--beui-background); cursor: pointer; } .tip { position: absolute; bottom: calc(100% + .375rem); left: 50%; translate: -50%; white-space: nowrap; border-radius: .4rem; padding: .2rem .5rem; font-size: .75rem; color: var(--beui-background); background: var(--beui-foreground); }</style>
