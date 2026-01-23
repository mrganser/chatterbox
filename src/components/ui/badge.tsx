import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary/30 bg-primary/20 text-primary',
        secondary: 'border-glow-secondary/30 bg-glow-secondary/20 text-glow-secondary',
        destructive: 'border-destructive/30 bg-destructive/20 text-destructive',
        outline: 'border-border/50 text-foreground',
        accent: 'border-accent/30 bg-accent/20 text-accent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
