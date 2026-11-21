<script setup lang="ts">
import { AspectRatio, AspectRatioImage, Tabs } from 'beui-vue'
import { computed, shallowRef } from 'vue'

const current = shallowRef('16:9')
const items = ['21:9', '16:9', '3:2', '4:3', '1:1', '4:5', '3:4', '2:3', '9:16'].map(value => ({ value, label: value }))
const ratio = computed(() => {
  const [width, height] = current.value.split(':').map(Number)
  return width / height
})
</script>

<template>
  <div class="aspect-demo">
    <Tabs v-model="current" class="ratio-tabs" :items="items" :labels="{ list: 'Aspect ratio' }" />
    <div class="media-frame" role="tabpanel" tabindex="0" :aria-label="`Aspect ratio ${current}`">
      <AspectRatio class="box" :ratio="ratio" :style="{ maxWidth: `${Math.min(440, 360 * ratio)}px`, borderRadius: '16px' }">
        <AspectRatioImage src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&amp;fit=crop&amp;w=1000&amp;q=80" alt="A lakeside cabin beneath mountains, reflected in the water" :width="1000" :height="667" />
      </AspectRatio>
    </div>
  </div>
</template>

<style scoped>
.aspect-demo { box-sizing: border-box; width: 100%; min-width: 0; max-width: 36rem; margin-inline: auto; padding: 1.5rem 1rem; }
.media-frame { display: flex; justify-content: center; align-items: center; width: 100%; height: 25rem; margin-top: 1.5rem; border-radius: 1rem; outline: none; }
.media-frame:focus-visible { outline: 2px solid var(--beui-ring); }
.box { background: var(--beui-muted); }
/* A neutral segmented list: the selected pill is the page background and its label stays foreground. */
.ratio-tabs :deep(.be-indicator) { background: var(--beui-background); }
.ratio-tabs :deep(.be-trigger) { min-height: 2.25rem; padding: 0 .75rem; font-size: .75rem; line-height: 1rem; }
.ratio-tabs :deep(.be-trigger[aria-selected=true]), .ratio-tabs :deep(.be-ink) { color: var(--beui-foreground); }
</style>
