<script setup lang="ts">
import { TiltCard } from 'beui-vue'
</script>

<template>
  <div class="tilt-demo">
    <TiltCard class="tilt-sample">
      <div class="eyebrow">Premium</div>
      <h3>Tilt me</h3>
      <p>Move your cursor across the card to see 3D tilt + glare.</p>
    </TiltCard>
  </div>
</template>

<style scoped>
.tilt-demo { display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
.tilt-sample { width: 280px; padding: 2rem; border: 1px solid var(--beui-border); background: var(--beui-card); }
.eyebrow { color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; letter-spacing: .05em; text-transform: uppercase; }
/* The docs theme styles bare h3/p inside page content; keep this demo's own type scale. */
.tilt-sample h3 { margin: .5rem 0 0; padding: 0; border: 0; color: var(--beui-foreground); font-size: 1.5rem; line-height: 2rem; font-weight: 600; }
.tilt-sample p { margin: .75rem 0 0; color: var(--beui-muted-foreground); font-size: .875rem; line-height: 1.25rem; }
</style>
