<script setup lang="ts">
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from 'beui-vue'
import { ref } from 'vue'
import { MenuIcon } from './menu-icons'

const statusBar = ref(true)
const compact = ref(false)
const panel = ref('bottom')
</script>

<template>
  <div class="menu-stage">
    <DropdownMenu>
      <DropdownMenuTrigger>
        <!-- No press or hover scale: the menu measures the trigger as it opens. -->
        <button type="button" class="menu-trigger">
          Options
          <MenuIcon name="ChevronDown" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent style="width: 14rem">
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuItem>
          <MenuIcon name="User" />
          Profile
          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <MenuIcon name="CreditCard" />
          Billing
          <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <MenuIcon name="Settings" />
          Settings
          <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <MenuIcon name="Share2" />
            Share
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent style="width: 11rem">
            <DropdownMenuItem>
              <MenuIcon name="Mail" />
              Email
            </DropdownMenuItem>
            <DropdownMenuItem>
              <MenuIcon name="MessageSquare" />
              Message
            </DropdownMenuItem>
            <DropdownMenuItem>
              <MenuIcon name="Link2" />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuLabel inset>View</DropdownMenuLabel>
        <DropdownMenuCheckboxItem v-model:checked="statusBar">Status bar</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem v-model:checked="compact">Compact rows</DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel inset>Panel</DropdownMenuLabel>
        <DropdownMenuRadioGroup v-model:value="panel">
          <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="hidden" disabled>Hidden</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="destructive">
          <MenuIcon name="LogOut" />
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<style scoped>
.menu-stage { display: flex; width: 100%; min-height: 360px; align-items: flex-start; justify-content: center; padding-top: 4rem; box-sizing: border-box; }
.menu-trigger {
  display: inline-flex; height: 2.5rem; align-items: center; gap: 0.375rem; box-sizing: border-box; border: 1px solid var(--beui-border); border-radius: 9999px;
  background: var(--beui-card); padding: 0 1rem 0 1.25rem; color: var(--beui-foreground); font: inherit; font-size: 0.875rem; font-weight: 500; line-height: 1.25rem; cursor: pointer;
  outline: none; transition: background-color 0.15s;
}
.menu-trigger:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
.menu-trigger:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 12%, transparent); }
.menu-trigger svg { width: 1rem; height: 1rem; color: var(--beui-muted-foreground); transition: transform 0.2s; }
.menu-trigger[data-state='open'] svg { transform: rotate(180deg); }
</style>
