<script setup lang="ts">
const {value, direction = 'up', duration = .18, stagger = .006, suffixLength = 0, animationKey} = defineProps<{
  value: number | string; direction?: 'up' | 'down'; duration?: number; stagger?: number; suffixLength?: number; animationKey?: string | number
}>()
</script>
<template><span class="be-digit" :aria-label="String(value)" :data-direction="direction" :style="{'--duration': `${duration}s`}"><span v-for="(char,index) in String(value)" :key="String(value).length-index" class="slot" aria-hidden="true" :style="{'--delay': `${index*stagger}s`}"><span class="reserve">{{ char }}</span><Transition name="digit"><span :key="index >= String(value).length-suffixLength ? 'suffix' : `${animationKey ?? ''}-${char}`" class="glyph">{{ char }}</span></Transition></span></span></template>
<style scoped>
.be-digit{display:inline-flex;font-variant-numeric:tabular-nums;--travel:45%}.be-digit[data-direction=down]{--travel:-45%}.slot{position:relative;display:inline-block;overflow:clip;white-space:pre}.reserve{visibility:hidden}.glyph{position:absolute;inset:0}.digit-enter-active,.digit-leave-active{transition:transform var(--duration) cubic-bezier(.16,1,.3,1) var(--delay),opacity var(--duration) var(--delay)}.digit-enter-from{transform:translateY(var(--travel));opacity:0}.digit-leave-to{transform:translateY(calc(-1 * var(--travel)));opacity:0}@media(prefers-reduced-motion:reduce){.digit-enter-active,.digit-leave-active{transition:none}}
</style>
