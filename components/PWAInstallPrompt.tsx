import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // 1. Detect if already installed / running as standalone app
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore
      Boolean(window.navigator.standalone);

    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      return;
    }

    // 2. Check if user already dismissed in this session
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // 4. Capture native install prompt (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Track network online/offline state
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <>
      {/* Offline Status Indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white text-xs sm:text-sm font-semibold py-2 px-4 text-center shadow-lg flex items-center justify-center gap-2 animate-fade-in">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-12.728a5 5 0 017.072 0m0 0l2.829 2.829" />
          </svg>
          <span>You are currently offline. Running in cached offline mode.</span>
        </div>
      )}

      {/* In-App PWA Install Banner */}
      {showPrompt && !isStandalone && (
        <div className="fixed bottom-5 right-5 left-5 sm:left-auto sm:w-96 z-50 bg-[#0f172a] text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 animate-fade-in flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#253b80] flex items-center justify-center shrink-0 shadow-md">
              <span className="font-black text-xl text-white">E</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm text-white">Install Eat & Park App</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Add to your home screen or desktop for fast full-screen ordering and offline reliability.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
            <button
              onClick={handleDismiss}
              className="text-xs font-semibold px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
            >
              Not now
            </button>
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="bg-[#253b80] hover:bg-[#1e2f65] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
              >
                Install App
              </button>
            )}
            {isIOS && !deferredPrompt && (
              <span className="text-[11px] text-amber-300 font-medium">
                Tap Share <span className="font-bold">⎋</span> &amp; &apos;Add to Home Screen&apos;
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;
