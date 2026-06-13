import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle, ShieldAlert } from 'lucide-react';
import { PaymentEnriched } from '../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentEnriched | any;
}

export default function ReceiptModal({ isOpen, onClose, payment }: ReceiptModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>MarketPay Receipt</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
          body { font-family: monospace; padding: 20px; color: #333; }
          .receipt-container { max-width: 400px; margin: 0 auto; border: 1px dashed #ccc; padding: 15px; }
          .header { text-align: center; margin-bottom: 15px; }
          .logo { font-size: 20px; font-weight: bold; color: #1e3a8a; }
          .meta { font-size: 12px; color: #666; margin-bottom: 10px; }
          .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; }
          .bold { font-weight: bold; }
          .total { font-size: 16px; font-weight: bold; margin: 15px 0; display: flex; justify-content: space-between; }
          .footer { text-align: center; font-size: 11px; color: #888; margin-top: 20px; }
          .qr-placeholder { border: 1px solid #ddd; width: 100px; height: 100px; margin: 10px auto; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center; }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 300);
      }
    }
  };

  const handleDownloadCSV = () => {
    const data = [
      ['MarketPay Collector - Official Digital Receipt'],
      ['Official Receipt No', payment.receipt_number],
      ['Payment Reference ID', payment.id],
      ['Stall Number', payment.stall_number],
      ['Stall Type', payment.stall_type],
      ['Market Location', payment.location],
      ['Vendor Name', payment.owner_name],
      ['Payment Amount', `PHP ${payment.amount.toFixed(2)}`],
      ['Payment Mode', payment.payment_type.toUpperCase()],
      ['Transaction Date', new Date(payment.payment_date).toLocaleString()],
      ['Collector', payment.collector_name],
      ['Remarks', payment.remarks],
      ['Verification Code', `VERIFY:${payment.receipt_number}-${payment.id}`]
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + data.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MarketPay_Receipt_${payment.receipt_number}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="receipt-modal-container">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all duration-300 scale-100">
        
        {/* Header bar */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center space-x-2 text-emerald-600">
            <CheckCircle className="w-5 h-5" id="receipt-success-icon" />
            <span className="font-semibold text-sm tracking-wide uppercase dark:text-emerald-400">Digital Receipt</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
            id="close-receipt-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area Wrapper */}
        <div className="p-6 overflow-y-auto max-h-[70vh]" id="receipt-printable-wrap">
          
          <div ref={printAreaRef} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300">
            
            <div className="text-center space-y-1 mb-4">
              {/* Municipality Banner */}
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-1">
                <span className="font-mono text-blue-700 dark:text-blue-300 text-lg font-black">M</span>
              </div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">MUNICIPAL TREASURY OFFICE</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">Market Operations & Stall Rental Admin</p>
              <div className="border-t border-slate-300 dark:border-slate-700 my-2"></div>
              <p className="text-center font-bold tracking-widest text-[#1e3a8a] dark:text-[#a5b4fc] text-xs">OFFICIAL RECEIPT</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">No: {payment.receipt_number}</p>
            </div>

            <div className="space-y-2 font-mono">
              <div className="flex justify-between">
                <span>DATE/TIME:</span>
                <span className="text-right font-bold">{new Date(payment.payment_date).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between">
                <span>STALL NUMBER:</span>
                <span className="text-right font-bold">{payment.stall_number}</span>
              </div>

              <div className="flex justify-between">
                <span>STALL TYPE:</span>
                <span className="text-right">{payment.stall_type || 'General'}</span>
              </div>

              <div className="flex justify-between">
                <span>ZONE/LOCATION:</span>
                <span className="text-right font-bold">{payment.location || 'N/A'}</span>
              </div>

              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-2"></div>

              <div className="flex justify-between">
                <span>VENDOR:</span>
                <span className="text-right font-bold truncate max-w-[200px]">{payment.owner_name}</span>
              </div>

              <div className="flex justify-between">
                <span>COLLECTOR:</span>
                <span className="text-right truncate max-w-[200px]">{payment.collector_name}</span>
              </div>

              <div className="flex justify-between">
                <span>PAYMENT MODE:</span>
                <span className="text-right font-bold uppercase">{payment.payment_type}</span>
              </div>

              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-2"></div>

              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded">
                <span>AMOUNT PAID:</span>
                <span>PHP {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="mt-3 text-[10px] text-slate-500 dark:text-slate-400 italic">
                <span>Remarks: </span>
                <span>{payment.remarks || 'Daily rental fee collection.'}</span>
              </div>

              <div className="border-b border-slate-200 dark:border-slate-700 my-3"></div>

              {/* QR Verification System */}
              <div className="text-center space-y-2 font-sans py-1">
                <div className="mx-auto w-24 h-24 bg-white p-1 rounded-sm shadow-xs border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                  {/* Generated simulated CSS QR block */}
                  <div className="grid grid-cols-6 gap-[2px] w-full h-full p-1 bg-white">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-full h-full rounded-[1px] ${
                          // Random beautiful QR blocks patterns
                          (i % 5 === 0 || i % 6 === 2 || i === 0 || i === 4 || i === 5 || i === 30 || i === 35 || (i > 10 && i < 17))
                            ? 'bg-slate-900' 
                            : 'bg-slate-50'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-mono tracking-wider text-slate-600 dark:text-slate-400">QR SECURE VERIFICATION CODE</p>
                  <p className="text-[8px] font-mono select-all bg-slate-200 dark:bg-slate-800 px-1 py-[2px] rounded inline-block text-slate-700 dark:text-slate-300">
                    MKT-{payment.receipt_number}-{payment.id?.slice(-6)}
                  </p>
                </div>
              </div>

              <div className="text-center font-sans text-[9px] text-slate-500 dark:text-slate-400 pt-3">
                <p>Thank you for your timely payment!</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-1">✓ SECURE DIGITAL TRANSACTION</p>
              </div>

            </div>

          </div>

        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button 
            type="button" 
            onClick={handleDownloadCSV}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
            id="receipt-download-csv-btn"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-450" />
            Export Data
          </button>
          
          <button 
            type="button" 
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
            id="receipt-print-btn"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>

      </div>
    </div>
  );
}
