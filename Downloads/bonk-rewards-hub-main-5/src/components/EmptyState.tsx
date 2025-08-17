import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'feature-preview' | 'coming-soon';
  timeline?: string;
  features?: string[];
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
  timeline,
  features = []
}: EmptyStateProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'feature-preview':
        return 'border-primary/20 bg-primary/5';
      case 'coming-soon':
        return 'border-amber-500/20 bg-amber-500/5';
      default:
        return 'border-border';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'feature-preview':
        return 'text-primary';
      case 'coming-soon':
        return 'text-amber-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`${getVariantStyles()}`}>
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className={`p-4 rounded-full bg-background mb-6 ${getIconColor()}`}>
            <Icon className="h-12 w-12" />
          </div>
          
          <h3 className="text-xl font-semibold mb-3">{title}</h3>
          <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
          
          {timeline && (
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                Expected: {timeline}
              </span>
            </div>
          )}
          
          {features.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Coming Features:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {actionLabel && onAction && (
            <Button 
              onClick={onAction}
              variant={variant === 'coming-soon' ? 'outline' : 'default'}
              className={variant === 'coming-soon' ? 'border-amber-500 text-amber-600 hover:bg-amber-50' : ''}
            >
              {actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}