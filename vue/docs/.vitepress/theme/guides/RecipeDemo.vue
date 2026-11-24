<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId } from 'vue'
import { easeOut, pressSpring, useReducedMotion } from 'beui-vue'
import type { MotionCopy } from './motion-copy.en'
import GuideIcon from './GuideIcon.vue'
import ReplayButton from './ReplayButton.vue'

/**
 * One live demo per recipe, as beui.dev's `RecipeDemoView`
 * (components/app/docs/motion-patterns.tsx).
 */
const props = defineProps<{ demo: 'press' | 'icon' | 'reveal' | 'layout' | 'swap'; copy: MotionCopy['demos'] }>()

// Layout continuity spring, local to this recipe upstream.
const CONTINUITY_SPRING = { type: 'spring', stiffness: 220, damping: 17, mass: 0.85 } as const
const CONTINUITY_LABEL = {
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(4px)' },
}

const reduce = useReducedMotion()
// True hover devices only; touch fires a sticky phantom hover on tap (upstream useHoverCapable).
const hoverCapable = shallowRef(false)
let media: MediaQueryList | undefined
const syncHover = () => { hoverCapable.value = Boolean(media?.matches) }
onMounted(() => { media = matchMedia('(hover: hover) and (pointer: fine)'); syncHover(); media.addEventListener('change', syncHover) })
onBeforeUnmount(() => media?.removeEventListener('change', syncHover))
const replay = shallowRef(0)
const iconActive = shallowRef(false)
const expanded = shallowRef(false)
const tab = shallowRef<'Preview' | 'Code'>('Preview')
const tabsId = useId()

const bellActive = computed(() => iconActive.value && hoverCapable.value && !reduce.value)
const continuity = computed(() => (reduce.value ? { duration: 0 } : CONTINUITY_SPRING))
</script>

<template>
  <motion.button
    v-if="props.demo === 'press'" type="button" class="beui-mg-demo-press"
    :while-press="reduce ? undefined : { scale: 0.97 }" :transition="pressSpring"
  >
    {{ copy.pressMe }}
  </motion.button>

  <button
    v-else-if="props.demo === 'icon'" type="button" class="beui-mg-demo-pill"
    @mouseenter="iconActive = true" @mouseleave="iconActive = false" @focus="iconActive = true" @blur="iconActive = false"
  >
    <motion.span
      class="beui-mg-bell" :animate="bellActive ? { rotate: [0, 12, -8, 4, 0] } : { rotate: 0 }"
      :transition="{ duration: 0.28, ease: easeOut }"
    >
      <GuideIcon name="bell" class="beui-mg-icon-4" />
    </motion.span>
    {{ copy.hoverBell }}
  </button>

  <div v-else-if="props.demo === 'reveal'" class="beui-mg-demo-reveal">
    <ReplayButton :label="copy.replay" @click="replay++" />
    <motion.div
      :key="replay" class="beui-mg-surface"
      :initial="{ opacity: 0, transform: reduce ? 'none' : 'translateY(8px)', filter: reduce ? 'none' : 'blur(4px)' }"
      :animate="{ opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' }"
      :transition="{ duration: 0.22, ease: easeOut }"
    >
      <p class="beui-mg-surface-title">{{ copy.newSurface }}</p>
      <p class="beui-mg-surface-note">{{ copy.readyBeforeFocus }}</p>
    </motion.div>
  </div>

  <motion.div v-else-if="props.demo === 'layout'" layout :transition="continuity" class="beui-mg-inline">
    <motion.button
      layout type="button" class="beui-mg-continuity" :aria-expanded="expanded" :aria-label="expanded ? copy.collapsePanel : copy.expandPanel"
      :while-press="reduce ? undefined : { scale: 0.97 }" :transition="continuity" :style="{ borderRadius: '9999px' }"
      @click="expanded = !expanded"
    >
      <motion.span layout="position" :transition="continuity" class="beui-mg-continuity-icon">
        <GuideIcon name="panel-top-open" class="beui-mg-icon-4" />
      </motion.span>
      <AnimatePresence mode="popLayout" :initial="false">
        <motion.span
          v-if="expanded" key="continuity-label" layout :variants="CONTINUITY_LABEL" class="beui-mg-continuity-label"
          :initial="reduce ? { opacity: 0 } : 'hidden'" :animate="reduce ? { opacity: 1 } : 'visible'" :exit="reduce ? { opacity: 0 } : 'exit'"
          :transition="continuity"
        >
          {{ copy.openPanel }}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  </motion.div>

  <div v-else class="beui-mg-demo-swap">
    <div role="tablist" :aria-label="copy.exampleViews" class="beui-mg-tabs">
      <button
        v-for="item in (['Preview', 'Code'] as const)" :id="`${tabsId}-${item}-tab`" :key="item" type="button" role="tab"
        :aria-selected="tab === item" :aria-controls="`${tabsId}-panel`" class="beui-mg-tab" :data-selected="tab === item || undefined"
        @click="tab = item"
      >
        {{ item === 'Preview' ? copy.preview : copy.code }}
      </button>
    </div>
    <AnimatePresence mode="wait" :initial="false">
      <motion.div
        :id="`${tabsId}-panel`" :key="tab" role="tabpanel" :aria-labelledby="`${tabsId}-${tab}-tab`" class="beui-mg-tabpanel"
        :initial="{ opacity: 0, transform: reduce ? 'none' : 'translateY(4px)' }"
        :animate="{ opacity: 1, transform: 'translateY(0px)' }"
        :exit="{ opacity: 0, transform: reduce ? 'none' : 'translateY(-4px)', transition: { duration: 0.12, ease: easeOut } }"
        :transition="{ duration: 0.18, ease: easeOut }"
      >
        {{ tab === 'Preview' ? copy.livePreview : copy.copyReadySource }}
      </motion.div>
    </AnimatePresence>
  </div>
</template>
