import React from 'react';
import { Link } from 'react-router-dom';
import { usePlan } from '../contexts/PlanContext';
import { Sparkles, ArrowRight, AlertCircle, X } from 'lucide-react';
import { Button } from './ui/button';

interface UpgradeBannerProps {
  variant?: 'default' | 'compact' | 'inline';
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
  variant = 'default',
  onDismiss,
  showDismiss = false,
}) => {
  const { isFreePlan, isAtPreviewLimit, isAtChatbotLimit, usage, limits } = usePlan();

  // Don't show if user is not on free plan
  if (!isFreePlan) return null;

  // Determine which message to show
  let title = 'Ready to Go Live?';
  let message = 'Your assistant is ready. Publish it to your website to start capturing leads.';
  let urgent = false;

  if (isAtChatbotLimit) {
    title = 'Chatbot Limit Reached';
    message = `You've reached your limit of ${limits?.chatbotLimit} chatbot. Upgrade to create more.`;
    urgent = true;
  } else if (isAtPreviewLimit) {
    title = 'Preview Messages Used';
    message = `You've used ${usage?.previewMessagesUsed}/${limits?.previewMessageLimit} preview messages. Upgrade for unlimited testing.`;
    urgent = true;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center justify-between px-4 py-2 rounded-lg ${
        urgent ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-indigo-500/10 border border-indigo-500/20'
      }`}>
        <div className="flex items-center gap-2">
          {urgent ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-500" />
          )}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Link to="/pricing">
          <Button size="sm" variant={urgent ? 'default' : 'outline'} className="h-7 text-xs">
            Upgrade
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm ${
        urgent ? 'text-amber-600' : 'text-indigo-600'
      }`}>
        {urgent ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        <span>{message}</span>
        <Link to="/pricing" className="font-medium hover:underline">
          Upgrade now
        </Link>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`relative rounded-xl p-6 ${
      urgent
        ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20'
        : 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20'
    }`}>
      {showDismiss && onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full ${
          urgent ? 'bg-amber-500/20' : 'bg-indigo-500/20'
        }`}>
          {urgent ? (
            <AlertCircle className={`w-6 h-6 ${urgent ? 'text-amber-500' : 'text-indigo-500'}`} />
          ) : (
            <Sparkles className="w-6 h-6 text-indigo-500" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-muted-foreground mb-4">{message}</p>

          <div className="flex items-center gap-4">
            <Link to="/pricing">
              <Button className={urgent ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                Upgrade to Pro
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              $45/month
            </span>
          </div>
        </div>
      </div>

      {/* Feature highlights */}
      {!urgent && (
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Live website embed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Unlimited messages</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Lead capture</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Remove branding</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Usage limit warning component
export const UsageLimitWarning: React.FC<{
  type: 'chatbot' | 'preview';
  current: number;
  limit: number;
}> = ({ type, current, limit }) => {
  const percentage = (current / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= limit;

  if (percentage < 50) return null;

  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
      isAtLimit
        ? 'bg-red-500/10 text-red-600 border border-red-500/20'
        : isNearLimit
        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
        : 'bg-muted text-muted-foreground'
    }`}>
      <AlertCircle className="w-4 h-4" />
      <span>
        {type === 'chatbot'
          ? `${current}/${limit} chatbots used`
          : `${current}/${limit} preview messages used`}
      </span>
      {isAtLimit && (
        <Link to="/pricing" className="font-medium ml-2 hover:underline">
          Upgrade
        </Link>
      )}
    </div>
  );
};

export default UpgradeBanner;
