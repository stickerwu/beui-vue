<template>
  <div data-slot="sidebar-content" class="be-asb-content"><slot /></div>
</template>

<style>
:where(.be-asb-content) { display: flex; flex: 1 1 0%; flex-direction: column; gap: .5rem; min-height: 0; padding: .5rem; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; }
</style>
