import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Sparkles } from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNote?: string;
  features: string[];
  excludedFeatures?: string[];
  cta: string;
  ctaLink: string;
  highlighted?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Build Only',
    price: '$0',
    priceNote: 'forever',
    features: [
      'Website scraping',
      'Upload documents & FAQs',
      'Visual customization',
      'Industry & tone selection',
    ],
    excludedFeatures: [
      'Test chat preview',
      'Live website embed',
      'Lead capture',
      'Analytics',
    ],
    cta: 'Get Started Free',
    ctaLink: '/register',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Go Live & Capture Leads',
    price: '$45',
    priceNote: '/month',
    features: [
      'Everything in Free',
      'Live website embed',
      'Unlimited conversations',
      'Branding removal',
      'Business hours behavior',
      'Full analytics',
      'Lead capture & qualification',
      'Instant notifications',
    ],
    cta: 'Get Pro',
    ctaLink: '/register',
    highlighted: true,
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Tailored Solutions',
    price: 'Custom',
    features: [
      'Everything in Pro',
      'CRM integrations',
      'Multi-channel bots',
      'White-label solution',
      'Custom workflows',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    ctaLink: 'mailto:altraverse.tt@gmail.com?subject=Custom Plan Inquiry',
  },
];

const Pricing: React.FC = () => {
  return (
    <section id="pricing" className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Build for free, pay when you're ready to go live and capture leads.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.id}
              className={`relative transition-all duration-300 ${
                tier.highlighted
                  ? 'border-2 border-primary shadow-xl scale-105 bg-gradient-to-b from-primary/5 to-transparent'
                  : 'border hover:border-primary/50 hover:shadow-lg'
              }`}
            >
              {/* Popular Badge */}
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold">{tier.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.priceNote && (
                    <span className="text-muted-foreground ml-1">{tier.priceNote}</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features */}
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {tier.excludedFeatures?.map((feature, index) => (
                    <li key={`ex-${index}`} className="flex items-start gap-2 opacity-50">
                      <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground line-through">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  variant={tier.highlighted ? 'default' : 'outline'}
                  className={`w-full ${
                    tier.highlighted
                      ? ''
                      : 'border-foreground/20 hover:bg-foreground hover:text-background'
                  }`}
                  asChild
                >
                  {tier.ctaLink.startsWith('mailto:') ? (
                    <a href={tier.ctaLink}>{tier.cta}</a>
                  ) : (
                    <Link to={tier.ctaLink}>{tier.cta}</Link>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upgrade Message */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-primary/10 border border-primary/20 rounded-xl px-8 py-6">
            <p className="text-lg font-medium mb-2">
              Start building today for free
            </p>
            <p className="text-muted-foreground text-sm">
              Your assistant will be ready. Upgrade when you want to go live.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
