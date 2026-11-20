<script setup lang="ts">
import { inject, shallowRef } from 'vue'
import { sideKey } from './shared'
withDefaults(defineProps<{ variant?: 'solid' | 'soft' | 'tint' | 'outline' | 'ghost' | 'danger', align?: 'start' | 'end', animateIn?: boolean }>(), { variant: 'soft' })
const side = inject(sideKey, shallowRef('start' as const))
</script>
<template><div class="be-bubble" data-slot="message-bubble" :data-align="align ?? side" :data-variant="variant" :data-animate="animateIn || undefined"><slot /></div></template>
<style>
.be-bubble { display:flex; flex-direction:column; align-items:flex-start; width:100%; }.be-bubble[data-align=end] { align-items:flex-end; }
.be-bubble-content { box-sizing:border-box; min-width:2.25rem; max-width:82%; border-radius:1rem; padding:.625rem .875rem; background:var(--beui-muted); color:var(--beui-foreground); font-size:.875rem; line-height:1.5rem; overflow-wrap:anywhere; }
.be-bubble[data-variant=solid] .be-bubble-content { color:var(--beui-background); background:var(--beui-foreground); }.be-bubble[data-variant=outline] .be-bubble-content { background:var(--beui-background);border:1px solid var(--beui-border); }.be-bubble[data-variant=ghost] .be-bubble-content { max-width:none; width:100%; padding:0; background:transparent; }.be-bubble[data-variant=danger] .be-bubble-content { color:var(--beui-destructive); background:color-mix(in srgb,var(--beui-destructive) 10%,transparent); }
.be-bubble[data-animate] .be-bubble-content { animation:be-message-enter .22s ease-out; }.be-bubble-content p {margin:0}.be-bubble-content p+p{margin-top:.5rem}
@media(prefers-reduced-motion:reduce){.be-bubble[data-animate] .be-bubble-content{animation:none}}
</style>
