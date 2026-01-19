import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  description?: string;
  loading?: boolean;
  className?: string;
  valueClassName?: string;
  iconClassName?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  description,
  loading = false,
  className,
  valueClassName,
  iconClassName,
}) => {
  // Determine trend direction
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-4 w-4" />;
    if (trend.value < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-success-600 dark:text-success-400';
    if (trend.value < 0) return 'text-error-600 dark:text-error-400';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <Card className={cn('card-hover', className)}>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('card-hover', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            {/* Label */}
            <p className="text-sm font-medium text-muted-foreground">{label}</p>

            {/* Value */}
            <p
              className={cn(
                'text-3xl font-bold tracking-tight text-foreground',
                valueClassName
              )}
            >
              {value}
            </p>

            {/* Trend or Description */}
            {trend && (
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-sm font-medium',
                    getTrendColor()
                  )}
                >
                  {getTrendIcon()}
                  <span>
                    {trend.value > 0 && '+'}
                    {trend.value}%
                  </span>
                </span>
                {trend.label && (
                  <span className="text-sm text-muted-foreground">{trend.label}</span>
                )}
              </div>
            )}

            {description && !trend && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {/* Icon */}
          {Icon && (
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full bg-primary/10',
                iconClassName
              )}
            >
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Compact variant
export const StatCardCompact: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  loading = false,
  className,
}) => {
  if (loading) {
    return (
      <div className={cn('flex items-center gap-3 p-4 bg-muted rounded-lg', className)}>
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors',
        className
      )}
    >
      {Icon && (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="space-y-1 flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
