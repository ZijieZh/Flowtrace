import { Toaster as Sonner, ToasterProps } from "sonner"
import './sonner.css'

const Toaster = ({ position = "bottom-right", ...props }: ToasterProps) => {
  return (
    <Sonner
      position={position}
      theme="light"
      className="toaster group !z-[9999]"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-white border border-gray-200 text-gray-900 shadow-lg relative !z-[9999]',
          title: 'text-gray-900 font-semibold',
          description: 'text-gray-600',
          error: 'bg-red-50 border-red-200 text-red-900',
          success: 'bg-white border border-slate-300 text-slate-900',
          warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
          info: 'bg-blue-50 border-blue-200 text-blue-900',
        },
        style: {
          width: '431px',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
