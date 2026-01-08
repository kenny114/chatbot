import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown, Menu, X } from 'lucide-react';

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLearnOpen, setIsLearnOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">ChatBot AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Learn Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLearnOpen(!isLearnOpen)}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>Learn</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {isLearnOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48">
                  <a href="#features" className="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                    Features
                  </a>
                  <a href="#use-cases" className="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                    Use Cases
                  </a>
                  <a href="#docs" className="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                    Documentation
                  </a>
                </div>
              )}
            </div>

            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </a>

            <Link to="/login">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                Sign in
              </Button>
            </Link>

            <Link to="/register">
              <Button className="bg-gradient-to-r from-primary to-primary-dark hover:opacity-90">
                Start for Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-600 hover:text-gray-900">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </a>
              <a href="#docs" className="text-gray-600 hover:text-gray-900">
                Documentation
              </a>
              <Link to="/login">
                <Button variant="ghost" className="w-full justify-start">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button className="w-full bg-gradient-to-r from-primary to-primary-dark">
                  Start for Free
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
