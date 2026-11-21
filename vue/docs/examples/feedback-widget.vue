<script setup lang="ts">
import { FeedbackWidget } from 'beui-vue'

// The first submission fails so the error and retry states are reachable; later ones succeed.
let attempts = 0
async function submitFeedback() {
  await new Promise(resolve => setTimeout(resolve, 900))
  attempts += 1
  if (attempts === 1) throw new Error('Preview submission failed')
}
</script>

<template>
  <div class="fb-demo">
    <!-- Faux app surface so the corner trigger has something to sit on. -->
    <div class="fb-demo-bar"><div class="fb-demo-line fb-w-24 is-strong" /></div>
    <div class="fb-demo-body">
      <div class="fb-demo-line fb-w-3-4" />
      <div class="fb-demo-line fb-w-1-2" />
      <div class="fb-demo-block" />
      <div class="fb-demo-line fb-w-2-3" />
    </div>
    <FeedbackWidget :on-submit="submitFeedback" />
  </div>
</template>

<style scoped>
.fb-demo { position: relative; box-sizing: border-box; width: 100%; max-width: 28rem; height: 20rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); }
.fb-demo-bar { padding: .75rem 1.25rem; border-bottom: 1px solid var(--beui-border); }
.fb-demo-body { display: flex; flex-direction: column; gap: .75rem; padding: 1.25rem; }
.fb-demo-line { height: .625rem; border-radius: 9999px; background: color-mix(in srgb, var(--beui-muted-foreground) 15%, transparent); }
.fb-demo-line.is-strong { background: color-mix(in srgb, var(--beui-muted-foreground) 20%, transparent); }
.fb-w-24 { width: 6rem; }
.fb-w-3-4 { width: 75%; }
.fb-w-1-2 { width: 50%; }
.fb-w-2-3 { width: 66.666%; }
.fb-demo-block { width: 100%; height: 6rem; border-radius: .75rem; background: color-mix(in srgb, var(--beui-muted-foreground) 6%, transparent); }
</style>
