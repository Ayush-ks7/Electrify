import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    const focusable = () => Array.from(node?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]') ?? []);
    focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    node?.addEventListener('keydown', trap);
    return () => { node?.removeEventListener('keydown', trap); previous?.focus(); };
  }, [isOpen]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px]">
      <div
        ref={dialog}
        className={cn(
          'w-full bg-white rounded-md border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]',
          sizes[size]
        )}
        role="dialog"
        aria-label={title}
        aria-modal="true"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-base font-semibold text-slate-900 leading-snug">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
