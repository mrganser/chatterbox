import { Wifi } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="relative flex h-[calc(100vh-4rem)] items-center justify-center">
      {/* Background effects */}
      <div className="absolute inset-0 mesh-gradient opacity-50" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative flex flex-col items-center gap-6 fade-in">
        {/* Animated loader */}
        <div className="relative">
          {/* Outer ring */}
          <div className="h-20 w-20 rounded-full border-2 border-primary/20" />
          {/* Spinning ring */}
          <div className="absolute inset-0 h-20 w-20 rounded-full border-2 border-transparent border-t-primary spinner" />
          {/* Inner icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Wifi className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>

        {/* Message */}
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">{message}</p>
          <p className="mt-1 text-sm text-muted-foreground">Establishing secure connection...</p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          <span
            className="h-2 w-2 rounded-full bg-primary animate-pulse"
            style={{ animationDelay: '0s' }}
          />
          <span
            className="h-2 w-2 rounded-full bg-primary animate-pulse"
            style={{ animationDelay: '0.2s' }}
          />
          <span
            className="h-2 w-2 rounded-full bg-primary animate-pulse"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </div>
  );
}
