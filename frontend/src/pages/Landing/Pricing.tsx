import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaLink: string;
  popular?: boolean;
  variant?: 'default' | 'pro' | 'enterprise';
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for testing and personal projects',
    features: [
      '1 chatbot',
      '100 messages per month',
      'Website URL training',
      'Manual text training',
      'Community support',
      'Basic analytics',
    ],
    cta: 'Start for Free',
    ctaLink: '/register',
    variant: 'default',
  },
  {
    name: 'Pro',
    price: '$29',
    period: 'per month',
    description: 'For growing businesses and startups',
    features: [
      '5 chatbots',
      '1,000 messages per month',
      'All Free features',
      'Custom branding',
      'Email support',
      'Advanced analytics',
      'API access',
      'Priority processing',
    ],
    cta: 'Upgrade to Pro',
    ctaLink: '/register',
    popular: true,
    variant: 'pro',
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: 'per month',
    description: 'For large organizations with high volume',
    features: [
      'Unlimited chatbots',
      'Unlimited messages',
      'All Pro features',
      'Dedicated account manager',
      'Priority support',
      'Custom integrations',
      'SLA guarantee',
      'Advanced security',
    ],
    cta: 'Contact Sales',
    ctaLink: '#demo',
    variant: 'enterprise',
  },
];

const Pricing: React.FC = () => {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${
                tier.popular
                  ? 'border-2 border-primary shadow-xl scale-105'
                  : 'border border-gray-200'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription className="text-gray-500">
                  {tier.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-gray-900">
                    {tier.price}
                  </span>
                  <span className="text-gray-500 ml-2">/{tier.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {tier.ctaLink.startsWith('#') ? (
                  <a href={tier.ctaLink} className="w-full">
                    <Button
                      className={`w-full ${
                        tier.popular
                          ? 'bg-gradient-to-r from-primary to-primary-dark hover:opacity-90'
                          : ''
                      }`}
                      variant={tier.popular ? 'default' : 'outline'}
                      size="lg"
                    >
                      {tier.cta}
                    </Button>
                  </a>
                ) : (
                  <Link to={tier.ctaLink} className="w-full">
                    <Button
                      className={`w-full ${
                        tier.popular
                          ? 'bg-gradient-to-r from-primary to-primary-dark hover:opacity-90'
                          : ''
                      }`}
                      variant={tier.popular ? 'default' : 'outline'}
                      size="lg"
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-gray-600">
            Questions about pricing?{' '}
            <a href="#faq" className="text-primary font-medium hover:underline">
              Check our FAQ
            </a>{' '}
            or{' '}
            <a href="#demo" className="text-primary font-medium hover:underline">
              contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
