<script setup lang="ts">
import { PreviewRail } from 'beui-vue'
const items = [
  ['Dashboard','Your workspace at a glance.'], ['Components','Motion components for everyday interfaces.'],
  ['Blocks','Ready-to-use sections.'], ['Playground','Explore interactive examples.'],
  ['Documentation','Installation and API details.'], ['Changelog','Recent releases and updates.'],
  ['Sponsors','Meet the project supporters.'], ['beUI Pro','Premium templates and sections.'],
  ['Examples','Patterns in practice.'], ['Templates','Full page layouts.'], ['Guides','Step-by-step walkthroughs.'],
  ['Community','Discuss your projects.'], ['GitHub','Browse the source.'], ['About','The story behind the library.'],
].map(([label,description],index) => ({id:`section-${index}`,label:label!,description}))
</script>
<template><PreviewRail :items="items" label="Section previews" :item-size="20"><span>Hover, tap or focus a mark.</span></PreviewRail></template>
<style scoped>span { color:var(--beui-muted-foreground); font-size:.8rem; }</style>
