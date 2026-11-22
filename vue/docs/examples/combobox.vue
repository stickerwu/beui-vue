<script setup lang="ts">
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxLabel, ComboboxList, ComboboxSeparator, ComboboxTrigger } from 'beui-vue'
import { ref } from 'vue'

// Mirrors components/previews/motion/combobox.preview.tsx.
const WORKSPACES = [
  { value: 'studio', label: 'Design studio', detail: '12 projects', group: 'Recent', icon: ['M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z', 'M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z', 'M8.916 17.912a1 1 0 0 0 0 1.415l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.415l-2.377-2.376a1 1 0 0 0-1.414 0z', 'M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z'] },
  { value: 'product', label: 'Product team', detail: '8 projects', group: 'Recent', icon: ['M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z', 'M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12', 'M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17'] },
  { value: 'playground', label: 'Playground', detail: '24 experiments', group: 'Workspaces', icon: ['M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2'], rect: true },
  { value: 'archive', label: 'Component archive', detail: '41 components', group: 'Workspaces', icon: ['M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z', 'm3.3 7 8.7 5 8.7-5', 'M12 22V12'] },
]
const GROUPS = ['Recent', 'Workspaces']
const value = ref('studio')
</script>
<template>
  <div class="cb-demo">
    <p class="cb-title">Workspace</p>
    <Combobox v-model="value">
      <ComboboxTrigger class="cb-trigger">
        <ComboboxInput aria-label="Search workspaces" placeholder="Search workspaces…" />
      </ComboboxTrigger>

      <ComboboxContent class="cb-content">
        <ComboboxList aria-label="Workspaces" class="cb-list">
          <ComboboxEmpty>No workspaces found.</ComboboxEmpty>
          <ComboboxGroup v-for="(group, groupIndex) in GROUPS" :key="group">
            <ComboboxSeparator v-if="groupIndex > 0" />
            <ComboboxLabel>{{ group }}</ComboboxLabel>
            <ComboboxItem v-for="workspace in WORKSPACES.filter(item => item.group === group)" :key="workspace.value" :value="workspace.value" :text-value="workspace.label" :keywords="[workspace.detail, workspace.group]" class="cb-item">
              <span class="cb-row">
                <span class="cb-mark" :data-tone="workspace.value">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path v-for="d in workspace.icon" :key="d" :d="d" /><rect v-if="workspace.rect" x="14" y="2" width="8" height="8" rx="1" /></svg>
                </span>
                <span class="cb-col">
                  <span class="cb-label">{{ workspace.label }}</span>
                  <span class="cb-detail">{{ workspace.detail }}</span>
                </span>
              </span>
            </ComboboxItem>
          </ComboboxGroup>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  </div>
</template>
<style>
/* Unscoped: the panel is portalled to <body>, outside this component's scope. */
.cb-demo { width: 100%; max-width: 18rem; }
.cb-title { margin: 0 0 .5rem; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; font-weight: 500; }
.be-combo-trigger.cb-trigger { height: 3rem; border-radius: 1rem; padding: 0 .625rem; }
.be-combo-panel.cb-content { width: 18rem; border-radius: 1rem; }
.be-combo-list.cb-list { padding: .5rem; }
.cb-row { display: flex; min-width: 0; align-items: center; gap: .625rem; }
.cb-mark { display: grid; width: 1.75rem; height: 1.75rem; flex: none; place-items: center; border-radius: .5rem; }
.cb-mark[data-tone=studio] { background: oklch(82.8% .189 84.429 / .2); color: oklch(55.5% .163 48.4); }
.cb-mark[data-tone=product] { background: oklch(74.6% .16 232.661 / .2); color: oklch(50% .134 242.749); }
.cb-mark[data-tone=playground] { background: oklch(76.5% .177 163.223 / .2); color: oklch(50.8% .118 165.612); }
.cb-mark[data-tone=archive] { background: oklch(71.2% .194 13.428 / .2); color: oklch(51.4% .222 16.935); }
.dark .cb-mark[data-tone=studio] { color: oklch(87.9% .169 91.605); }
.dark .cb-mark[data-tone=product] { color: oklch(82.8% .111 230.318); }
.dark .cb-mark[data-tone=playground] { color: oklch(84.5% .143 164.978); }
.dark .cb-mark[data-tone=archive] { color: oklch(81% .117 11.638); }
.cb-col { display: block; min-width: 0; }
.cb-label { display: block; overflow: hidden; color: var(--beui-foreground); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.cb-detail { display: block; overflow: hidden; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; text-overflow: ellipsis; white-space: nowrap; }
</style>
