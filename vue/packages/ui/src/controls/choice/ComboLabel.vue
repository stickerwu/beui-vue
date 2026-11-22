<script setup lang="ts">
import { inject } from 'vue'
import { COMBO_GROUP_KEY } from './combo-context'
import './combo.css'

/** The heading of a group (a `<legend>` inside one, a plain heading outside). */
defineSlots<{ default?(): unknown }>()
const groupId = inject(COMBO_GROUP_KEY, null)
</script>

<template>
  <legend v-if="groupId" class="be-combo-label"><slot /></legend>
  <div v-else class="be-combo-label"><slot /></div>
</template>
