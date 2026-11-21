<script setup lang="ts">
import { FileTree, FileTreeFile, FileTreeFolder } from 'beui-vue'
import { LucideIcon } from './layout-icons'
</script>

<template>
  <div class="stage">
    <div class="box">
      <FileTree default-value="file-tree" :default-expanded-ids="['app', 'components']" label="Project files">
        <FileTreeFolder value="app" name="app">
          <FileTreeFolder value="components" name="components">
            <FileTreeFile value="file-tree" name="file-tree.tsx">
              <template #icon><LucideIcon name="Braces" :size="16" style="color: #0ea5e9" /></template>
            </FileTreeFile>
            <FileTreeFile value="button" name="button.tsx">
              <template #icon><LucideIcon name="Braces" :size="16" style="color: #0ea5e9" /></template>
            </FileTreeFile>
          </FileTreeFolder>
          <FileTreeFile value="page" name="page.tsx">
            <template #icon><LucideIcon name="FileCode2" :size="16" style="color: #0ea5e9" /></template>
          </FileTreeFile>
          <FileTreeFile value="styles" name="globals.css">
            <template #icon><LucideIcon name="Palette" :size="16" style="color: #8b5cf6" /></template>
          </FileTreeFile>
        </FileTreeFolder>
        <FileTreeFolder value="public" name="public">
          <FileTreeFile value="logo" name="logo.svg" />
          <FileTreeFile value="grid" name="grid.svg" />
        </FileTreeFolder>
        <FileTreeFile value="package" name="package.json">
          <template #icon><LucideIcon name="FileJson2" :size="16" style="color: #f59e0b" /></template>
        </FileTreeFile>
        <FileTreeFile value="readme" name="README.md">
          <template #icon><LucideIcon name="FileText" :size="16" style="color: var(--beui-muted-foreground)" /></template>
        </FileTreeFile>
      </FileTree>
    </div>
  </div>
</template>

<style scoped>
.stage { display: flex; min-height: 420px; width: 100%; align-items: flex-start; justify-content: center; padding: 2.5rem 1rem 0; box-sizing: border-box; }
.box { width: 100%; max-width: 20rem; padding: .5rem; box-sizing: border-box; }
</style>
