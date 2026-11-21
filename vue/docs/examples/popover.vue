<script setup lang="ts">
import { Popover } from 'beui-vue'
</script>

<template>
  <div class="actions">
    <Popover side="bottom" align="start" label="Dimensions" content-style="width: 18rem">
      <template #trigger>Edit profile</template>
      <p class="title">Dimensions</p>
      <p class="hint">Set the width and height for the layer.</p>
      <div class="fields">
        <label><span>Width</span><input value="100%" /></label>
        <label><span>Height</span><input value="auto" /></label>
      </div>
    </Popover>

    <Popover trigger="hover" side="top" trigger-variant="outline" content-style="width: 14rem">
      <template #trigger>Hover me</template>
      <p class="hover-copy">Opens on hover, with a grace window so you can move into the panel.</p>
    </Popover>
  </div>
</template>

<style scoped>
.actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1rem; }
.title { margin: 0; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.hint { margin: .25rem 0 0; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.hover-copy { margin: 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.fields { margin-top: .75rem; display: flex; flex-direction: column; gap: .5rem; }
.fields label { display: flex; align-items: center; justify-content: space-between; gap: .75rem; font-size: .875rem; line-height: 1.25rem; }
.fields span { color: var(--beui-muted-foreground); }
.fields input { box-sizing: border-box; height: 2rem; width: 8rem; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); padding: 0 .625rem; font: inherit; font-size: .875rem; color: var(--beui-foreground); outline: none; }
.fields input:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
</style>
