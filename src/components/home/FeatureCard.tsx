import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export function FeatureCard({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <div
      className="group relative fade-in opacity-0 p-6 rounded-2xl glass glass-hover transition-all duration-300 cursor-default"
      style={{ animationDelay: `${0.4 + delay * 0.1}s` }}
    >
      {/* Gradient border on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 border-gradient" />

      {/* Icon container */}
      <div className="relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
        <Icon className="h-5 w-5 text-primary transition-colors" />
      </div>

      {/* Content */}
      <h3 className="relative mb-2 font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="relative text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
