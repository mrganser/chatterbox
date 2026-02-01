'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export type ToastVariant = 'default' | 'warning' | 'destructive';

export interface ToastProps {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss: (id: string) => void;
}

export function Toast({
  id,
  message,
  variant = 'default',
  duration = 4000,
  onDismiss,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(id), 200);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 200);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'bg-secondary/90 backdrop-blur-md border shadow-lg',
        'transform transition-all duration-200',
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0',
        variant === 'default' && 'border-border/50',
        variant === 'warning' && 'border-yellow-500/50 bg-yellow-950/50',
        variant === 'destructive' && 'border-destructive/50 bg-destructive/10'
      )}
    >
      <span
        className={cn(
          'text-sm font-medium',
          variant === 'default' && 'text-foreground',
          variant === 'warning' && 'text-yellow-200',
          variant === 'destructive' && 'text-destructive'
        )}
      >
        {message}
      </span>
      <button
        onClick={handleDismiss}
        className="ml-auto p-1 rounded-md hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; variant?: ToastVariant; duration?: number }>;
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
          duration={toast.duration}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
