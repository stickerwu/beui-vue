<script setup lang="ts">
import { Popover } from 'beui-vue'
</script>
<template>
  <div class="actions">
    <Popover align="start" label="Dimensions">
      <template #trigger>Edit profile</template>
      <div class="dimensions">
        <strong>Dimensions</strong><p>Set the width and height for the layer.</p>
        <label>Width<input value="100%" /></label>
        <label>Height<input value="auto" /></label>
      </div>
    </Popover>
    <Popover trigger="hover" side="top" label="Hover details">
      <template #trigger>Hover me</template>
      <p class="hover-copy">Opens on hover, with a grace window so you can move into the panel.</p>
    </Popover>
  </div>
</template>
<style scoped>
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
.dimensions { display: grid; gap: .5rem; min-width: min(16rem,70vw); }
.dimensions p,.hover-copy { margin: 0; max-width: 15rem; font-size: .8rem; color: var(--beui-muted-foreground); }
.dimensions label { display: flex; justify-content: space-between; align-items: center; }
.dimensions input { width: 8rem; border: 1px solid var(--beui-border); border-radius: .4rem; background: var(--beui-background); color: var(--beui-foreground); padding: .3rem; }
</style>
