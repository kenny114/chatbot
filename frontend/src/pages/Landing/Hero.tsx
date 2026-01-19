import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Hero: React.FC = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl sm:text-6xl font-bold mb-6">
          AI Chatbots
        </h1>

        <p className="text-lg text-muted-foreground mb-8">
          Create and deploy intelligent chatbots
        </p>

        <Link to="/register">
          <Button
            variant="outline"
            className="border border-foreground hover:bg-foreground hover:text-background"
          >
            Get Started
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default Hero;
