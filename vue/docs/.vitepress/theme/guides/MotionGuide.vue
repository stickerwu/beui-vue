<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, shallowRef } from 'vue'
import { easeInOut, easeOut, useReducedMotion } from 'beui-vue'
import { useLocale } from '../i18n'
import { accessibilityCode, recipeCode } from './motion-code'
import { motionCopyEn } from './motion-copy.en'
import { motionCopyZh } from './motion-copy.zh'
import GuideIcon from './GuideIcon.vue'
import RecipeDemo from './RecipeDemo.vue'
import ReplayButton from './ReplayButton.vue'

/** Port of beui.dev's `MotionPatterns` (components/app/docs/motion-patterns.tsx), the body of the Motion guide. */
const { isZh } = useLocale()
const copy = computed(() => (isZh.value ? motionCopyZh : motionCopyEn))
const reduce = useReducedMotion()
const replay = shallowRef(0)

const decisions = [
  { number: '01', key: 'frequency' },
  { number: '02', key: 'purpose' },
  { number: '03', key: 'physics' },
  { number: '04', key: 'fallback' },
] as const
const timings = ['press', 'tooltip', 'dropdown', 'modal', 'marketing'] as const
const recipes = [
  { key: 'press', icon: 'mouse-pointer-2' },
  { key: 'icon', icon: 'bell' },
  { key: 'reveal', icon: 'sparkles' },
  { key: 'layout', icon: 'panel-top-open' },
  { key: 'swap', icon: 'rows-3' },
] as const
const tracks = computed(() => [
  { key: `out-${replay.value}`, label: 'easeOut', value: '[0.16, 1, 0.3, 1]', description: copy.value.easing.easeOut, ease: easeOut },
  { key: `in-out-${replay.value}`, label: 'easeInOut', value: '[0.77, 0, 0.175, 1]', description: copy.value.easing.easeInOut, ease: easeInOut },
])
</script>

<template>
  <div class="beui-mg">
    <section id="decision-framework" class="beui-mg-section">
      <p class="beui-mg-eyebrow">{{ copy.sections.decisionFramework.eyebrow }}</p>
      <h2 class="beui-mg-h2">{{ copy.sections.decisionFramework.title }}</h2>
      <p class="beui-mg-lede">{{ copy.sections.decisionFramework.description }}</p>
      <div class="beui-mg-body beui-mg-rules">
        <article v-for="decision in decisions" :key="decision.number" class="beui-mg-decision">
          <span class="beui-mg-number">{{ decision.number }}</span>
          <h3>{{ copy.decisions[decision.key].title }}</h3>
          <div>
            <p class="beui-mg-text">{{ copy.decisions[decision.key].body }}</p>
            <p class="beui-mg-note">{{ copy.decisions[decision.key].note }}</p>
          </div>
        </article>
      </div>
    </section>

    <section id="motion-tokens" class="beui-mg-section">
      <p class="beui-mg-eyebrow">{{ copy.sections.motionTokens.eyebrow }}</p>
      <h2 class="beui-mg-h2">{{ copy.sections.motionTokens.title }}</h2>
      <p class="beui-mg-lede">{{ copy.sections.motionTokens.description }}</p>
      <div class="beui-mg-body beui-mg-lab">
        <div class="beui-mg-lab-head">
          <div>
            <p class="beui-mg-lab-title">{{ copy.easing.title }}</p>
            <p class="beui-mg-lab-subtitle">{{ copy.easing.subtitle }}</p>
          </div>
          <ReplayButton :label="copy.demos.replay" @click="replay++" />
        </div>
        <div class="beui-mg-tracks">
          <div v-for="track in tracks" :key="track.key" class="beui-mg-track">
            <div class="beui-mg-track-head">
              <span class="beui-mg-token">{{ track.label }}</span>
              <span class="beui-mg-value">{{ track.value }}</span>
            </div>
            <div class="beui-mg-rail">
              <motion.div
                class="beui-mg-dot" :initial="{ opacity: 0.5, transform: 'translateX(0px)' }"
                :animate="{ opacity: 1, transform: reduce ? 'translateX(0px)' : 'translateX(176px)' }"
                :transition="{ duration: reduce ? 0.18 : 0.9, ease: track.ease }"
              />
            </div>
            <p class="beui-mg-text beui-mg-track-text">{{ track.description }}</p>
          </div>
        </div>
        <div class="beui-mg-notes">
          <div v-for="note in [{ icon: 'mouse-pointer-2', title: 'pressSpring', body: copy.easing.springPress }, { icon: 'circle-gauge', title: 'layoutSpring', body: copy.easing.springLayout }]" :key="note.title" class="beui-mg-token-note">
            <span class="beui-mg-badge"><GuideIcon :name="note.icon" class="beui-mg-icon-35" /></span>
            <div>
              <p class="beui-mg-token">{{ note.title }}</p>
              <p class="beui-mg-note beui-mg-note-tight">{{ note.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="timing" class="beui-mg-section">
      <p class="beui-mg-eyebrow">{{ copy.sections.timing.eyebrow }}</p>
      <h2 class="beui-mg-h2">{{ copy.sections.timing.title }}</h2>
      <p class="beui-mg-lede">{{ copy.sections.timing.description }}</p>
      <div class="beui-mg-body beui-mg-table">
        <div class="beui-mg-table-head">
          <span>{{ copy.timing.interaction }}</span>
          <span>{{ copy.timing.range }}</span>
          <span>{{ copy.timing.desiredFeel }}</span>
        </div>
        <div v-for="timing in timings" :key="timing" class="beui-mg-table-row">
          <span class="beui-mg-use">{{ copy.timing.rows[timing].use }}</span>
          <span class="beui-mg-range">{{ copy.timing.rows[timing].range }}</span>
          <span class="beui-mg-feel">{{ copy.timing.rows[timing].feel }}</span>
        </div>
      </div>
      <div class="beui-mg-callout">
        <GuideIcon name="zap" class="beui-mg-icon-4 beui-mg-callout-icon" />
        <p class="beui-mg-text">{{ copy.timing.note }}</p>
      </div>
    </section>

    <section id="recipes" class="beui-mg-section">
      <p class="beui-mg-eyebrow">{{ copy.sections.recipes.eyebrow }}</p>
      <h2 class="beui-mg-h2">{{ copy.sections.recipes.title }}</h2>
      <p class="beui-mg-lede">{{ copy.sections.recipes.description }}</p>
      <div class="beui-mg-body beui-mg-rules">
        <article v-for="recipe in recipes" :key="recipe.key" class="beui-mg-recipe">
          <div class="beui-mg-recipe-grid">
            <div class="beui-mg-recipe-copy">
              <div class="beui-mg-recipe-kicker">
                <span class="beui-mg-badge beui-mg-badge-card"><GuideIcon :name="recipe.icon" class="beui-mg-icon-35" /></span>
                <span class="beui-mg-kicker">{{ copy.recipes[recipe.key].eyebrow }}</span>
              </div>
              <h3>{{ copy.recipes[recipe.key].title }}</h3>
              <p class="beui-mg-text beui-mg-recipe-text">{{ copy.recipes[recipe.key].description }}</p>
              <div class="beui-mg-rule-list">
                <div class="beui-mg-rule"><span>{{ copy.recipes.purpose }}</span><span>{{ copy.recipes[recipe.key].purpose }}</span></div>
                <div class="beui-mg-rule"><span>{{ copy.recipes.avoid }}</span><span>{{ copy.recipes[recipe.key].avoid }}</span></div>
              </div>
            </div>
            <div class="beui-mg-stage"><RecipeDemo :demo="recipe.key" :copy="copy.demos" /></div>
          </div>
          <details class="beui-mg-code">
            <summary>{{ copy.recipes.viewRecipe }}<span aria-hidden="true">+</span></summary>
            <pre><code>{{ recipeCode[recipe.key] }}</code></pre>
          </details>
        </article>
      </div>
    </section>

    <section id="accessibility" class="beui-mg-section">
      <p class="beui-mg-eyebrow">{{ copy.sections.accessibility.eyebrow }}</p>
      <h2 class="beui-mg-h2">{{ copy.sections.accessibility.title }}</h2>
      <p class="beui-mg-lede">{{ copy.sections.accessibility.description }}</p>
      <div class="beui-mg-body beui-mg-a11y">
        <div class="beui-mg-a11y-copy">
          <GuideIcon name="accessibility" class="beui-mg-icon-5" />
          <h3>{{ copy.accessibility.title }}</h3>
          <p class="beui-mg-text">{{ copy.accessibility.body }}</p>
        </div>
        <pre class="beui-mg-a11y-code"><code>{{ accessibilityCode }}</code></pre>
      </div>
    </section>
  </div>
</template>
