
import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: ReactNode | string;
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary'
  disabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  disabled = false,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  // Handle escape key
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousPointerEvents = document.body.style.pointerEvents

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      // Ensure clicks are not blocked by pointer-events on body
      document.body.style.pointerEvents = 'auto'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousOverflow || 'unset'
      document.body.style.pointerEvents = previousPointerEvents
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmButtonClass =
    `px-4 py-2.5 text-white rounded-md font-semibold ${disabled
      ? 'bg-slate-400 opacity-50 cursor-not-allowed'
      : confirmVariant === 'danger'
        ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
        : 'bg-emerald-700 hover:bg-emerald-900 focus:ring-0 focus:ring-offset-0 cursor-pointer'
    }`;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="relative z-[151] mx-4 w-full max-w-md rounded-lg bg-white shadow-[0_4px_8px_4px_rgba(0,0,0,0.12)]"
        style={{ animation: 'zoom-in 0.2s ease-out' }}
      >
        <div className="p-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">
            {title}
          </h3>
          <p className="mb-6 text-base leading-relaxed text-slate-500 break-words [overflow-wrap:anywhere]">
            {message}
          </p>
          <div className="flex gap-4 justify-end text-sm">
            <button
              onClick={onCancel}
              className="border-2 border-slate-200 px-4 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors focus:outline-none cursor-pointer font-semibold"
            >
              {cancelText}
            </button>
            <button
              onClick={disabled ? undefined : onConfirm}
              className={confirmButtonClass}
              disabled={disabled}
              autoFocus={!disabled}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
