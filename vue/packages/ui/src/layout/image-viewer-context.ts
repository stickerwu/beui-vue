import { inject, type ComputedRef, type InjectionKey, type Slot } from 'vue'

/** English defaults. Override per instance with `labels`. */
export const imageViewerMessages = {
  label: 'Image gallery',
  open: 'Open {alt}',
  counter: '{current} / {total}',
  close: 'Close viewer',
  previous: 'Previous image',
  next: 'Next image',
  loadError: 'Unable to load this image.',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  panHelp: 'When zoomed in, drag the image to pan, or keep this control focused and use the arrow keys.',
}
export type ImageViewerMessages = typeof imageViewerMessages

export interface LightboxImage {
  id: string
  src: string
  alt: string
  /** Intrinsic dimensions preserve aspect ratio through the thumbnail morph. */
  width: number
  height: number
  caption?: string
}
export type ImageViewerImage = LightboxImage

export interface MorphingLightboxProps {
  images: readonly LightboxImage[]
  label?: string
  className?: string
  thumbnailClassName?: string
  /** Override any built-in string. */
  labels?: Partial<ImageViewerMessages>
}

export interface ImageViewerContext {
  images: ComputedRef<readonly LightboxImage[]>
  /** Id of the open image, or null. */
  value: ComputedRef<string | null>
  image: ComputedRef<LightboxImage | undefined>
  index: ComputedRef<number>
  label: ComputedRef<string>
  t: ComputedRef<ImageViewerMessages>
  fill: (template: string, values: Record<string, string | number>) => string
  groupKey: string
  reduce: ComputedRef<boolean>
  renderCaption: () => Slot | undefined
  select: (id: string | null) => void
  move: (direction: -1 | 1) => void
  close: () => void
}

export const imageViewerKey: InjectionKey<ImageViewerContext> = Symbol('beui-image-viewer')

export function useImageViewerContext(part: string) {
  const context = inject(imageViewerKey, null)
  if (!context) throw new Error(`${part} must be used within ImageViewer.`)
  return context
}

/** Shared selection and navigation for custom gallery and viewer controls. */
export function useImageViewer() {
  const { images, value, image, index, select, move, close } = useImageViewerContext('useImageViewer')
  return {
    images, value, image, index,
    hasPrevious: () => index.value > 0,
    hasNext: () => index.value >= 0 && index.value < images.value.length - 1,
    select, close,
    previous: () => move(-1),
    next: () => move(1),
  }
}
