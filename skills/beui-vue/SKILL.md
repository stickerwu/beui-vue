---
name: beui-vue
description: Pick and install beui-vue (@beui-vue) animated Vue 3 components through the beui-vue MCP server or the shadcn-vue registry. Use when building motion UI in Vue or Nuxt, agent/chat interfaces, toasts, docks, bottom sheets, drawers, popovers, sliders, loaders, 404 pages, or any component from beui.stickerwu.net. Maps user intent to exact @beui-vue install slugs instead of inventing custom widgets.
---

# beui-vue

beui-vue is the Vue 3 port of beUI. Use it as copy-paste source through its MCP server or the `@beui-vue` shadcn-vue registry, or as the `beui-vue` package.

See the [Agent guide](https://beui.stickerwu.net/en/docs/ai-agents) for current connection instructions and endpoints.
The MCP server at `https://beui.stickerwu.net/mcp` needs no key.

## Workflow

1. Discover current components with the MCP's `list_components` or `search_components` when connected. Otherwise, fetch the live registry:

```bash
curl -fsS https://beui.stickerwu.net/r/index.json
```

2. Pick the closest install slug from `items[].name`. A docs page can hold several installable variants (the Button page installs `button-base`, `button-stateful`, `button-magnetic`, `button-metallic`), so do not assume every page slug is an install slug.
3. Inspect the item with MCP `get_component`, or read `https://beui.stickerwu.net/r/<slug>.json`. Its `docs` field names the file to import and the shared styles to load once.
4. The project needs a `components.json`; if there is none, run `npx shadcn-vue@latest init` first. Then install with the user's package runner:

```bash
npx shadcn-vue@latest add @beui-vue/<slug>
# or
pnpm dlx shadcn-vue@latest add @beui-vue/<slug>
# or
bunx --bun shadcn-vue@latest add @beui-vue/<slug>
```

The full URL works too: `npx shadcn-vue@latest add https://beui.stickerwu.net/r/<slug>.json`.

5. Load the shared styles once in the app entry, `import '@/components/beui/styles.css'`, then import the component from the file that was added, for example `import ButtonBase from '@/components/beui/ButtonBase.vue'`.

Projects that prefer a dependency can install the `beui-vue` package instead (`npm install beui-vue@next`; see the [installation guide](https://beui.stickerwu.net/en/install)), import named components from `beui-vue`, and load `beui-vue/style.css` once.

The live registry is the source of truth. Use the table below only to resolve common lookalikes.

## Picker

| User asks for | Install `@beui-vue/...` | Avoid |
| --- | --- | --- |
| Toast or snackbar | `animated-toast-stack` | `notification-stack` |
| Expanding notification inbox | `notification-stack` | `animated-toast-stack` |
| Mobile bottom sheet, Vaul-style panel | `bottom-sheet` | `drawer` |
| Side panel or app drawer | `drawer` | `bottom-sheet` |
| App chrome sidebar | `animated-sidebar` | `bounce-sidebar`, `ai-sidebar` |
| AI files, folders, bookmarks | `ai-sidebar` | `animated-sidebar` |
| Whole agent workspace | `chat-app` | hand-rolled chat shell |
| Streaming thread that follows tokens | `message-scroller`, `message` | custom scroll math |
| Just a chat bubble | `message-bubble` | custom bubble |
| Prompt box or composer | `prompt-input` | textarea plus custom buttons |
| Agent reasoning, search, tool trace | `agent-activity` | plain log list |
| Task plan | `todo-list` | custom checklist |
| Code surface | `code-block` | pre/code from scratch |
| File diff | `file-diff` | custom diff renderer |
| Tool output | `tool-result` | raw terminal block |
| Tool permission card | `tool-approval` | alert dialog |
| Approval or HITL question | `approval-card` | custom form |
| Inline citations | `citations` | plain numbered links |
| Generated image canvas | `image-generation` | image card from scratch |
| Liquid popover | `popover` | `popover-morph` |
| Corner morph popover | `popover-morph` | `popover` |
| Dropdown select | `select` | `select-morph`, `combobox` |
| Select that grows into panel | `select-morph` | `select` |
| Searchable select | `combobox` | `select` |
| Cmd+K palette | `command-palette` | `combobox` |
| Right-click or long-press menu | `context-menu` | `bloom-menu` |
| Button that blooms into a menu | `bloom-menu` | `context-menu` |
| Press button | `button-base` | custom `motion.button` (motion-v) |
| Loading/success/error button | `button-stateful` | spinner button |
| Magnetic button | `button-magnetic` | custom pointer tracking |
| Hold to confirm | `hold-action-button` | `button-base` |
| Slide to confirm | `slide-action-button` | `swipeable-list` |
| Hover CTA with expanding arrow | `expanding-arrow-button` | `button-base` |
| Spinner, dots, bars loader | `loader` | `thinking-shimmer` |
| Agent thinking status | `thinking-shimmer` | `loader`, `text-shimmer` |
| Cycling reasoning phrases | `reasoning-text` | `text-cascade` |
| Timed agent progress glyph | `agent-progress` | `loader` |
| Shimmer headline text | `text-shimmer` | `thinking-shimmer` |
| Word or letter reveal | `text-reveal` | `text-cascade` |
| Chromatic cycling word | `chromatic-text-reveal` | `text-shimmer` |
| Slot-machine letters | `text-cascade` | `text-scramble` |
| Scramble resolving text | `text-scramble` | `text-cascade` |
| Rolling digits | `number-ticker` | `animated-number` |
| Count-up on view | `animated-number` | `number-ticker` |
| Tick-dot slider | `range-slider` | other `range-slider-*` |
| Inline label slider | `range-slider-inline` | `range-slider` |
| Liquid fill slider | `range-slider-fluid` | `range-slider` |
| Equalizer slider | `range-slider-wave` | `range-slider` |
| Tilting value bubble slider | `range-slider-bubble` | `range-slider` |
| Ruler slider | `range-slider-ruler` | `range-slider` |
| iOS wheel picker | `wheel-picker` | `select` |
| macOS dock | `dock` | `expandable-action-bar` |
| Icon actions with labels | `expandable-action-bar` | `dock` |
| Overflow action rail | `overflow-actions` | `expandable-action-bar` |
| Icon tabs with active label | `expandable-tabs` | `tabs` |
| Morphing tab content room | `morphing-tabs` | `tabs` |
| Pill or underline tabs | `tabs` | `expandable-tabs` |
| Hover gliding background | `shared-layout-bg` | `tabs` |
| Preview ticks or rail | `preview-rail` | `bounce-sidebar` |
| Dynamic Island | `dynamic-island` | `notification-stack` |
| Swipe row actions | `swipeable-list` | `slide-action-button` |
| Pull to refresh | `pull-to-refresh` | custom touch math |
| Basic upload queue | `file-upload` | `attachment-upload` |
| Mixed file, audio, image attachments | `attachment-upload` | `file-upload` |
| OTP or PIN boxes | `otp-input` | `input` |
| Sign-up form | `signup-form` | manual form assembly |
| Theme wipe | `theme-toggle` | class toggle only |
| Shader background | `shader-background` | custom canvas |
| Cylinder carousel | `cylinder-carousel` | `marquee` |
| Logo or text marquee | `marquee` | `cylinder-carousel` |
| Data table | `table` | HTML table from scratch |
| Activity heatmap, contribution graph | `heat-calendar` | custom grid |
| Monthly returns grid | `returns-calendar` | `heat-calendar` |
| Analyst price target chart, forecast fan | `price-target-fan` | custom svg chart |
| Editable table | `table-editable` | `table` |
| Async table | `table-async` | `table` |
| Tournament bracket | `knockout-bracket` | `knockout-wheel` |
| Radial tournament wheel | `knockout-wheel` | `knockout-bracket` |
| 404 page | `not-found-glitch` | custom 404 |
| Project folder card | `project-folder` | folder card from scratch |
| Token or chain swap | `swap` | custom swap form |
| Weekly availability editor | `availability-scheduler` | custom calendar grid |
| Wallet overview card | `wallet-card` | custom wallet card |
| Prediction market ticket | `prediction-market` | custom trade ticket |
| Feedback popup | `feedback-widget` | `animated-toast-stack` |
| Infinite masonry grid | `infinite-masonry` | CSS columns |
| Accordion | `bouncy-accordion` | custom accordion |
| 3D tilt card | `tilt-card` | custom glare math |
| Tooltip | `tooltip` | `popover` |
| Switch, checkbox, radio, input | `switch`, `checkbox`, `radio`, `input` | restyled native controls |

## Composition rules

- Prefer installed beui-vue source over custom one-off motion widgets.
- Use `<script setup lang="ts">` with the component's typed props, `v-model` and events as documented on its page.
- Pass `class` for layout and small styling changes, and theme with the `--beui-*` CSS variables. Do not fork internals unless the user asks.
- Keep the helpers the registry installs next to the component, such as `core/motion.ts` and `core/reduced-motion.ts`.
- If adding new motion around beui-vue components, use `motion-v`, the shared tokens (`pressSpring`, `layoutSpring`, `easeOut`, ...) and `useReducedMotion()` from `beui-vue`.
- Gate decorative hover effects like magnetic pull and tilt behind a `(hover: hover) and (pointer: fine)` media query.
- Animate `transform` and `opacity`; avoid layout-property animation.

## Charts and casino

Chart components (`heat-calendar`, `returns-calendar`, `price-target-fan` and the other charts) live under `/charts` in the docs; casino games (`crash`, `mines`, `plinko`, `slide-game`) live under `/casino`. Their install slugs are in the registry like any other item.

Compose charts from their root and parts. `HeatCalendar` provides `HeatCalendarGrid`, `HeatCalendarLegend` and `HeatCalendarTooltip`; `ReturnsCalendar` provides `ReturnsCalendarGrid` and `ReturnsCalendarTooltip`. Put each calendar tooltip inside its grid. Sample data belongs in the consuming app, not the chart implementation.
