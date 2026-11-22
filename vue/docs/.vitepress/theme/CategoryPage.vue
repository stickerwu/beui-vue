<script setup lang="ts">
import { computed } from 'vue'
import { localizePage, localizeSection, pages, sections } from './catalog'
import { useLocale } from './i18n'
import PreviewTile from './PreviewTile.vue'
import ProBlockLinks from './ProBlockLinks.vue'

const { category } = defineProps<{ category?: string }>()
const { isZh, t, href } = useLocale()
const locale = computed(() => (isZh.value ? 'zh' : 'en'))
const section = computed(() => {
  const found = sections.find(item => item.slug === category)
  return found ? localizeSection(found, locale.value) : undefined
})
const categoryPages = computed(() => section.value?.entries ?? pages.map(page => localizePage(page, locale.value)))
const recent = computed(() => categoryPages.value.filter(item => item.isNew))
const remaining = computed(() => categoryPages.value.filter(item => !item.isNew))
// beui.dev's AGENT_CATEGORY_GROUPS (src/routes/-pages/category-page.tsx) and Docs.category.agentGroups copy.
const agentGroups = computed(() => [
  { id: 'conversation', title: t('Conversation components'), description: t('Compose prompts, arrange sender-aware messages, shape conversational surfaces, and keep streamed turns stable while the reader moves through the transcript.'), slugs: ['prompt-input', 'message', 'message-bubble', 'message-scroller'] },
  { id: 'responses', title: t('Response and evidence components'), description: t('Render rich answers as they arrive, reveal completion actions at the right time, and connect generated claims to inspectable sources.'), slugs: ['streaming-response', 'image-generation', 'citations'] },
  { id: 'progress', title: t('Progress and planning components'), description: t('Communicate unknown waits, durable task plans, and chronological agent activity without inventing precision or exposing an unfiltered trace.'), slugs: ['loading-states', 'todo-list', 'agent-activity'] },
  { id: 'tools', title: t('Tool and code components'), description: t('Present execution outcomes, generated source, and file changes with bounded streaming, stable highlighting, and inspectable completion states.'), slugs: ['tool-result', 'code-block', 'file-diff'] },
  { id: 'human-control', title: t('Human-in-the-loop components'), description: t('Pause agent work for a scoped permission, clarification, review, or decision, then preserve the resolved outcome in the run history.'), slugs: ['tool-approval', 'approval-card'] },
])
const groups = computed(() => agentGroups.value.map(group => ({
  ...group,
  entries: group.slugs.flatMap(slug => categoryPages.value.filter(item => item.slug === slug)),
})).filter(group => group.entries.length))
</script>

<template>
  <article class="beui-category-page">
    <nav class="beui-breadcrumb" :aria-label="t('Breadcrumb')">
      <span>{{ section?.name ?? t('Components') }}</span>
    </nav>
    <h1>{{ section?.heading ?? t('All Vue components') }}</h1>
    <p class="beui-category-description">{{ section?.description ?? t('Animated components and interactive blocks, rebuilt for Vue 3 and Nuxt.') }}</p>
    <nav class="beui-mobile-platform" :aria-label="t('Component platform')">
      <span aria-current="page">Vue</span>
      <a :href="`https://beui.dev${section?.path ?? '/components/motion'}`" target="_blank" rel="noopener noreferrer">React ↗</a>
    </nav>
    <div v-if="category === 'agents'" class="beui-agent-groups">
      <section v-for="group in groups" :id="group.id" :key="group.id">
        <h2>{{ group.title }}</h2>
        <p>{{ group.description }}</p>
        <div class="beui-category-grid">
          <PreviewTile v-for="item in group.entries" :key="item.path" :page="item" detailed />
        </div>
      </section>
    </div>
    <template v-else>
      <section v-if="recent.length" class="beui-category-section">
        <h2>{{ t('New') }}</h2>
        <div class="beui-category-grid">
          <PreviewTile v-for="item in recent" :key="item.path" :page="item" detailed />
        </div>
      </section>
      <ProBlockLinks v-if="category" :page-key="category" category />
      <section class="beui-category-section">
        <h2>{{ section?.allLabel ?? t('All components') }}</h2>
        <div class="beui-category-grid">
          <PreviewTile v-for="item in remaining" :key="item.path" :page="item" detailed />
        </div>
      </section>
    </template>
  </article>
</template>
