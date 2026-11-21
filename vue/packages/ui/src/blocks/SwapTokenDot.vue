<script setup lang="ts">
import SwapChainDot from './SwapChainDot.vue'
import type { SwapChain, SwapToken } from './swap-assets'

withDefaults(defineProps<{ token: SwapToken; chain: SwapChain; size?: number }>(), { size: 28 })
</script>

<template>
  <span class="be-swap-token-dot" aria-hidden="true" :style="{ width: `${size}px`, height: `${size}px` }">
    <span class="be-swap-token-mark">{{ token.symbol.slice(0, 2) }}</span>
    <SwapChainDot class="be-swap-token-chain" :chain="chain" :size="size * 0.42" :font-size="7" ring />
  </span>
</template>

<style scoped>
.be-swap-token-dot { position: relative; display: inline-flex; flex: none; }
.be-swap-token-mark { position: absolute; inset: 0; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--beui-border); border-radius: 9999px; background: var(--beui-background); color: var(--beui-foreground); font-size: 11px; font-weight: 700; line-height: 1.5; }
.be-swap-token-chain { position: absolute; right: -.125rem; bottom: -.125rem; }
</style>
