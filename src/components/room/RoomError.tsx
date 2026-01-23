'use client';

import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface RoomErrorProps {
  error: string;
  onRetry: () => void;
}

export function RoomError({ error, onRetry }: RoomErrorProps) {
  const router = useRouter();

  return (
    <div className="relative flex h-full items-center justify-center p-6">
      {/* Background effects */}
      <div className="absolute inset-0 mesh-gradient opacity-50" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <Card className="relative w-full max-w-md scale-in">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            {/* Error icon */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>

            {/* Error message */}
            <h2 className="mb-2 text-xl font-semibold text-foreground">Connection Error</h2>
            <p className="mb-6 text-sm text-muted-foreground leading-relaxed">{error}</p>

            {/* Actions */}
            <div className="flex w-full gap-3">
              <Button variant="outline" onClick={() => router.push('/')} className="flex-1 gap-2">
                <Home className="h-4 w-4" />
                <span>Go Home</span>
              </Button>
              <Button onClick={onRetry} className="flex-1 gap-2">
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
