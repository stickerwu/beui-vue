<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import {
  ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator,
  ContextMenuShortcut, ContextMenuTrigger, useReducedMotion
} from 'beui-vue'
import { ref } from 'vue'
import { MenuIcon } from './menu-icons'

const swapSpring = { type: 'spring', stiffness: 460, damping: 30, mass: 0.55 } as const
const reduce = useReducedMotion()
const message = ref<string | null>(null)
const offline = ref(false)
</script>

<template>
  <div class="ctx-stage">
    <ContextMenu>
      <ContextMenuTrigger>
        <button type="button" class="ctx-target">
          <div class="folder">
            <div class="ctx-tab" />
            <div class="ctx-back" />
            <div class="ctx-front" />
            <div class="ctx-rule" />
          </div>

          <span class="title">Right click on me</span>

          <div class="status">
            <AnimatePresence mode="wait" :initial="false">
              <motion.span
                v-if="message" :key="message" class="note"
                :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 3, filter: 'blur(2px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
                :exit="reduce ? { opacity: 0 } : { opacity: 0, y: -2, filter: 'blur(2px)' }" :transition="reduce ? { duration: 0.1 } : swapSpring"
              >
                <MenuIcon name="Check" class="tick" />
                {{ message }}
              </motion.span>
              <span v-else key="hint" class="hint">or long-press · Shift + F10</span>
            </AnimatePresence>
          </div>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent aria-label="Folder actions" style="width: 15rem">
        <ContextMenuLabel>Project files</ContextMenuLabel>
        <ContextMenuItem text-value="Open" @select="message = 'Folder opened'">
          <MenuIcon name="Eye" />
          Open
          <ContextMenuShortcut>↵</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem text-value="Rename" @select="message = 'Ready to rename'">
          <MenuIcon name="Pencil" />
          Rename
          <ContextMenuShortcut>R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem text-value="Duplicate" @select="message = 'Folder duplicated'">
          <MenuIcon name="Copy" />
          Duplicate
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem text-value="Download" @select="message = 'Download started'">
          <MenuIcon name="Download" />
          Download
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuCheckboxItem
          text-value="Keep offline" :checked="offline" :close-on-select="false"
          @checked-change="(checked: boolean) => { offline = checked; message = checked ? 'Available offline' : 'Online only' }"
        >
          Keep offline
        </ContextMenuCheckboxItem>

        <ContextMenuSeparator />

        <ContextMenuItem tone="destructive" text-value="Move to trash" @select="message = 'Moved to trash'">
          <MenuIcon name="Trash2" />
          Move to trash
          <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  </div>
</template>

<style scoped>
.ctx-stage { display: flex; width: 100%; min-height: 360px; align-items: center; justify-content: center; box-sizing: border-box; }
.ctx-target { display: flex; flex-direction: column; align-items: center; border: 0; background: none; padding: 0; color: inherit; font: inherit; outline: none; cursor: default; }
.folder { position: relative; width: 8rem; height: 6rem; transition: transform 0.15s; }
.ctx-target:active .folder { transform: scale(0.98); }
.ctx-target:focus-visible .folder { border-radius: 1rem; box-shadow: 0 0 0 4px var(--beui-background), 0 0 0 6px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.ctx-tab { position: absolute; left: 0.25rem; top: 0.25rem; width: 3.5rem; height: 1.75rem; border-radius: 10px 10px 0 0; background: #d4a84f; }
.ctx-back { position: absolute; inset: 1.25rem 0 0; border-radius: 14px; background: #e7bb61; box-shadow: 0 14px 24px -16px rgba(90, 58, 8, 0.75); }
.ctx-front { position: absolute; inset: 2.25rem 0 0; border-radius: 14px; background: #efc86f; }
.ctx-rule { position: absolute; inset: auto 1.25rem 1rem; height: 1px; background: rgb(0 0 0 / 0.1); }
:global(.dark .ctx-tab) { background: #a77d2f; }
:global(.dark .ctx-back) { background: #bd8d36; }
:global(.dark .ctx-front) { background: #cb9a41; }
:global(.dark .ctx-rule) { background: rgb(255 255 255 / 0.1); }
.title { margin-top: 1rem; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.status { margin-top: 0.25rem; height: 1rem; }
.hint, .note { font-size: 10px; line-height: 1rem; color: var(--beui-muted-foreground); }
.note { display: flex; align-items: center; gap: 0.25rem; }
.tick { width: 0.75rem; height: 0.75rem; color: oklch(70% 0.18 155); }
</style>
