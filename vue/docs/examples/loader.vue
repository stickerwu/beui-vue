<script setup lang="ts">
import { ref } from 'vue'
import { Loader } from 'beui-vue'
const paused = ref(false)
const variants = ['spinner','dots','bars','dot-matrix','dither','morph','comet','metaballs','newton','helix','scramble','percent','ascii','ascii-line','ascii-braille','ascii-blocks','ascii-bounce'] as const
</script>
<template><div class="gallery"><label><input v-model="paused" type="checkbox"> Pause animations</label><div class="loaders"><div v-for="variant in variants" :key="variant"><Loader :variant="variant" :paused="paused" :label="`Loading (${variant})`" /><small>{{ variant }}</small></div></div></div></template>
<style scoped>.gallery { width:100%; text-align:center; } label,small { font-size:.72rem; color:var(--beui-muted-foreground); } .loaders { display:grid; grid-template-columns:repeat(auto-fit,minmax(6rem,1fr)); gap:.5rem; margin-top:1rem; } .loaders>div { display:grid; justify-items:center; align-content:center; gap:.5rem; min-height:4.5rem; border:1px solid var(--beui-border); border-radius:.7rem; }</style>
