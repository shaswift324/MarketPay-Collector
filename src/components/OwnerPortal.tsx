import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Calendar, CheckSquare, Sparkles, Bell, 
  History, Download, User, Key, Lock, Phone, Mail, 
  Eye, RefreshCw, LogOut, ChevronRight, Moon, Sun, DollarSign, ShieldAlert
} from 'lucide-react';
import { User as UserType } from '../types';
import ReceiptModal from './ReceiptModal';

interface OwnerPortalProps {
  user: UserType;
  token: string;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export default function OwnerPortal({ user, token, onLogout, isDarkMode, toggleDarkMode }: OwnerPortalProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'notifications' | 'settings'>('dashboard');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings State
  const [phone, setPhone] = useState(user.phone || '');
  const [fullName, setFullName] = useState(user.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch dashboard stats
      const resp = await fetch('/api/owners/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Failed to retrieve ledger data');
      const data = await resp.json();
      setDashboardData(data);

      // 2. Fetch notifications
      const notifResp = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (notifResp.ok) {
        const notifs = await notifResp.json();
        setNotifications(notifs);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred connecting to the Treasury server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(null);
    setSettingsError(null);
    setSavingSettings(true);

    try {
      const resp = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          password: newPassword
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to update profile settings.');
      
      setSettingsSuccess('Your profiles and system configuration updated successfully!');
      setNewPassword('');
    } catch (err: any) {
      setSettingsError(err.message || 'An error occurred updating records.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleViewReceipt = (p: any) => {
    // Map minimal payment items to enriched receipt parameters
    const enriched = {
      id: p.id,
      receipt_number: p.receipt_number,
      payment_date: p.date || p.payment_date,
      amount: p.amount,
      payment_type: p.payment_type || 'CASH',
      remarks: p.remarks || 'Daily rental collection receipt.',
      stall_number: p.stall_number || (dashboardData?.stalls?.[0]?.stall_number || 'ST-Rental'),
      stall_type: dashboardData?.stalls?.[0]?.stall_type || 'Market Stall',
      location: dashboardData?.stalls?.[0]?.location || 'Main Zone',
      owner_name: user.full_name,
      collector_name: p.collector_name || 'Assigned Collector'
    };
    setSelectedPayment(enriched);
    setIsReceiptOpen(true);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      
      {/* Top Bar Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* System Logo */}
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm leading-none select-none">
                M
              </span>
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-slate-950 dark:text-white leading-none">MarketPay <span className="text-blue-500">Pro</span></h1>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Stall Owner Panel</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              
              {/* Dark mode switcher */}
              <button 
                onClick={toggleDarkMode}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                id="vendor-toggle-dark-mode"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Notification Badge */}
              <button 
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 h-9 w-9 rounded-xl flex items-center justify-center transition-all"
                id="vendor-notifications-bell"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] min-w-4 h-4 rounded-full px-1 flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Sign out */}
              <button 
                onClick={onLogout}
                className="inline-flex items-center gap-1 px-3 py-1.5 h-9 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer"
                id="vendor-logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* welcome card snippet */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">Welcome Back</p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.full_name}</h2>
            <div className="flex flex-wrap gap-2 mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">ROLE: VENDOR</span>
              {dashboardData?.stalls?.map((s: any) => (
                <span key={s.id} className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold border border-blue-100/50 dark:border-blue-900/10">
                  {s.stall_number} ({s.location})
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={fetchDashboard}
              className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 h-9 rounded-xl flex items-center justify-center transition border border-slate-200 dark:border-slate-800 cursor-pointer"
              title="Refresh ledger state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 h-9 font-semibold text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <User className="w-3.5 h-3.5" />
              Settings Profile
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-850 gap-4 mb-6 select-none overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 text-xs font-bold tracking-wide uppercase transition relative cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Ledger Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-bold tracking-wide uppercase transition relative cursor-pointer ${
              activeTab === 'history'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Payment History Ledger
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 text-xs font-bold tracking-wide uppercase transition relative cursor-pointer ${
              activeTab === 'notifications'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Treasury Alerts & Announcements
            {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-rose-500 text-white font-bold text-[9px] rounded-full inline-block">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoading && !dashboardData ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <span className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></span>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Synchronizing vendor transactions...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 p-6 rounded-xl text-center space-y-4 max-w-lg mx-auto my-12">
            <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Communication Interruption</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">{error}</p>
            <button 
              onClick={fetchDashboard}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div>
            
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && dashboardData && (
              <div className="space-y-6 animate-fade-in">
                
                {/* 4 Cards Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="vendor-stats-grid">
                  
                  {/* Current Rent Balance */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-450">Outstanding rent balance</span>
                      <div className="bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg text-rose-600 dark:text-rose-450">
                        <CreditCard className="w-4 h-4" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-black text-rose-500 font-mono tracking-tight">
                      Php {dashboardData.stats.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1.5">Accumulated pending daily rental dues.</p>
                  </div>

                  {/* Last Payment */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-450">Last Payment Recorded</span>
                      <div className="bg-emerald-50 dark:bg-emerald-905/40 p-1.5 rounded-lg text-emerald-600 dark:text-emerald-450">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                      Php {dashboardData.stats.lastPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h2>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium mt-1.5">
                      {dashboardData.stats.lastPaymentDate 
                        ? `Acknowledge: ${new Date(dashboardData.stats.lastPaymentDate).toLocaleDateString()}`
                        : 'No historic receipts found.'}
                    </p>
                  </div>

                  {/* Next Due Date */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-450">Next Payment Due Date</span>
                      <div className="bg-blue-50 dark:bg-blue-900/40 p-1.5 rounded-lg text-blue-600 dark:text-blue-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white font-mono tracking-normal leading-relaxed">
                      {new Date(dashboardData.stats.nextDueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1.5">Daily collection cutoff at 5:00 PM</p>
                  </div>

                  {/* Total Paid overall */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-450">Overall Total Paid</span>
                      <div className="bg-indigo-50 dark:bg-indigo-900/40 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                      Php {dashboardData.stats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1.5">Cumulative payments completed in 2026.</p>
                  </div>

                </div>

                {/* Stalls Info & Banner */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Stalls Specifications */}
                  <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Registered Stall Specs</h3>
                    
                    {dashboardData.stalls.map((st: any) => (
                      <div key={st.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{st.stall_number}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350">{st.stall_type}</span>
                        </div>
                        <div className="border-b border-slate-200 dark:border-slate-800 my-1"></div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div>
                            <p className="text-slate-450 text-[10px]">ZONE LOCATION</p>
                            <p className="font-bold text-slate-800 dark:text-slate-300">{st.location}</p>
                          </div>
                          <div>
                            <p className="text-slate-450 text-[10px]">DAILY RENTAL RATE</p>
                            <p className="font-bold text-emerald-600 dark:text-emerald-450">Php {st.daily_fee}/day</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* QR Code Identification Guide */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-blue-800 dark:text-blue-300">QR Code Identification</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Each rental space is stickered with a digital QR. Remind field collectors to run visual scans for fast direct verification and contactless payment processing.
                      </p>
                    </div>

                  </div>

                  {/* Recent Payments logs widget */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent Transactions</h3>
                      <button 
                        onClick={() => setActiveTab('history')} 
                        className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                      >
                        See Full Ledger
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      {dashboardData.paymentHistory.length === 0 ? (
                        <p className="text-center py-8 text-xs text-slate-400">No payment transactions recorded.</p>
                      ) : (
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-widest text-[9px]">
                              <th className="py-2.5">Date</th>
                              <th className="py-2.5">Receipt No</th>
                              <th className="py-2.5">Stall</th>
                              <th className="py-2.5">Amount</th>
                              <th className="py-2.5">Collector</th>
                              <th className="py-2.5 text-right">Receipt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.paymentHistory.slice(0, 5).map((pay: any) => (
                              <tr key={pay.id} className="border-b border-slate-100 dark:border-slate-800/55 hover:bg-slate-50 dark:hover:bg-slate-850/30 transition">
                                <td className="py-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  {new Date(pay.date).toLocaleDateString()}
                                </td>
                                <td className="py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                                  {pay.receipt_number}
                                </td>
                                <td className="py-2.5 font-mono text-[11px]">{pay.stall_number}</td>
                                <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                  ₱{pay.amount.toLocaleString()}
                                </td>
                                <td className="py-2.5 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                                  {pay.collector_name}
                                </td>
                                <td className="py-2.5 text-right">
                                  <button
                                    onClick={() => handleViewReceipt(pay)}
                                    className="p-1 px-2.5 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-105 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/50 transition cursor-pointer"
                                  >
                                    View OR
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB: PAYMENT HISTORY */}
            {activeTab === 'history' && dashboardData && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in" id="vendor-ledger-tab">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <History className="w-4.5 h-4.5 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Stall Rental Ledger History</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{dashboardData.paymentHistory.length} total payments records</span>
                </div>

                <div className="overflow-x-auto">
                  {dashboardData.paymentHistory.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-xs text-slate-400 font-mono">No payment transactions recorded.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-widest text-[9px]">
                          <th className="py-3 px-2 font-mono">Timestamp</th>
                          <th className="py-3 px-2 font-mono">Official Receipt No</th>
                          <th className="py-3 px-2">Stall Rent Reference</th>
                          <th className="py-3 px-2">Recorded Collector</th>
                          <th className="py-3 px-2 font-mono">Amount Paid</th>
                          <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.paymentHistory.map((pay: any) => (
                          <tr key={pay.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-850/30 transition">
                            <td className="py-3 px-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {new Date(pay.date).toLocaleString()}
                            </td>
                            <td className="py-3 px-2 font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {pay.receipt_number}
                            </td>
                            <td className="py-3 px-2 font-mono text-[11px]">Stall {pay.stall_number}</td>
                            <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{pay.collector_name}</td>
                            <td className="py-3 px-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ₱{pay.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2 text-right space-x-1">
                              <button
                                onClick={() => handleViewReceipt(pay)}
                                className="inline-flex items-center gap-1 p-1 px-2.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/50 transition cursor-pointer"
                              >
                                View OR
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in" id="vendor-notifications-tab">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4.5 h-4.5 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Alerts & Treasury Communications</h3>
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition rounded-lg cursor-pointer"
                    >
                      Mark All as Read
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {notifications.length === 0 ? (
                    <p className="text-center py-10 text-xs text-slate-400 font-mono">Your notification tray is empty.</p>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-4 rounded-xl border transition flex items-start gap-3 ${
                          notif.is_read 
                            ? 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-850 text-slate-600 dark:text-slate-400' 
                            : 'bg-blue-50/30 dark:bg-blue-950/15 border-blue-100 dark:border-blue-900/30 text-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${notif.is_read ? 'bg-slate-300' : 'bg-blue-600 ring-4 ring-blue-500/20'}`}></div>
                        <div className="space-y-1 flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs font-bold leading-normal">{notif.title}</p>
                            <span className="text-[9px] font-mono text-slate-400 select-none whitespace-nowrap">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{notif.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: SETTIGNS */}
            {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5 animate-fade-in" id="vendor-settings-tab">
                
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Account Information & Security</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Configure profile details and reset security credentials.</p>
                </div>

                {settingsSuccess && (
                  <p className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs font-medium text-emerald-700 dark:text-emerald-450 rounded-xl leading-normal">
                    {settingsSuccess}
                  </p>
                )}

                {settingsError && (
                  <p className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs font-medium text-rose-700 dark:text-rose-450 rounded-xl leading-normal">
                    {settingsError}
                  </p>
                )}

                <form onSubmit={handleUpdateSettings} className="space-y-4 text-xs font-medium">
                  
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-450">Full Registered Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Email static info */}
                  <div className="space-y-1">
                    <label className="text-slate-400">Registered Email (Cannot modify)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-350 pointer-events-none">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input 
                        type="email" 
                        value={user.email}
                        disabled
                        className="w-full pl-9 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 select-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-450">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+63 9xx xxx xxxx"
                      />
                    </div>
                  </div>

                  {/* Reset Password */}
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-450">Reset Security Password (Optional)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Leave blank to maintain current"
                        minLength={6}
                      />
                    </div>
                    <p className="text-[9px] text-slate-450 italic mt-1">Minimum 6 characters required for compliance.</p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={savingSettings}
                    className="w-full inline-flex items-center justify-center h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow transition disabled:opacity-50"
                  >
                    {savingSettings ? 'Syncing Profile...' : 'Save Configuration Updates'}
                  </button>

                </form>

              </div>
            )}

          </div>
        )}

      </main>

      {/* Digital Receipt Modal Overlay */}
      <ReceiptModal 
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
      />

    </div>
  );
}
