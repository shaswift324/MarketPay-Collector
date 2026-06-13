import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, Search, QrCode, ClipboardList, CheckSquare, 
  MapPin, User, LogOut, Moon, Sun, RefreshCw, X, Check, 
  CreditCard, Smartphone, Banknote, ShieldAlert, BadgeCheck, FileSpreadsheet
} from 'lucide-react';
import { User as UserType } from '../types';
import ReceiptModal from './ReceiptModal';

interface CollectorPortalProps {
  user: UserType;
  token: string;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export default function CollectorPortal({ user, token, onLogout, isDarkMode, toggleDarkMode }: CollectorPortalProps) {
  const [stalls, setStalls] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action Forms
  const [selectedStall, setSelectedStall] = useState<any>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'gcash' | 'card'>('cash');
  const [remarks, setRemarks] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Digital Receipt popup trigger
  const [receiptPayload, setReceiptPayload] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Scanning Simulation State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanningMessage, setScanningMessage] = useState('Align QR indicator inside physical bounds...');
  const [scannerFilter, setScannerFilter] = useState('');

  const syncCollectorData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch available stalls list
      const stallsResp = await fetch('/api/stalls', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!stallsResp.ok) throw new Error('Incomplete synchronization of municipal stalls.');
      const stallsData = await stallsResp.json();
      
      // We filter or rank stalls if the collector has an assigned zone
      // e.g., user.assignedZone === 'Zone A'
      setStalls(stallsData);

      // 2. Fetch payments made to capture history
      const payResp = await fetch('/api/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!payResp.ok) throw new Error('Incomplete sync of payments history.');
      const payData = await payResp.json();

      // Filter history recorded by this active collector user
      const colHistory = payData.filter((p: any) => p.collector_id === user.id);
      setHistory(colHistory);
    } catch (err: any) {
      setError(err.message || 'Connecting error. Please verify dev server state.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncCollectorData();
  }, [token]);

  // Record fee submission
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStall || !amount) return;

    setSubmittingPayment(true);
    try {
      const resp = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stall_id: selectedStall.id,
          amount: Number(amount),
          payment_type: paymentType,
          remarks: remarks || `Daily rental fee collection - ST-${selectedStall.stall_number}`
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to submit payment collection transaction.');

      // Successfully saved!
      // Enriched payment response to feeds receipt modal
      const payRecord = {
        ...data.payment,
        stall_number: selectedStall.stall_number,
        stall_type: selectedStall.stall_type,
        location: selectedStall.location,
        owner_name: selectedStall.owner_name,
        collector_name: user.full_name
      };

      setReceiptPayload(payRecord);
      setIsReceiptOpen(true);
      setIsCollectModalOpen(false);
      
      // Clear forms
      setAmount('');
      setRemarks('');
      setPaymentType('cash');
      setSelectedStall(null);

      // Refresh listings
      syncCollectorData();
    } catch (err: any) {
      alert(err.message || 'Error occurred recording payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Launch simulated scanning resolution
  const handleTriggerScanner = () => {
    setIsScannerOpen(true);
    setScanningMessage('Sensing camera environment... scanning standard QR matrices...');
    setScannerFilter('');
  };

  // Resolve simulated QR scan action
  const handleResolveScan = (stall: any) => {
    setScanningMessage(`✓ Scanned Stall ID ST-${stall.stall_number} resolved! Connecting ledger...`);
    setTimeout(() => {
      setIsScannerOpen(false);
      // Autofill the collection state and prompt payment modal
      setSelectedStall(stall);
      // Pre-set standard daily fee amount
      // Balance calculation: we can estimate outstanding balance
      // Monthly fee or outstanding balance: let's use the actual stall daily fee as amount
      setAmount(stall.daily_fee.toString());
      setRemarks(`Contactless scanned collection for ${stall.stall_number}`);
      setIsCollectModalOpen(true);
    }, 700);
  };

  // Filter Stalls list based on global Search criteria (Permit number, Stall number, Owner name)
  const filteredStalls = stalls.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      s.stall_number.toLowerCase().includes(q) || 
      (s.owner_name && s.owner_name.toLowerCase().includes(q)) || 
      s.business_permit_number.toLowerCase().includes(q) ||
      s.stall_type.toLowerCase().includes(q);
    
    return matchesSearch;
  });

  const assignedZoneStalls = filteredStalls.filter(s => s.location === user.assignedZone);
  const otherZoneStalls = filteredStalls.filter(s => s.location !== user.assignedZone);

  // Totals calculations
  const totalCollectedToday = history.reduce((sum, h) => {
    // Check if recorded today (June 12, 2026)
    const isToday = h.payment_date.startsWith('2026-06-12') || new Date(h.payment_date).toDateString() === new Date().toDateString();
    return isToday ? sum + h.amount : sum;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans pb-12">
      
      {/* Mobile-Friendly header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 select-none text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          
          <div className="flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm leading-none select-none">
              M
            </span>
            <div>
              <h1 className="text-xs font-semibold tracking-tight text-white leading-none">MarketPay <span className="text-blue-400">Pro</span></h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Collector Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            
            {/* Theme option */}
            <button 
              onClick={toggleDarkMode}
              className="p-1 px-2.5 h-8 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              id="collector-toggle-dark-mode"
            >
              {isDarkMode ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-emerald-400" />}
              <span className="hidden sm:inline">Theme</span>
            </button>

            {/* Logout */}
            <button 
              onClick={onLogout}
              className="p-1 px-2 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-900/40 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
              id="collector-logout-btn"
            >
              <LogOut className="w-3 h-3" />
              <span>Log out</span>
            </button>

          </div>

        </div>
      </header>

      {/* Main Body container */}
      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        
        {/* Personal Stats card */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
          
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Active Collector Profile</p>
          <h2 className="text-xl font-bold tracking-tight mt-0.5">{user.full_name}</h2>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Emp ID: {user.employeeNumber || 'EMP-2026-001'} • Zone: {user.assignedZone || 'Zone A'}</p>

          <div className="border-t border-slate-800 my-4"></div>

          {/* Core mobile targets */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-850 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider block uppercase">My Collections Today</span>
              <span className="text-lg font-black text-emerald-400 font-mono">Php {totalCollectedToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-slate-850 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider block uppercase">Transaction Count</span>
              <span className="text-lg font-black text-white font-mono">{history.length} Receipts</span>
            </div>
          </div>
          
          {/* Main Action buttons: SCAN QR & SYNC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <button
              onClick={handleTriggerScanner}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
              id="collector-trigger-scanner-btn"
            >
              <QrCode className="w-5 h-5" />
              CONTACTLESS SCAN QR
            </button>

            <button
              onClick={syncCollectorData}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold text-sm rounded-xl border border-slate-700 active:scale-98 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              SYNC TERMINAL DATA
            </button>
          </div>

        </div>

        {/* Sync or Connect error notification */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-450 font-mono">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* MAIN DIRECTORY VIEW */}
        <div className="space-y-4">
          
          {/* Search bar block */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
              placeholder="Search vendor name, permit BP, stall ST..."
              id="collector-search-stalls"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex justify-between items-center select-none pt-2">
            <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">Stalls Layout Queue</h3>
            <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/20 font-mono">
              {filteredStalls.length} Result{filteredStalls.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Loading listings spinner */}
          {isLoading && stalls.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <span className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-500 inline-block animate-spin"></span>
              <p className="text-xs text-slate-400 font-mono">Fetching assigned municipal blocks...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* PRIMARY: Assigned Zone stalls */}
              {assignedZoneStalls.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">My Assigned Sector ({user.assignedZone})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="assigned-zone-grid">
                    {assignedZoneStalls.map((stl) => {
                      // Estimate outstanding balance
                      // Daily fee is standard, let's say outstanding is random for variation but realistic
                      const hasPaidToday = history.some(h => h.stall_id === stl.id && (h.payment_date.startsWith('2026-06-12') || new Date(h.payment_date).toDateString() === new Date().toDateString()));
                      
                      return (
                        <div 
                          key={stl.id} 
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-900 transition duration-150 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{stl.stall_number}</span>
                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-350 truncate max-w-[150px] mt-0.5">{stl.owner_name}</p>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                hasPaidToday 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'
                              }`}>
                                {hasPaidToday ? '✓ PAID TODAY' : 'PENDING'}
                              </span>
                            </div>

                            <div className="border-b border-slate-100 dark:border-slate-850 my-1"></div>

                            <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                              <div>
                                <p className="text-[9px] text-slate-400 uppercase">Rate/Daily</p>
                                <p className="font-bold text-slate-800 dark:text-slate-300">₱{stl.daily_fee}/day</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-400 uppercase">Permit Clearance</p>
                                <p className="truncate max-w-[100px]" title={stl.business_permit_number}>{stl.business_permit_number}</p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3.5 flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedStall(stl);
                                // Set initial payment amount equal to exact daily fee
                                setAmount(stl.daily_fee.toString());
                                setIsCollectModalOpen(true);
                              }}
                              className={`flex-1 inline-flex items-center justify-center h-8 text-[11px] font-bold rounded-lg transition shadow-2xs cursor-pointer ${
                                hasPaidToday 
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-705 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                              }`}
                            >
                              Collect Fee
                            </button>
                            <button
                              onClick={() => {
                                // Simulate digital QR sticker checkout trigger
                                setSelectedStall(stl);
                                setAmount(stl.daily_fee.toString());
                                setRemarks(`Contactless QR verification check ST-${stl.stall_number}`);
                                setIsCollectModalOpen(true);
                              }}
                              className="p-1 px-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                              title="Show QR Identification"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECONDARY: Other Sector stalls */}
              {otherZoneStalls.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Out of Assigned Sector</span>
                  
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-850 shadow-2xs">
                    {otherZoneStalls.map((stl) => {
                      const hasPaidToday = history.some(h => h.stall_id === stl.id && (h.payment_date.startsWith('2026-06-12') || new Date(h.payment_date).toDateString() === new Date().toDateString()));

                      return (
                        <div key={stl.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-850/20 transition gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-150">{stl.stall_number}</span>
                              <span className="px-1 py-[1px] bg-slate-100 dark:bg-slate-800 rounded text-[8px] font-bold text-slate-500 font-mono">{stl.location}</span>
                              <span className="text-slate-400 font-mono text-[10px]">({stl.stall_type})</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{stl.owner_name}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-350 mr-1">₱{stl.daily_fee}</span>
                            <button
                              onClick={() => {
                                setSelectedStall(stl);
                                setAmount(stl.daily_fee.toString());
                                setIsCollectModalOpen(true);
                              }}
                              className={`h-7 px-3 text-[10px] font-bold rounded-lg cursor-pointer transition ${
                                hasPaidToday 
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-slate-850 dark:text-slate-400'
                                  : 'bg-blue-600 hover:bg-blue-750 text-white shadow-xs'
                              }`}
                            >
                              Collect
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredStalls.length === 0 && (
                <div className="py-16 text-center space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 font-mono font-bold">No rental space matching filter parameters.</p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* RECENT HISTORIC COLLECTIONS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 mt-6">
          <div className="flex justify-between items-center select-none border-b border-slate-100 dark:border-slate-850 pb-2">
            <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">My Collected Fee Activity Ledger</h3>
            <span className="text-[10px] font-mono text-slate-400">{history.length} collections logged</span>
          </div>

          <div className="overflow-x-auto">
            {history.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400 font-mono">No payment collections logged today.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-mono uppercase tracking-widest text-[9px]">
                    <th className="py-2">Receipt OR</th>
                    <th className="py-2 text-center">Stall No</th>
                    <th className="py-2">Mode</th>
                    <th className="py-2">Amount Paid</th>
                    <th className="py-2 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 8).map((h) => (
                    <tr key={h.id} className="border-b border-slate-100 dark:border-slate-850/40 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition font-mono">
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                        {h.receipt_number}
                      </td>
                      <td className="py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">
                        {h.stall_number || 'ST-Rental'}
                      </td>
                      <td className="py-2.5 uppercase font-sans text-[10px] font-semibold text-slate-500">{h.payment_type}</td>
                      <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-450">₱{h.amount.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-sans">
                        <button
                          onClick={() => {
                            // Find relevant stall parameters
                            const st = stalls.find(s => s.id === h.stall_id) || {};
                            setReceiptPayload({
                              ...h,
                              stall_number: st.stall_number || 'ST-No',
                              stall_type: st.stall_type || 'Market Space',
                              location: st.location || 'Municipal Center',
                              owner_name: st.owner_name || 'Vendor Profile',
                              collector_name: user.full_name
                            });
                            setIsReceiptOpen(true);
                          }}
                          className="p-1 px-2 rounded font-bold text-[9px] bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 cursor-pointer transition hover:bg-blue-100"
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

      </main>

      {/* MODAL: COLLECT FEE PAYMENT DRAWER */}
      {isCollectModalOpen && selectedStall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="collector-payment-modal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-slide-up">
            
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
              <span className="font-bold text-xs tracking-wider uppercase text-blue-600 dark:text-blue-400">Collect Rent Transaction</span>
              <button 
                onClick={() => {
                  setIsCollectModalOpen(false);
                  setSelectedStall(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs font-semibold">
              
              {/* Stall info display summary */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-blue-600">{selectedStall.stall_number}</span>
                  <span className="font-sans text-[10px] text-slate-400">BP: {selectedStall.business_permit_number}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-850/80 my-1"></div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono select-none">
                  <div>
                    <span className="text-slate-450 uppercase block">Owner Name</span>
                    <span className="font-bold font-sans text-slate-805 dark:text-slate-300 text-xs">{selectedStall.owner_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 uppercase block">Daily Rent Dues</span>
                    <span className="font-bold text-emerald-600 text-xs">Php {selectedStall.daily_fee}/day</span>
                  </div>
                </div>
              </div>

              {/* Amount to collect input */}
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-450">Collected Payment Amount (Php)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-455 font-mono font-bold text-xs pointer-events-none">
                    ₱
                  </div>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-7 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-205 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm font-bold"
                    placeholder="Enter amount"
                    id="collector-payment-amount"
                    required
                    min={1}
                  />
                </div>
                {/* quick matching buttons */}
                <div className="flex gap-1.5 pt-1">
                  <button 
                    type="button" 
                    onClick={() => setAmount(selectedStall.daily_fee.toString())}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-[9px] font-bold rounded-lg font-mono transition text-slate-600 dark:text-slate-300"
                  >
                    Daily: ₱{selectedStall.daily_fee}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setAmount((selectedStall.daily_fee * 2).toString())}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-[9px] font-bold rounded-lg font-mono transition text-slate-600 dark:text-slate-300"
                  >
                    2 Days: ₱{selectedStall.daily_fee * 2}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setAmount((selectedStall.daily_fee * 7).toString())}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-[9px] font-bold rounded-lg font-mono transition text-slate-600 dark:text-slate-300"
                  >
                    1 Week: ₱{selectedStall.daily_fee * 7}
                  </button>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-450 block mb-1">Fee Payment Method</label>
                <div className="grid grid-cols-3 gap-2" id="payment-mode-selection">
                  <button
                    type="button"
                    onClick={() => setPaymentType('cash')}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      paymentType === 'cash' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase">CASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('gcash')}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      paymentType === 'gcash' 
                        ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase">GCash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('card')}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      paymentType === 'card' 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-400'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase">CARD / POS</span>
                  </button>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-450 block">Transaction Remarks (Optional)</label>
                <textarea 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono font-medium resize-none h-16"
                  placeholder="e.g., Daily collection clearance"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCollectModalOpen(false);
                    setSelectedStall(null);
                  }}
                  className="flex-1 h-10 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 h-10 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow transition disabled:opacity-50"
                  id="collector-submit-payment-btn"
                >
                  {submittingPayment ? 'Recording...' : 'Submit Collection'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: TELEMATIC QR SCANNER SIMULATOR */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-between p-4 font-mono select-none" id="qr-scanner-simulator">
          
          {/* Header */}
          <div className="w-full max-w-md flex justify-between items-center text-slate-300 py-2 border-b border-slate-850">
            <div className="flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-emerald-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">Contactless QR Lens Simulator</span>
            </div>
            <button 
              onClick={() => setIsScannerOpen(false)}
              className="text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-slate-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner Feed screen simulator */}
          <div className="w-full max-w-sm aspect-square border-2 border-dashed border-emerald-500/50 rounded-2xl relative flex items-center justify-center overflow-hidden bg-slate-900/60 shadow-inner">
            
            {/* Pulsing red scan line */}
            <div className="absolute left-0 right-0 h-[2px] bg-emerald-500 shadow-lg shadow-emerald-555 animate-scan-line pointer-events-none"></div>

            {/* Simulated targeting reticle corner brackets */}
            <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm"></div>
            <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm"></div>
            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm"></div>
            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-sm"></div>

            <div className="text-center p-6 space-y-4 max-w-xs z-10 text-white font-sans">
              <Smartphone className="w-10 h-10 mx-auto text-emerald-500 animate-bounce" />
              <p className="text-xs font-semibold leading-relaxed text-slate-200">{scanningMessage}</p>
              <p className="text-[10px] text-slate-500 font-mono">Select a physical stall sticker below to simulate scanning its unique code</p>
            </div>
            
            {/* Digital background noise */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950/20 opacity-30 pointer-events-none"></div>

          </div>

          {/* Scanner search list block */}
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shrink-0">
            
            <div className="relative">
              <input 
                type="text" 
                value={scannerFilter}
                onChange={(e) => setScannerFilter(e.target.value)}
                placeholder="Lookup Stall Sticker (e.g. ST-012)..."
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs font-mono rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            </div>

            <div className="h-44 overflow-y-auto divide-y divide-slate-850/60 pr-1 text-slate-300 font-mono text-[11px]">
              {stalls
                .filter(s => {
                  const query = scannerFilter.toLowerCase();
                  return s.stall_number.toLowerCase().includes(query) || (s.owner_name && s.owner_name.toLowerCase().includes(query));
                })
                .map((stall) => (
                  <div 
                    key={stall.id} 
                    onClick={() => handleResolveScan(stall)}
                    className="py-2 px-1.5 flex justify-between items-center hover:bg-slate-800/60 rounded cursor-pointer transition active:scale-99"
                  >
                    <div>
                      <span className="text-emerald-400 font-bold font-mono">{stall.stall_number}</span>
                      <span className="text-[10px] text-slate-500 ml-2">({stall.owner_name || 'Vendor'})</span>
                    </div>
                    <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-400 hover:text-emerald-400 border border-slate-800 font-bold uppercase tracking-wider flex items-center gap-1">
                      <QrCode className="w-2.5 h-2.5" /> Simulate Scan
                    </span>
                  </div>
                ))}
            </div>

          </div>

          {/* Footer note */}
          <p className="text-[9px] text-slate-500 font-mono tracking-widest pt-2">
            MUNICIPAL MARKET PAYROLL METAPORTAL v1.1 • DIGITAL CORE LENS
          </p>

        </div>
      )}

      {/* RENDER DIGITAL RECEIPT POPUP COMPONENT */}
      <ReceiptModal 
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setReceiptPayload(null);
        }}
        payment={receiptPayload}
      />

    </div>
  );
}
