<template>
  <div data-slot="sidebar-footer" class="be-asb-footer"><slot /></div>
</template>

<style>
:where(.be-asb-footer) { display: flex; flex-shrink: 0; flex-direction: column; gap: .5rem; padding: .75rem; padding-bottom: max(.75rem, env(safe-area-inset-bottom)); border-top: 1px solid var(--beui-border); }
</style>
