<script setup lang="ts">
import { MorphingLightbox } from 'beui-vue'
const photographs = [
  { id:'architecture', photo:'1511818966892-d7d671e672a2', alt:'Sculptural architecture', caption:'01 / Form and light' },
  { id:'landscape', photo:'1500530855697-b586d89ba3ee', alt:'Open landscape', caption:'02 / A little room to breathe' },
  { id:'workspace', photo:'1497366754035-f200968a6e72', alt:'Light-filled workspace', caption:'03 / Places to make things' },
].map(image => ({ ...image, width:1600, height:2000, src:`https://images.unsplash.com/photo-${image.photo}?auto=format&fit=crop&w=1600&h=2000&q=85`, thumbnail:`https://images.unsplash.com/photo-${image.photo}?auto=format&fit=crop&w=420&h=525&q=80` }))
</script>
<template><div class="gallery"><strong>Look a little closer.</strong><MorphingLightbox :images="photographs" label="Collected photographs" /></div></template>
<style scoped>.gallery { width:min(34rem,100%); } strong { display:block; margin-bottom:1rem; }</style>
