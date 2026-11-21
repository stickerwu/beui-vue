<template>
  <div data-slot="sidebar-header" class="be-asb-header"><slot /></div>
</template>

<style>
:where(.be-asb-header) { display: flex; flex-shrink: 0; flex-direction: column; gap: .5rem; padding: .75rem; }
</style>
