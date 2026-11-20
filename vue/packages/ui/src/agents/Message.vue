<script setup lang="ts">
import { computed, provide } from 'vue'
import { sideKey, type Labels } from './shared'
const props = withDefaults(defineProps<{ from: 'user' | 'assistant', animateIn?: boolean, labels?: Labels }>(), { animateIn: false })
provide(sideKey, computed(() => props.from === 'user' ? 'end' : 'start'))
</script>
<template>
  <article class="be-message" data-slot="message" :data-from="from" :data-animate="animateIn || undefined" :aria-label="labels?.[from] ?? `${from} message`"><slot /></article>
</template>
<style>
.be-message { display:flex; align-items:flex-start; gap:.5rem; width:100%; color:var(--beui-foreground); }
.be-message[data-from=user] { flex-direction:row-reverse; transform-origin:bottom right; }
.be-message[data-animate] { animation:be-message-enter .22s ease-out; }
.be-message-group, .be-message-bubble-group { display:flex; flex-direction:column; width:100%; gap:.375rem; }.be-message-group[data-spacing=default],.be-message-bubble-group[data-spacing=default] { gap:1rem; }
.be-message-avatar { display:grid; place-items:center; flex:none; width:1.75rem; height:1.75rem; overflow:hidden; border-radius:50%; background:var(--beui-muted); color:var(--beui-muted-foreground); font-size:.75rem; }
.be-message-avatar[aria-hidden=true] { visibility:hidden; }.be-message-avatar img { width:100%; height:100%; object-fit:cover; }
.be-message-content { display:flex; flex:1; min-width:0; flex-direction:column; gap:.25rem; }
.be-message[data-from=user] .be-message-content { align-items:flex-end; }
.be-message-header,.be-message-footer,.be-message-marker { display:flex; align-items:center; gap:.5rem; color:var(--beui-muted-foreground); font-size:.75rem; }
.be-message-typing { display:inline-flex; align-items:center; gap:.25rem; }.be-message-typing i { width:.3rem; height:.3rem; border-radius:50%; background:currentColor; animation:be-typing .9s ease-in-out infinite alternate; }.be-message-typing i:nth-child(2){animation-delay:.12s}.be-message-typing i:nth-child(3){animation-delay:.24s}
@keyframes be-message-enter { from { opacity:0;transform:translateY(4px) scale(.98) } }
@keyframes be-typing { from { opacity:.35;transform:translateY(1px) } to { opacity:1;transform:translateY(-2px) } }
@media(prefers-reduced-motion:reduce){.be-message[data-animate],.be-message-typing i{animation:none}}
</style>
