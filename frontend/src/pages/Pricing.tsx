import React, { useEffect, useState } from 'react';
import PayPalButton from '../components/PayPalButton';
import { paymentAPI } from '../services/api';
import { PaymentPlan } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, Sparkles, ArrowRight, Mail } from 'lucide-react';

const Pricing: React.FC = () => {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const navigate = useNavigate();
  const { subscription, user } = useAuth();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getPlans();
      setPlans(response.plans || []);
    } catch (err) {
      setError('Failed to load pricing plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = (_data: any, actions: any, paypalPlanId: string) => {
    return actions.subscription.create({
      plan_id: paypalPlanId
    });
  };

  const handleApprove = async (data: any, planId: string) => {
    try {
      console.log('Subscription approved:', data.subscriptionID);

      // Activate the subscription in our backend
      await paymentAPI.activateSubscription(data.subscriptionID, planId);

      navigate('/payment/success');
    } catch (err) {
      console.error('Failed to process subscription:', err);
      navigate('/payment/cancel');
    }
  };

  const handleCtaClick = (plan: PaymentPlan) => {
    if (plan.cta_action === 'contact') {
      window.location.href = 'mailto:sales@yourcompany.com?subject=Custom Plan Inquiry';
    } else if (plan.cta_action === 'upgrade' && !user) {
      navigate('/register');
    } else {
      setSelectedPlan(plan.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white text-lg">Loading plans...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400 text-lg">{error}</p>
          <button
            onClick={loadPlans}
            className="mt-4 text-red-300 hover:text-white transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Build for free, pay when you're ready to go live and capture leads.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.plan_id === plan.id;
            const isHighlighted = plan.highlighted;
            const isFree = plan.id === 'free';
            const isCustom = plan.id === 'custom';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl transition-all duration-300 ${
                  isHighlighted
                    ? 'bg-gradient-to-b from-indigo-600/20 to-purple-600/20 border-2 border-indigo-500 scale-105 lg:scale-110 shadow-2xl shadow-indigo-500/20'
                    : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {/* Popular Badge */}
                {isHighlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold px-4 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-emerald-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                      Current Plan
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-1">{plan.name}</h2>
                    <p className="text-slate-400 text-sm">{plan.shortDescription}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-8">
                    {isFree ? (
                      <div>
                        <span className="text-5xl font-bold text-white">$0</span>
                        <span className="text-slate-400 ml-2">forever</span>
                      </div>
                    ) : isCustom ? (
                      <div>
                        <span className="text-3xl font-bold text-white">Custom</span>
                        <p className="text-slate-400 text-sm mt-1">Tailored to your needs</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-5xl font-bold text-white">${plan.price}</span>
                        <span className="text-slate-400">/month</span>
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                          isHighlighted ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </div>
                    ))}

                    {/* Excluded Features for Free Plan */}
                    {plan.excludedFeatures?.map((feature, index) => (
                      <div key={`excluded-${index}`} className="flex items-start gap-3 opacity-50">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center mt-0.5">
                          <X className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-slate-500 text-sm line-through">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 px-6 rounded-lg bg-slate-700 text-slate-400 font-medium cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : plan.paypal_plan_id && selectedPlan === plan.id ? (
                    <PayPalButton
                      planId={plan.id}
                      paypalPlanId={plan.paypal_plan_id}
                      onApprove={(subscriptionId) => handleApprove({ subscriptionID: subscriptionId }, plan.id)}
                      onCancel={() => setSelectedPlan(null)}
                      onError={(err) => {
                        console.error('PayPal error:', err);
                        setError('Payment processing failed. Please try again.');
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => handleCtaClick(plan)}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                        isHighlighted
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                          : isFree
                          ? 'bg-white text-slate-900 hover:bg-slate-100'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      {isCustom ? (
                        <>
                          <Mail className="w-4 h-4" />
                          {plan.cta_text}
                        </>
                      ) : (
                        <>
                          {plan.cta_text}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upgrade Message for Free Users */}
        {subscription?.plan_id === 'free' && (
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">
                Ready to Go Live?
              </h3>
              <p className="text-slate-400 mb-4">
                Your assistant is ready. Publish it to your website to start capturing leads.
              </p>
              <button
                onClick={() => {
                  const proPlan = plans.find(p => p.id === 'pro');
                  if (proPlan) handleCtaClick(proPlan);
                }}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2 px-6 rounded-lg transition-all"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Compare Plans
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">Feature</th>
                  {plans.map(plan => (
                    <th key={plan.id} className="text-center py-4 px-4 text-white font-semibold">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="py-4 px-4 text-slate-300">Website scraping</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">Bot training (docs, FAQs)</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">Visual customization</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">Preview testing</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4 text-slate-300">
                      {plan.preview_messages === -1 ? 'Unlimited' : `${plan.preview_messages}/mo`}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">Live website embed</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.live_embed ? (
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">Real visitor conversations</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.message_limit !== 0 ? (
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">Branding removal</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.branding_removal ? (
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">Lead capture</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.lead_capture ? (
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">Conversation insights</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4 text-slate-300">
                      {plan.analytics_access === 'full' ? 'Full' : plan.analytics_access === 'preview' ? 'Preview' : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">Business hours</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.business_hours ? (
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">CRM integrations</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.id === 'custom' ? (
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">Multi-channel (WhatsApp, etc.)</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.id === 'custom' ? (
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-slate-300">White-labeling</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.id === 'custom' ? (
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ or Contact */}
        <div className="mt-16 text-center">
          <p className="text-slate-400">
            Have questions? {' '}
            <a
              href="mailto:support@yourcompany.com"
              className="text-indigo-400 hover:text-indigo-300 transition"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
