<script setup lang="ts">
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from 'beui-vue'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
const path = ['Workspace','Projects','Website','Design system','Components','Navigation','Breadcrumb']
const depth = ref(5)
const root = useTemplateRef('root')
const crumbs = computed(() => path.slice(0, depth.value + 1))
function select(index: number) {
  depth.value = index
  nextTick(() => root.value?.querySelector<HTMLElement>('[aria-current="page"]')?.focus())
}
function navigate(event: MouseEvent, index: number) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  select(index)
}
</script>
<template>
  <div ref="root" class="path-demo">
    <Breadcrumb class="path-crumb">
      <BreadcrumbList :max-items="3">
        <BreadcrumbItem v-for="(label, index) in crumbs" :key="label">
          <BreadcrumbSeparator v-if="index > 0" />
          <BreadcrumbPage v-if="index === depth" tabindex="-1">
            <svg v-if="index === 0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            {{ label }}
          </BreadcrumbPage>
          <BreadcrumbLink v-else :href="`#${label.toLowerCase()}`" @click="navigate($event, index)">
            <svg v-if="index === 0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            {{ label }}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    <div class="path-next">
      <button v-if="depth < path.length - 1" type="button" class="path-button" @click="select(depth + 1)">
        <svg aria-hidden="true" class="path-folder" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
        <span class="path-label">{{ path[depth + 1] }}</span>
        <svg aria-hidden="true" class="path-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
      </button>
      <p v-else class="path-done">Choose a parent path to go back.</p>
    </div>
  </div>
</template>
<style scoped>
.path-demo { display: grid; width: 100%; max-width: 32rem; gap: 2rem; padding: 0 1rem; box-sizing: border-box; }
.path-crumb { min-height: 2rem; }
@media (max-width: 639px) { .path-crumb { min-height: 4.25rem; } }
.path-next { min-height: 5rem; border-top: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); padding-top: 1.25rem; }
.path-button { display: flex; width: 100%; align-items: center; gap: .75rem; box-sizing: border-box; padding: .75rem 1rem; border: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); border-radius: .5rem; background: none; color: inherit; font: inherit; font-size: .875rem; text-align: start; cursor: pointer; transition: background-color .15s; }
.path-button:hover { background: color-mix(in srgb, var(--beui-muted) 40%, transparent); }
.path-button:focus-visible { outline: 2px solid var(--beui-ring); }
.path-label { flex: 1; }
.path-folder { width: 1rem; height: 1rem; color: var(--beui-muted-foreground); }
.path-arrow { width: .875rem; height: .875rem; color: var(--beui-muted-foreground); }
.path-done { margin: 0; padding: .75rem 0; text-align: center; font-size: .875rem; color: var(--beui-muted-foreground); }
</style>
