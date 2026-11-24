/** English copy of the Motion guide (beui.dev `Pages.motionPatterns`), reworded for Vue where code is named. */
export const motionCopyEn = {
  header: {
    eyebrow: 'Motion guide',
    title: 'Motion that explains, not distracts',
    intro: 'A practical guide to deciding when something should move, choosing the right token, and shipping motion that stays fast, coherent, and accessible.',
  },
  sections: {
    decisionFramework: { eyebrow: 'Decision framework', title: 'Four questions before motion', description: 'The best animation decision is often made before touching a duration or spring value.' },
    motionTokens: { eyebrow: 'Motion tokens', title: 'Use one language everywhere', description: 'beui-vue keeps deliberate motion in shared tokens. Choose by purpose so components feel related without moving identically.' },
    timing: { eyebrow: 'Timing', title: 'Fast enough to feel immediate', description: 'Duration depends on size, distance, and frequency. These ranges are starting points, not targets to hit mechanically.' },
    recipes: { eyebrow: 'Recipes', title: 'Patterns you can copy', description: 'Each recipe connects a purpose to a production token, a reduced-motion state, and a concrete failure mode.' },
    accessibility: { eyebrow: 'Accessibility', title: 'Reduced motion is a designed state', description: 'Do not remove every transition. Keep feedback that helps comprehension and remove movement that can cause discomfort.' },
  },
  decisions: {
    frequency: { title: 'Check frequency', body: 'Repeated actions should feel nearly instant. Save expressive motion for moments users see occasionally.', note: '100× a day: no choreography. Rare moments: more delight is allowed.' },
    purpose: { title: 'Name the purpose', body: 'Motion should explain space, confirm input, show state, or soften a change. Decoration alone is not enough.', note: 'If you cannot explain why it moves, remove the movement.' },
    physics: { title: 'Choose the physics', body: 'Use ease-out for entrances, ease-in-out for movement, linear for progress, and springs for gestures.', note: 'The curve should match what the object is doing, not personal taste.' },
    fallback: { title: 'Design the fallback', body: 'Reduced motion keeps useful opacity and color feedback while removing travel, scale, and parallax.', note: 'Accessibility is a motion state, not an afterthought.' },
  },
  timing: {
    interaction: 'Interaction',
    range: 'Range',
    desiredFeel: 'Desired feel',
    note: 'Under 300ms is the default for interface motion. Longer motion belongs to explanatory demos, deliberate gestures, and large spatial changes.',
    rows: {
      press: { use: 'Press feedback', range: '100–160ms', feel: 'Immediate and physical' },
      tooltip: { use: 'Tooltip / popover', range: '125–200ms', feel: 'Quick, origin-aware' },
      dropdown: { use: 'Dropdown / select', range: '150–250ms', feel: 'Responsive, no waiting' },
      modal: { use: 'Modal / drawer', range: '200–500ms', feel: 'Enough time to explain space' },
      marketing: { use: 'Marketing demo', range: 'Flexible', feel: 'Clarity matters more than speed' },
    },
  },
  easing: {
    title: 'Compare the curves',
    subtitle: 'Same distance and duration. Different jobs.',
    easeOut: 'Entrances and exits respond immediately, then settle quietly.',
    easeInOut: 'Objects already on screen accelerate and decelerate naturally.',
    springPress: 'Fast, weighted feedback for buttons and other pressable surfaces.',
    springLayout: 'Shared surfaces and indicators that need continuous spatial movement.',
  },
  recipes: {
    purpose: 'Purpose',
    avoid: 'Avoid',
    viewRecipe: 'View recipe',
    press: { title: 'Press feedback', eyebrow: 'Feedback', description: 'A press should acknowledge input before the action finishes. Keep the scale small and the response immediate.', purpose: 'Confirms that the interface heard the user.', avoid: 'Large scale changes, slow rebounds, or a spring on every child.' },
    icon: { title: 'Semantic icon motion', eyebrow: 'Meaning', description: 'Let the icon imitate its real action. A bell swings from its hinge; a download arrow drops toward its tray.', purpose: 'Reinforces what the action does without adding another label.', avoid: 'The same generic bounce on every icon, or motion on touch hover.' },
    reveal: { title: 'Content reveal', eyebrow: 'Entrance', description: 'Reveal one meaningful surface with a short lift and restrained blur. The motion should finish before it becomes the focus.', purpose: 'Prevents new content from appearing as a jarring visual cut.', avoid: 'Half-second UI entrances or a long stagger across every small child.' },
    layout: { title: 'Layout continuity', eyebrow: 'Movement', description: 'Keep the same surface visible while its footprint changes. Move the shape first, then introduce its label.', purpose: 'Preserves object identity while a compact control expands.', avoid: 'Direct width tweens or text appearing before the surface makes room.' },
    swap: { title: 'Content swap', eyebrow: 'State change', description: 'For small view changes, let the old content leave faster than the new content arrives. Keep travel to a few pixels.', purpose: 'Clarifies that content changed while the surrounding context stayed put.', avoid: 'Large page-like transitions for tabs, filters, or frequently changed views.' },
  },
  accessibility: {
    title: 'Keep meaning. Remove travel.',
    body: 'Preserve opacity, color, and instant state changes. Drop parallax, large transforms, repeated scale, and spring overshoot.',
  },
  demos: {
    replay: 'Replay',
    pressMe: 'Press me',
    hoverBell: 'Hover bell',
    newSurface: 'New surface',
    readyBeforeFocus: 'Ready before focus.',
    expandPanel: 'Expand panel',
    collapsePanel: 'Collapse panel',
    openPanel: 'Open panel',
    exampleViews: 'Example views',
    preview: 'Preview',
    code: 'Code',
    livePreview: 'Live component view',
    copyReadySource: 'Copy-ready source',
  },
}

export type MotionCopy = typeof motionCopyEn
