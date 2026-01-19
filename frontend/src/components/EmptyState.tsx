import React from 'react';
import { LucideIcon, Bot, FileText, BarChart3, Inbox } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'w-12 h-12',
      iconWrapper: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'w-16 h-16',
      iconWrapper: 'w-24 h-24',
      title: 'text-xl',
      description: 'text-base',
    },
    lg: {
      container: 'py-16',
      icon: 'w-20 h-20',
      iconWrapper: 'w-28 h-28',
      title: 'text-2xl',
      description: 'text-lg',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', sizes.container, className)}>
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted mb-6',
          sizes.iconWrapper
        )}
      >
        <Icon className={cn('text-muted-foreground', sizes.icon)} />
      </div>

      {/* Title */}
      <h3 className={cn('font-semibold text-foreground mb-2', sizes.title)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-muted-foreground max-w-md mb-6', sizes.description)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Predefined empty state variants
export const NoChatbotsEmptyState: React.FC<{
  onCreateClick: () => void;
  className?: string;
}> = ({ onCreateClick, className }) => (
  <EmptyState
    icon={Bot}
    title="No chatbots yet"
    description="Get started by creating your first AI chatbot. It only takes a few minutes to set up."
    action={{
      label: 'Create Your First Chatbot',
      onClick: onCreateClick,
    }}
    className={className}
  />
);

export const NoDataSourcesEmptyState: React.FC<{
  onAddClick: () => void;
  className?: string;
}> = ({ onAddClick, className }) => (
  <EmptyState
    icon={FileText}
    title="No data sources"
    description="Add URLs or documents to train your chatbot with relevant information."
    action={{
      label: 'Add Data Source',
      onClick: onAddClick,
    }}
    size="sm"
    className={className}
  />
);

export const NoAnalyticsEmptyState: React.FC<{
  className?: string;
}> = ({ className }) => (
  <EmptyState
    icon={BarChart3}
    title="No analytics data yet"
    description="Analytics will appear here once your chatbot starts receiving messages."
    size="sm"
    className={className}
  />
);

export const SearchEmptyState: React.FC<{
  searchQuery: string;
  onClearSearch: () => void;
  className?: string;
}> = ({ searchQuery, onClearSearch, className }) => (
  <EmptyState
    icon={Inbox}
    title="No results found"
    description={`We couldn't find anything matching "${searchQuery}". Try adjusting your search.`}
    action={{
      label: 'Clear Search',
      onClick: onClearSearch,
      variant: 'outline',
    }}
    size="sm"
    className={className}
  />
);

export default EmptyState;
