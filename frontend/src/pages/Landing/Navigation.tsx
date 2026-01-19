import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="border-b border-foreground">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-lg font-bold">
            ChatBot AI
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <a href="#pricing" className="hover:opacity-60">
              Pricing
            </a>

            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="hover:opacity-60">
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="hover:opacity-60"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:opacity-60">
                  Login
                </Link>
                <Link to="/register">
                  <Button variant="outline" size="sm" className="border border-foreground hover:bg-foreground hover:text-background">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
