import { EmptyState } from '@/components/EmptyState';
import { LucideIcon } from 'lucide-react';

interface FeatureComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  timeline?: string;
  features?: string[];
  onNotifyMe?: () => void;
}

export function FeatureComingSoon({
  icon,
  title,
  description,
  timeline = "Q2 2025",
  features = [],
  onNotifyMe
}: FeatureComingSoonProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      variant="coming-soon"
      timeline={timeline}
      features={features}
      actionLabel="Notify Me When Available"
      onAction={onNotifyMe}
    />
  );
}