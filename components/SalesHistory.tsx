import React, { useEffect, useState } from 'react';
import { Transaction, MenuItem, TableStatus } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchBillRegistry } from '../services/api';
import ReceiptPreviewModal from './ReceiptPreviewModal';

interface SalesHistoryProps {
  transactions: Transaction[];
  menuItems: MenuItem[];
}

const getLocalYMD = (d: Date) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatDisplayDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const mapApiTransaction = (raw: Record<string, unknown>): Transaction => {
  const items = (raw.items as Array<{ menuItemId?: { _id?: string }; quantity: number }>) || [];
  return {
    id: String(raw.receiptId || raw._id),
    tableId: Number(raw.tableId),
    items: items.map((item) => ({
      menuItemId: String(item.menuItemId?._id || item.menuItemId),
      quantity: item.quantity,
    })),
    subtotal: Number(raw.subtotal),
    tax: 0,
    serviceCharge: 0,
    total: Number(raw.total),
    timestamp: new Date(String(raw.createdAt)),
    paymentMethod: raw.paymentMethod as Transaction['paymentMethod'],
  };
};

const SalesHistory: React.FC<SalesHistoryProps> = ({ transactions, menuItems }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [registryDate, setRegistryDate] = useState(getLocalYMD(new Date()));
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [reprintTx, setReprintTx] = useState<Transaction | null>(null);

  const todayYMD = getLocalYMD(new Date());

  useEffect(() => {
    const localToday = transactions.filter((tx) => getLocalYMD(tx.timestamp) === todayYMD);
    const token = localStorage.getItem('token');

    if (!token) {
      setTodayTransactions(localToday);
      setRegistryDate(todayYMD);
      return;
    }

    fetchBillRegistry(token)
      .then((data) => {
        setRegistryDate(data.date);
        setTodayTransactions(
          (data.transactions as Record<string, unknown>[]).map(mapApiTransaction)
        );
      })
      .catch(() => {
        setTodayTransactions(localToday);
        setRegistryDate(todayYMD);
      });
  }, [transactions, todayYMD]);

  const totalRevenue = todayTransactions.reduce((acc, t) => acc + t.total, 0);
  const totalPaymentsDone = todayTransactions.length;
  const totalItemsServed = todayTransactions.reduce(
    (acc, t) => acc + t.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );

  const handleExportPDF = () => {
    setIsExporting(true);
    
    try {
      const doc = new jsPDF();
      const dateStr = new Date().toLocaleDateString();
      const timeStr = new Date().toLocaleTimeString();

      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text("Eat & Park POS", 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      doc.text('Daily Sales Registry Report', 14, 30);
      doc.text(`Generated: ${dateStr} at ${timeStr}`, 14, 36);

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 45, 182, 30, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('TOTAL REVENUE (INCL.)', 20, 55);
      doc.text('PAYMENTS DONE', 80, 55);
      doc.text('ITEMS SERVED', 140, 55);
      
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(`INR ${Math.round(totalRevenue)}`, 20, 65);
      doc.text(`${totalPaymentsDone}`, 80, 65);
      doc.text(`${totalItemsServed}`, 140, 65);

      const tableData = [...todayTransactions].reverse().map(tx => [
        `#${tx.id}`,
        `Table ${tx.tableId}`,
        tx.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tx.paymentMethod,
        `Rs. ${Math.round(tx.total)}`
      ]);

      autoTable(doc, {
        startY: 85,
        head: [['Invoice ID', 'Table', 'Time', 'Method', 'Total Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [37, 99, 235], 
          textColor: [255, 255, 255], 
          fontSize: 10,
          fontStyle: 'bold' 
        },
        bodyStyles: { 
          fontSize: 10, 
          textColor: [15, 23, 42] 
        },
        alternateRowStyles: { 
          fillColor: [241, 245, 249] 
        },
        margin: { top: 85 }
      });

      const fileName = `EatNPark_Registry_${dateStr.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('PDF Export Failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pr-2 animate-fade-in pb-20 lg:pb-10 space-y-6 sm:space-y-8">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0">
        <div>
          <h2 className="text-[32px] font-bold text-[#0f172a] tracking-tight leading-none">Bill Registry</h2>
          <p className="text-[14px] text-[#475569] mt-2">
            Today — {formatDisplayDate(registryDate)} • Daily summary of finalized settlements (GST Inclusive).
          </p>
        </div>
        
        <button 
          onClick={handleExportPDF}
          disabled={todayTransactions.length === 0 || isExporting}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-full font-medium text-[14px] transition-colors shrink-0 ${
            todayTransactions.length === 0 
            ? 'bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed' 
            : 'bg-[#253b80] hover:bg-[#0093d5] text-[#ffffff] active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.16)]'
          }`}
        >
          {isExporting ? (
            <svg className="animate-spin h-4 w-4 text-[#ffffff]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          <span>Daily PDF Report</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <div className="bg-[#ffffff] p-5 rounded-xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">Total Paid</p>
          <p className="text-[24px] font-bold text-[#0f172a] tracking-tight leading-none">{totalPaymentsDone} Bills</p>
        </div>
        <div className="bg-[#ffffff] p-5 rounded-xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">Daily Revenue (Incl.)</p>
          <p className="text-[24px] font-bold text-[#0f172a] tracking-tight leading-none">₹{Math.round(totalRevenue)}</p>
        </div>
        <div className="bg-[#253b80] p-5 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
          <p className="text-[12px] font-bold text-[#f1f5f9] uppercase tracking-wide mb-1">Items Served</p>
          <p className="text-[24px] font-bold text-[#ffffff] tracking-tight leading-none">{totalItemsServed} Dishes</p>
        </div>
      </div>

      <div>
        {todayTransactions.length === 0 ? (
          <div className="bg-[#ffffff] rounded-xl p-16 flex flex-col items-center justify-center border border-[#e2e8f0] text-center">
              <div className="w-16 h-16 bg-[#f1f5f9] rounded-full flex items-center justify-center mb-4 text-[#94a3b8]">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[#0f172a]">No bills today</h3>
              <p className="text-[#475569] text-[14px] mt-1">Today&apos;s settlements will appear here after checkout.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[...todayTransactions].reverse().map((tx) => (
              <div key={tx.id} className="bg-[#ffffff] rounded-xl border border-[#e2e8f0] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow flex flex-col gap-4">
                
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                      <p className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wide">INV #{tx.id}</p>
                      <h4 className="text-[18px] font-bold text-[#0f172a] tracking-tight mt-1">Table {tx.tableId} Settlement</h4>
                  </div>
                  <div className="text-right shrink-0">
                      <span className="bg-[#f1f5f9] text-[#0f172a] text-[12px] font-bold px-3 py-1 rounded-full uppercase">
                          {tx.paymentMethod}
                      </span>
                      <p className="text-[12px] font-medium text-[#475569] mt-2">{tx.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 py-4 border-y border-[#f1f5f9]">
                  {tx.items.map((item, idx) => {
                      const menu = menuItems.find(m => m.id === item.menuItemId);
                      return (
                          <div key={idx} className="flex items-center gap-1.5 bg-[#f1f5f9] px-2.5 py-1 rounded text-[12px]">
                              <span className="text-[#0f172a] font-bold">{item.quantity}x</span>
                              <span className="text-[#475569] font-medium truncate max-w-[120px]">{menu?.name}</span>
                          </div>
                      )
                  })}
                </div>

                <div className="flex justify-between items-end pt-1">
                  <div>
                    <span className="text-[12px] font-bold text-[#475569] uppercase tracking-wide">Amount Paid</span>
                    <p className="text-[24px] font-bold text-[#0f172a] tracking-tight leading-none mt-1">₹{Math.round(tx.total)}</p>
                  </div>
                  <button
                    onClick={() => setReprintTx(tx)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f8fafc] hover:bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] hover:border-[#bfdbfe] rounded-full text-[12px] font-bold transition-all shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Reprint Slip</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reprintTx && (
        <ReceiptPreviewModal
          isOpen={!!reprintTx}
          onClose={() => setReprintTx(null)}
          table={{
            id: reprintTx.tableId,
            status: TableStatus.AVAILABLE,
            currentOrder: reprintTx.items,
          }}
          menuItems={menuItems}
          total={reprintTx.total}
          paymentMethod={reprintTx.paymentMethod}
        />
      )}
    </div>
  );
};

export default SalesHistory;