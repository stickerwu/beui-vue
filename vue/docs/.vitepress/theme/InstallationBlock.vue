<script setup lang="ts">
import { Tabs } from 'beui-vue'
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import CodeBlock from './CodeBlock.vue'
import { useLocale } from './i18n'

const { t } = useLocale()

const props = defineProps<{
  importName?: string
  importCode?: string
}>()

const archiveName = 'beui-vue-0.1.0-alpha.0.tgz'
const packageUrl = `https://github.com/stickerwu/beui-vue/releases/download/v0.1.0-alpha.0/${archiveName}`
const methods = computed(() => [
  { value: 'package', label: t('Package') },
  { value: 'manual', label: t('Manual') },
])
const packageManagers = [
  { value: 'bun', label: 'bun' },
  { value: 'npm', label: 'npm' },
  { value: 'pnpm', label: 'pnpm' },
  { value: 'yarn', label: 'yarn' },
]
const method = shallowRef('package')
const packageManager = shallowRef('bun')
const installAction = computed(() => packageManager.value === 'npm' ? 'install' : 'add')
const installCommand = computed(() => {
  const target = method.value === 'manual' ? `./${archiveName}` : packageUrl
  return `${packageManager.value} ${installAction.value} ${target}`
})
const usage = computed(() => props.importCode ?? [
  props.importName ? `import { ${props.importName} } from 'beui-vue'` : '',
  "import 'beui-vue/style.css'",
].filter(Boolean).join('\n'))
const copyState = shallowRef<'idle' | 'copied' | 'failed'>('idle')
const copyLabel = computed(() => t({
  idle: 'Copy install command',
  copied: 'Copied!',
  failed: 'Copy failed',
}[copyState.value]))
let copyTimer: ReturnType<typeof setTimeout> | undefined

async function copyCommand() {
  clearTimeout(copyTimer)
  try {
    await navigator.clipboard.writeText(installCommand.value)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }
  copyTimer = setTimeout(() => {
    copyState.value = 'idle'
  }, 2000)
}

onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<template>
  <div class="beui-installation">
    <Tabs
      v-model="method"
      class="beui-install-methods"
      :items="methods"
      :labels="{ list: t('Installation method') }"
    >
      <template #trigger="{ item }">{{ item.label }}</template>
      <template #panel="{ item }">
        <div class="beui-install-panel">
          <p v-if="item.value === 'manual'" class="beui-install-note">
            <a :href="packageUrl">{{ t('Download the release archive') }}</a>
            {{ t('to your project root, then install the local file.') }}
          </p>
          <div class="beui-install-command-card">
            <div class="beui-install-command-header">
              <Tabs
                v-model="packageManager"
                class="beui-install-managers"
                :items="packageManagers"
                variant="segment"
                :labels="{ list: t('Package manager') }"
              >
                <template #trigger="{ item: manager }">{{ manager.label }}</template>
              </Tabs>
              <button
                class="beui-code-copy"
                type="button"
                :aria-label="copyLabel"
                :title="copyLabel"
                @click="copyCommand"
              >
                <svg v-if="copyState === 'copied'" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m5 12 4 4L19 6" />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span v-if="copyState !== 'idle'" class="beui-code-copy-feedback" role="status">{{ copyLabel }}</span>
              </button>
            </div>
            <div class="beui-install-command-viewport" tabindex="0" role="region" :aria-label="t('Install command')">
              <pre class="beui-install-command"><code><span class="beui-install-prompt" aria-hidden="true">$ </span><span class="beui-install-runner">{{ packageManager }}</span> <span class="beui-install-action">{{ installAction }}</span> <span class="beui-install-target">{{ item.value === 'manual' ? `./${archiveName}` : packageUrl }}</span></code></pre>
            </div>
          </div>
        </div>
      </template>
    </Tabs>
    <div class="beui-install-import">
      <p class="beui-install-description">{{ t('Import the compiled styles once in your application.') }}</p>
      <CodeBlock :code="usage" lang="ts" label="Usage" />
    </div>
  </div>
</template>
