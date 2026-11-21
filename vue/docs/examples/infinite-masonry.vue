<script setup lang="ts">
import { computed, ref } from 'vue'
import { InfiniteMasonry } from 'beui-vue'

type GalleryItem = { id: string; title: string; category: string; image: string; imageHeight: number }

const PAGE_SIZE = 6
const MAX_ITEMS = 42
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=720&q=80`
const gallerySource = [
  { title: 'Soft geometry', category: 'Architecture', image: photo('1511818966892-d7d671e672a2'), imageHeight: 260 },
  { title: 'Open horizon', category: 'Landscape', image: photo('1500530855697-b586d89ba3ee'), imageHeight: 190 },
  { title: 'Working rhythm', category: 'Workspace', image: photo('1497366754035-f200968a6e72'), imageHeight: 230 },
  { title: 'Shared table', category: 'Studio', image: photo('1524758631624-e2822e304c36'), imageHeight: 300 },
  { title: 'In session', category: 'People', image: photo('1521737711867-e3b97375f902'), imageHeight: 210 },
  { title: 'After hours', category: 'Office', image: photo('1504384308090-c894fdcc538d'), imageHeight: 280 },
] as const

function createItems(start: number, count: number): GalleryItem[] {
  return Array.from({ length: count }, (_, offset) => {
    const index = start + offset
    const source = gallerySource[index % gallerySource.length]!
    return { ...source, id: `gallery-${index}`, title: `${source.title} ${Math.floor(index / gallerySource.length) + 1}` }
  })
}

const items = ref(createItems(0, 12))
const loading = ref(false)
const hasMore = computed(() => items.value.length < MAX_ITEMS)

async function loadMore() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 650))
  const count = Math.min(PAGE_SIZE, MAX_ITEMS - items.value.length)
  if (count > 0) items.value = [...items.value, ...createItems(items.value.length, count)]
  loading.value = false
}
</script>

<template>
  <div class="gallery">
    <div class="gallery-head">
      <div>
        <p class="gallery-title">Visual index</p>
        <p class="gallery-hint">Scroll to load the next page</p>
      </div>
      <p class="gallery-count">{{ items.length }} items</p>
    </div>

    <InfiniteMasonry class="gallery-masonry" :items="items" :get-item-key="item => item.id" :on-load-more="loadMore" :has-more="hasMore"
      :loading="loading" :estimate-size="item => item.imageHeight + 66" aria-label="Visual inspiration gallery">
      <template #default="{ item }">
        <figure class="card">
          <div class="card-photo" :style="{ height: `${item.imageHeight}px` }">
            <img :src="item.image" :alt="item.title" loading="lazy" decoding="async">
          </div>
          <figcaption class="card-caption">
            <p class="card-name">{{ item.title }}</p>
            <p class="card-category">{{ item.category }}</p>
          </figcaption>
        </figure>
      </template>
    </InfiniteMasonry>
  </div>
</template>

<style scoped>
.gallery { width: 100%; max-width: 64rem; }
.gallery-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: .75rem; padding-inline: .25rem; }
.gallery-head p { margin: 0; }
.gallery-title { font-size: .875rem; line-height: 1.25rem; font-weight: 600; color: var(--beui-foreground); }
.gallery-hint { margin-top: .125rem !important; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.gallery-count { font-family: var(--font-mono, "Geist Mono Variable", "Geist Mono", ui-monospace, monospace); font-size: .75rem; line-height: 1rem; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.gallery-masonry { height: 34rem; }
.card { margin: 0; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-card); }
.card-photo { position: relative; width: 100%; overflow: hidden; }
.card-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.card-caption { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; padding: .75rem; }
.card-caption p { margin: 0; }
.card-name { font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.card-category { flex-shrink: 0; font-size: 10px; line-height: 1rem; letter-spacing: .05em; text-transform: uppercase; color: var(--beui-muted-foreground); }
</style>
