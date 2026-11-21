<script setup lang="ts">
import {
  AgentIcon,
  AISidebar,
  AnimatedSidebarContent,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarPanel,
  AnimatedSidebarProvider,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
  type SidebarResource,
} from 'beui-vue'
import { computed, shallowRef } from 'vue'

const resources = shallowRef<SidebarResource[]>([
  { id: 'design-system', label: 'Design system', kind: 'project' },
  { id: 'client-portal', label: 'Client portal', kind: 'project' },
  { id: 'marketing-site', label: 'Marketing website', kind: 'project' },
  {
    id: 'platform', label: 'Platform', kind: 'project',
    children: [
      { id: 'api', label: 'API migration', kind: 'file' },
      { id: 'billing', label: 'Billing states', kind: 'file' },
      { id: 'docs', label: 'Read platform docs', kind: 'bookmark' },
    ],
  },
  { id: 'mobile-app', label: 'Mobile app', kind: 'project' },
  { id: 'research-lab', label: 'Research lab', kind: 'folder' },
  {
    id: 'agent-workspace', label: 'Agent workspace', kind: 'project',
    children: [
      { id: 'resource-review', label: 'Review resource sidebar interaction details', kind: 'file' },
      { id: 'release-offer', label: 'Prepare release announcement', kind: 'file' },
      { id: 'haptics', label: 'Explore interaction feedback', kind: 'bookmark' },
      { id: 'promotion', label: 'Plan launch distribution', kind: 'file' },
      { id: 'motion-research', label: 'Research motion implementation patterns', kind: 'bookmark' },
    ],
  },
  { id: 'release-notes', label: 'Release notes', kind: 'file' },
])
const actions = [
  { label: 'New workspace', icon: 'SquarePen' },
  { label: 'Pull requests', icon: 'GitPullRequest' },
  { label: 'Sites', icon: 'LayoutGrid' },
  { label: 'Scheduled', icon: 'Clock3' },
  { label: 'Extensions', icon: 'Plug' },
] as const
const active = shallowRef('resource-review')

function findLabel(items: SidebarResource[], id: string): string | undefined {
  for (const item of items) {
    if (item.id === id) return item.label
    const child = item.children ? findLabel(item.children, id) : undefined
    if (child) return child
  }
}
const activeLabel = computed(() => findLabel(resources.value, active.value) ?? active.value)
const move = () => new Promise<void>(resolve => setTimeout(resolve, 450))
</script>

<template>
  <div class="ais-demo">
    <AnimatedSidebarProvider class="ais-shell" style="--sidebar-width: 16rem">
      <AnimatedSidebarPanel aria-label="Workspace resources" collapsible="offcanvas" class="ais-panel" panel-class="ais-surface">
        <AnimatedSidebarContent class="ais-content">
          <AnimatedSidebarGroup class="ais-actions">
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu class="ais-menu">
                <AnimatedSidebarMenuItem v-for="action in actions" :key="action.label">
                  <AnimatedSidebarMenuButton class="ais-action" @select="() => {}">
                    <template #icon><AgentIcon :name="action.icon" :size="16" /></template>
                    {{ action.label }}
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>

          <AnimatedSidebarGroup class="ais-projects">
            <AnimatedSidebarGroupLabel class="ais-label">Projects</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent class="ais-tree-wrap">
              <div class="ais-scroll">
                <AISidebar v-model:items="resources" v-model:active-id="active" :default-expanded-ids="['platform', 'agent-workspace']" :on-move="move" />
              </div>
              <div aria-hidden="true" class="ais-fade" />
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>
        <AnimatedSidebarRail />
      </AnimatedSidebarPanel>

      <AnimatedSidebarInset class="ais-inset">
        <header class="ais-header">
          <div class="ais-heading">
            <AnimatedSidebarTrigger class="ais-trigger"><AgentIcon name="PanelLeft" :size="16" /></AnimatedSidebarTrigger>
            <div class="ais-title">
              <p class="ais-eyebrow">Workspace</p>
              <p class="ais-name">Agent workspace</p>
            </div>
          </div>
          <span class="ais-badge">Draft</span>
        </header>
        <div class="ais-body">
          <div class="ais-copy">
            <p class="ais-small">Selected resource</p>
            <h3 class="ais-h">{{ activeLabel }}</h3>
            <p class="ais-lead">Keep the resource tree predictable while files move between projects, labels overflow, and folders expand around the current selection.</p>
            <div class="ais-notes">
              <p class="ais-notes-title">Interaction notes</p>
              <ul>
                <li>Folders only reveal their contents.</li>
                <li>Files can be selected, moved, or renamed.</li>
                <li>Rejected moves return to their previous location.</li>
              </ul>
            </div>
          </div>
        </div>
      </AnimatedSidebarInset>
    </AnimatedSidebarProvider>
  </div>
</template>

<style>
.ais-demo { box-sizing: border-box; width: 100%; padding: .5rem 0; }
@media (min-width: 640px) { .ais-demo { padding: .75rem; } }
.ais-demo .ais-shell { height: 720px; min-height: 0; width: 100%; overflow: hidden; border-radius: 1rem; border: 1px solid color-mix(in srgb, var(--beui-foreground) 8%, transparent); background: var(--beui-background); }
.ais-demo .ais-panel { min-height: 0; width: 100%; }
.ais-demo .ais-surface { height: 100%; }
.ais-demo .ais-content { gap: 1rem; overflow: hidden; padding: 1rem .5rem; }
.ais-demo .ais-actions { flex-shrink: 0; padding: 0 .25rem; }
.ais-demo .ais-menu { gap: .25rem; }
.ais-demo .ais-action { font-weight: 400; color: var(--beui-foreground); }
.ais-demo .ais-projects { min-height: 0; flex: 1 1 0%; padding: 0 .25rem; }
.ais-demo .ais-label { height: 2rem; margin-bottom: .25rem; padding: 0 .5rem; font-size: .75rem; line-height: 1rem; font-weight: 500; text-transform: none; letter-spacing: normal; }
.ais-demo .ais-tree-wrap { position: relative; min-height: 0; flex: 1 1 0%; overflow: hidden; }
.ais-demo .ais-scroll { height: 100%; overflow-y: auto; overscroll-behavior: contain; padding-bottom: 2rem; overflow-anchor: none; scrollbar-width: none; -ms-overflow-style: none; }
.ais-demo .ais-scroll::-webkit-scrollbar { display: none; }
.ais-demo .ais-fade { pointer-events: none; position: absolute; left: 0; right: 0; bottom: 0; z-index: 20; height: 2rem; background: linear-gradient(to top, var(--beui-background), color-mix(in srgb, var(--beui-background) 80%, transparent), transparent); }
.ais-demo .ais-inset { min-height: 0; background: var(--beui-background); }
.ais-demo .ais-header { display: flex; height: 3.5rem; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 1rem; border-bottom: 1px solid var(--beui-border); padding: 0 1.25rem; }
.ais-demo .ais-heading { display: flex; min-width: 0; align-items: center; gap: .75rem; }
.ais-demo .ais-trigger { margin-left: -.5rem; color: var(--beui-muted-foreground); transition: color .15s, background-color .15s; }
.ais-demo .ais-trigger:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.ais-demo .ais-title { min-width: 0; }
.ais-demo .ais-title p { margin: 0; }
.ais-demo .ais-eyebrow { font-size: 10px; line-height: 1.5; font-weight: 500; text-transform: uppercase; letter-spacing: .14em; color: var(--beui-muted-foreground); }
.ais-demo .ais-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.ais-demo .ais-badge { flex-shrink: 0; border-radius: 9999px; background: var(--beui-muted); padding: .25rem .625rem; font-size: 10px; line-height: 1.5; font-weight: 500; color: var(--beui-muted-foreground); }
.ais-demo .ais-body { min-height: 0; flex: 1 1 0%; overflow-y: auto; padding: 1.5rem; }
@media (min-width: 640px) { .ais-demo .ais-body { padding: 2rem; } }
.ais-demo .ais-copy { max-width: 36rem; margin: 0 auto; }
.ais-demo .ais-copy p, .ais-demo .ais-copy h3, .ais-demo .ais-copy ul { margin: 0; padding-top: 0; }
.ais-demo .ais-small { font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.ais-demo .ais-h { margin-top: .5rem !important; border-top: 0 !important; font-size: 1.25rem; line-height: 1.75rem; font-weight: 600; letter-spacing: -.025em; color: var(--beui-foreground); }
@media (min-width: 640px) { .ais-demo .ais-h { font-size: 1.5rem; line-height: 2rem; } }
.ais-demo .ais-lead { max-width: 32rem; margin-top: .75rem !important; font-size: .875rem; line-height: 1.5rem; color: var(--beui-muted-foreground); }
.ais-demo .ais-notes { margin-top: 2rem; border-top: 1px solid var(--beui-border); padding-top: 1.5rem; }
.ais-demo .ais-notes-title { font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.ais-demo .ais-notes ul { margin-top: .75rem !important; padding: 0; list-style: none; display: grid; gap: .75rem; font-size: .875rem; line-height: 1.5rem; color: var(--beui-muted-foreground); }
.ais-demo .ais-notes li { margin: 0; color: var(--beui-muted-foreground); }
</style>
