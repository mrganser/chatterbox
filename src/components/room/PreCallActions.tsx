import { Video, Wifi, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface PreCallActionsProps {
  roomId: string;
  isConnecting: boolean;
  name: string;
  onNameChange: (name: string) => void;
  onJoin: () => void;
}

export function PreCallActions({
  roomId,
  isConnecting,
  name,
  onNameChange,
  onJoin,
}: PreCallActionsProps) {
  return (
    <div className="relative flex h-[calc(100vh-4rem)] items-center justify-center p-6">
      {/* Background effects */}
      <div className="absolute inset-0 mesh-gradient opacity-50" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <Card className="relative w-full max-w-md scale-in glow">
        <CardHeader className="text-center pb-2">
          {/* Animated icon */}
          <div className="mx-auto mb-6 relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Video className="h-9 w-9 text-primary" />
            </div>
            {/* Connection indicator */}
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-background border border-border/50">
              <Wifi className="h-4 w-4 text-primary" />
            </div>
          </div>

          <CardTitle className="text-2xl">Ready to join?</CardTitle>
          <CardDescription className="text-base mt-2">
            Entering room <span className="font-medium text-primary">{roomId}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Name input */}
          <div className="mt-2">
            <label htmlFor="display-name" className="text-sm font-medium text-muted-foreground">
              Display name (optional)
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                id="display-name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isConnecting) {
                    onJoin();
                  }
                }}
                className="pl-10"
                maxLength={30}
              />
            </div>
          </div>

          {/* Info items */}
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5">
                <svg
                  className="h-4 w-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <span>Camera and microphone access required</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5">
                <svg
                  className="h-4 w-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <span>End-to-end encrypted connection</span>
            </div>
          </div>

          <Button
            onClick={onJoin}
            disabled={isConnecting}
            size="lg"
            className="w-full h-14 text-base gap-3"
          >
            {isConnecting ? (
              <>
                <div className="h-5 w-5 spinner" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Video className="h-5 w-5" />
                <span>Join Room</span>
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground/60">
            By joining, you agree to share your camera and microphone
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
