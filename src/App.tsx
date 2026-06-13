import React, { useState, useEffect } from 'react';
import { User } from './types';
import Login from './components/Login';
import AdminPortal from './components/AdminPortal';
import CollectorPortal from './components/CollectorPortal';
import OwnerPortal from './components/OwnerPortal';
import { Shield } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [appInitializing, setAppInitializing] = useState(true);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme_dark');
      return saved ? saved === 'true' : false;
    }
    return false;
  });

  // Track root dark class changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme_dark', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme_dark', 'false');
    }
  }, [isDarkMode]);

  // Read stored session on mount
  useEffect(() => {
    const checkActiveSession = async () => {
      const savedToken = localStorage.getItem('marketpay_jwt');
      if (savedToken) {
        try {
          const resp = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          
          if (resp.ok) {
            const data = await resp.json();
            setUser(data.user);
            setToken(savedToken);
          } else {
            // Token stale or expired
            localStorage.removeItem('marketpay_jwt');
          }
        } catch (err) {
          console.error('Network error during session validation:', err);
        }
      }
      setAppInitializing(false);
    };

    checkActiveSession();
  }, []);

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    localStorage.setItem('marketpay_jwt', sessionToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('marketpay_jwt');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // 1. Initializing state
  if (appInitializing) {
    return (
      <div className="min-h-screen bg-slate-905 dark:bg-slate-950 flex flex-col items-center justify-center space-y-3 font-sans pb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md text-white font-black text-xl select-none">
          MⱣ
        </div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono tracking-widest uppercase">
          Initializing MarketPay Terminal SECURE-TSL...
        </p>
      </div>
    );
  }

  // 2. Logged out state
  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. User authenticated redirect logic
  switch (user.role) {
    case 'admin':
      return (
        <AdminPortal 
          user={user} 
          token={token} 
          onLogout={handleLogout} 
          isDarkMode={isDarkMode} 
          toggleDarkMode={toggleDarkMode} 
        />
      );
    case 'collector':
      return (
        <CollectorPortal 
          user={user} 
          token={token} 
          onLogout={handleLogout} 
          isDarkMode={isDarkMode} 
          toggleDarkMode={toggleDarkMode} 
        />
      );
    case 'owner':
      return (
        <OwnerPortal 
          user={user} 
          token={token} 
          onLogout={handleLogout} 
          isDarkMode={isDarkMode} 
          toggleDarkMode={toggleDarkMode} 
        />
      );
    default:
      // Safety Fallback reset
      return (
        <div className="min-h-screen bg-rose-50 dark:bg-rose-950/20 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <Shield className="text-rose-600 w-12 h-12" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Invalid Privilege Role mapping found</h2>
          <p className="text-xs text-slate-605">Your user account does not have mapped portal permissions. Contact administrative support.</p>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
          >
            Return to Login
          </button>
        </div>
      );
  }
}
