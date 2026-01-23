import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomUrl: string;
}

export function ShareDialog({ open, onOpenChange, roomUrl }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Share this room</DialogTitle>
            </div>
          </div>
          <DialogDescription>
            Copy the link below and share it with others to invite them to this room.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          <Input value={roomUrl} readOnly className="flex-1 font-mono text-xs" />
          <Button
            onClick={handleCopy}
            variant={copied ? 'default' : 'outline'}
            className="shrink-0 gap-2 min-w-[100px]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground/60 text-center">
            Anyone with this link can join the room
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
