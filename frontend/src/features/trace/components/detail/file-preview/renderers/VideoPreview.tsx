import React from 'react'

interface VideoPreviewProps {
  videoUrl: string
}

export function VideoPreview({ videoUrl }: VideoPreviewProps) {
  return (
    <div className="flex-1 overflow-hidden flex items-center justify-center bg-black rounded-lg">
      <video
        src={videoUrl}
        controls
        preload="metadata"
        className="max-w-full max-h-full"
        style={{ maxHeight: '100%' }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
