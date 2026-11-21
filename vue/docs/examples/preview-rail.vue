<script setup lang="ts">
import { PreviewRail } from 'beui-vue'

const items = [
  { id: 'dashboard', label: 'Dashboard', description: 'Return to your workspace overview and recent activity.' },
  { id: 'components', label: 'Components', description: 'Browse motion primitives for React and Next.js.' },
  { id: 'blocks', label: 'Blocks', description: 'Explore composed, product-ready interface blocks.' },
  { id: 'playground', label: 'Playground', description: 'Tune motion values and preview behavior live.' },
  { id: 'docs', label: 'Documentation', description: 'Read installation, usage, and API reference notes.' },
  { id: 'changelog', label: 'Changelog', description: 'Review newly launched components and improvements.' },
  { id: 'sponsors', label: 'Sponsors', description: 'Support continued development of the open-source library.' },
  { id: 'pro', label: 'beUI Pro', description: 'Get premium components and lifetime access.' },
  { id: 'examples', label: 'Examples', description: 'See components composed in practical interface patterns.' },
  { id: 'templates', label: 'Templates', description: 'Start from polished layouts built with beUI components.' },
  { id: 'guides', label: 'Guides', description: 'Learn how to combine motion primitives effectively.' },
  { id: 'community', label: 'Community', description: 'Discover what other builders are creating with beUI.' },
  { id: 'github', label: 'GitHub', description: 'View the source, report issues, and contribute improvements.' },
  { id: 'about', label: 'About', description: 'Learn more about the ideas and people behind beUI.' },
].map(item => ({ ...item, href: `#${item.id}` }))
</script>

<template>
  <div class="stack">
    <PreviewRail :items="items" default-active-id="docs" class="rail vertical" />
    <PreviewRail :items="items" orientation="horizontal" default-active-id="docs" class="rail horizontal" />
  </div>
</template>

<style scoped>
.stack { display: flex; width: 100%; flex-direction: column; gap: 2rem; }
.rail { margin-inline: auto; width: 100%; max-width: 42rem; }
.vertical { height: 360px; }
.horizontal { height: 280px; }
</style>
