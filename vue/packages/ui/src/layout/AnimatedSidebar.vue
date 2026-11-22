<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { type SidebarCollapsible, type SidebarDestination, type SidebarSide, type SidebarVariant } from './animated-sidebar/context'
import AnimatedSidebarClose from './animated-sidebar/AnimatedSidebarClose.vue'
import AnimatedSidebarContent from './animated-sidebar/AnimatedSidebarContent.vue'
import AnimatedSidebarFooter from './animated-sidebar/AnimatedSidebarFooter.vue'
import AnimatedSidebarGroup from './animated-sidebar/AnimatedSidebarGroup.vue'
import AnimatedSidebarGroupContent from './animated-sidebar/AnimatedSidebarGroupContent.vue'
import AnimatedSidebarHeader from './animated-sidebar/AnimatedSidebarHeader.vue'
import AnimatedSidebarInset from './animated-sidebar/AnimatedSidebarInset.vue'
import AnimatedSidebarMenu from './animated-sidebar/AnimatedSidebarMenu.vue'
import AnimatedSidebarMenuButton from './animated-sidebar/AnimatedSidebarMenuButton.vue'
import AnimatedSidebarMenuItem from './animated-sidebar/AnimatedSidebarMenuItem.vue'
import AnimatedSidebarMenuSub from './animated-sidebar/AnimatedSidebarMenuSub.vue'
import AnimatedSidebarMenuSubButton from './animated-sidebar/AnimatedSidebarMenuSubButton.vue'
import AnimatedSidebarMenuSubItem from './animated-sidebar/AnimatedSidebarMenuSubItem.vue'
import AnimatedSidebarPanel from './animated-sidebar/AnimatedSidebarPanel.vue'
import AnimatedSidebarProvider from './animated-sidebar/AnimatedSidebarProvider.vue'
import AnimatedSidebarRail from './animated-sidebar/AnimatedSidebarRail.vue'
import AnimatedSidebarTrigger from './animated-sidebar/AnimatedSidebarTrigger.vue'

/**
 * With `items`: a zero-config shell, a sidebar built from the items with the page
 * content in the default slot. Without `items`: the sidebar panel of the compound
 * API (the upstream `AnimatedSidebar`), to be used inside `AnimatedSidebarProvider`
 * next to `AnimatedSidebarInset`.
 */
defineOptions({ inheritAttrs: false })
const { items, label = 'Workspace', shortcut = true, collapsible = 'icon', side = 'left', variant = 'sidebar', ariaLabel, panelClassName } = defineProps<{
  /** Builds the whole shell from data. Leave it out to compose the parts yourself. */
  items?: readonly SidebarDestination[]
  /** Accessible name of the shell in `items` mode. */
  label?: string
  shortcut?: boolean
  collapsible?: SidebarCollapsible
  /** Panel mode: which edge the sidebar sits on. */
  side?: SidebarSide
  /** Panel mode: surface style. */
  variant?: SidebarVariant
  /** Panel mode: accessible name of the sidebar. */
  ariaLabel?: string
  /** Panel mode: class of the sticky surface inside the width-animated wrapper. */
  panelClassName?: string
}>()
const active = defineModel<string>()
const open = defineModel<boolean>('open', { default: true })
const openSection = shallowRef<string | null>(null)

function select(item: SidebarDestination) {
  if (item.children?.length) openSection.value = openSection.value === item.id ? null : item.id
  else openSection.value = null
  active.value = item.id
}
</script>

<template>
  <AnimatedSidebarPanel v-if="!items" v-bind="$attrs" :side="side" :variant="variant" :collapsible="collapsible" :aria-label="ariaLabel" :panel-class-name="panelClassName">
    <slot />
  </AnimatedSidebarPanel>
  <AnimatedSidebarProvider v-else v-bind="$attrs" v-model:open="open" class="be-asb-shell" :shortcut="shortcut">
    <AnimatedSidebarPanel :aria-label="label" :collapsible="collapsible" class="be-asb-shell-panel" panel-class="be-asb-shell-surface">
      <AnimatedSidebarHeader>
        <div class="be-asb-shell-head">
          <slot name="header" :expanded="open"><strong class="be-asb-shell-title">{{ label }}</strong></slot>
          <AnimatedSidebarClose class="be-asb-mobile-only"><span aria-hidden="true">&times;</span></AnimatedSidebarClose>
        </div>
      </AnimatedSidebarHeader>
      <AnimatedSidebarContent>
        <AnimatedSidebarGroup>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              <AnimatedSidebarMenuItem v-for="item in items" :key="item.id">
                <AnimatedSidebarMenuButton
                  :is-active="active === item.id || item.children?.some(child => child.id === active) === true" :label="item.label" :href="item.href"
                  :aria-expanded="item.children?.length ? openSection === item.id : undefined" :badge="item.badge" :disabled="item.disabled"
                  @select="select(item)"
                >
                  <template #icon><slot name="icon" :item="item">{{ item.icon ?? item.label[0] }}</slot></template>
                  {{ item.label }}
                </AnimatedSidebarMenuButton>
                <AnimatedSidebarMenuSub v-if="item.children?.length" :open="openSection === item.id">
                  <AnimatedSidebarMenuSubItem v-for="child in item.children" :key="child.id">
                    <AnimatedSidebarMenuSubButton :is-active="active === child.id" :href="child.href" :disabled="child.disabled" @select="active = child.id">{{ child.label }}</AnimatedSidebarMenuSubButton>
                  </AnimatedSidebarMenuSubItem>
                </AnimatedSidebarMenuSub>
              </AnimatedSidebarMenuItem>
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
      </AnimatedSidebarContent>
      <AnimatedSidebarFooter v-if="$slots.footer"><slot name="footer" :expanded="open" /></AnimatedSidebarFooter>
      <AnimatedSidebarRail />
    </AnimatedSidebarPanel>
    <AnimatedSidebarInset class="be-asb-shell-inset">
      <div class="be-asb-shell-bar"><AnimatedSidebarTrigger class="be-asb-shell-trigger"><span aria-hidden="true">&#9703;</span></AnimatedSidebarTrigger></div>
      <div class="be-asb-shell-main"><slot :active="active" :toggle="() => (open = !open)" /></div>
    </AnimatedSidebarInset>
  </AnimatedSidebarProvider>
</template>

<style>
.be-asb-shell { min-height: 22rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); }
.be-asb-shell .be-asb-shell-surface { height: 100%; min-height: 22rem; }
.be-asb-shell .be-asb-shell-panel { min-height: 0; }
.be-asb-shell .be-asb-shell-inset { min-height: 0; }
.be-asb-shell-head { display: flex; align-items: center; justify-content: space-between; gap: .75rem; min-height: 2.75rem; padding: 0 .5rem; overflow: hidden; }
.be-asb-shell-title { font-size: .875rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.be-asb-shell-bar { display: flex; align-items: center; height: 4rem; padding: 0 1rem; border-bottom: 1px solid var(--beui-border); }
@media (min-width: 768px) { .be-asb-mobile-only { display: none; } }
.be-asb-shell-trigger { color: var(--beui-muted-foreground); }
.be-asb-shell-trigger:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.be-asb-shell-main { flex: 1 1 0%; min-height: 0; padding: 1.25rem; }
</style>
