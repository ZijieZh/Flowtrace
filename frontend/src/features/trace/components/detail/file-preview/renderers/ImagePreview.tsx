import React, { useCallback, useRef, useState } from 'react'

interface ImagePreviewProps {
  imageUrl: string
  fileName: string
  zoom: number
  onZoomChange?: (newZoom: number) => void
}

/**
 * Image preview with wheel zoom + drag pan. Pure CSS transform — no extra deps.
 */
export function ImagePreview({ imageUrl, fileName, zoom, onZoomChange }: ImagePreviewProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragOriginRef = useRef({ x: 0, y: 0 })

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    dragOriginRef.current = pos
    e.currentTarget.setPointerCapture?.(e.pointerId)
    e.preventDefault()
  }, [pos])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setPos({
      x: dragOriginRef.current.x + (e.clientX - dragStartRef.current.x),
      y: dragOriginRef.current.y + (e.clientY - dragStartRef.current.y),
    })
  }, [isDragging])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }, [isDragging])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!onZoomChange) return
    const delta = e.deltaY < 0 ? 10 : -10
    onZoomChange(Math.max(10, Math.min(400, zoom + delta)))
  }, [zoom, onZoomChange])

  return (
    <div
      className={`flex-1 bg-[#f1f5f9] rounded-lg relative overflow-hidden w-full h-full touch-none flex items-center justify-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <img
        src={imageUrl}
        alt={fileName}
        draggable={false}
        className="select-none max-w-full max-h-full object-contain"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  )
}
