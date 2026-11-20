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
    <Tabs v-model="current" :items="items" :labels="{ list: 'Aspect ratio' }" />
    <div class="media-frame">
      <AspectRatio :ratio="ratio" :style="{ maxWidth: `${Math.min(440, 360 * ratio)}px`, borderRadius: '16px' }">
        <AspectRatioImage src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&amp;fit=crop&amp;w=1000&amp;q=80" alt="A lakeside cabin beneath mountains, reflected in the water" :width="1000" :height="667" />
      </AspectRatio>
    </div>
  </div>
</template>

<style scoped>
.aspect-demo { box-sizing: border-box; width: 100%; min-width: 0; max-width: 36rem; padding: 1rem; }
.media-frame { display: flex; justify-content: center; align-items: center; height: 25rem; margin-top: 1.5rem; }
</style>
