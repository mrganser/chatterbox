import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Share2,
  Maximize,
  MessageSquare,
  Monitor,
  MonitorOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
  chatUnreadCount: number;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onShare: () => void;
  onLeave: () => void;
  onFullscreen: () => void;
}

export function Toolbar({
  videoEnabled,
  audioEnabled,
  isScreenSharing,
  chatUnreadCount,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onToggleChat,
  onShare,
  onLeave,
  onFullscreen,
}: ToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 scale-in">
      <div className="flex items-center gap-2 p-2 rounded-2xl glass glow border border-border/50">
        {/* Audio toggle */}
        <Tooltip content={audioEnabled ? 'Mute' : 'Unmute'}>
          <Button
            variant={audioEnabled ? 'ghost' : 'destructive'}
            size="icon"
            onClick={onToggleAudio}
            className={cn(
              'h-12 w-12 rounded-xl transition-all duration-200',
              audioEnabled ? 'hover:bg-white/10 text-foreground' : 'glow-accent'
            )}
          >
            {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
        </Tooltip>

        {/* Video toggle */}
        <Tooltip content={videoEnabled ? 'Turn off camera' : 'Turn on camera'}>
          <Button
            variant={videoEnabled ? 'ghost' : 'destructive'}
            size="icon"
            onClick={onToggleVideo}
            className={cn(
              'h-12 w-12 rounded-xl transition-all duration-200',
              videoEnabled ? 'hover:bg-white/10 text-foreground' : 'glow-accent'
            )}
          >
            {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
        </Tooltip>

        {/* Divider */}
        <div className="h-8 w-px bg-border/50 mx-1" />

        {/* Screen share */}
        <Tooltip content={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
          <Button
            variant={isScreenSharing ? 'default' : 'ghost'}
            size="icon"
            onClick={onToggleScreenShare}
            className={cn(
              'h-12 w-12 rounded-xl transition-all duration-200',
              isScreenSharing ? 'glow text-primary-foreground' : 'hover:bg-white/10 text-foreground'
            )}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>
        </Tooltip>

        {/* Chat */}
        <Tooltip content="Chat">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleChat}
            className="relative h-12 w-12 rounded-xl hover:bg-white/10 text-foreground transition-all duration-200"
          >
            <MessageSquare className="h-5 w-5" />
            {chatUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
              </span>
            )}
          </Button>
        </Tooltip>

        {/* Share link */}
        <Tooltip content="Share room link">
          <Button
            variant="ghost"
            size="icon"
            onClick={onShare}
            className="h-12 w-12 rounded-xl hover:bg-white/10 text-foreground transition-all duration-200"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </Tooltip>

        {/* Fullscreen */}
        <Tooltip content="Fullscreen">
          <Button
            variant="ghost"
            size="icon"
            onClick={onFullscreen}
            className="h-12 w-12 rounded-xl hover:bg-white/10 text-foreground transition-all duration-200"
          >
            <Maximize className="h-5 w-5" />
          </Button>
        </Tooltip>

        {/* Divider */}
        <div className="h-8 w-px bg-border/50 mx-1" />

        {/* Leave */}
        <Tooltip content="Leave room">
          <Button
            variant="destructive"
            size="icon"
            onClick={onLeave}
            className="h-12 w-12 rounded-xl glow-accent transition-all duration-200 btn-lift"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
