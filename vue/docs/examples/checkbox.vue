<script setup lang="ts">
import { Checkbox } from 'beui-vue'
import { ref } from 'vue'
import { usePreviewVariant } from './use-preview-variant'
const { variant, select } = usePreviewVariant('description')
const terms = ref(true)
const updates = ref(false)
const comments = ref(true)
const mentions = ref(true)
const digest = ref(false)
</script>
<template>
  <div class="choices">
    <label>Example <select :value="variant" @change="select(($event.target as HTMLSelectElement).value)"><option value="default">Default</option><option value="description">Description</option></select></label>
    <template v-if="variant==='description'">
      <Checkbox v-model="comments" label="Comments" description="Replies on threads you started."/>
      <Checkbox v-model="mentions" label="Mentions" description="Whenever someone tags you by name."/>
      <Checkbox v-model="digest" label="Weekly digest" description="A summary of activity every Monday."/>
      <Checkbox disabled label="SMS alerts" description="Add a phone number to enable."/>
    </template>
    <template v-else>
    <Checkbox v-model="terms" label="Accept terms and conditions" />
    <Checkbox v-model="updates" label="Email me product updates" />
    <Checkbox :model-value="true" indeterminate label="Select all (partial)" />
    <Checkbox :model-value="true" disabled label="Disabled" />
    </template>
  </div>
</template>
<style scoped>.choices { display: grid; gap: .75rem; }</style>
