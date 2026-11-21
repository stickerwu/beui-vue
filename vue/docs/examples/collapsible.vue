<script setup lang="ts">
import { Collapsible, CollapsibleContent, CollapsibleIndicator, CollapsibleTrigger } from 'beui-vue'
</script>

<template>
  <Collapsible class="disclosure-demo">
    <CollapsibleTrigger>More details <CollapsibleIndicator /></CollapsibleTrigger>
    <CollapsibleContent content-class-name="disclosure-body">
      <p>Keep extra information tucked away until you need it.</p>
    </CollapsibleContent>
  </Collapsible>
</template>

<style scoped>
.disclosure-demo { box-sizing: border-box; max-width: 24rem; padding: .25rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); }
.disclosure-demo :deep(.disclosure-body) { padding: .25rem .75rem .75rem; color: var(--beui-muted-foreground); font-size: .875rem; line-height: 1.5rem; }
.disclosure-demo p { margin: 0; }
</style>
