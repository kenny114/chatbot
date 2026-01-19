import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { userAPI } from '../services/api';

interface Subscription {
  plan_id: string;
  plan_name: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  company_name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  subscription: Subscription | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await userAPI.getProfile();
      setUser(profile.user);
      setSubscription(profile.subscription);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Token might be invalid
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const login = useCallback(async (token: string) => {
    localStorage.setItem('token', token);
    try {
      const profile = await userAPI.getProfile();
      setUser(profile.user);
      setSubscription(profile.subscription);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to load profile after login:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setSubscription(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const value = React.useMemo(
    () => ({ isAuthenticated, isLoading, user, subscription, login, logout, refreshProfile }),
    [isAuthenticated, isLoading, user, subscription, login, logout, refreshProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
