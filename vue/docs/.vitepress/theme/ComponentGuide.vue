<script setup lang="ts">
import type { CatalogGuide } from './catalog'
import { useLocale } from './i18n'

// beui.dev's ComponentGuide: "Composition" (tree + connected components) and "How it works".
const props = defineProps<{ guide: CatalogGuide }>()
const { t, href, isZh } = useLocale()

function lowercaseFirst(value: string) {
  return isZh.value ? value : value.charAt(0).toLowerCase() + value.slice(1)
}
</script>

<template>
  <div>
    <section id="composition" class="beui-guide-section">
      <h2>{{ t('Composition') }}</h2>
      <p>{{ props.guide.composition.description }}</p>
      <pre><code>{{ props.guide.composition.tree }}</code></pre>
      <p v-if="props.guide.connections.length" class="beui-guide-connections">
        <span class="beui-guide-note">{{ t('Note:') }}</span>{{ ' ' }}
        <span v-for="(connection, index) in props.guide.connections" :key="connection.slug">
          <template v-if="index > 0">{{ ' ' }}</template>
          <a :href="href(`/components/agents/${connection.slug}`)">{{ connection.name }}</a>{{ ' ' }}{{ lowercaseFirst(connection.description) }}
        </span>
      </p>
    </section>
    <section id="behavior" class="beui-guide-section">
      <h2>{{ t('How it works') }}</h2>
      <p>{{ props.guide.introduction }}</p>
    </section>
  </div>
</template>
