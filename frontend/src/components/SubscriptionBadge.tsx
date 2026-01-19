import React from 'react';
import { Crown, Zap, Rocket, TrendingUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

export interface SubscriptionInfo {
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  usage: {
    messages: {
      used: number;
      limit: number;
    };
    chatbots: {
      used: number;
      limit: number;
    };
  };
}

interface SubscriptionBadgeProps {
  subscription: SubscriptionInfo;
  onUpgradeClick?: () => void;
  variant?: 'compact' | 'expanded';
  className?: string;
}

const PLAN_CONFIG = {
  free: {
    name: 'Free',
    icon: Zap,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    badgeVariant: 'secondary' as const,
  },
  starter: {
    name: 'Starter',
    icon: Rocket,
    color: 'text-info-600 dark:text-info-400',
    bgColor: 'bg-info-100 dark:bg-info-900',
    badgeVariant: 'default' as const,
  },
  pro: {
    name: 'Pro',
    icon: Crown,
    color: 'text-primary-600 dark:text-primary-400',
    bgColor: 'bg-primary-100 dark:bg-primary-900',
    badgeVariant: 'default' as const,
  },
  enterprise: {
    name: 'Enterprise',
    icon: TrendingUp,
    color: 'text-accent-600 dark:text-accent-400',
    bgColor: 'bg-accent-100 dark:bg-accent-900',
    badgeVariant: 'default' as const,
  },
};

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    color: 'text-success-600',
    variant: 'success' as const,
  },
  trialing: {
    label: 'Trial',
    color: 'text-info-600',
    variant: 'default' as const,
  },
  past_due: {
    label: 'Past Due',
    color: 'text-warning-600',
    variant: 'warning' as const,
  },
  canceled: {
    label: 'Canceled',
    color: 'text-error-600',
    variant: 'destructive' as const,
  },
};

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  subscription,
  onUpgradeClick,
  variant = 'compact',
  className,
}) => {
  const planConfig = PLAN_CONFIG[subscription.plan];
  const statusConfig = STATUS_CONFIG[subscription.status];
  const PlanIcon = planConfig.icon;

  const messageUsagePercent = Math.round(
    (subscription.usage.messages.used / subscription.usage.messages.limit) * 100
  );
  const chatbotUsagePercent = Math.round(
    (subscription.usage.chatbots.used / subscription.usage.chatbots.limit) * 100
  );

  const isNearLimit = messageUsagePercent >= 80 || chatbotUsagePercent >= 80;
  const canUpgrade = subscription.plan !== 'enterprise';

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border',
          planConfig.bgColor,
          className
        )}
      >
        <PlanIcon className={cn('h-4 w-4', planConfig.color)} />
        <span className={cn('text-sm font-medium', planConfig.color)}>
          {planConfig.name}
        </span>
        {subscription.status !== 'active' && (
          <Badge variant={statusConfig.variant} className="h-5 text-xs">
            {statusConfig.label}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', planConfig.bgColor)}>
              <PlanIcon className={cn('h-5 w-5', planConfig.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{planConfig.name} Plan</h3>
              <Badge variant={statusConfig.variant} className="mt-1">
                {statusConfig.label}
              </Badge>
            </div>
          </div>
          {canUpgrade && onUpgradeClick && (
            <Button size="sm" variant="outline" onClick={onUpgradeClick}>
              Upgrade
            </Button>
          )}
        </div>

        {/* Usage Meters */}
        <div className="space-y-4">
          {/* Messages Usage */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Messages</span>
              <span className="font-medium text-foreground">
                {subscription.usage.messages.used.toLocaleString()} /{' '}
                {subscription.usage.messages.limit.toLocaleString()}
              </span>
            </div>
            <Progress
              value={messageUsagePercent}
              className={cn(
                'h-2',
                messageUsagePercent >= 90 && 'bg-error-200'
              )}
            />
          </div>

          {/* Chatbots Usage */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Chatbots</span>
              <span className="font-medium text-foreground">
                {subscription.usage.chatbots.used} / {subscription.usage.chatbots.limit}
              </span>
            </div>
            <Progress
              value={chatbotUsagePercent}
              className={cn(
                'h-2',
                chatbotUsagePercent >= 90 && 'bg-error-200'
              )}
            />
          </div>
        </div>

        {/* Warning/CTA */}
        {isNearLimit && canUpgrade && (
          <div className="pt-2 border-t">
            <p className="text-xs text-warning-600 dark:text-warning-400 mb-2">
              You're approaching your plan limits
            </p>
            {onUpgradeClick && (
              <Button
                size="sm"
                variant="default"
                className="w-full"
                onClick={onUpgradeClick}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Simplified version for sidebar
export const SubscriptionBadgeSimple: React.FC<{
  plan: SubscriptionInfo['plan'];
  className?: string;
}> = ({ plan, className }) => {
  const planConfig = PLAN_CONFIG[plan];
  const PlanIcon = planConfig.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        planConfig.bgColor,
        className
      )}
    >
      <PlanIcon className={cn('h-4 w-4', planConfig.color)} />
      <span className={cn('text-sm font-medium', planConfig.color)}>
        {planConfig.name}
      </span>
    </div>
  );
};

export default SubscriptionBadge;
