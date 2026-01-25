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

        {/* Demo Video */}
        <div className="mt-12">
          <video
            className="w-full max-w-3xl mx-auto rounded-lg shadow-lg border border-border"
            controls
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="/demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </section>
  );
};

export default Hero;
