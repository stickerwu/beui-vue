export const pressSpring = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 } as const
export const glideSpring = { type: 'spring', stiffness: 700, damping: 50, mass: 0.5 } as const
export const tabsSpring = { type: 'spring', stiffness: 245, damping: 36, mass: 1.2 } as const
export const toastSpring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.75 } as const
/** Content swaps — label/icon slots trading places inside a control. Mirrors `SPRING_SWAP` in `lib/ease.ts`. */
export const swapSpring = { type: 'spring', stiffness: 460, damping: 30, mass: 0.55 } as const
/** Overlay panel entrances — modals and sheets summoned by pointer. Mirrors `SPRING_PANEL`. */
export const panelSpring = { type: 'spring', stiffness: 420, damping: 40, mass: 0.5 } as const
/** Shared-layout glides — pills, indicators and cards morphing between positions. Mirrors `SPRING_LAYOUT`. */
export const layoutSpring = { type: 'spring', stiffness: 360, damping: 32, mass: 0.6 } as const
/** Cursor-follow physics for decorative mouse tracking (magnetic, tilt, dock). Mirrors `SPRING_MOUSE`. */
export const mouseSpring = { stiffness: 200, damping: 15, mass: 0.3 } as const
export const easeOut = [0.16, 1, 0.3, 1] as const
/** Symmetric curve for loops that run both ways (a loader's pulse, a breathing orb). */
export const easeInOut = [0.77, 0, 0.175, 1] as const
