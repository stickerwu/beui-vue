<script setup lang="ts">
import { Parallax } from 'beui-vue'
import { useTemplateRef } from 'vue'
const region = useTemplateRef('region')
</script>
<template><div ref="region" role="region" aria-label="Layered landscape" tabindex="0" class="parallax-frame"><div class="hint">Scroll down ↓</div>
  <div class="scene">
    <Parallax class="landscape" :container="region" :speed="-.6"><img src="https://picsum.photos/seed/beui-parallax/800/600" width="800" height="600" alt="" /></Parallax>
    <Parallax class="label" :container="region" :speed=".5"><span>Parallax</span></Parallax>
    <Parallax class="avatar" :container="region" :speed=".9"><img src="https://picsum.photos/seed/beui-avatar/120/120" width="48" height="48" alt="" /></Parallax>
  </div><div class="hint">↑ Scroll up</div></div></template>
<style scoped>.parallax-frame { height: min(600px, 65vh); width: 100%; max-width: 42rem; overflow: auto; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-card); } .hint { height: 20rem; display: grid; place-items: center; font-size: .875rem; color: var(--beui-muted-foreground); } .scene { position: relative; height: 24rem; overflow: hidden; } .landscape { position: absolute; inset: -25% 0; } .landscape img { width: 100%; height: 100%; object-fit: cover; } .label { position: absolute; inset: 0; display: grid; place-items: center; } .label span { border-radius: 999px; background: var(--beui-background); padding: .5rem 1.25rem; } .avatar { position: absolute; bottom: 1rem; right: 1rem; } .avatar img { width: 3rem; height: 3rem; border: 2px solid var(--beui-background); border-radius: 50%; object-fit: cover; }</style>
