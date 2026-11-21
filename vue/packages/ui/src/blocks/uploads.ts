/**
 * Shared model for the two upload blocks: `FileUpload` (the progress queue) and
 * `AttachmentUpload` (the mixed attachment workspace). The React originals are
 * separate files with their own drag physics, queue lifecycle and motion, so
 * only the item shapes and the inline icon set live here.
 */
import { defineComponent, h, type PropType } from 'vue'
import type { AttachmentUploadMessages, FileUploadMessages } from './messages'
// Type-only, so nothing at runtime depends on the component modules.
import type { FileUploadProps } from './UploadSurface.vue'
import type { AttachmentUploadProps } from './AttachmentUpload.vue'

/* -------------------------------------------------------------------------- */
/* File queue (components/motion/file-upload.tsx)                             */
/* -------------------------------------------------------------------------- */

export type FileUploadStatus = 'queued' | 'uploading' | 'success' | 'error'
export type FileUploadVariant = 'default' | 'centered'

export type FileUploadItem = {
  id: string
  name: string
  size: number
  type?: string
  progress?: number
  status?: FileUploadStatus
  error?: string
  file?: File
}

export type FileUploadClassNames = {
  root?: string
  dropzone?: string
  queue?: string
  item?: string
  leading?: string
  content?: string
  name?: string
  meta?: string
  progress?: string
  action?: string
}

/* -------------------------------------------------------------------------- */
/* Attachment workspace (components/motion/attachment-upload.tsx)             */
/* -------------------------------------------------------------------------- */

export type AttachmentUploadKind = 'file' | 'link' | 'image' | 'audio'
export type AttachmentRejectReason = 'too-large' | 'max-files'
export type AttachmentUploadStatus = 'idle' | 'uploading' | 'complete' | 'failed'

export type AttachmentUploadItem = {
  id: string
  name: string
  kind: AttachmentUploadKind
  size?: number
  href?: string
  previewUrl?: string
  currentTime?: number
  duration?: number
  status?: AttachmentUploadStatus
  error?: string
  file?: File
}

export type AttachmentUploadClassNames = {
  dropzone?: string
  list?: string
  row?: string
}

/** Legacy shared item union (`blocks/index.ts` re-exports it). */
export type UploadItem = FileUploadItem | AttachmentUploadItem
/** Legacy shared prop surface (`blocks/index.ts` re-exports it). */
export type UploadProps = FileUploadProps | AttachmentUploadProps

/** Mirrors `createFileUploadItem` in the React original. */
export function createFileUploadItem(file: File, index = 0): FileUploadItem {
  return {
    id: `${Date.now()}-${index}-${file.name}`,
    name: file.name,
    size: file.size,
    type: file.type,
    progress: 0,
    status: 'uploading',
    file,
  }
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

/*
 * The React originals import lucide icons. The Vue package ships without an icon
 * dependency, so the same glyphs are inlined here as path data (lucide v1.29,
 * ISC) and rendered by `UploadGlyph`. The component is local to this folder:
 * `blocks/index.ts` does not export it.
 */
export type UploadGlyphName =
  | 'uploadCloud'
  | 'fileImage'
  | 'fileVideo'
  | 'fileAudio'
  | 'fileArchive'
  | 'fileSpreadsheet'
  | 'fileText'
  | 'fileCode'
  | 'file'
  | 'checkCircle'
  | 'check'
  | 'alertCircle'
  | 'loader'
  | 'rotateCcw'
  | 'x'
  | 'externalLink'
  | 'link'
  | 'mic'
  | 'paperclip'
  | 'play'
  | 'pause'
  | 'upload'

type GlyphNode = readonly [string, Record<string, string>]

const FILE_OUTLINE: GlyphNode = [
  'path',
  {
    d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
  },
]
const FILE_CORNER: GlyphNode = ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }]

const UPLOAD_GLYPHS: Record<UploadGlyphName, readonly GlyphNode[]> = {
  uploadCloud: [
    ['path', { d: 'M12 13v8' }],
    ['path', { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242' }],
    ['path', { d: 'm8 17 4-4 4 4' }],
  ],
  fileImage: [
    FILE_OUTLINE,
    FILE_CORNER,
    ['circle', { cx: '10', cy: '12', r: '2' }],
    ['path', { d: 'm20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22' }],
  ],
  fileVideo: [
    FILE_OUTLINE,
    FILE_CORNER,
    [
      'path',
      {
        d: 'M15.033 13.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56v-4.704a.645.645 0 0 1 .967-.56z',
      },
    ],
  ],
  fileAudio: [
    [
      'path',
      {
        d: 'M4 6.835V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-.343',
      },
    ],
    FILE_CORNER,
    [
      'path',
      {
        d: 'M2 19a2 2 0 0 1 4 0v1a2 2 0 0 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 0 1-4 0v-1a2 2 0 0 1 4 0',
      },
    ],
  ],
  fileArchive: [
    [
      'path',
      {
        d: 'M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5',
      },
    ],
    FILE_CORNER,
    ['path', { d: 'M8 12v-1' }],
    ['path', { d: 'M8 18v-2' }],
    ['path', { d: 'M8 7V6' }],
    ['circle', { cx: '8', cy: '20', r: '2' }],
  ],
  fileSpreadsheet: [
    FILE_OUTLINE,
    FILE_CORNER,
    ['path', { d: 'M8 13h2' }],
    ['path', { d: 'M14 13h2' }],
    ['path', { d: 'M8 17h2' }],
    ['path', { d: 'M14 17h2' }],
  ],
  fileText: [
    FILE_OUTLINE,
    FILE_CORNER,
    ['path', { d: 'M10 9H8' }],
    ['path', { d: 'M16 13H8' }],
    ['path', { d: 'M16 17H8' }],
  ],
  fileCode: [
    [
      'path',
      {
        d: 'M4 12.15V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3.35',
      },
    ],
    FILE_CORNER,
    ['path', { d: 'm5 16-3 3 3 3' }],
    ['path', { d: 'm9 22 3-3-3-3' }],
  ],
  file: [FILE_OUTLINE, FILE_CORNER],
  checkCircle: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'm9 12 2 2 4-4' }],
  ],
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  alertCircle: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['line', { x1: '12', x2: '12', y1: '8', y2: '12' }],
    ['line', { x1: '12', x2: '12.01', y1: '16', y2: '16' }],
  ],
  loader: [['path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' }]],
  rotateCcw: [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
    ['path', { d: 'M3 3v5h5' }],
  ],
  x: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }],
  ],
  externalLink: [
    ['path', { d: 'M15 3h6v6' }],
    ['path', { d: 'M10 14 21 3' }],
    ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }],
  ],
  link: [
    ['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }],
    ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }],
  ],
  mic: [
    ['path', { d: 'M12 19v3' }],
    ['path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }],
    ['rect', { x: '9', y: '2', width: '6', height: '13', rx: '3' }],
  ],
  paperclip: [
    ['path', { d: 'm16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551' }],
  ],
  play: [
    [
      'path',
      { d: 'M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z' },
    ],
  ],
  pause: [
    ['rect', { x: '14', y: '3', width: '5', height: '18', rx: '1' }],
    ['rect', { x: '5', y: '3', width: '5', height: '18', rx: '1' }],
  ],
  upload: [
    ['path', { d: 'M12 3v12' }],
    ['path', { d: 'm17 8-5-5-5 5' }],
    ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
  ],
}

/** One inlined lucide glyph, sized in `rem`/`px` through `size`. */
export const UploadGlyph = defineComponent({
  name: 'UploadGlyph',
  props: {
    icon: { type: String as PropType<UploadGlyphName>, required: true },
    size: { type: String, default: '1rem' },
    /** `fill-current` in the original — used by the play and pause glyphs. */
    filled: { type: Boolean, default: false },
  },
  setup(props) {
    return () =>
      h(
        'svg',
        {
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: props.filled ? 'currentColor' : 'none',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          style: { width: props.size, height: props.size, display: 'block', flex: 'none' },
        },
        UPLOAD_GLYPHS[props.icon].map(([tag, attrs], index) => h(tag, { ...attrs, key: index })),
      )
  },
})
