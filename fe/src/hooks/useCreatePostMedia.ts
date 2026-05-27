import { useState, useRef, useCallback } from 'react'
import { shortId } from '../utils/shortId'
import type { MediaFile } from '../components/create-post/types'

export interface UseCreatePostMediaReturn {
  media: MediaFile[]
  dragOver: boolean
  dragId: string | null
  dragOverId: string | null
  editingId: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  replaceInputRef: React.RefObject<HTMLInputElement | null>
  replaceTargetIdRef: React.MutableRefObject<string | null>
  setMedia: React.Dispatch<React.SetStateAction<MediaFile[]>>
  setDragOver: (v: boolean) => void
  setEditingId: (v: string | null) => void
  handleFiles: (files: FileList | null) => void
  onDrop: (e: React.DragEvent) => void
  removeMedia: (id: string) => void
  handleDragStart: (id: string) => void
  handleDragOver: (e: React.DragEvent, id: string) => void
  handleDropOnThumb: (id: string) => void
  handleDragEnd: () => void
  handleReplaceVideo: (id: string) => void
  handleReplaceFile: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleEditorSave: (blob: Blob) => void
  resetMedia: () => void
}

export function useCreatePostMedia(): UseCreatePostMediaReturn {
  const [media, setMedia] = useState<MediaFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const replaceTargetIdRef = useRef<string | null>(null)

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      const type = file.type.startsWith('video') ? 'video' : 'image'
      const localUrl = URL.createObjectURL(file)

      // Add local preview with the original File object attached.
      // The actual upload to cloud storage happens at save time.
      setMedia(prev => [...prev, {
        id: shortId(),
        url: localUrl,
        type,
        name: file.name,
        file,
      }])
    })
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeMedia = (id: string) => {
    setMedia(prev => {
      const item = prev.find(m => m.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return prev.filter(m => m.id !== id)
    })
    setEditingId(prev => (prev === id ? null : prev))
  }

  const handleDragStart = (id: string) => setDragId(id)
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id) }
  const handleDropOnThumb = (id: string) => {
    if (!dragId || dragId === id) { setDragId(null); setDragOverId(null); return }
    setMedia(prev => {
      const from = prev.findIndex(m => m.id === dragId)
      const to = prev.findIndex(m => m.id === id)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
    setDragId(null); setDragOverId(null)
  }
  const handleDragEnd = () => { setDragId(null); setDragOverId(null) }

  const handleReplaceVideo = (id: string) => {
    replaceTargetIdRef.current = id
    replaceInputRef.current?.click()
  }

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const targetId = replaceTargetIdRef.current
    if (!file || !targetId) return
    const newUrl = URL.createObjectURL(file)
    const newType: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image'
    setMedia(prev => prev.map(m => {
      if (m.id !== targetId) return m
      URL.revokeObjectURL(m.url)
      return { ...m, url: newUrl, type: newType, name: file.name, file }
    }))
    e.target.value = ''
    replaceTargetIdRef.current = null
  }

  const handleEditorSave = (blob: Blob) => {
    if (!editingId) return
    const newUrl = URL.createObjectURL(blob)
    setMedia(prev => prev.map(m => {
      if (m.id !== editingId) return m
      URL.revokeObjectURL(m.url)
      // Store the edited blob as a new File so it can be uploaded at save time
      const editedFile = new File([blob], m.name.replace(/\.[^.]+$/, '') + '_edited.jpg', { type: 'image/jpeg' })
      return { ...m, url: newUrl, name: editedFile.name, file: editedFile }
    }))
    setEditingId(null)
  }

  const resetMedia = useCallback(() => {
    setMedia(prev => { prev.forEach(m => URL.revokeObjectURL(m.url)); return [] })
    setDragId(null)
    setDragOverId(null)
    setEditingId(null)
  }, [])

  return {
    media,
    dragOver,
    dragId,
    dragOverId,
    editingId,
    fileInputRef,
    replaceInputRef,
    replaceTargetIdRef,
    setMedia,
    setDragOver,
    setEditingId,
    handleFiles,
    onDrop,
    removeMedia,
    handleDragStart,
    handleDragOver,
    handleDropOnThumb,
    handleDragEnd,
    handleReplaceVideo,
    handleReplaceFile,
    handleEditorSave,
    resetMedia,
  }
}
