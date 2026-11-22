<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, useId } from 'vue'
import { easeOut, layoutSpring } from '../core/motion'
import AgentIcon from './AgentIcon.vue'
import CitationFavicon from './CitationFavicon.vue'
import { citationTargetId, sourceUrl, type CitationItem } from './shared'

const props = defineProps<{ citations: CitationItem[], idPrefix?: string }>()
const baseId = useId()
const prefix = computed(() => props.idPrefix ?? `citation-list-${baseId}`)
const reduce = useReducedMotion()
const enter = computed(() => reduce.value ? { opacity: 1 } : { opacity: 0, y: 6 })
const exit = computed(() => reduce.value ? { opacity: 0 } : { opacity: 0, y: -3 })
const transition = computed(() => reduce.value ? { duration: 0 } : { opacity: { duration: 0.18, ease: easeOut }, y: layoutSpring, layout: layoutSpring })
</script>

<template>
  <div class="cl">
    <AnimatePresence mode="popLayout">
      <motion.div v-for="(citation, index) in citations" :key="citation.id" layout="position" :initial="enter" :animate="{ opacity: 1, y: 0 }" :exit="exit" :transition="transition">
        <component :is="sourceUrl(citation.url) ? 'a' : 'div'" :id="citationTargetId(prefix, citation.id)" class="cl-row" :href="sourceUrl(citation.url)" :target="sourceUrl(citation.url) ? '_blank' : undefined" :rel="sourceUrl(citation.url) ? 'noreferrer noopener' : undefined" :tabindex="sourceUrl(citation.url) ? undefined : -1">
          <CitationFavicon :url="citation.url" :icon="citation.icon" />
          <slot name="source" :item="citation" :index="index + 1">
            <span class="cl-text">
              <span class="cl-title">{{ citation.title }}</span>
              <span v-if="citation.domain" class="cl-domain">{{ citation.domain }}</span>
            </span>
          </slot>
          <span class="cl-end">
            <span class="cl-index">{{ index + 1 }}</span>
            <AgentIcon v-if="sourceUrl(citation.url)" class="cl-external" name="ExternalLink" :size="14" />
          </span>
        </component>
      </motion.div>
    </AnimatePresence>
  </div>
</template>

<style scoped>
.cl { display: grid; gap: .125rem; }
.cl-row { box-sizing: border-box; display: flex; align-items: center; gap: .5rem; border-radius: .375rem; padding: .25rem .375rem; color: inherit; text-decoration: none; outline: none; }
.cl-row:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.cl-text { display: flex; min-width: 0; flex: 1; flex-wrap: wrap; align-items: baseline; gap: .125rem .5rem; }
.cl-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: color-mix(in oklab, var(--beui-foreground) 80%, transparent); transition: color .15s; }
.cl-row:hover .cl-title { color: var(--beui-foreground); }
.cl-domain { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .75rem; line-height: 1rem; color: color-mix(in oklab, var(--beui-muted-foreground) 60%, transparent); }
.cl-end { display: flex; flex: none; align-items: center; gap: .375rem; }
.cl-index { display: grid; width: 1.25rem; height: 1.25rem; place-items: center; border-radius: .375rem; background: color-mix(in oklab, var(--beui-foreground) 5%, transparent); font-size: 10px; line-height: calc(1.25 / .875); font-weight: 600; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.cl-external { color: color-mix(in oklab, var(--beui-muted-foreground) 40%, transparent); transition: color .15s; }
.cl-row:hover .cl-external { color: var(--beui-muted-foreground); }
</style>
