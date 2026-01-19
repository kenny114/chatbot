import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Loader2, Check } from 'lucide-react';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not meet all requirements');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.register(email, password, companyName);
      await login(response.token);
      // Navigation will be handled by the useEffect when isAuthenticated becomes true
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold text-foreground">ChatBot AI</span>
          </Link>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl text-center font-bold">Create your account</CardTitle>
            <CardDescription className="text-center text-base">
              Start building AI chatbots for your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                {error}
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Acme Inc."
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={8}
                  disabled={isLoading}
                />
                {password && (
                  <div className="text-xs space-y-1 mt-2">
                    <div className={`flex items-center gap-2 ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                      <Check className={`w-3 h-3 ${passwordRequirements.minLength ? 'opacity-100' : 'opacity-30'}`} />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                      <Check className={`w-3 h-3 ${passwordRequirements.hasUppercase ? 'opacity-100' : 'opacity-30'}`} />
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                      <Check className={`w-3 h-3 ${passwordRequirements.hasLowercase ? 'opacity-100' : 'opacity-30'}`} />
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                      <Check className={`w-3 h-3 ${passwordRequirements.hasNumber ? 'opacity-100' : 'opacity-30'}`} />
                      <span>One number</span>
                    </div>
                  </div>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 rounded-full"
                disabled={isLoading || (password.length > 0 && !isPasswordValid)}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-600 text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </div>
            <div className="text-sm text-gray-600 text-center">
              <Link to="/" className="text-primary hover:underline">
                ← Back to home
              </Link>
            </div>
            <div className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
