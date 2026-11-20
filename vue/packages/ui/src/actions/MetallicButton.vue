<script setup lang="ts">
import ButtonBase from '../ButtonBase.vue'
const {paused = false, size = 'md'} = defineProps<{paused?:boolean; size?:'sm'|'md'|'lg'|'icon'}>()
</script>
<template>
  <ButtonBase class="chrome" variant="ghost" :size="size" :data-paused="paused"><span class="rim" aria-hidden="true" /><span class="reflection" aria-hidden="true" /><span class="inset" aria-hidden="true" /><span class="label"><slot /></span></ButtonBase>
</template>
<style scoped>
.chrome { isolation:isolate; position:relative; overflow:hidden; box-shadow:0 8px 22px #0003; color:var(--beui-foreground); }
.chrome > span:not(.label) { position:absolute; pointer-events:none; }
.rim { inset:0 -18%; background:linear-gradient(105deg,#111,#737373 14%,#fafafa 26%,#525252 38%,#0a0a0a 50%,#a3a3a3 64%,white 75%,#404040 87%,#111); }
.reflection { inset:0 auto 0 -58%; width:52%; background:linear-gradient(90deg,transparent,#ffffff80 48%,transparent); opacity:.5; filter:blur(3px); mix-blend-mode:screen; transform:skewX(-12deg); }
.inset { inset:2px; border-radius:inherit; background:var(--beui-background); box-shadow:inset 0 1px 0 #ffffff47,inset 0 -1px 0 #0003; }
.label { position:relative; display:inline-flex; align-items:center; gap:.5rem; }
@media (prefers-reduced-motion:no-preference) {
  .chrome:not([data-paused=true]) .rim { animation:beui-rim 8s cubic-bezier(.77,0,.175,1) infinite; }
  .chrome:not([data-paused=true]) .reflection { transition:transform 2.4s cubic-bezier(.77,0,.175,1); }
  .chrome:not([data-paused=true]):hover .reflection { transform:translateX(310%) skewX(-12deg); }
}
@keyframes beui-rim { 50% { transform:translateX(13%); } }
</style>
