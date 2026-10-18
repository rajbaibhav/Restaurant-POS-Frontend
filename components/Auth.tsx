
import React, { useState } from 'react';
import { login as backendLogin, register as backendRegister } from '../services/backendApi';

interface AuthProps {
  onLogin: (role: 'owner' | 'staff', token: string) => void;
  staffMembers?: unknown[]; // kept for prop compatibility, not used
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsProcessing(true);
    try {
      const trimmedName = name.trim();
      const trimmedPin = pin.trim();
      const res = await backendLogin(trimmedName, trimmedPin);
      if (res && res.token) {
        localStorage.setItem('token', res.token);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsProcessing(true);
    try {
      const trimmedName = name.trim();
      const trimmedPin = pin.trim();
      const res = await backendRegister(trimmedName, trimmedPin);
      if (res && res.message) {
        setInfo(res.message);
        setMode('login');
        setPin('');
      } else {
        setInfo('Registration completed. Please sign in once your account is approved.');
        setMode('login');
        setPin('');
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Registration failed.');
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



        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setInfo(''); }}
            className={`px-5 py-3 rounded-full font-semibold transition ${mode === 'login' ? 'bg-[#253b80] text-white' : 'bg-[#f1f5f9] text-[#475569]'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setInfo(''); }}
            className={`px-5 py-3 rounded-full font-semibold transition ${mode === 'register' ? 'bg-[#253b80] text-white' : 'bg-[#f1f5f9] text-[#475569]'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-6">
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

            {error && <p className="text-[#d14343] text-[14px] font-medium bg-[#fef2f2] p-3 rounded-lg border border-[#fecaca]">{error}</p>}
            {info && <p className="text-[#0f172a] text-[14px] font-medium bg-[#f1f5f9] p-3 rounded-lg border border-[#e2e8f0]">{info}</p>}
          </div>

          <button
            type="submit"
            disabled={isProcessing || !name || !pin}
            className="w-full h-14 bg-[#253b80] hover:bg-[#0093d5] disabled:opacity-50 text-[#ffffff] rounded-full font-bold text-[16px] transition-colors flex items-center justify-center"
          >
            {isProcessing ? 'Processing...' : mode === 'login' ? 'Continue' : 'Create account'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-[#475569] text-[14px]">
            {mode === 'login'
              ? 'Need an account?'
              : 'Already have an account?'}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setInfo('');
              }}
              className="ml-2 text-[#253b80] font-semibold hover:text-[#0093d5]"
            >
              {mode === 'login' ? 'Register' : 'Login'}
            </button>
          </p>
          {mode === 'register' && (
            <p className="text-[#64748b] text-[12px] mt-2">
              First registered user becomes an admin. Subsequent registrations are sent for admin approval.
            </p>
          )}
        </div>

        <p className="text-center text-[12px] text-[#94a3b8] mt-10">
          Secure terminal access for authorized personnel only.
        </p>
      </div>
    </div>
  );
};

export default Auth;