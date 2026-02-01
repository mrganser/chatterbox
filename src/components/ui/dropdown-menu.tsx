'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { MoreVertical } from 'lucide-react';

interface DropdownMenuProps {
  children: ReactNode;
  className?: string;
}

export function DropdownMenu({ children, className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 160, // menu width
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          'bg-black/40 backdrop-blur-sm border border-white/10',
          'hover:bg-black/60 hover:border-white/20 transition-all',
          'text-white/80 hover:text-white'
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPosition.top, left: menuPosition.left }}
            className={cn(
              'fixed z-50',
              'min-w-[160px] py-1 rounded-xl',
              'bg-secondary/95 backdrop-blur-md border border-border/50 shadow-xl',
              'animate-in fade-in-0 zoom-in-95 duration-100'
            )}
            onClick={() => setIsOpen(false)}
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
}

interface DropdownMenuItemProps {
  icon?: ReactNode;
  label: string;
  variant?: 'default' | 'destructive';
  onClick: () => void;
}

export function DropdownMenuItem({
  icon,
  label,
  variant = 'default',
  onClick,
}: DropdownMenuItemProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm',
        'transition-colors',
        variant === 'default' && 'text-foreground hover:bg-white/10',
        variant === 'destructive' && 'text-destructive hover:bg-destructive/10'
      )}
    >
      {icon && <span className="h-4 w-4">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
