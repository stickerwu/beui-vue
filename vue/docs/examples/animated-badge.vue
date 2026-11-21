<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { AnimatedBadge } from 'beui-vue'

const STATES = [
  { status: 'loading', label: 'Syncing' },
  { status: 'success', label: 'Synced' },
  { status: 'warning', label: 'Review' },
  { status: 'danger', label: 'Failed' },
] as const
const active = ref(0)
const state = computed(() => STATES[active.value])
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { active.value = (active.value + 1) % STATES.length }, 1600) })
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="badge-demo">
    <div class="badge-live">
      <AnimatedBadge :status="state.status" size="md" aria-live="polite">{{ state.label }}</AnimatedBadge>
    </div>
    <div class="badge-grid">
      <AnimatedBadge status="neutral" size="sm">Queued</AnimatedBadge>
      <AnimatedBadge status="info" size="sm">Live</AnimatedBadge>
      <AnimatedBadge status="loading" size="sm">Indexing</AnimatedBadge>
      <AnimatedBadge status="success" size="sm">Verified</AnimatedBadge>
      <AnimatedBadge status="warning" size="sm">Pending</AnimatedBadge>
      <AnimatedBadge status="danger" size="sm">Blocked</AnimatedBadge>
    </div>
  </div>
</template>

<style scoped>
.badge-demo { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
.badge-live { display: flex; height: 4rem; align-items: center; justify-content: center; }
.badge-grid { display: grid; grid-template-columns: repeat(3, auto); gap: .5rem; }
@media (max-width: 639px) { .badge-grid { grid-template-columns: repeat(2, auto); } }
</style>
