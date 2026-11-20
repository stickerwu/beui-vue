<script setup lang="ts">
const { as = 'span', duration = 2.5, paused = false } = defineProps<{ as?: string; duration?: number; paused?: boolean }>()
</script>

<template><component :is="as" class="shimmer" :style="{ '--shimmer-duration': `${duration}s`, animationPlayState: paused ? 'paused' : 'running' }"><slot /></component></template>

<style scoped>
.shimmer { display: inline-block; color: var(--beui-muted-foreground); }
@supports (background-clip: text) { .shimmer { color: transparent; background-image: linear-gradient(110deg, var(--beui-muted-foreground) 30%, var(--beui-foreground) 50%, var(--beui-muted-foreground) 70%); background-size: 200% 100%; background-clip: text; } }
@media (prefers-reduced-motion: no-preference) { .shimmer { animation: text-glow var(--shimmer-duration) linear infinite; } }
@keyframes text-glow { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@media (forced-colors: active) { .shimmer { color: CanvasText; background: none; } }
</style>
