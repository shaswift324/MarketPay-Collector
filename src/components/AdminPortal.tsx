import React, { useState, useEffect } from 'react';
import { 
  Building, UserCheck, ShieldAlert, FileText, Settings, Database as DbIcon,
  Search, Filter, Plus, Calendar, Download, RefreshCw, LogOut, CheckCircle2,
  Trash2, Moon, Sun, MapPin, DollarSign, Users, Sparkles, TrendingUp,
  AlertCircle, ChevronRight, PieChart as PieIcon, BarChart2, Check, X, ShieldCheck
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { User, Stall, CollectorEnriched, PaymentEnriched, DashboardStats, AuditLog } from '../types';
import ReceiptModal from './ReceiptModal';

interface AdminPortalProps {
  user: User;
  token: string;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export default function AdminPortal({ user, token, onLogout, isDarkMode, toggleDarkMode }: AdminPortalProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [allStalls, setAllStalls] = useState<any[]>([]);
  const [allCollectors, setAllCollectors] = useState<CollectorEnriched[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'stalls' | 'collectors' | 'reports' | 'backup' | 'audit'>('dashboard');

  // Multi-modal Forms State
  const [isStallModalOpen, setIsStallModalOpen] = useState(false);
  const [newStallForm, setNewStallForm] = useState({
    stall_number: '',
    stall_type: 'Wet Market',
    location: 'Zone A',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    monthly_fee: 4500,
    daily_fee: 150
  });

  const [isCollectorModalOpen, setIsCollectorModalOpen] = useState(false);
  const [newCollectorForm, setNewCollectorForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    assigned_zone: 'Zone A'
  });

  // Receipt modal trigger
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Advanced Reports Wizard State
  const [reportTimeframe, setReportTimeframe] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'custom'>('all');
  const [reportZone, setReportZone] = useState('');
  const [reportCollector, setReportCollector] = useState('');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportedData, setReportedData] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Search & General Table filters
  const [globalSearchStall, setGlobalSearchStall] = useState('');
  const [globalSearchCollector, setGlobalSearchCollector] = useState('');

  // Backup & Import
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [importingJson, setImportingJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Sync data function
  const fetchAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch dashboard metrics
      const dashResp = await fetch('/api/analytics/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!dashResp.ok) throw new Error('Analytical core handshake failure.');
      const dashData = await dashResp.json();
      setStats(dashData);

      // 2. Fetch all stalls
      const stallsResp = await fetch('/api/stalls', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (stallsResp.ok) {
        const stallsData = await stallsResp.json();
        setAllStalls(stallsData);
      }

      // 3. Fetch collectors list
      const collResp = await fetch('/api/collectors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (collResp.ok) {
        const collData = await collResp.json();
        setAllCollectors(collData);
      }

      // 4. Fetch administrative audit logs
      const auditResp = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (auditResp.ok) {
        const auditData = await auditResp.json();
        setAuditLogs(auditData);
      }

    } catch (err: any) {
      setError(err.message || 'Error occurred synchronizing with Cloud Run server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // Default load some reports
    handleTriggerReport();
  }, [token, activeSubTab]);

  // Create Stall Handler
  const handleCreateStallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/stalls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newStallForm)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to initialize stall space.');

      setIsStallModalOpen(false);
      setNewStallForm({
        stall_number: '',
        stall_type: 'Wet Market',
        location: 'Zone A',
        owner_name: '',
        owner_email: '',
        owner_phone: '',
        monthly_fee: 4500,
        daily_fee: 150
      });
      fetchAdminData();
      alert('Stall has been successfully registered under Municipal Treasury records!');
    } catch (err: any) {
      alert(err.message || 'Error creating stall Record.');
    }
  };

  // Modify Stall Fee / Status Direct
  const handleUpdateStallField = async (stallId: string, fieldName: string, value: any) => {
    try {
      const resp = await fetch(`/api/stalls/${stallId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [fieldName]: value })
      });
      if (!resp.ok) throw new Error('Unsuccessful update.');
      
      setAllStalls(prev => prev.map(s => s.id === stallId ? { ...s, [fieldName]: value } : s));
    } catch (err) {
      alert('Failed to modify stall parameter.');
    }
  };

  // Create Collector Handler
  const handleCreateCollectorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/collectors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCollectorForm)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error recording collector.');

      setIsCollectorModalOpen(false);
      setNewCollectorForm({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        assigned_zone: 'Zone A'
      });
      fetchAdminData();
      alert(`Collector registration completed for ${newCollectorForm.full_name}!`);
    } catch (err: any) {
      alert(err.message || 'Error occurred registering collector.');
    }
  };

  // Update Collector Zone Or Status Assignment
  const handleUpdateCollectorField = async (collectorId: string, fieldName: string, value: any) => {
    try {
      const resp = await fetch(`/api/collectors/${collectorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [fieldName]: value })
      });
      if (!resp.ok) throw new Error('Unsuccessful update.');
      
      setAllCollectors(prev => prev.map(c => c.id === collectorId ? { ...c, [fieldName]: value } : c));
      fetchAdminData();
    } catch (err) {
      alert('Failed to update collector zone binding.');
    }
  };

  // Reporting Wizard Dispatch
  const handleTriggerReport = async () => {
    setGeneratingReport(true);
    try {
      let query = `?timeframe=${reportTimeframe}`;
      if (reportZone) query += `&zone=${reportZone}`;
      if (reportCollector) query += `&collectorId=${reportCollector}`;
      if (reportStartDate) query += `&startDate=${reportStartDate}`;
      if (reportEndDate) query += `&endDate=${reportEndDate}`;

      const resp = await fetch(`/api/reports/generate${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      setReportedData(data);
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Export CSV Helper
  const handleExportCSV = () => {
    if (!reportedData || !reportedData.rows || reportedData.rows.length === 0) {
      alert('No rows found to export.');
      return;
    }

    const headers = ['Ref ID', 'Date', 'Receipt OR', 'Stall No', 'Stall Zone', 'Vendor Owner', 'Collector Name', 'Amount (Php)', 'Mode'];
    const rows = reportedData.rows.map((row: any) => [
      row.payment_id,
      row.date,
      row.receipt_number,
      row.stall_number,
      row.zone,
      row.owner_name,
      row.collector_name,
      row.amount,
      row.payment_type
    ]);

    const content = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map((row: any) => row.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encoded = encodeURI(content);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Treasury_Report_${reportedData.metadata.timeframe}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Backup DB Export direct
  const handleTriggerBackupDownload = async () => {
    setBackupSuccess(null);
    try {
      const resp = await fetch('/api/backup/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MarketPay_CoreDB_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setBackupSuccess('System Database JSON backup downloaded. Keep this file secure to preserve transaction tracks.');
    } catch (err) {
      alert('Error initiating backup export process.');
    }
  };

  // Backup DB Restore / Import dispatch
  const handleImportBackup = async () => {
    setImportError(null);
    setImportSuccess(null);
    if (!importingJson || importingJson.trim().length === 0) {
      setImportError('Please paste a valid schema export JSON to restore operations.');
      return;
    }

    try {
      const parsed = JSON.parse(importingJson);
      const resp = await fetch('/api/backup/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(parsed)
      });
      const data = await resp.json();

      if (!resp.ok) throw new Error(data.error || 'Database ingestion crash.');

      setImportSuccess('Database restoring process completed successfully! Initializing refresh...');
      setImportingJson('');
      setTimeout(() => {
        fetchAdminData();
        setImportSuccess(null);
      }, 1500);

    } catch (err: any) {
      setImportError(err.message || 'Past values contain schema configuration typing errors. Keep original intact.');
    }
  };

  // Colors for Recharts Pie
  const COLORS = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans">
      
      {/* Admin Dashboard Sidebar Layout */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        
        {/* SIDE BAR NAVIGATION */}
        <aside className="w-full lg:w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 shrink-0 flex flex-col justify-between p-4 border-r border-slate-800">
          
          <div className="space-y-6">
            
            {/* Government insignia header */}
            <div className="flex items-center space-x-3 py-3 border-b border-slate-800">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm select-none">
                M
              </span>
              <div>
                <h1 className="text-sm font-bold text-white leading-none tracking-tight">MarketPay <span className="text-blue-400">Pro</span></h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">MUNI TRES EXECUTIVE</p>
              </div>
            </div>

            {/* Profile Check block */}
            <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span>TREASURER SECURE</span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 ring-2 ring-blue-500/20"></span>
              </div>
              <p className="text-xs font-bold truncate text-white leading-tight">{user.full_name}</p>
              <p className="text-[10px] text-slate-400 select-all truncate">{user.email}</p>
            </div>

            {/* Sub-tab navigation */}
            <nav className="space-y-1 text-xs select-none" id="admin-sub-navbar">
              
              <button
                onClick={() => setActiveSubTab('dashboard')}
                className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-lg transition duration-150 font-semibold cursor-pointer ${
                  activeSubTab === 'dashboard' ? 'bg-blue-600/10 border-r-4 border-blue-500 text-blue-400' : 'hover:bg-slate-800 hover:text-white transition-colors text-slate-400'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Treasury Visual Board</span>
              </button>

              <button
                onClick={() => setActiveSubTab('stalls')}
                className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-lg transition duration-150 font-semibold cursor-pointer ${
                  activeSubTab === 'stalls' ? 'bg-blue-600/10 border-r-4 border-blue-500 text-blue-400' : 'hover:bg-slate-800 hover:text-white transition-colors text-slate-400'
                }`}
              >
                <Building className="w-4 h-4 text-emerald-400" />
                <span>Stalls Ledger Panel ({allStalls.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('collectors')}
                className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-lg transition duration-150 font-semibold cursor-pointer ${
                  activeSubTab === 'collectors' ? 'bg-blue-600/10 border-r-4 border-blue-500 text-blue-400' : 'hover:bg-slate-800 hover:text-white transition-colors text-slate-400'
                }`}
              >
                <UserCheck className="w-4 h-4 text-violet-400" />
                <span>Collector Registrants</span>
              </button>

              <button
                onClick={() => setActiveSubTab('reports')}
                className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-lg transition duration-150 font-semibold cursor-pointer ${
                  activeSubTab === 'reports' ? 'bg-blue-600/10 border-r-4 border-blue-500 text-blue-400' : 'hover:bg-slate-800 hover:text-white transition-colors text-slate-400'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Reports Generator</span>
              </button>

              <button
                onClick={() => setActiveSubTab('backup')}
                className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-lg transition duration-150 font-semibold cursor-pointer ${
                  activeSubTab === 'backup' ? 'bg-blue-600/10 border-r-4 border-blue-500 text-blue-400' : 'hover:bg-slate-800 hover:text-white transition-colors text-slate-400'
                }`}
              >
                <DbIcon className="w-4 h-4 text-pink-400" />
                <span>System backup file</span>
              </button>

              <button
                onClick={() => setActiveSubTab('audit')}
                className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-lg transition duration-150 font-semibold cursor-pointer ${
                  activeSubTab === 'audit' ? 'bg-blue-600/10 border-r-4 border-blue-500 text-blue-400' : 'hover:bg-slate-800 hover:text-white transition-colors text-slate-400'
                }`}
              >
                <Settings className="w-4 h-4 text-sky-400" />
                <span>Muni Treasury Log Trace</span>
              </button>

            </nav>

          </div>

          {/* Bottom logout / utilities */}
          <div className="pt-6 border-t border-slate-800 space-y-4">
            
            {/* dark mode toggler */}
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-950/40 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl transition cursor-pointer text-xs font-semibold"
              id="admin-toggle-dark-mode"
            >
              <span className="flex items-center space-x-2">
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-emerald-455 text-blue-400" />}
                <span>{isDarkMode ? 'Light Mode' : 'Toggle Dark'}</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/25 text-red-400 hover:bg-red-900/30 font-bold border border-red-900/30 shadow-xs rounded-xl text-xs transition cursor-pointer"
              id="admin-logout-btn"
            >
              <LogOut className="w-4 h-4" />
              Sign Out System
            </button>

            <p className="text-center font-mono text-[9px] text-slate-600">
               MarketPay Pro • Security Core v1.1.2
            </p>

          </div>

        </aside>

        {/* MAIN BODY WORKSPACE */}
        <main className="flex-1 p-6 overflow-y-auto max-h-screen" id="admin-workspace-area">
          
          {/* Header Bar */}
          <div className="flex justify-between items-center pb-5 mb-5 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2 text-slate-800 dark:text-slate-200">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Treasury Hub Control</p>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">
                {activeSubTab === 'dashboard' ? 'MUNI System Dashboard Insights' : `${activeSubTab} management directory`}
              </h2>
            </div>

            <div className="flex gap-2 text-xs font-semibold">
              <button
                onClick={fetchAdminData}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition shadow-2xs relative"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>

              <button
                onClick={() => setIsStallModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 shadow rounded-xl transition"
                id="admin-register-stall-btn"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stall</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 rounded-xl flex items-center gap-3 font-mono leading-relaxed max-w-xl mx-auto my-6 shadow-sm">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* CONTROLLER SWITCHER */}
          {isLoading && !stats ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <span className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></span>
              <p className="text-xs text-slate-400 font-mono">Compiling visual ledger analytics structures from server storage...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* SUB TAB: DASHBOARD */}
              {activeSubTab === 'dashboard' && stats && (
                <div className="space-y-6 animate-fade-in" id="admin-dashboard-view">
                  
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="kpi-dashboard-grid">
                    
                    {/* Total Stalls */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                      <div className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">Total Stalls</div>
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-1 font-mono">{stats.cards.totalStalls}</h2>
                      <div className="mt-2 text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                        <span className="text-emerald-500 font-bold">100% Capacitated</span>
                      </div>
                      <div className="absolute right-3 bottom-3 text-slate-200 dark:text-slate-800 pointer-events-none">
                        <Building className="w-8 h-8 opacity-50" />
                      </div>
                    </div>

                    {/* Active Vendors */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                      <div className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">Active Vendors</div>
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-1 font-mono">{stats.cards.activeVendors}</h2>
                      <div className="mt-2 text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                        <span className="text-emerald-500 font-bold">100 Registrants</span>
                      </div>
                      <div className="absolute right-3 bottom-3 text-slate-200 dark:text-slate-800 pointer-events-none">
                        <Users className="w-8 h-8 opacity-50" />
                      </div>
                    </div>

                    {/* Today's Collection */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                      <div className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">Today's Collection</div>
                      <h2 className="text-xl font-black text-emerald-600 mt-1 font-mono">₱{stats.cards.todayCollection.toLocaleString()}</h2>
                      <div className="mt-2 text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                        <span className="text-emerald-500 font-bold">✓ Live receipts synched</span>
                      </div>
                      <div className="absolute right-3 bottom-3 text-slate-200 dark:text-slate-800 pointer-events-none">
                        <DollarSign className="w-8 h-8 opacity-50" />
                      </div>
                    </div>

                    {/* Monthly Collection */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                      <div className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">Monthly Collection</div>
                      <h2 className="text-xl font-black text-blue-600 mt-1 font-mono">₱{stats.cards.monthlyCollection.toLocaleString()}</h2>
                      <p className="mt-2 text-[9px] text-slate-455 font-mono">Target: ₱75,000.00</p>
                      <div className="absolute right-3 bottom-3 text-slate-200 dark:text-slate-800 pointer-events-none">
                        <TrendingUp className="w-8 h-8 opacity-50" />
                      </div>
                    </div>

                    {/* Outstanding rent balance */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                      <div className="text-slate-455 text-[10px] font-bold uppercase tracking-wider block">Outstanding dues</div>
                      <h2 className="text-xl font-black text-rose-500 mt-1 font-mono">₱{stats.cards.outstandingBalances.toLocaleString()}</h2>
                      <p className="mt-2 text-[9px] text-rose-450 font-mono font-medium">Contact pending accounts</p>
                      <div className="absolute right-3 bottom-3 text-slate-200 dark:text-slate-800 pointer-events-none">
                        <AlertCircle className="w-8 h-8 opacity-50" />
                      </div>
                    </div>

                  </div>

                  {/* Charts & Analytic Visualizers */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Recharts Collection Trend Daily */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black tracking-wider uppercase text-slate-500">MUNI Daily Revenue Collection Trend</h3>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-slate-500 font-bold font-mono rounded">Weekly track</span>
                      </div>
                      <div className="h-64 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats.charts.collectionTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                            <Tooltip contentStyle={{ fontSize: 11, background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Revenue by Stall type Pie */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <h3 className="text-xs font-black tracking-wider uppercase text-slate-500">Revenue per Stall Type</h3>
                      <div className="h-64 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="105%">
                          <PieChart>
                            <Pie
                              data={stats.charts.revenueByType}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {stats.charts.revenueByType.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} contentStyle={{ fontSize: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center core values */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                          <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-4">Total June</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                            ₱{stats.cards.monthlyCollection.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* legends color custom list */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                        {stats.charts.revenueByType.map((item, idx) => (
                          <div key={item.name} className="flex items-center space-x-1">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                            <span className="truncate text-slate-500 max-w-[90px]">{item.name}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-350 shrink-0">({Math.round(item.value / stats.cards.monthlyCollection * 100)}%)</span>
                          </div>
                        ))}
                      </div>

                    </div>

                  </div>

                  {/* Leaderboards & tables */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Recent Payments table log */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black tracking-wider uppercase text-slate-500">Live Fees Transactions Stream</h3>
                        <button 
                          onClick={() => setActiveSubTab('reports')}
                          className="text-[10px] font-bold text-blue-600 hover:underline inline-flex items-center"
                        >
                          Reporting panel <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-mono">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] tracking-wider uppercase">
                              <th className="py-2.5">Date</th>
                              <th className="py-2.5">Official OR</th>
                              <th className="py-2.5">Stall</th>
                              <th className="py-2.5">Vendor</th>
                              <th className="py-2.5">Amount</th>
                              <th className="py-2.5 text-right">Receipt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.tables.recentPayments.slice(0, 6).map((pay) => (
                              <tr key={pay.id} className="border-b border-slate-100 dark:border-slate-85/50 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition">
                                <td className="py-2 text-[11px] text-slate-500">{new Date(pay.payment_date).toLocaleDateString()}</td>
                                <td className="py-2 font-bold text-slate-800 dark:text-slate-200">{pay.receipt_number}</td>
                                <td className="py-2 text-blue-600 dark:text-blue-400 font-bold">{pay.stall_number}</td>
                                <td className="py-2 font-sans truncate max-w-[100px]">{pay.owner_name}</td>
                                <td className="py-2 font-bold text-emerald-600 dark:text-emerald-450">₱{pay.amount.toLocaleString()}</td>
                                <td className="py-2 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedReceipt(pay);
                                      setIsReceiptOpen(true);
                                    }}
                                    className="p-1 px-2 text-[9px] font-bold rounded bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 cursor-pointer hover:bg-blue-100"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pending Account Payments listing */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <h3 className="text-xs font-black tracking-wider uppercase text-slate-500">Unpaid Stalls Today</h3>
                      
                      <div className="space-y-3 max-h-[290px] overflow-y-auto">
                        {stats.tables.pendingPayments.length === 0 ? (
                          <p className="text-center text-xs py-8 text-slate-400">All active occupied stalls paid today!</p>
                        ) : (
                          stats.tables.pendingPayments.slice(0, 5).map((p) => (
                            <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs gap-3">
                              <div>
                                <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{p.stall_number}</span>
                                <span className="text-[9px] bg-amber-50 text-amber-700 px-1 p-[1px] rounded font-semibold ml-2 font-mono uppercase">{p.location}</span>
                                <p className="text-[11px] font-semibold text-slate-500 mt-0.5 max-w-[120px] truncate">{p.owner_name}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-bold text-rose-500">₱{p.daily_fee}</p>
                                <p className="text-[9px] text-slate-400 uppercase mt-0.5">Rent Due</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* SUB TAB: STALLS */}
              {activeSubTab === 'stalls' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in" id="admin-stalls-ledger">
                  
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    {/* Search stall inputs */}
                    <div className="relative max-w-sm w-full font-sans">
                      <input 
                        type="text" 
                        value={globalSearchStall}
                        onChange={(e) => setGlobalSearchStall(e.target.value)}
                        placeholder="Filter by Stall ST, owner name, type..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 pl-8 pr-4 rounded-xl text-xs"
                      />
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    </div>

                    <span className="text-xs text-slate-400">{allStalls.length} recorded municipal stalls</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] tracking-wider uppercase font-mono">
                          <th className="py-3 px-2">Stall ST</th>
                          <th className="py-3 px-2">Owner Fullname</th>
                          <th className="py-3 px-2">Sector Zone</th>
                          <th className="py-3 px-2">Type</th>
                          <th className="py-3 px-2">Daily Dues (Php)</th>
                          <th className="py-3 px-2">Monthly Fee</th>
                          <th className="py-3 px-2">Rent Status</th>
                          <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allStalls
                          .filter(s => {
                            const q = globalSearchStall.toLowerCase();
                            return s.stall_number.toLowerCase().includes(q) || 
                              s.owner_name.toLowerCase().includes(q) || 
                              s.stall_type.toLowerCase().includes(q) ||
                              s.location.toLowerCase().includes(q);
                          })
                          .map((st) => (
                            <tr key={st.id} className="border-b border-slate-100 dark:border-slate-85/40 hover:bg-slate-50 dark:hover:bg-slate-950/20 font-mono transition text-slate-800 dark:text-slate-300">
                              <td className="py-3.5 px-2 font-bold text-slate-900 dark:text-white">{st.stall_number}</td>
                              <td className="py-3.5 px-2 font-sans font-semibold text-slate-700 dark:text-slate-350">{st.owner_name}</td>
                              <td className="py-3.5 px-2 text-slate-500">{st.location}</td>
                              <td className="py-3.5 px-2 font-sans font-medium text-slate-600 dark:text-slate-400">{st.stall_type}</td>
                              
                              {/* inline direct updates for rent values if admin wants to edit */}
                              <td className="py-3.5 px-2">
                                <input 
                                  type="number" 
                                  defaultValue={st.daily_fee}
                                  onBlur={(e) => handleUpdateStallField(st.id, 'daily_fee', Number(e.target.value))}
                                  className="w-16 bg-slate-100 dark:bg-slate-800/80 p-1 rounded font-bold text-center"
                                />
                              </td>
                              <td className="py-3.5 px-2">
                                <input 
                                  type="number" 
                                  defaultValue={st.monthly_fee}
                                  onBlur={(e) => handleUpdateStallField(st.id, 'monthly_fee', Number(e.target.value))}
                                  className="w-18 bg-slate-100 dark:bg-slate-800/80 p-1 rounded font-bold text-center"
                                />
                              </td>

                              <td className="py-3.5 px-2">
                                <select
                                  defaultValue={st.status}
                                  onChange={(e) => handleUpdateStallField(st.id, 'status', e.target.value)}
                                  className={`p-1 rounded text-[10px] font-bold uppercase transition ${
                                    st.status === 'occupied' 
                                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' 
                                      : (st.status === 'vacant' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30')
                                  }`}
                                >
                                  <option value="occupied">Occupied</option>
                                  <option value="vacant">Vacant</option>
                                  <option value="under-maintenance">Repair</option>
                                </select>
                              </td>

                              <td className="py-3.5 px-2 text-right">
                                <span className="text-[10px] text-slate-400 font-sans italic">Autosaved</span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* SUB TAB: COLLECTORS */}
              {activeSubTab === 'collectors' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in" id="admin-collectors-ledger">
                  
                  <div className="flex justify-between items-center sm:flex-row flex-col gap-3">
                    <button
                      onClick={() => setIsCollectorModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-violet-600 text-white hover:bg-violet-750 text-xs font-bold rounded-xl transition"
                      id="admin-new-collector-btn"
                    >
                      <Plus className="w-4 h-4" /> Register New Field Collector
                    </button>

                    <span className="text-xs text-slate-400">{allCollectors.length} authorized officers in field</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allCollectors.map((col) => (
                      <div key={col.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl flex justify-between items-start">
                        <div className="space-y-2 select-text">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center font-bold text-xs select-none">
                              {col.full_name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-none">{col.full_name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{col.employee_number}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono p-1">
                            <div>
                              <p className="text-[9px] text-slate-400">EMAIL</p>
                              <p className="truncate max-w-[120px]" title={col.email}>{col.email}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400">PHONE</p>
                              <p>{col.phone || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 dark:border-slate-850 my-2 pt-2 grid grid-cols-2 gap-x-4">
                            <div>
                              <p className="text-[9px] text-slate-400 font-mono">TOTAL TRANSACTIONS</p>
                              <p className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">{col.total_transactions} txs</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-mono">TOTAL COLLECTED</p>
                              <p className="text-xs font-black text-emerald-600 font-mono">₱{col.total_collected.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        {/* Assignments controls */}
                        <div className="space-y-4 text-right">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase font-mono block">Assign Sector</label>
                            <select
                              defaultValue={col.assigned_zone}
                              onChange={(e) => handleUpdateCollectorField(col.id, 'assigned_zone', e.target.value)}
                              className="bg-white dark:bg-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
                            >
                              <option value="Zone A">Zone A</option>
                              <option value="Zone B">Zone B</option>
                              <option value="Zone C">Zone C</option>
                              <option value="Zone D">Zone D</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase font-mono block">Officer Status</label>
                            <select
                              defaultValue={col.status}
                              onChange={(e) => handleUpdateCollectorField(col.id, 'status', e.target.value)}
                              className={`p-1 text-[10px] rounded font-bold uppercase transition ${
                                col.status === 'active' ? 'bg-emerald-600/10 text-emerald-650' : 'bg-rose-600/10 text-rose-650'
                              }`}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Suspended</option>
                            </select>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* SUB TAB: REPORTS DYNAMIC WIZARD */}
              {activeSubTab === 'reports' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in" id="admin-reports-wizard">
                  
                  {/* Reporting filters toolbar */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    
                    {/* Timeframe */}
                    <div className="space-y-1">
                      <label>Timeframe Period</label>
                      <select 
                        value={reportTimeframe} 
                        onChange={(e: any) => setReportTimeframe(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2 rounded-xl text-slate-800 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none font-medium h-9"
                      >
                        <option value="all">Cumulative (All Dates)</option>
                        <option value="daily">Daily cutoff (June 12, 2026)</option>
                        <option value="weekly">Weekly span (Last 7 Days)</option>
                        <option value="monthly">June billing cycle</option>
                        <option value="custom">Custom Calendar range</option>
                      </select>
                    </div>

                    {/* Zone selector */}
                    <div className="space-y-1">
                      <label>Market Sector Zone</label>
                      <select 
                        value={reportZone} 
                        onChange={(e) => setReportZone(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2 rounded-xl text-slate-800 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none font-medium h-9"
                      >
                        <option value="">All Gates & Sectors</option>
                        <option value="Zone A">Zone A (Dry Goods)</option>
                        <option value="Zone B">Zone B (Wet Market)</option>
                        <option value="Zone C">Zone C (Groceries)</option>
                        <option value="Zone D">Zone D (Food courts)</option>
                      </select>
                    </div>

                    {/* Collector selector */}
                    <div className="space-y-1">
                      <label>Assigned Collector</label>
                      <select 
                        value={reportCollector} 
                        onChange={(e) => setReportCollector(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2 rounded-xl text-slate-800 dark:text-slate-305 focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none font-medium h-9"
                      >
                        <option value="">All Field Officers</option>
                        {allCollectors.map((c) => (
                          <option key={c.id} value={c.user_id}>{c.full_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Custom dates picker */}
                    <div className="space-y-1">
                      <label>Start Date</label>
                      <input 
                        type="date" 
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        disabled={reportTimeframe !== 'custom'}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2 rounded-xl text-slate-800 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none h-9 disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label>End Date</label>
                      <input 
                        type="date" 
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        disabled={reportTimeframe !== 'custom'}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2 rounded-xl text-slate-800 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none h-9 disabled:opacity-50"
                      />
                    </div>

                  </div>

                  {/* Actions buttons */}
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl">
                    <button
                      onClick={handleTriggerReport}
                      disabled={generatingReport}
                      className="inline-flex items-center gap-1.5 px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs text-xs font-bold transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generatingReport ? 'animate-spin' : ''}`} />
                      Generate Treasury Logs Report
                    </button>

                    {reportedData && reportedData.rows && reportedData.rows.length > 0 && (
                      <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-1 px-3.5 h-9 bg-emerald-500 text-slate-950 hover:bg-emerald-600 text-xs font-bold rounded-xl transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Export Excel CSV File
                      </button>
                    )}
                  </div>

                  {/* Render resulting tables */}
                  {reportedData ? (
                    <div className="space-y-4">
                      
                      {/* Summary Banner */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-blue-50/40 dark:bg-blue-900/10 p-4 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-xs">
                        <div>
                          <p className="text-slate-450 uppercase text-[10px]">TIMEFRAME SPAN</p>
                          <p className="font-bold font-mono text-slate-800 dark:text-slate-250 uppercase mt-0.5">{reportedData.metadata.timeframe}</p>
                        </div>
                        <div>
                          <p className="text-slate-450 uppercase text-[10px]">RECORD COUNT</p>
                          <p className="font-bold font-mono text-slate-800 dark:text-slate-250 mt-0.5">{reportedData.metadata.transactionCount} payments records</p>
                        </div>
                        <div>
                          <p className="text-slate-455 uppercase text-[10px]">CUMULATIVE COLLECTIONS</p>
                          <p className="font-bold font-mono text-emerald-600 mt-0.5 text-sm">₱{reportedData.metadata.totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-450 uppercase text-[10px]">GENERATED TIMESTAMP</p>
                          <p className="font-bold font-mono text-slate-800 dark:text-slate-350 mt-0.5">{new Date(reportedData.metadata.generatedAt).toLocaleTimeString()}</p>
                        </div>
                      </div>

                      {/* Resulting listing table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-205 dark:border-slate-800 text-slate-400 font-mono uppercase tracking-widest text-[9px] py-2">
                              <th className="py-2.5">Date</th>
                              <th className="py-2.5">Official OR</th>
                              <th className="py-2.5 text-center">Stall Rent</th>
                              <th className="py-2.5">Stall Zone</th>
                              <th className="py-2.5">Owner Vendor</th>
                              <th className="py-2.5">Collector</th>
                              <th className="py-2.5">Paid Amount (₱)</th>
                              <th className="py-2.5">Mode</th>
                              <th className="py-2.5 text-right">Receipt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportedData.rows.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="text-center py-12 text-slate-400 font-mono">
                                  No transaction matches the active reporting criteria.
                                </td>
                              </tr>
                            ) : (
                              reportedData.rows.map((row: any) => (
                                <tr key={row.index} className="border-b border-slate-100 dark:border-slate-850/50 hover:bg-slate-50 dark:hover:bg-slate-950/15 transition font-mono">
                                  <td className="py-2 px-1 text-[11px] text-slate-500">{row.date}</td>
                                  <td className="py-2 font-bold text-slate-800 dark:text-slate-200">{row.receipt_number}</td>
                                  <td className="py-2 text-center text-blue-600 dark:text-blue-400 font-bold">{row.stall_number}</td>
                                  <td className="py-2 text-slate-500">{row.zone}</td>
                                  <td className="py-2 font-sans truncate max-w-[110px]" title={row.owner_name}>{row.owner_name}</td>
                                  <td className="py-2 font-sans truncate max-w-[110px]" title={row.collector_name}>{row.collector_name}</td>
                                  <td className="py-2 font-bold text-emerald-600 dark:text-emerald-450">₱{row.amount.toLocaleString()}</td>
                                  <td className="py-2 text-[10px] uppercase font-semibold text-slate-500">{row.payment_type}</td>
                                  <td className="py-2 text-right">
                                    <button
                                      onClick={() => {
                                        setSelectedReceipt(row);
                                        setIsReceiptOpen(true);
                                      }}
                                      className="p-1 px-2 text-[9px] font-bold rounded bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 cursor-pointer hover:bg-blue-100"
                                    >
                                      View OR
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <p className="text-xs text-slate-400 font-mono">Run dynamic generator above to inspect transaction logs.</p>
                    </div>
                  )}

                </div>
              )}

              {/* SUB TAB: SYSTEM BACKUP MODULE */}
              {activeSubTab === 'backup' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in" id="admin-backup-module">
                  
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Disaster Recovery & Data Backup Panel</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Extract complete application tracks or re-ingest exported assets securely.</p>
                  </div>

                  {backupSuccess && (
                     <p className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-700 dark:text-emerald-400 rounded-xl leading-normal">
                      {backupSuccess}
                     </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    
                    {/* Database Backup Export */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Download System Backup (JSON)</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                          Creates a secure structured copy containing all 100 stalls records, collector logs, registered users accounts, and 500 payments streams. Recommended before updates.
                        </p>
                      </div>

                      <button
                        onClick={handleTriggerBackupDownload}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition"
                      >
                        <Download className="w-4 h-4" /> Export Core Database File
                      </button>
                    </div>

                    {/* Database Restoring Import */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Restore Operations Recovery</h4>
                      <p className="text-[10px] text-slate-400 leading-normal mb-2 font-sans">
                        Restores all datasets. Paste raw structural JSON string backup file inside, then trigger RESTORE.
                      </p>

                      {importError && <p className="text-rose-500 font-mono text-[10px]">{importError}</p>}
                      {importSuccess && <p className="text-emerald-600 font-mono text-[10px]">{importSuccess}</p>}

                      <textarea 
                        value={importingJson}
                        onChange={(e) => setImportingJson(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 text-[10px] font-mono border border-slate-250 dark:border-slate-800 rounded-xl h-24 outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder='Paste raw database JSON string content here...'
                      />

                      <button
                        onClick={handleImportBackup}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-905 hover:bg-slate-850 text-white rounded-xl border border-slate-805 transition font-semibold"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Execute Restoring Process
                      </button>
                    </div>

                  </div>

                </div>
              )}

              {/* SUB TAB: AUDIT LOGS TRACE */}
              {activeSubTab === 'audit' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in" id="admin-audit-logs">
                  
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-500">Muni Treasury Database Audit Trace Logs</h3>
                    <span className="text-[10px] font-mono text-slate-400">Total stored logs: {auditLogs.length} events</span>
                  </div>

                  <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-100 dark:divide-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl">
                    {auditLogs.length === 0 ? (
                      <p className="text-center py-10 text-xs text-slate-400">No activity logs recorded.</p>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-slate-50/50 dark:bg-slate-950/20 text-xs grid grid-cols-1 sm:grid-cols-4 gap-2 font-mono items-center hover:bg-slate-50 dark:hover:bg-slate-900/40">
                          <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{log.user_name}</span>
                            <span className="px-1.5 py-[1px] bg-indigo-50 text-indigo-750 border border-indigo-100 text-[8px] rounded ml-2 uppercase font-sans font-bold">{log.role}</span>
                          </div>
                          <span className="sm:col-span-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">{log.action}</span>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* RENDER MODAL: STALL REGISTER SPACE */}
      {isStallModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="admin-create-stall-modal">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
            
            <div className="px-5 py-4 border-b border-slate-105 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
              <span className="text-xs font-black tracking-wider uppercase text-blue-600 dark:text-blue-400">Add New Market Rent Stall</span>
              <button onClick={() => setIsStallModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStallSubmit} className="p-5 overflow-y-auto max-h-[75vh] space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>Stall Number (ST-XXX)</label>
                  <input 
                    type="text" 
                    value={newStallForm.stall_number}
                    onChange={(e) => setNewStallForm(prev => ({ ...prev, stall_number: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-xl font-mono text-slate-800 text-xs font-bold"
                    placeholder="e.g. ST-101"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label>Layout location</label>
                  <select 
                    value={newStallForm.location}
                    onChange={(e) => setNewStallForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-xl font-mono text-slate-800 text-xs font-bold"
                  >
                    <option value="Zone A">Zone A (Dry Goods)</option>
                    <option value="Zone B">Zone B (Wet Market)</option>
                    <option value="Zone C">Zone C (Grocery)</option>
                    <option value="Zone D">Zone D (Food court)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label>Stall Rental Type</label>
                <select 
                  value={newStallForm.stall_type}
                  onChange={(e: any) => {
                    const type = e.target.value;
                    let m_fee = 3600;
                    let d_fee = 120;
                    if (type === 'Wet Market') { m_fee = 6000; d_fee = 200; }
                    else if (type === 'Grocery') { m_fee = 7500; d_fee = 250; }
                    else if (type === 'Food Stall') { m_fee = 4500; d_fee = 150; }
                    
                    setNewStallForm(prev => ({ ...prev, stall_type: type, monthly_fee: m_fee, daily_fee: d_fee }));
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-xl font-mono text-slate-800 text-xs font-bold font-sans"
                >
                  <option value="Wet Market">Wet Market (₱200/day)</option>
                  <option value="Dry Goods">Dry Goods (₱120/day)</option>
                  <option value="Grocery">Grocery (₱250/day)</option>
                  <option value="Food Stall">Food Stall (₱150/day)</option>
                  <option value="Fruit & Veg">Fruit & Veg (₱100/day)</option>
                </select>
              </div>

              {/* Vendor Information block */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-3">
                <p className="text-[10px] font-black tracking-wider uppercase text-blue-500">Stall Owner Account (Vendor)</p>
                
                <div className="space-y-1">
                  <label>Owner Full Name</label>
                  <input 
                    type="text" 
                    value={newStallForm.owner_name}
                    onChange={(e) => setNewStallForm(prev => ({ ...prev, owner_name: e.target.value }))}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-slate-800 text-xs"
                    placeholder="Elena Santos"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label>Email address</label>
                    <input 
                      type="email" 
                      value={newStallForm.owner_email}
                      onChange={(e) => setNewStallForm(prev => ({ ...prev, owner_email: e.target.value }))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-slate-800 text-xs"
                      placeholder="elena@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Phone Number</label>
                    <input 
                      type="text" 
                      value={newStallForm.owner_phone}
                      onChange={(e) => setNewStallForm(prev => ({ ...prev, owner_phone: e.target.value }))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-slate-800 text-xs"
                      placeholder="+63 9xx xxx xxxx"
                    />
                  </div>
                </div>
              </div>

              {/* Specific Fees values override */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>Override Daily Rental Fee (₱)</label>
                  <input 
                    type="number" 
                    value={newStallForm.daily_fee}
                    onChange={(e) => setNewStallForm(prev => ({ ...prev, daily_fee: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label>Monthly Target Fee (₱)</label>
                  <input 
                    type="number" 
                    value={newStallForm.monthly_fee}
                    onChange={(e) => setNewStallForm(prev => ({ ...prev, monthly_fee: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsStallModalOpen(false)}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-705 dark:bg-slate-800 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow transition"
                >
                  Register Stall
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* RENDER MODAL: COLLECTOR REGISTER */}
      {isCollectorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="admin-create-collector-modal">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
            
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-855">
              <span className="text-xs font-black tracking-wider uppercase text-violet-600 dark:text-violet-400">Register Field Collector Officer</span>
              <button onClick={() => setIsCollectorModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCollectorSubmit} className="p-5 space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-400">
              
              <div className="space-y-1">
                <label>Officer Full Name</label>
                <input 
                  type="text" 
                  value={newCollectorForm.full_name}
                  onChange={(e) => setNewCollectorForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-xl"
                  placeholder="Juan dela Cruz"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>MUNI Government Email</label>
                  <input 
                    type="email" 
                    value={newCollectorForm.email}
                    onChange={(e) => setNewCollectorForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-808 text-slate-850 dark:text-white rounded-xl font-mono"
                    placeholder="juan@marketpay.gov"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label>Secret Access password</label>
                  <input 
                    type="password" 
                    value={newCollectorForm.password}
                    onChange={(e) => setNewCollectorForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-808 text-slate-850 dark:text-white rounded-xl font-mono"
                    placeholder="Create password"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>Assign Sector Area</label>
                  <select
                    value={newCollectorForm.assigned_zone}
                    onChange={(e) => setNewCollectorForm(prev => ({ ...prev, assigned_zone: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-808 rounded-xl font-bold font-mono"
                  >
                    <option value="Zone A">Zone A (Dry Goods)</option>
                    <option value="Zone B">Zone B (Wet Market)</option>
                    <option value="Zone C">Zone C (Grocery)</option>
                    <option value="Zone D">Zone D (Food court)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Direct Contact Phone</label>
                  <input 
                    type="text" 
                    value={newCollectorForm.phone}
                    onChange={(e) => setNewCollectorForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-808 text-slate-850 dark:text-white rounded-xl"
                    placeholder="+63 9xx xxx xxxx"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-450 italic flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Automatically generates employee ID reference EMP-2026-X on submission.
              </p>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCollectorModalOpen(false)}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-violet-600 hover:bg-violet-750 text-white rounded-xl font-bold shadow transition"
                >
                  Register Collector
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* RENDER SHARED DIGITAL RECEIPT */}
      <ReceiptModal 
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedReceipt(null);
        }}
        payment={selectedReceipt}
      />

    </div>
  );
}
