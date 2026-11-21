# Visual verification

This version is based on beUI commit `c0a936f` and covers 122 components and 38 blocks. Every catalog entry can run its Vue example, show its API and open the corresponding upstream source.

## Visual comparison

- [172 pairs of upstream and Vue preview screenshots](/review/index.html). Captured in the light theme with reduced motion; filter by component name and zoom in. Each side keeps its own preview, so differences in copy, data and controls remain visible in the images.
- [Keyframes and pixel differences for six reference samples](/review/frames/index.html). Captured with the same viewport and data in both light and dark themes, at the starting frame, 80 ms and 780 ms. The scenes cover pressing a button, switching tabs, moving a slider, adding a notification, inspecting a data point and switching a Shader frame.

## Verification scope

Browser tests cover Chromium, Firefox, WebKit and emulated touch environments, checking component interaction, the server-rendered first paint and client takeover. Installation tests use the actual packaged `.tgz` in standalone Vite and Nuxt projects.

Drag release on real devices, fast reverse switching and interrupted animations still need a per-variant review. Maintainers record evidence for four criteria (keyframes, keyboard, touch and reduced motion) in `ports*.json`, and the catalog updates its pass counts as those records change. The release check for the stable `1.0.0` version requires every variant to pass.
