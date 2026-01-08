import React from 'react';
import Navigation from './Navigation';
import Hero from './Hero';
import Pricing from './Pricing';
import Demo from './Demo';
import Footer from './Footer';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main>
        <Hero />
        <Pricing />
        <Demo />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
