<script setup lang="ts">
import { TextCascade } from 'beui-vue'
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
const phrases = ['Install skills', 'Open settings', 'Ship updates']
const index = shallowRef(0)
let timer: number | undefined
onMounted(() => { timer = window.setInterval(() => { index.value = (index.value + 1) % phrases.length }, 2400) })
onBeforeUnmount(() => window.clearInterval(timer))
</script>
<template><div class="cascade-demo"><p><TextCascade :text="phrases[index] ?? phrases[0]!" /></p></div></template>
<style scoped>
.cascade-demo { display: flex; width: 100%; justify-content: center; }
p { margin: 0; font-size: 1.125rem; line-height: 1.75rem; font-weight: 500; color: var(--beui-foreground); }
</style>
