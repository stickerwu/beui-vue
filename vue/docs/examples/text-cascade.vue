<script setup lang="ts">
import { ButtonBase, TextCascade } from 'beui-vue'
import { onMounted, shallowRef, watch } from 'vue'
const phrases = ['Install skills', 'Open settings', 'Ship updates']
const index = shallowRef(0)
const paused = shallowRef(false)
function next() { index.value = (index.value + 1) % phrases.length }
onMounted(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  paused.value = preference.matches
  watch(paused, (stop, _, cleanup) => {
    if (stop) return
    const timer = window.setInterval(next, 2400)
    cleanup(() => window.clearInterval(timer))
  }, { immediate: true })
})
</script>
<template><div class="cascade-demo"><TextCascade :text="phrases[index]!" /><div><ButtonBase variant="ghost" size="sm" @click="paused = !paused">{{ paused ? 'Play' : 'Pause' }}</ButtonBase><ButtonBase variant="secondary" size="sm" @click="next">Next phrase</ButtonBase></div></div></template>
<style scoped>.cascade-demo { display: grid; justify-items: center; gap: 1.5rem; font-size: 1.125rem; font-weight: 500; }</style>
