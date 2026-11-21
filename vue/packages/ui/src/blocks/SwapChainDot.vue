<script setup lang="ts">
import type { SwapChain } from './swap-assets'

/** A chain's badge. The `tone` names a theme colour pair, as the original's Tailwind classes did. */
withDefaults(defineProps<{ chain: SwapChain; size?: number; fontSize?: number; ring?: boolean }>(), { size: 16, fontSize: 9 })
</script>

<template>
  <span class="be-swap-chain-dot" :class="{ 'is-ring': ring }" :data-tone="chain.tone" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${fontSize}px` }">{{ chain.symbol }}</span>
</template>

<style scoped>
.be-swap-chain-dot { display: inline-flex; flex: none; box-sizing: border-box; align-items: center; justify-content: center; border-radius: 9999px; font-weight: 700; line-height: 1.5; }
.be-swap-chain-dot.is-ring { border: 2px solid var(--beui-card); }
.be-swap-chain-dot[data-tone="primary"] { background: var(--beui-primary); color: var(--beui-primary-foreground); }
.be-swap-chain-dot[data-tone="secondary"] { background: var(--beui-card); color: var(--beui-foreground); }
.be-swap-chain-dot[data-tone="accent"] { background: var(--beui-accent); color: var(--beui-accent-foreground, #151515); }
.be-swap-chain-dot[data-tone="muted"] { background: var(--beui-muted); color: var(--beui-muted-foreground); }
.be-swap-chain-dot[data-tone="destructive"] { background: var(--beui-destructive); color: var(--beui-primary-foreground); }
.be-swap-chain-dot[data-tone="primary/80"] { background: color-mix(in srgb, var(--beui-primary) 80%, transparent); color: var(--beui-primary-foreground); }
.be-swap-chain-dot[data-tone="destructive/80"] { background: color-mix(in srgb, var(--beui-destructive) 80%, transparent); color: var(--beui-primary-foreground); }
.be-swap-chain-dot:not([data-tone]) { background: var(--beui-muted); color: var(--beui-muted-foreground); }
</style>
