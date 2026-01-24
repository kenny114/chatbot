import React, { useEffect, useRef, useState } from 'react';

interface PayPalButtonProps {
  paypalPlanId: string;
  onApprove: (subscriptionId: string) => void;
  onCancel: () => void;
  onError: (error: any) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const PAYPAL_CLIENT_ID = (import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim();

const PayPalButton: React.FC<PayPalButtonProps> = ({
  paypalPlanId,
  onApprove,
  onCancel,
  onError,
}) => {
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load PayPal SDK script
  useEffect(() => {
    const scriptId = 'paypal-sdk-script';

    // Check if script already exists
    if (document.getElementById(scriptId)) {
      setScriptLoaded(true);
      setIsLoading(false);
      return;
    }

    // Check if paypal is already available
    if (window.paypal) {
      setScriptLoaded(true);
      setIsLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
    script.async = true;

    script.onload = () => {
      setScriptLoaded(true);
      setIsLoading(false);
    };

    script.onerror = () => {
      setIsLoading(false);
      onError(new Error('Failed to load PayPal SDK'));
    };

    document.body.appendChild(script);

    return () => {
      // Don't remove the script on unmount - it should persist
    };
  }, []);

  // Render PayPal button when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !window.paypal || !buttonContainerRef.current) return;

    // Clear any existing buttons
    buttonContainerRef.current.innerHTML = '';

    window.paypal.Buttons({
      style: {
        shape: 'rect',
        color: 'gold',
        layout: 'vertical',
        label: 'subscribe',
      },
      createSubscription: (_data: any, actions: any) => {
        return actions.subscription.create({
          plan_id: paypalPlanId,
        });
      },
      onApprove: (data: any) => {
        onApprove(data.subscriptionID);
      },
      onCancel: () => {
        onCancel();
      },
      onError: (err: any) => {
        console.error('PayPal error:', err);
        onError(err);
      },
    }).render(buttonContainerRef.current);
  }, [scriptLoaded, paypalPlanId, onApprove, onCancel, onError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-slate-400">Loading PayPal...</span>
      </div>
    );
  }

  return <div ref={buttonContainerRef} className="w-full" />;
};

export default PayPalButton;
