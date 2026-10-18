import React, { useState, useEffect } from 'react';
import { bluetoothPrinter, PrinterState } from '../services/bluetoothPrinter';

interface BluetoothPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BluetoothPrinterModal: React.FC<BluetoothPrinterModalProps> = ({ isOpen, onClose }) => {
  const [printerState, setPrinterState] = useState<PrinterState>(bluetoothPrinter.getState());
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    const unsubscribe = bluetoothPrinter.subscribe((state) => {
      setPrinterState(state);
      if (state.error) {
        setFeedback({ type: 'error', message: state.error });
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const isSupported = bluetoothPrinter.isSupported();

  const handleConnect = async () => {
    setFeedback(null);
    try {
      const success = await bluetoothPrinter.connect();
      if (success) {
        setFeedback({
          type: 'success',
          message: `Connected successfully to ${bluetoothPrinter.getState().deviceName || 'printer'}!`,
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Connection failed',
      });
    }
  };

  const handleDisconnect = () => {
    bluetoothPrinter.disconnect();
    setFeedback({ type: 'info', message: 'Bluetooth printer disconnected.' });
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      await bluetoothPrinter.printTestSlip();
      setFeedback({
        type: 'success',
        message: 'Test slip sent to printer! Check the printout.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Test print failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a] bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#ffffff] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#e2e8f0] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#f1f5f9] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7l10 10-5 5V2l5 5L7 17" />
              </svg>
            </div>
            <div>
              <h3 className="text-[20px] font-bold text-[#0f172a] leading-tight">Bluetooth Printer</h3>
              <p className="text-[13px] text-[#64748b] font-medium">80mm Thermal Receipt Printer Setup</p>
            </div>
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

        {/* Browser support alert */}
        {!isSupported && (
          <div className="mb-6 p-4 bg-[#fef2f2] border border-[#fecaca] rounded-2xl flex items-start gap-3">
            <svg className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-[13px] text-[#991b1b]">
              <p className="font-bold">Web Bluetooth Not Available</p>
              <p className="mt-0.5">Please open this POS webapp in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> to use direct Bluetooth thermal printing. Standard browser print is still supported as a fallback.</p>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="p-5 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Connection Status</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold ${
              printerState.isConnected
                ? 'bg-[#dcfce7] text-[#15803d]'
                : printerState.isConnecting
                ? 'bg-[#fef9c3] text-[#854d0e]'
                : 'bg-[#f1f5f9] text-[#64748b]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                printerState.isConnected
                  ? 'bg-[#22c55e] animate-pulse'
                  : printerState.isConnecting
                  ? 'bg-[#eab308] animate-ping'
                  : 'bg-[#94a3b8]'
              }`}></span>
              {printerState.isConnected
                ? 'Connected'
                : printerState.isConnecting
                ? 'Connecting...'
                : 'Disconnected'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[16px] font-bold text-[#0f172a]">
                {printerState.deviceName || (isSupported ? 'No device connected' : 'Not supported')}
              </p>
              <p className="text-[13px] text-[#64748b] mt-0.5">
                Paper: 80mm Roll (ESC/POS 48 columns)
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {feedback && (
          <div className={`mb-6 p-4 rounded-2xl text-[13px] font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]'
              : feedback.type === 'error'
              ? 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
              : 'bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]'
          }`}>
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="ml-2 hover:opacity-75">✕</button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {printerState.isConnected ? (
            <>
              <button
                onClick={handleTestPrint}
                disabled={isTesting}
                className="w-full py-3.5 px-4 bg-[#253b80] hover:bg-[#1e2f66] text-[#ffffff] font-bold text-[15px] rounded-full transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Printing Test Slip...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Test Slip
                  </>
                )}
              </button>

              <button
                onClick={handleDisconnect}
                className="w-full py-3.5 px-4 bg-[#ffffff] hover:bg-[#f8fafc] text-[#ef4444] border border-[#fecaca] font-bold text-[15px] rounded-full transition-colors flex items-center justify-center gap-2"
              >
                Disconnect Printer
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={printerState.isConnecting || !isSupported}
              className="w-full py-4 px-4 bg-[#253b80] hover:bg-[#1e2f66] disabled:opacity-50 text-[#ffffff] font-bold text-[16px] rounded-full transition-all flex items-center justify-center gap-2.5 shadow-md"
            >
              {printerState.isConnecting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Pairing with Printer...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7l10 10-5 5V2l5 5L7 17" />
                  </svg>
                  Pair Bluetooth Printer
                </>
              )}
            </button>
          )}
        </div>

        {/* Quick Instructions */}
        <div className="mt-6 pt-5 border-t border-[#f1f5f9] text-[12px] text-[#64748b] space-y-1.5">
          <p className="font-bold text-[#334155]">Pairing Tips:</p>
          <p>1. Make sure your Bluetooth thermal receipt printer is powered on and within range.</p>
          <p>2. Click <strong>Pair Bluetooth Printer</strong> and select your printer from the browser prompt.</p>
          <p>3. Once paired, receipts will print instantly when clicking Print on checkout.</p>
        </div>
      </div>
    </div>
  );
};

export default BluetoothPrinterModal;
