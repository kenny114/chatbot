import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, LayoutDashboard, BarChart3, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
  const { logout } = useAuth();
  const { effectiveTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">
              ChatBot AI
            </h1>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Button
              variant={isActive('/dashboard') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/dashboard')}
              className={cn(
                'flex items-center gap-2',
                isActive('/dashboard') && 'bg-muted'
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={isActive('/analytics') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/analytics')}
              className={cn(
                'flex items-center gap-2',
                isActive('/analytics') && 'bg-muted'
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {effectiveTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-error-600 focus:text-error-600">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
