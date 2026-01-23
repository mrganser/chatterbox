'use client';

import Link from 'next/link';
import { MessagesSquare } from 'lucide-react';

export function Header() {
  return (
    <header className="glass border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-3 transition-smooth">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-smooth group-hover:bg-primary/20 group-hover:glow">
            <MessagesSquare className="h-5 w-5 text-primary transition-smooth group-hover:scale-110" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground transition-smooth group-hover:text-primary">
            ChatterBox
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs text-muted-foreground">Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}
