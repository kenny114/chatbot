import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usageAPI, UsageResponse } from '../services/api';
import { useAuth } from './AuthContext';

interface PlanContextType {
  // Usage data
  usage: UsageResponse['usage'] | null;
  limits: UsageResponse['limits'] | null;
  plan: UsageResponse['plan'] | null;
  features: UsageResponse['features'] | null;

  // Computed states
  isAtChatbotLimit: boolean;
  isAtPreviewLimit: boolean;
  canGoLive: boolean;
  isFreePlan: boolean;
  isBusinessPlan: boolean;
  isCustomPlan: boolean;

  // Loading state
  loading: boolean;
  error: string | null;

  // Actions
  refreshUsage: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageResponse['usage'] | null>(null);
  const [limits, setLimits] = useState<UsageResponse['limits'] | null>(null);
  const [plan, setPlan] = useState<UsageResponse['plan'] | null>(null);
  const [features, setFeatures] = useState<UsageResponse['features'] | null>(null);
  const [isAtChatbotLimit, setIsAtChatbotLimit] = useState(false);
  const [isAtPreviewLimit, setIsAtPreviewLimit] = useState(false);
  const [canGoLive, setCanGoLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUsage = useCallback(async () => {
    if (!user) {
      // Reset state when not logged in
      setUsage(null);
      setLimits(null);
      setPlan(null);
      setFeatures(null);
      setIsAtChatbotLimit(false);
      setIsAtPreviewLimit(false);
      setCanGoLive(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await usageAPI.getUsage();

      setUsage(data.usage);
      setLimits(data.limits);
      setPlan(data.plan);
      setFeatures(data.features);
      setIsAtChatbotLimit(data.isAtChatbotLimit);
      setIsAtPreviewLimit(data.isAtPreviewLimit);
      setCanGoLive(data.canGoLive);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
      setError('Failed to load plan information');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load usage data when user changes
  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // Computed plan checks
  const isFreePlan = plan?.id === 'free';
  const isBusinessPlan = plan?.id === 'business';
  const isCustomPlan = plan?.id === 'custom';

  const value: PlanContextType = {
    usage,
    limits,
    plan,
    features,
    isAtChatbotLimit,
    isAtPreviewLimit,
    canGoLive,
    isFreePlan,
    isBusinessPlan,
    isCustomPlan,
    loading,
    error,
    refreshUsage,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

export const usePlan = (): PlanContextType => {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};

// Hook for checking specific features
export const useFeature = (feature: keyof UsageResponse['features']): boolean => {
  const { features } = usePlan();
  if (!features) return false;

  const value = features[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value !== 'none';
  return false;
};

// Hook for upgrade prompts
export const useUpgradePrompt = () => {
  const { isFreePlan, isAtChatbotLimit, isAtPreviewLimit, canGoLive } = usePlan();

  return {
    shouldShowUpgrade: isFreePlan,
    shouldShowChatbotLimitWarning: isAtChatbotLimit,
    shouldShowPreviewLimitWarning: isAtPreviewLimit,
    shouldShowGoLivePrompt: isFreePlan && !canGoLive,
  };
};
