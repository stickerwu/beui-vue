export type UploadItem = {
  id: string, name: string, size?: number, type?: string, progress?: number,
  kind?: 'link' | 'file' | 'image' | 'audio', status?: 'queued' | 'uploading' | 'complete' | 'success' | 'error' | 'failed' | 'idle',
  error?: string, file?: File, href?: string, previewUrl?: string, duration?: number, currentTime?: number
}
export interface UploadProps {
  value?: UploadItem[], modelValue?: UploadItem[], defaultValue?: UploadItem[], accept?: string, multiple?: boolean, maxFiles?: number,
  maxFileSize?: number, disabled?: boolean, variant?: 'default' | 'centered', title?: string, description?: string, browseLabel?: string, playingId?: string
}
export function accepts(file: File, accept: string | undefined) {
  if (!accept) return true
  return accept.toLowerCase().split(',').some(entry => {
    const match = entry.trim()
    if (match.startsWith('.')) return file.name.toLowerCase().endsWith(match)
    return match.endsWith('/*') ? file.type.startsWith(match.slice(0,-1)) : file.type === match
  })
}
export function filesize(bytes?: number) {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
