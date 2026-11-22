<script setup lang="ts">
import { Parallax } from 'beui-vue'
import { useTemplateRef } from 'vue'
// On a real page <Parallax> tracks the viewport. Here it is scoped to the box via the `container` prop.
// Scroll inside the box: the background image drifts against the scroll, the label and avatar drift with it at different speeds.
const region = useTemplateRef('region')
</script>
<template>
  <div ref="region" role="region" aria-label="Layered landscape" tabindex="0" class="parallax-frame">
    <div class="hint">Scroll down ↓</div>
    <div class="scene">
      <Parallax class="landscape" :container="region" :speed="-.6"><img class="photo" src="https://picsum.photos/seed/beui-parallax/800/600" width="800" height="600" alt="" /></Parallax>
      <Parallax class="label" :container="region" :speed=".5"><span class="pill">Parallax</span></Parallax>
      <Parallax class="avatar" :container="region" :speed=".9"><img class="face" src="https://picsum.photos/seed/beui-avatar/120/120" width="48" height="48" alt="" /></Parallax>
    </div>
    <div class="hint">↑ Scroll up</div>
  </div>
</template>
<style scoped>
.parallax-frame { box-sizing: border-box; position: relative; height: 600px; width: 100%; max-width: 42rem; overflow-y: auto; scrollbar-width: none; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-card); }
.parallax-frame::-webkit-scrollbar { display: none; }
.hint { display: flex; height: 20rem; align-items: center; justify-content: center; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.scene { position: relative; height: 24rem; overflow: hidden; }
.landscape { position: absolute; left: 0; right: 0; top: -25%; height: 150%; }
.photo { display: block; width: 100%; height: 100%; object-fit: cover; }
.label { position: absolute; inset: 0; display: grid; place-items: center; }
.pill { border-radius: 999px; background: color-mix(in srgb, var(--beui-background) 85%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); padding: .5rem 1.25rem; font-size: 1rem; line-height: 1.5rem; font-weight: 500; color: var(--beui-foreground); }
.avatar { position: absolute; bottom: 1rem; right: 1rem; }
.face { display: block; width: 3rem; height: 3rem; border: 2px solid var(--beui-background); border-radius: 50%; object-fit: cover; box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
</style>
