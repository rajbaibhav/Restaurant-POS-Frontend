
import React, { useState } from 'react';
import { login as backendLogin } from '../services/backendApi';

interface AuthProps {
  onLogin: (role: 'owner' | 'staff', token: string) => void;
  staffMembers?: unknown[]; // kept for prop compatibility, not used
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      // Send the fields the backend actually reads: { name, pin }
      const res = await backendLogin(name, pin);
      if (res && res.token) {
        localStorage.setItem('token', res.token);
        // Role comes from the backend response — never trust the UI toggle for access control
        const backendRole: 'owner' | 'staff' = res.role === 'admin' ? 'owner' : 'staff';
        onLogin(backendRole, res.token);
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Login failed.');
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#ffffff] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm">
        
        <div className="mb-10 text-center">
          <h1 className="text-[32px] font-bold text-[#0f172a] tracking-tight leading-tight">Eat & Park</h1>
          <p className="text-[#475569] text-[16px] font-medium mt-2">Sign in to your terminal</p>
        </div>



        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                required
                disabled={isProcessing}
                className="w-full h-14 bg-[#ffffff] border border-[#cbd5e1] rounded-lg px-4 text-[16px] text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-shadow disabled:opacity-50"
              />
            </div>

            <div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN"
                required
                disabled={isProcessing}
                className="w-full h-14 bg-[#ffffff] border border-[#cbd5e1] rounded-lg px-4 text-[16px] text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-shadow disabled:opacity-50"
              />
            </div>

            {error && <p className="text-[#0f172a] text-[14px] font-medium bg-[#f1f5f9] p-3 rounded-lg border border-[#e2e8f0]">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isProcessing || !name || !pin}
            className="w-full h-14 bg-[#253b80] hover:bg-[#0093d5] disabled:opacity-50 text-[#ffffff] rounded-full font-bold text-[16px] transition-colors flex items-center justify-center"
          >
            {isProcessing ? "Verifying..." : "Continue"}
          </button>
        </form>

        <p className="text-center text-[12px] text-[#94a3b8] mt-10">
          Secure terminal access for authorized personnel only.
        </p>
      </div>
    </div>
  );
};

export default Auth;