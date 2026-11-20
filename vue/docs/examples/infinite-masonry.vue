<script setup lang="ts">
import { ref } from 'vue'
import { InfiniteMasonry } from 'beui-vue'
const names = ['Research','Sketches','Prototype','Design review','Notes','Archive','Iterations','Typography','Components','Palette','Handoff','Release']
const items = ref(names.slice(0,4))
function height(name:string) { return 55 + name.length * 6 }
async function load() {
  await new Promise(resolve => setTimeout(resolve,250))
  items.value = names.slice(0,items.value.length+4)
}
</script>
<template><InfiniteMasonry :items="items" :get-item-key="name=>name" :estimate-size="height" :has-more="items.length < names.length" :on-load-more="load" :min-column-width="120"><template #default="{item}"><div class="tile" :style="{height:`${height(item)}px`}">{{ item }}</div></template></InfiniteMasonry></template>
<style scoped>.tile{display:grid;align-items:end;padding:.65rem;border-radius:.65rem;background:linear-gradient(145deg,var(--beui-muted),var(--beui-border));font-weight:600}</style>
