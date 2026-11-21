<template>
  <div data-slot="sidebar-group-content" class="be-asb-group-content"><slot /></div>
</template>

<style>
:where(.be-asb-group-content) { width: 100%; min-width: 0; }
</style>
