<script setup lang="ts">
import { useAlert } from './state'
const { variant } = useAlert()
</script>

<template>
  <span class="be-alert-icon" aria-hidden="true" data-slot="alert-icon">
    <Transition name="be-icon"><span :key="variant"><slot>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path v-if="variant === 'warning'" d="M10.4 4.2a1.8 1.8 0 0 1 3.2 0l8 13.9a1.9 1.9 0 0 1-1.6 2.9H4a1.9 1.9 0 0 1-1.6-2.9z" />
        <circle v-else cx="12" cy="12" r="9" />
        <path v-if="variant === 'success'" d="m8 12 3 3 5-6" />
        <path v-else-if="variant === 'warning' || variant === 'destructive'" d="M12 8v5m0 3h.01" />
        <path v-else d="M12 11v5m0-8h.01" />
      </svg>
    </slot></span></Transition>
  </span>
</template>

<style scoped>
.be-alert-icon { display: grid; place-items: center; flex: none; width: 1rem; height: 1rem; margin-top: .125rem; }
.be-alert-icon > span { grid-area: 1 / 1; display: flex; }
.be-alert-icon :deep(svg) { width: 1rem; height: 1rem; }
.be-icon-enter-active, .be-icon-leave-active { transition: opacity .15s, transform .15s; }
.be-icon-enter-from, .be-icon-leave-to { opacity: 0; transform: scale(.9); }
@media (prefers-reduced-motion:reduce) { .be-icon-enter-from, .be-icon-leave-to { transform: none; } }
</style>
