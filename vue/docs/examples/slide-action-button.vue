<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { SlideActionButton } from 'beui-vue'

const continued = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
function complete() {
  continued.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { continued.value = false }, 1800)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="slide-demo">
    <SlideActionButton complete-label="Ready" @complete="complete">Slide to continue</SlideActionButton>
    <p aria-live="polite">{{ continued ? 'Action completed' : 'Drag the arrow to the end' }}</p>
  </div>
</template>

<style scoped>
.slide-demo { display: flex; flex-direction: column; align-items: center; gap: .75rem; }
p { height: 1rem; margin: 0; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
</style>
