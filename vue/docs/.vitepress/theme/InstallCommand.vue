<script setup lang="ts">
import { ActionSwapCascadeText, Tabs } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useLocale } from './i18n'
import Icon from './Icon.vue'

// `@beui-vue` is in the shadcn-vue registry directory, so the CLI installs an
// item by name with no components.json setup, the way beui.dev's hero runs
// `shadcn add @beui/<slug>`. The command fits on one line.
const { slugs } = defineProps<{
  /** Install slugs to cycle through. */
  slugs: readonly string[]
}>()
const { t } = useLocale()

const RUNNERS = { bun: 'bunx --bun', npm: 'npx', pnpm: 'pnpm dlx', yarn: 'yarn dlx' } as const
type Runner = keyof typeof RUNNERS
const packageManagers = (Object.keys(RUNNERS) as Runner[]).map(value => ({ value, label: value }))
const CLI = 'shadcn-vue@latest'
const NAMESPACE = '@beui-vue/'
// Upstream InstallCommand cadence.
const CYCLE_MS = 1800

const packageManager = shallowRef<Runner>('bun')
const index = shallowRef(0)
// Holding the pointer or focus on the command stops the cycle so it can be read and copied.
const held = shallowRef(false)
const slug = computed(() => slugs[index.value % slugs.length] ?? '')
const runner = computed(() => RUNNERS[packageManager.value].split(' '))
const command = computed(() => `${RUNNERS[packageManager.value]} ${CLI} add ${NAMESPACE}${slug.value}`)

let cycle: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  cycle = setInterval(() => {
    if (!held.value && !document.hidden) index.value = (index.value + 1) % slugs.length
  }, CYCLE_MS)
})
onBeforeUnmount(() => clearInterval(cycle))

const copied = shallowRef(false)
const status = shallowRef('')
let copyTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(copyTimer))
async function copy() {
  clearTimeout(copyTimer)
  try {
    await navigator.clipboard.writeText(command.value)
    copied.value = true
    status.value = t('Install command copied.')
    copyTimer = setTimeout(() => { copied.value = false }, 2000)
  } catch {
    copied.value = false
    status.value = t('Select the install command to copy it.')
  }
}
</script>

<template>
  <div class="home-command" @pointerenter="held = true" @pointerleave="held = false" @focusin="held = true" @focusout="held = false">
    <div class="home-command-toolbar">
      <Tabs v-model="packageManager" :items="packageManagers" variant="segment" :labels="{ list: t('Package manager') }" class="home-package-tabs" />
      <button type="button" class="home-copy" :aria-label="copied ? t('Install command copied') : t('Copy install command')" @click="copy">
        <Icon :name="copied ? 'check' : 'copy'" />
      </button>
    </div>
    <pre class="home-command-code" tabindex="0" role="region" :aria-label="t('Install a component with the shadcn-vue CLI')"><code><span class="home-command-prompt" aria-hidden="true">$ </span><span class="home-command-runner">{{ runner[0] }}</span><span v-if="runner[1]" class="home-command-flag"> {{ runner[1] }}</span><span class="home-command-cli"> {{ CLI }} </span><span class="home-command-action">add</span> <span class="home-command-prefix">{{ NAMESPACE }}</span><ActionSwapCascadeText :value="slug" class="home-command-slug">{{ slug }}</ActionSwapCascadeText></code></pre>
    <span class="home-sr-only" role="status">{{ status }}</span>
  </div>
</template>

<style scoped>
/* Token colours of upstream InstallCommand (GitHub light / dark). */
.home-command-flag { color: #6f42c1; }
.home-command-cli { color: #24292f; }
.home-command-prefix { color: rgb(36 41 47 / .7); }
.home-command-slug { color: #0a3069; font-weight: 500; }
:global(.dark .home-command-flag) { color: #d2a8ff; }
:global(.dark .home-command-cli) { color: #e6edf3; }
:global(.dark .home-command-prefix) { color: rgb(230 237 243 / .6); }
:global(.dark .home-command-slug) { color: #a5d6ff; }
</style>
