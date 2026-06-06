'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: React.ReactNode
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="hm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`hm-modal animate-fade-in w-full ${sizeMap[size]}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {title}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div>{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgb(var(--color-border))' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
