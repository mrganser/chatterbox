import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MicOff, VideoOff, User, VolumeX, VideoOff as VideoOffIcon, LogOut } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface ModerationHandlers {
  onMute: (peerId: string) => void;
  onDisableVideo: (peerId: string) => void;
  onKick: (peerId: string) => void;
}

interface VideoTileProps {
  stream: MediaStream | null;
  peerId: string;
  name?: string;
  isLocal?: boolean;
  speakerLevel?: number;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  isScreenShare?: boolean;
  label?: string;
  compact?: boolean;
  fill?: boolean;
  onClick?: () => void;
  className?: string;
  moderation?: ModerationHandlers;
}

export function VideoTile({
  stream,
  peerId,
  name,
  isLocal = false,
  speakerLevel = 0,
  videoEnabled = true,
  audioEnabled = true,
  isScreenShare = false,
  label,
  compact = false,
  fill = false,
  onClick,
  className,
  moderation,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    const handleTrackAdded = () => {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.play().catch(() => {});
    };

    stream.addEventListener('addtrack', handleTrackAdded);
    video.play().catch(() => {});

    return () => {
      stream.removeEventListener('addtrack', handleTrackAdded);
    };
  }, [stream, peerId, isScreenShare]);

  const displayName = label || (isLocal ? (name || 'You') : (name || `Peer ${peerId.slice(0, 6)}`));
  const shouldMirror = isLocal && !isScreenShare;
  const showVideo = stream && videoEnabled;

  // Calculate glow intensity from speaker level (0-100 range, capped at 60)
  const minThreshold = 15;
  const maxLevel = 60;
  const isSpeaking = speakerLevel > minThreshold;
  const glowIntensity = isSpeaking
    ? Math.min(speakerLevel - minThreshold, maxLevel - minThreshold) / (maxLevel - minThreshold)
    : 0;

  // Dynamic glow style based on speaker level
  const glowStyle = isSpeaking ? {
    boxShadow: `
      0 0 ${20 + glowIntensity * 30}px rgba(0, 245, 212, ${0.15 + glowIntensity * 0.4}),
      0 0 ${40 + glowIntensity * 40}px rgba(0, 245, 212, ${0.08 + glowIntensity * 0.2})
    `,
  } : {};

  // Determine aspect ratio class
  const aspectClass = isScreenShare
    ? '' // Screen shares fill container, video uses object-contain
    : fill
      ? '' // Fill mode: expand to fill grid cell
      : 'aspect-video'; // Default: maintain 16:9 aspect ratio

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl transition-all duration-300',
        'bg-secondary/80 border border-border/50',
        aspectClass,
        onClick && 'cursor-pointer hover:border-primary/30',
        className
      )}
      onClick={onClick}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          'h-full w-full transition-opacity duration-300',
          isScreenShare ? 'object-contain bg-black' : 'object-cover',
          shouldMirror && 'scale-x-[-1]',
          !showVideo && 'opacity-0 absolute'
        )}
      />

      {/* Avatar fallback when video is off */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center mesh-gradient">
          <div className="relative">
            {/* Outer ring */}
            <div className="absolute -inset-3 rounded-full border border-primary/20" />
            {/* Avatar circle */}
            <div
              className={cn(
                'flex items-center justify-center rounded-full',
                'bg-linear-to-br from-primary/20 to-glow-secondary/20',
                'border border-primary/30 transition-all duration-150',
                compact ? 'h-12 w-12' : 'h-20 w-20'
              )}
              style={glowStyle}
            >
              <User className={cn(compact ? 'h-5 w-5' : 'h-8 w-8', 'text-primary/70')} />
            </div>
          </div>
        </div>
      )}

      {/* Gradient overlay at bottom */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none',
          compact ? 'h-16' : 'h-24'
        )}
      />

      {/* Info bar */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 flex items-center justify-between',
          compact ? 'p-2' : 'p-3'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Name badge */}
          <span
            className={cn(
              'rounded-lg font-medium',
              'bg-black/40 backdrop-blur-sm text-white/90',
              'border border-white/10',
              compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
            )}
          >
            {displayName}
          </span>

          {/* Speaking indicator */}
          {isSpeaking && videoEnabled && !compact && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/20 border border-primary/30">
              <div className="flex gap-0.5">
                <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse" />
                <span
                  className="w-0.5 h-3 bg-primary rounded-full animate-pulse"
                  style={{ animationDelay: '0.1s' }}
                />
                <span
                  className="w-0.5 h-2 bg-primary rounded-full animate-pulse"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Status indicators (not shown for screen share) */}
        {!isScreenShare && (!audioEnabled || !videoEnabled) && (
          <div className="flex items-center gap-1">
            {!audioEnabled && (
              <span className={cn(
                "flex items-center justify-center rounded-lg bg-destructive/80 backdrop-blur-sm",
                compact ? "h-5 w-5" : "h-7 w-7"
              )}>
                <MicOff className={compact ? "h-2.5 w-2.5 text-white" : "h-3.5 w-3.5 text-white"} />
              </span>
            )}
            {!videoEnabled && (
              <span className={cn(
                "flex items-center justify-center rounded-lg bg-destructive/80 backdrop-blur-sm",
                compact ? "h-5 w-5" : "h-7 w-7"
              )}>
                <VideoOff className={compact ? "h-2.5 w-2.5 text-white" : "h-3.5 w-3.5 text-white"} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Moderation menu for remote peers */}
      {!isLocal && !isScreenShare && moderation && (
        <div className={cn(
          "absolute opacity-0 group-hover:opacity-100 transition-opacity",
          compact ? "top-1 right-1" : "top-3 right-3"
        )}>
          <DropdownMenu>
            {audioEnabled && (
              <DropdownMenuItem
                icon={<VolumeX className="h-4 w-4" />}
                label="Mute"
                onClick={() => moderation.onMute(peerId)}
              />
            )}
            {videoEnabled && (
              <DropdownMenuItem
                icon={<VideoOffIcon className="h-4 w-4" />}
                label="Disable video"
                onClick={() => moderation.onDisableVideo(peerId)}
              />
            )}
            <DropdownMenuItem
              icon={<LogOut className="h-4 w-4" />}
              label="Kick"
              variant="destructive"
              onClick={() => moderation.onKick(peerId)}
            />
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
