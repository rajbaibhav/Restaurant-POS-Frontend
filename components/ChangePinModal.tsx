import React, { useState } from 'react';
import { changePin } from '../services/backendApi';

interface ChangePinModalProps {
  token: string;
  onClose: () => void;
}

const ChangePinModal: React.FC<ChangePinModalProps> = ({ token, onClose }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNumericInput = (val: string, setter: (v: string) => void) => {
    // Only allow numeric input up to 4 digits
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      setter(cleaned);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('The PINs do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePin(newPin, confirmPin, token);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change PIN. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a] bg-opacity-65 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-[#ffffff] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#e2e8f0] transform transition-transform duration-300 scale-100">
        
        {/* Modal Header */}
        <div className="relative p-6 border-b border-[#e2e8f0] bg-[#ffffff] flex items-center justify-between">
          <div>
            <h3 className="text-[20px] font-bold text-[#0f172a] tracking-tight">Security Settings</h3>
            <p className="text-[13px] text-[#475569] mt-0.5">Update your personal security PIN</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={success || isSubmitting}
            className="w-8 h-8 bg-[#f1f5f9] rounded-full flex items-center justify-center text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a] transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center text-green-600 animate-bounce">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-[18px] font-bold text-[#0f172a]">PIN Changed Successfully!</h4>
                <p className="text-[14px] text-[#475569] mt-1">Your security credentials have been updated.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[14px] font-medium flex items-start gap-2.5">
                  <svg className="w-5 h-5 shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#0f172a] uppercase tracking-wider block">New 4-Digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newPin}
                  onChange={(e) => handleNumericInput(e.target.value, setNewPin)}
                  placeholder="••••"
                  maxLength={4}
                  required
                  autoFocus
                  className="w-full h-12 border border-[#e2e8f0] focus:border-[#253b80] focus:ring-1 focus:ring-[#253b80] rounded-xl px-4 text-[18px] font-mono tracking-widest text-center outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#0f172a] uppercase tracking-wider block">Confirm New PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) => handleNumericInput(e.target.value, setConfirmPin)}
                  placeholder="••••"
                  maxLength={4}
                  required
                  className="w-full h-12 border border-[#e2e8f0] focus:border-[#253b80] focus:ring-1 focus:ring-[#253b80] rounded-xl px-4 text-[18px] font-mono tracking-widest text-center outline-none transition-colors"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 h-12 border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569] hover:text-[#0f172a] rounded-full font-bold text-[14px] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newPin.length !== 4 || confirmPin.length !== 4}
                  className="flex-1 h-12 bg-[#253b80] hover:bg-[#1e293b] text-[#ffffff] rounded-full font-bold text-[14px] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Update PIN'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePinModal;
