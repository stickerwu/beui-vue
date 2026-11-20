<script setup lang="ts">
import { SmoothScroll, ScrollProgress, ScrollTo } from 'beui-vue'
</script>
<template>
  <SmoothScroll class="reader" :root="false">
    <div class="sticky"><ScrollProgress :fixed="false" :spring="false" /></div>
    <section id="smooth-start"><small>01</small><h3>Smooth scroll</h3><ScrollTo to="#smooth-finish" :duration=".65">Jump to the last section ↓</ScrollTo></section>
    <section><small>02</small><h3>In motion</h3></section>
    <section id="smooth-finish"><small>03</small><h3>Last section</h3><ScrollTo to="#smooth-start" :duration=".65">Back to start ↑</ScrollTo></section>
  </SmoothScroll>
</template>
<style scoped>.reader { width:100%; height:17rem; border:1px solid var(--beui-border); border-radius:1rem; } .sticky { position:sticky; top:0; z-index:2; } section { box-sizing:border-box; min-height:17rem; padding:2rem; display:flex; align-items:start; flex-direction:column; justify-content:center; border-bottom:1px solid var(--beui-border); } section:nth-of-type(2) { background:var(--beui-muted); } button { cursor:pointer; text-decoration:underline; } small { color:var(--beui-muted-foreground); }</style>
