import React, { useState, useEffect } from 'react';
import { Table, MenuItem } from '../types';
import { bluetoothPrinter, PrinterState, ReceiptData } from '../services/bluetoothPrinter';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table;
  menuItems: MenuItem[];
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI';
  onOpenBluetoothModal?: () => void;
}

const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  table,
  menuItems,
  total,
  paymentMethod,
  onOpenBluetoothModal,
}) => {
  const [printerState, setPrinterState] = useState<PrinterState>(bluetoothPrinter.getState());
  const [isPrintingBt, setIsPrintingBt] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const unsub = bluetoothPrinter.subscribe((state) => setPrinterState(state));
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = currentDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const invoiceNum = `INV-T${table.id}-${Date.now().toString().slice(-4)}`;

  const receiptData: ReceiptData = {
    tableId: table.id,
    invoiceId: invoiceNum,
    items: table.currentOrder,
    menuItems: menuItems,
    subtotal: total,
    total: total,
    paymentMethod: paymentMethod,
    date: currentDate,
  };

  const handleBluetoothPrint = async () => {
    setIsPrintingBt(true);
    setFeedback(null);
    try {
      if (!printerState.isConnected) {
        const connected = await bluetoothPrinter.connect();
        if (!connected) {
          setIsPrintingBt(false);
          return;
        }
      }

      await bluetoothPrinter.printReceipt(receiptData);
      setFeedback({
        type: 'success',
        message: 'Receipt sent to Bluetooth thermal printer!',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Printing failed',
      });
    } finally {
      setIsPrintingBt(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text('Eat & Park', 14, 22);

      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      doc.text(`Invoice - Table ${table.id} (${invoiceNum})`, 14, 30);
      doc.text(`Date: ${dateStr} at ${timeStr} | Payment: ${paymentMethod}`, 14, 36);

      const tableData = table.currentOrder.map((item) => {
        const menuInfo = menuItems.find((m) => m.id === item.menuItemId);
        const price = menuInfo?.price || 0;
        return [
          menuInfo?.name || 'Unknown Item',
          item.quantity.toString(),
          `Rs. ${price}`,
          `Rs. ${price * item.quantity}`,
        ];
      });

      autoTable(doc, {
        startY: 45,
        head: [['Item Name', 'Qty', 'Rate', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 10,
          textColor: [15, 23, 42],
        },
        foot: [['', '', 'Total Amount (Incl. GST)', `Rs. ${Math.round(total)}`]],
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 12,
        },
      });

      doc.save(`EatNPark_Table${table.id}_${invoiceNum}.pdf`);
    } catch {
      alert('Failed to generate PDF.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a] bg-opacity-60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="bg-[#ffffff] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#e2e8f0] relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#f1f5f9] mb-5">
          <div>
            <h3 className="text-[20px] font-bold text-[#0f172a]">Receipt & Print Options</h3>
            <p className="text-[13px] text-[#64748b]">80mm Thermal Receipt • Table {table.id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] flex items-center justify-center text-[#475569] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mb-4 p-3.5 rounded-2xl text-[13px] font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]'
              : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
          }`}>
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="ml-2 hover:opacity-75">✕</button>
          </div>
        )}

        {/* Realistic 80mm Thermal Paper Preview */}
        <div className="max-h-[380px] overflow-y-auto p-4 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] mb-5">
          <div
            id="thermal-receipt-printable"
            className="w-full max-w-[340px] mx-auto bg-white p-5 rounded-lg border border-dashed border-[#cbd5e1] font-mono text-[13px] text-[#0f172a] shadow-sm"
            style={{ fontFamily: 'Courier New, Courier, monospace' }}
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-[#94a3b8]">
              <h2 className="text-[18px] font-extrabold tracking-wider">EAT & PARK</h2>
              <p className="text-[11px] font-semibold text-[#475569]">RESTAURANT & LOUNGE</p>
              <p className="text-[10px] text-[#64748b]">Multi-Cuisine Fine Dining</p>
            </div>

            {/* Receipt Meta */}
            <div className="py-2.5 text-[11px] border-b border-dashed border-[#94a3b8] space-y-0.5">
              <div className="flex justify-between">
                <span>Table: Table {table.id}</span>
                <span>{invoiceNum}</span>
              </div>
              <div className="flex justify-between">
                <span>Date: {dateStr}</span>
                <span>{timeStr}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment: {paymentMethod}</span>
                <span>GST Inclusive</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-[#94a3b8]">
              <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-gray-300">
                <span className="w-1/2">ITEM</span>
                <span className="w-12 text-center">QTY</span>
                <span className="w-16 text-right">RATE</span>
                <span className="w-16 text-right">AMT</span>
              </div>
              <div className="pt-2 space-y-1.5 text-[11px]">
                {table.currentOrder.map((item) => {
                  const menuInfo = menuItems.find((m) => m.id === item.menuItemId);
                  const price = menuInfo?.price || 0;
                  return (
                    <div key={item.menuItemId} className="flex justify-between items-start">
                      <span className="w-1/2 truncate font-medium">{menuInfo?.name || 'Item'}</span>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <span className="w-16 text-right">₹{price}</span>
                      <span className="w-16 text-right font-bold">₹{price * item.quantity}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-[#94a3b8] space-y-1 text-[12px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{Math.round(total)}</span>
              </div>
              <div className="flex justify-between text-[#64748b] text-[11px]">
                <span>Taxes (GST):</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between font-extrabold text-[15px] pt-1 border-t border-black">
                <span>TOTAL:</span>
                <span>₹{Math.round(total)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-[#64748b]">
              <p className="font-semibold text-[#334155]">Thank you for dining with us!</p>
              <p>Please visit again</p>
              <p className="mt-1 text-[9px]">*** Powered by Eat & Park POS ***</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5">
          {/* Primary Bluetooth Print Button */}
          <button
            onClick={handleBluetoothPrint}
            disabled={isPrintingBt}
            className="w-full py-3.5 px-4 bg-[#253b80] hover:bg-[#1e2f66] text-[#ffffff] font-bold text-[15px] rounded-full transition-all flex items-center justify-center gap-2.5 shadow-md disabled:opacity-50"
          >
            {isPrintingBt ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Sending to Bluetooth Thermal Printer...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7l10 10-5 5V2l5 5L7 17" />
                </svg>
                {printerState.isConnected
                  ? `Print via Bluetooth (${printerState.deviceName || 'Thermal'})`
                  : 'Connect & Print via Bluetooth'}
              </>
            )}
          </button>

          {/* Secondary Fallback Controls */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleBrowserPrint}
              className="py-3 px-3 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] font-semibold text-[13px] rounded-full transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Browser Print (80mm)
            </button>

            <button
              onClick={handleDownloadPDF}
              className="py-3 px-3 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] font-semibold text-[13px] rounded-full transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
          </div>

          {/* Bluetooth Settings Quick Link */}
          {onOpenBluetoothModal && (
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenBluetoothModal();
                }}
                className="text-[12px] font-semibold text-[#2563eb] hover:underline"
              >
                Configure Bluetooth Printer Settings →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreviewModal;
