<script setup lang="ts">
import { useComboContext } from './combo-context'
import './combo.css'

/** Shown while the filter leaves no options. */
defineSlots<{ default?(): unknown }>()
const context = useComboContext('ComboboxEmpty')
</script>

<template>
  <div v-if="context.visibleCount.value === 0" role="status" class="be-combo-empty"><slot>{{ context.t('empty') }}</slot></div>
</template>
