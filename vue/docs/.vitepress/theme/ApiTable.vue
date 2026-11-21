<script setup lang="ts">
import { useLocale } from './i18n'

defineProps<{ rows: { name: string; type: string; required: boolean }[] }>()
const { t } = useLocale()
</script>

<template>
  <div v-if="rows.length" class="beui-api-table">
    <div class="beui-api-heading" aria-hidden="true"><span>{{ t('Prop') }}</span><span>{{ t('Type') }}</span><span>{{ t('Required') }}</span></div>
    <dl>
      <div v-for="row in rows" :key="row.name" class="beui-api-row">
        <dt><code>{{ row.name }}{{ row.required ? '' : '?' }}</code></dt>
        <dd><code>{{ row.type }}</code></dd>
        <dd><span class="beui-sr-only">{{ t('Required ') }}</span>{{ row.required ? t('Yes') : '—' }}</dd>
      </div>
    </dl>
  </div>
</template>
