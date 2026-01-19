import React from 'react';
import Navigation from './Navigation';
import Hero from './Hero';
import Pricing from './Pricing';
import Footer from './Footer';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
