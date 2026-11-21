<script setup lang="ts">
import { MultiSelect } from 'beui-vue'
import { ref } from 'vue'

// Mirrors components/previews/motion/multi-select.preview.tsx.
const teams = ref(['design', 'engineering'])
const options = [
  { value: 'design', label: 'Design', group: 'Product teams' },
  { value: 'engineering', label: 'Engineering', group: 'Product teams' },
  { value: 'product', label: 'Product', group: 'Product teams' },
  { value: 'research', label: 'Research', group: 'Product teams' },
  { value: 'marketing', label: 'Marketing', group: 'Business teams' },
  { value: 'operations', label: 'Operations', group: 'Business teams' },
]
</script>
<template>
  <div class="ms-demo">
    <div class="ms-box">
      <MultiSelect v-model="teams" :options="options" label="Search teams" placeholder="Choose teams" empty="No teams found." :labels="{ listLabel: 'Teams' }">
        <template #option="{ option }">
          <span class="ms-row">
            <svg class="ms-dot" :data-tone="option.value" aria-hidden="true" viewBox="0 0 24 24" width="10" height="10" fill="currentColor" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /></svg>
            {{ option.label }}
          </span>
        </template>
      </MultiSelect>
    </div>
  </div>
</template>
<style scoped>
.ms-demo { display: flex; width: 100%; min-height: 420px; box-sizing: border-box; align-items: flex-start; justify-content: center; padding: 6rem 1rem 0; }
.ms-box { width: 100%; max-width: 24rem; }
.ms-row { display: flex; align-items: center; gap: .625rem; }
.ms-dot { flex: none; }
.ms-dot[data-tone=design] { color: oklch(64.5% .246 16.439); }
.ms-dot[data-tone=engineering] { color: oklch(68.5% .169 237.323); }
.ms-dot[data-tone=product] { color: oklch(76.9% .188 70.08); }
.ms-dot[data-tone=research] { color: oklch(60.6% .25 292.717); }
.ms-dot[data-tone=marketing] { color: oklch(69.6% .17 162.48); }
.ms-dot[data-tone=operations] { color: oklch(55.4% .046 257.417); }
</style>
