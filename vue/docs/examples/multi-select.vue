<script setup lang="ts">
import { MultiSelect, MultiSelectContent, MultiSelectEmpty, MultiSelectGroup, MultiSelectInput, MultiSelectItem, MultiSelectLabel, MultiSelectList, MultiSelectTrigger, MultiSelectValue } from 'beui-vue'

// Mirrors components/previews/motion/multi-select.preview.tsx.
const GROUPS = [
  { label: 'Product teams', teams: [{ value: 'design', label: 'Design' }, { value: 'engineering', label: 'Engineering' }, { value: 'product', label: 'Product' }, { value: 'research', label: 'Research' }] },
  { label: 'Business teams', teams: [{ value: 'marketing', label: 'Marketing' }, { value: 'operations', label: 'Operations' }] },
]
</script>
<template>
  <div class="ms-demo">
    <div class="ms-box">
      <MultiSelect :default-value="['design', 'engineering']">
        <MultiSelectTrigger>
          <MultiSelectValue placeholder="Choose teams" />
          <MultiSelectInput aria-label="Search teams" />
        </MultiSelectTrigger>
        <MultiSelectContent>
          <MultiSelectList aria-label="Teams">
            <MultiSelectGroup v-for="group in GROUPS" :key="group.label">
              <MultiSelectLabel>{{ group.label }}</MultiSelectLabel>
              <MultiSelectItem v-for="team in group.teams" :key="team.value" :value="team.value" :text-value="team.label">
                <span class="ms-row">
                  <svg class="ms-dot" :data-tone="team.value" aria-hidden="true" viewBox="0 0 24 24" width="10" height="10" fill="currentColor" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /></svg>
                  {{ team.label }}
                </span>
              </MultiSelectItem>
            </MultiSelectGroup>
            <MultiSelectEmpty>No teams found.</MultiSelectEmpty>
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
    </div>
  </div>
</template>
<style>
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
