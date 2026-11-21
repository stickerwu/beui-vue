<script setup lang="ts">
import { MorphingSearchChips } from 'beui-vue'

const tiles = [
  'linear-gradient(to bottom right, rgb(251 113 133 / .4), rgb(253 186 116 / .3))',
  'linear-gradient(to bottom right, rgb(56 189 248 / .4), rgb(129 140 248 / .3))',
  'linear-gradient(to bottom right, rgb(52 211 153 / .4), rgb(94 234 212 / .3))',
  'linear-gradient(to bottom right, rgb(252 211 77 / .4), rgb(253 164 175 / .3))',
  'linear-gradient(to bottom right, rgb(167 139 250 / .4), rgb(240 171 252 / .3))',
  'linear-gradient(to bottom right, rgb(94 234 212 / .4), rgb(125 211 252 / .3))',
]
const suggestions = ['dashboards', 'data tables', 'dark mode', 'empty states', 'onboarding', 'pricing pages', 'settings', 'sign in']
</script>

<template>
  <div class="inspiration">
    <div aria-hidden="true" class="inspiration-tiles">
      <div v-for="tile in tiles" :key="tile" class="inspiration-tile" :style="{ backgroundImage: tile }" />
    </div>
    <MorphingSearchChips class="inspiration-search" placeholder="Search inspiration" label="Search inspiration" :default-chips="['onboarding']"
      :default-recents="['dashboards', 'empty states', 'pricing pages']" storage-key="beui:morphing-search-chips:recents" :max-chips="4"
      :suggestions="suggestions" />
  </div>
</template>

<style scoped>
.inspiration { position: relative; display: flex; box-sizing: border-box; height: 440px; width: 100%; max-width: 42rem; flex-direction: column; justify-content: flex-end; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1.5rem; background: color-mix(in srgb, var(--beui-muted) 40%, transparent); padding: 1rem; }
.inspiration-tiles { position: absolute; inset: 1rem; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; opacity: .8; }
.inspiration-tile { border-radius: 1rem; }
.inspiration-search { margin-inline: auto; }
</style>
