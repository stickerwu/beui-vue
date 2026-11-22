<script setup lang="ts">
import { useLocale } from './i18n'

export interface ApiRow {
  name: string
  type: string
  required: boolean
  defaultValue: string | null
  description: string
}
export interface ApiDoc {
  displayName: string
  rows: ApiRow[]
}

// Same layout as beui.dev's PropsTable: Prop / Type (with description) / Default,
// one card per documented component, titled when a file documents several.
const props = withDefaults(defineProps<{
  docs: ApiDoc[]
  id: string
  heading: string
  /** Page-level section (border, 48px gap) rather than a block inside an example. */
  section?: boolean
}>(), { section: false })
const { t } = useLocale()
</script>

<template>
  <component
    :is="props.section ? 'section' : 'div'"
    v-if="props.docs.length"
    :id="props.id"
    :class="props.section ? 'beui-doc-section' : 'beui-example-section'"
  >
    <h2 class="beui-section-title">{{ props.heading }}</h2>
    <div class="beui-api-docs" :class="{ 'is-section': props.section }">
      <div v-for="doc in props.docs" :key="doc.displayName">
        <h3 v-if="props.docs.length > 1" class="beui-api-name">{{ doc.displayName }}</h3>
        <div class="beui-api-table">
          <div class="beui-api-heading" aria-hidden="true">
            <span>{{ t('Prop') }}</span>
            <span>{{ t('Type') }}</span>
            <span class="beui-api-default-heading">{{ t('Default') }}</span>
          </div>
          <div class="beui-api-rows">
            <div v-for="row in doc.rows" :key="row.name" class="beui-api-row">
              <code class="beui-api-code">{{ row.name }}{{ row.required ? '' : '?' }}</code>
              <div class="beui-api-type">
                <code class="beui-api-code">{{ row.type }}</code>
                <p v-if="row.description">{{ row.description }}</p>
              </div>
              <div class="beui-api-default">
                <span class="beui-api-default-label">{{ t('Default') }}</span>
                <code class="beui-api-code">{{ row.defaultValue ?? '—' }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </component>
</template>
