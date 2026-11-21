<script setup lang="ts">
import { MorphingLightbox } from 'beui-vue'

const photographs = [
  { id: 'architecture', photo: '1511818966892-d7d671e672a2', alt: 'Sculptural architecture', caption: '01 / Form and light' },
  { id: 'landscape', photo: '1500530855697-b586d89ba3ee', alt: 'Open landscape', caption: '02 / A little room to breathe' },
  { id: 'workspace', photo: '1497366754035-f200968a6e72', alt: 'Light-filled workspace', caption: '03 / Places to make things' },
].map(image => ({
  ...image,
  width: 1600,
  height: 2000,
  src: `https://images.unsplash.com/photo-${image.photo}?auto=format&fit=crop&w=1600&h=2000&q=85`,
  thumbnail: `https://images.unsplash.com/photo-${image.photo}?auto=format&fit=crop&w=420&h=525&q=80`,
}))
</script>

<template>
  <div class="gallery">
    <div class="head">
      <div>
        <p class="eyebrow">Collected moments</p>
        <h3 class="title">Look a little closer.</h3>
      </div>
      <span class="count">3 photographs</span>
    </div>
    <MorphingLightbox :images="photographs" label="Collected photographs" />
    <p class="hint">Open a photograph. Swipe or use the arrows to explore.</p>
  </div>
</template>

<style scoped>
.gallery { width: 100%; max-width: 36rem; }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: .75rem; margin-bottom: 1.25rem; }
.eyebrow { margin: 0 0 .25rem; font-size: 10px; line-height: 1.5; font-weight: 500; text-transform: uppercase; letter-spacing: .18em; color: var(--beui-muted-foreground); }
.title { margin: 0; padding: 0; border: 0; font-size: 1.125rem; line-height: 1.75rem; font-weight: 500; letter-spacing: -.025em; color: var(--beui-foreground); }
.count { font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.hint { margin: 1rem 0 0; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
</style>
