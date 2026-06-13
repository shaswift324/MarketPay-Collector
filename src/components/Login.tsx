import React, { useState } from 'react';
import { LogIn, Key, Mail, Shield, UserCheck, HelpCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials to login.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Server error occurred during sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo shortcut login helper
  const handleQuickLogin = (role: 'admin' | 'collector' | 'owner') => {
    setError(null);
    if (role === 'admin') {
      setEmail('admin@marketpay.gov');
      setPassword('admin123');
    } else if (role === 'collector') {
      setEmail('collector1@marketpay.gov');
      setPassword('collector1');
    } else if (role === 'owner') {
      setEmail('owner1@example.com');
      setPassword('owner1');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors duration-300" id="login-root-container">
      
      {/* Decorative Subtle Blur Accents */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 shadow-sm text-white font-bold text-xl tracking-wide mb-2 select-none">
            M
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white" id="brand-title">
            MarketPay <span className="text-blue-500">Pro</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal max-w-sm mx-auto leading-relaxed">
            Digital Fee Collection & Management System for Public Market Stall Rentals & Daily Municipal Dues
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Account Access</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-750">
              SECURE LOGS
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400 font-medium" id="login-error-banner">
              <AlertCircle className="w-4 h-4 shrink-0 mt-[2px] text-red-500" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Registered Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Registered Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-slate-150 transition"
                  placeholder="name@marketpay.gov"
                  id="login-email-input"
                  required
                />
              </div>
            </div>

            {/* Secret Password */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')} // quick admin reminder
                  className="text-xs text-blue-600 hover:text-blue-750 font-medium transition cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-slate-150 transition"
                  placeholder="••••••••"
                  id="login-password-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  id="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Notice */}
            <p className="text-[10px] text-slate-450 dark:text-slate-550 flex items-center gap-1.5 leading-normal">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              Unauthorized access attempts are tracked in the municipal audit logs.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              id="login-submit-button"
            >
              {isLoading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to System
                </>
              )}
            </button>

          </form>

          {/* Quick Demo Login Shortcut Section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Demo Quick Access Shortcuts</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 select-none pb-1">
              Select a predefined role below to auto-fill authentic credentials for easy review:
            </p>
            
            <div className="grid grid-cols-3 gap-2" id="demo-roles-panel">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl text-center border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-slate-900 transition-all cursor-pointer duration-150 group"
              >
                <Shield className="w-4 h-4 text-slate-450 group-hover:text-blue-550 mb-1 transition-colors" />
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Municipal Admin</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-550 truncate max-w-full">Director</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('collector')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl text-center border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-slate-900 transition-all cursor-pointer duration-150 group"
              >
                <UserCheck className="w-4 h-4 text-slate-455 group-hover:text-blue-550 mb-1 transition-colors" />
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Field Collector</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-550 truncate max-w-full">Zone A</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('owner')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl text-center border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-slate-900 transition-all cursor-pointer duration-150 group"
              >
                <HelpCircle className="w-4 h-4 text-slate-450 group-hover:text-blue-550 mb-1 transition-colors" />
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Stall Vendor</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-550 truncate max-w-full">PC Reyes</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Notes */}
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 italic">
          MarketPay Pro • Secured with HMAC JWT Session Signatures
        </p>

      </div>
    </div>
  );
}
