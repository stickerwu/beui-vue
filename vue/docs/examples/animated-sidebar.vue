<script setup lang="ts">
import { ref } from 'vue'
import {
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarMenuSub,
  AnimatedSidebarMenuSubButton,
  AnimatedSidebarMenuSubItem,
  AnimatedSidebar,
  AnimatedSidebarProvider,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
} from 'beui-vue'
import { LucideIcon } from './layout-icons'

const destinations = [
  { label: 'People', icon: 'CircleUserRound', children: ['All people', 'Recent activity', 'Segments'] },
  { label: 'Companies', icon: 'Building2' },
  { label: 'Opportunities', icon: 'Target', children: ['Pipeline', 'Forecast', 'Closed deals'] },
  { label: 'Tasks', icon: 'ListTodo' },
  { label: 'Notes', icon: 'NotebookTabs' },
  { label: 'Workflows', icon: 'Workflow', children: ['Automations', 'Runs', 'Templates'] },
  { label: 'Dashboard', icon: 'LayoutGrid' },
] as { label: string; icon: string; children?: string[] }[]

const quick = [
  { label: 'Search', icon: 'Search', badge: undefined },
  { label: 'AI Assistant', icon: 'Sparkles', badge: undefined },
  { label: 'Inbox', icon: 'Inbox', badge: '4' },
]

const person = 'Ava Stone'
const email = 'ava@solace.app'
const greeting = 'Ava'

const active = ref('People')
const openSection = ref<string | null>(null)

function selectDestination(label: string, children?: string[]) {
  if (!children) {
    active.value = label
    openSection.value = null
    return
  }
  openSection.value = openSection.value === label ? null : label
}
</script>

<template>
  <div class="sidebar-demo">
    <AnimatedSidebarProvider class="sidebar-shell">
      <AnimatedSidebar aria-label="Solace workspace" collapsible="icon" class="sidebar-panel" panel-class-name="sidebar-surface">
        <AnimatedSidebarHeader class="sidebar-header">
          <div class="brand-row">
            <div class="brand-mark"><LucideIcon name="Command" :size="16" /></div>
            <button type="button" class="team-button">
              <span class="team-name">Acme Inc</span>
              <LucideIcon name="ChevronsUpDown" :size="14" class="muted" />
            </button>
            <AnimatedSidebarClose class="sidebar-close"><LucideIcon name="X" :size="16" /></AnimatedSidebarClose>
          </div>
        </AnimatedSidebarHeader>

        <AnimatedSidebarContent class="sidebar-content">
          <AnimatedSidebarGroup class="group-first">
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                <AnimatedSidebarMenuItem v-for="item in quick" :key="item.label">
                  <AnimatedSidebarMenuButton :badge="item.badge" @select="active = item.label">
                    <template #icon><LucideIcon :name="item.icon" :size="16" /></template>
                    {{ item.label }}
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>

          <AnimatedSidebarGroup class="group-second">
            <AnimatedSidebarGroupLabel>Workspaces</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                <AnimatedSidebarMenuItem v-for="item in destinations" :key="item.label">
                  <AnimatedSidebarMenuButton
                    :is-active="active === item.label || item.children?.includes(active) === true"
                    :aria-expanded="item.children ? openSection === item.label : undefined"
                    @select="selectDestination(item.label, item.children)"
                  >
                    <template #icon><LucideIcon :name="item.icon" :size="16" /></template>
                    {{ item.label }}
                  </AnimatedSidebarMenuButton>
                  <AnimatedSidebarMenuSub v-if="item.children" :open="openSection === item.label">
                    <AnimatedSidebarMenuSubItem v-for="child in item.children" :key="child">
                      <AnimatedSidebarMenuSubButton :is-active="active === child" @select="active = child">{{ child }}</AnimatedSidebarMenuSubButton>
                    </AnimatedSidebarMenuSubItem>
                  </AnimatedSidebarMenuSub>
                </AnimatedSidebarMenuItem>
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>

        <AnimatedSidebarFooter class="sidebar-footer">
          <button type="button" class="account-button">
            <span class="avatar">AS</span>
            <span class="account-text">
              <span class="account-name">{{ person }}</span>
              <span class="account-email">{{ email }}</span>
            </span>
            <LucideIcon name="ChevronRight" :size="16" class="muted account-chevron" />
          </button>
        </AnimatedSidebarFooter>

        <AnimatedSidebarRail />
      </AnimatedSidebar>

      <AnimatedSidebarInset class="sidebar-inset">
        <header class="inset-header">
          <AnimatedSidebarTrigger class="inset-trigger"><LucideIcon name="PanelLeft" :size="16" /></AnimatedSidebarTrigger>
          <div class="divider" />
          <p class="active-title">{{ active }}</p>
        </header>

        <div class="inset-body">
          <div>
            <p class="date">Wednesday, July 29</p>
            <h3 class="greeting">Good morning, {{ greeting }}.</h3>
            <p class="intro">Your workspace stays in place while the navigation folds down to a focused icon rail.</p>
          </div>

          <div class="inset-foot">
            <div>
              <p class="foot-label">Active view</p>
              <p class="foot-value">{{ active }}</p>
            </div>
            <p class="foot-hint">Press ⌘B to toggle</p>
          </div>
        </div>
      </AnimatedSidebarInset>
    </AnimatedSidebarProvider>
  </div>
</template>

<style scoped>
.sidebar-demo { box-sizing: border-box; width: 100%; padding: .5rem 0; }
@media (min-width: 640px) { .sidebar-demo { padding: .75rem; } }
.sidebar-shell {
  height: 720px; min-height: 0; overflow: hidden; border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--beui-foreground) 8%, transparent); background: var(--beui-background);
}
.sidebar-panel { min-height: 0; }
.sidebar-demo :deep(.be-asb-surface.sidebar-surface) { height: 100%; border-color: color-mix(in srgb, var(--beui-foreground) 8%, transparent); }
.sidebar-header { padding: .75rem; padding-bottom: .5rem; }
.brand-row { display: flex; align-items: center; gap: .75rem; min-height: 2.75rem; padding: 0 .5rem; overflow: hidden; }
.brand-mark { display: grid; flex-shrink: 0; place-items: center; width: 1.75rem; height: 1.75rem; border-radius: .5rem; background: var(--beui-foreground); color: var(--beui-background); }
.team-button {
  display: flex; flex: 1 1 0%; align-items: center; gap: .5rem; min-width: 0; padding: 0; border: 0; border-radius: .5rem; background: transparent;
  color: inherit; font: inherit; text-align: left; cursor: pointer; outline: none;
}
.team-button:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.team-name { overflow: hidden; color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.muted { flex-shrink: 0; color: var(--beui-muted-foreground); }
.sidebar-close { margin-left: auto; color: var(--beui-muted-foreground); }
.sidebar-close:hover { background: var(--beui-muted); }
@media (min-width: 768px) { .sidebar-close { display: none; } }
.sidebar-content { padding: .25rem .5rem 0; }
.group-first { padding-bottom: .5rem; }
.group-second { padding-top: .25rem; }
.sidebar-footer { gap: .75rem; padding: .75rem; border-top: 0; }
.account-button {
  display: flex; align-items: center; gap: .75rem; box-sizing: border-box; width: 100%; min-height: 2.75rem; padding: .25rem; overflow: hidden;
  border: 0; border-radius: .75rem; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; outline: none; transition: background-color .15s;
}
.account-button:hover { background: var(--beui-muted); }
.account-button:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.avatar { display: grid; flex-shrink: 0; place-items: center; width: 2.25rem; height: 2.25rem; border-radius: 999px; background: #d5ff66; color: #172000; font-size: .75rem; line-height: 1rem; font-weight: 600; }
.account-text { flex: 1 1 0%; min-width: 0; }
.account-name, .account-email { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-name { color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
.account-email { color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; }
/* The panel root carries data-state while it folds to the icon rail. */
.sidebar-demo :deep([data-slot=sidebar][data-state=collapsed]) .team-button,
.sidebar-demo :deep([data-slot=sidebar][data-state=collapsed]) .account-text,
.sidebar-demo :deep([data-slot=sidebar][data-state=collapsed]) .account-chevron { display: none; }
.sidebar-inset { min-height: 0; background: var(--beui-background); }
.inset-header { display: flex; flex-shrink: 0; align-items: center; gap: .75rem; height: 4rem; padding: 0 1rem; border-bottom: 1px solid var(--beui-border); }
.inset-trigger { color: var(--beui-muted-foreground); transition: color .15s, background-color .15s; }
.inset-trigger:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.divider { width: 1px; height: 1.25rem; background: var(--beui-border); }
.active-title { margin: 0; color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
.inset-body { display: flex; flex: 1 1 0%; flex-direction: column; justify-content: space-between; min-height: 0; padding: 1.25rem; overflow: hidden; }
@media (min-width: 640px) { .inset-body { padding: 1.75rem; } }
.date { margin: 0; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; font-weight: 500; }
.greeting { max-width: 28rem; margin: .5rem 0 0; padding: 0; border: 0; color: var(--beui-foreground); font-size: 1.25rem; line-height: 1.75rem; font-weight: 600; letter-spacing: -.025em; }
@media (min-width: 640px) { .greeting { font-size: 1.5rem; line-height: 2rem; } }
.intro { max-width: 28rem; margin: .5rem 0 0; color: var(--beui-muted-foreground); font-size: .875rem; line-height: 1.5rem; }
.inset-foot { display: flex; align-items: flex-end; justify-content: space-between; padding-top: 1rem; border-top: 1px solid var(--beui-border); }
.foot-label { margin: 0; color: var(--beui-muted-foreground); font-size: 10px; text-transform: uppercase; letter-spacing: .16em; }
.foot-value { margin: .25rem 0 0; color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
.foot-hint { display: none; margin: 0; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; }
@media (min-width: 640px) { .foot-hint { display: block; } }
</style>
