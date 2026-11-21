<template>
  <div data-slot="sidebar-group" class="be-asb-group"><slot /></div>
</template>

<style>
:where(.be-asb-group) { display: flex; flex-direction: column; width: 100%; min-width: 0; padding: .375rem .25rem; }
</style>
