<script setup lang="ts">
import { CenterMorphModal, CenterMorphModalContent, CenterMorphModalTrigger } from 'beui-vue'

const features = ['Premium animated sections', 'Complete Next.js templates', 'Editable source and private registry']
</script>

<template>
  <div class="stage">
    <CenterMorphModal>
      <CenterMorphModalTrigger>
        <button type="button" class="trigger press">Open modal</button>
      </CenterMorphModalTrigger>

      <CenterMorphModalContent aria-label="beUI Pro" aria-described-by="center-morph-pro-description">
        <div class="content">
          <p class="eyebrow">beUI Pro</p>
          <h2>Ship the whole experience.</h2>
          <p id="center-morph-pro-description" class="lead">Go beyond individual components with premium animated sections and complete Next.js templates.</p>

          <div class="features">
            <div v-for="feature in features" :key="feature" class="feature">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              <span>{{ feature }}</span>
            </div>
          </div>

          <a class="cta press" href="https://pro.beui.dev/?utm_source=beui&utm_medium=component_preview&utm_campaign=center_morph_modal" target="_blank" rel="noreferrer">
            Explore beUI Pro
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
          </a>
        </div>
      </CenterMorphModalContent>
    </CenterMorphModal>
  </div>
</template>

<style scoped>
.stage { display: flex; width: 100%; min-height: 420px; align-items: center; justify-content: center; }
.press { transition: transform 120ms cubic-bezier(.16, 1, .3, 1); }
.press:active { transform: scale(.97); }
.trigger { display: inline-flex; box-sizing: border-box; height: 2.5rem; align-items: center; justify-content: center; padding: 0 1.25rem; border: 0; border-radius: 999px; background: var(--beui-foreground); color: var(--beui-background); font: inherit; font-size: .875rem; font-weight: 500; line-height: 1.25rem; cursor: pointer; }
.trigger:focus-visible, .cta:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.content { padding: 2rem; }
@media (max-width: 639px) { .content { padding: 1.75rem; } }
p { margin: 0; }
.eyebrow { font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-muted-foreground); }
h2 { max-width: 20rem; margin: 1.25rem 0 0; padding-right: 2rem; font-size: 1.5rem; line-height: 2rem; font-weight: 500; letter-spacing: -.025em; color: var(--beui-foreground); }
.lead { margin-top: .75rem; font-size: .875rem; line-height: 1.625; color: var(--beui-muted-foreground); }
.features { display: flex; flex-direction: column; gap: .75rem; margin-top: 1.75rem; padding: 1.25rem 0; border-block: 1px solid var(--beui-border); }
.feature { display: flex; align-items: center; gap: .75rem; font-size: .875rem; line-height: 1.25rem; color: var(--beui-foreground); }
svg { width: 1rem; height: 1rem; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.feature svg { color: var(--beui-muted-foreground); }
.cta { display: inline-flex; box-sizing: border-box; width: 100%; height: 2.75rem; align-items: center; justify-content: center; gap: .5rem; margin-top: 1.75rem; padding: 0 1.25rem; border-radius: 999px; background: var(--beui-foreground); color: var(--beui-background); font-size: .875rem; line-height: 1.25rem; font-weight: 500; text-decoration: none; }
</style>
