import React from 'react';

interface SidebarProps {
  currentView: string;
  isOwner: boolean;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onNavigate: (view: 'dashboard' | 'order' | 'billing' | 'checkout-map' | 'bill-registry' | 'admin-dashboard') => void;
  onChangePin: () => void;
  onOpenBluetooth?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, isOwner, isOpen, onClose, onLogout, onNavigate, onChangePin, onOpenBluetooth }) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-[#0f172a] bg-opacity-40 z-40 lg:hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      <aside className={`fixed lg:sticky top-0 left-0 h-[100dvh] w-[280px] bg-[#ffffff] text-[#0f172a] flex flex-col z-50 transition-transform duration-200 transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} border-r border-[#e2e8f0]`}>
        
        <div className="h-20 flex items-center justify-between px-6 shrink-0">
          <span className="font-bold text-[24px] tracking-tight text-[#0f172a]">Eat & Park</span>
          <button onClick={onClose} className="lg:hidden p-2 text-[#0f172a] rounded-full hover:bg-[#f1f5f9]">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <nav className="flex-1 min-h-0 py-4 px-4 space-y-1 overflow-y-auto">
          <button onClick={() => onNavigate('dashboard')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-full transition-colors text-[16px] font-medium ${currentView === 'dashboard' ? 'bg-[#253b80] text-[#ffffff]' : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'}`}>
            Floor Plan
          </button>

          <div className="pt-6 pb-2 px-5 text-[12px] font-bold text-[#94a3b8] uppercase tracking-wide">Operations</div>
          <button disabled={currentView !== 'order'} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-full text-[16px] font-medium ${currentView === 'order' ? 'bg-[#253b80] text-[#ffffff]' : 'text-[#94a3b8] cursor-not-allowed'}`}>
            Active Order
          </button>

          <button onClick={() => onNavigate('checkout-map')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-full transition-colors text-[16px] font-medium ${currentView === 'checkout-map' || currentView === 'billing' ? 'bg-[#253b80] text-[#ffffff]' : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'}`}>
            Checkout
          </button>

          <button onClick={() => onNavigate('bill-registry')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-full transition-colors text-[16px] font-medium ${currentView === 'bill-registry' ? 'bg-[#253b80] text-[#ffffff]' : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'}`}>
            Registry
          </button>

          {onOpenBluetooth && (
            <button 
              onClick={onOpenBluetooth} 
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-full transition-colors text-[16px] font-medium text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7l10 10-5 5V2l5 5L7 17" />
                </svg>
                <span>BT Printer</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#2563eb]">80mm</span>
            </button>
          )}

          {isOwner && (
            <>
              <div className="pt-6 pb-2 px-5 text-[12px] font-bold text-[#94a3b8] uppercase tracking-wide">Management</div>
              <button onClick={() => onNavigate('admin-dashboard')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-full transition-colors text-[16px] font-medium ${currentView === 'admin-dashboard' ? 'bg-[#253b80] text-[#ffffff]' : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'}`}>
                Admin Portal
              </button>
            </>
          )}
        </nav>

        <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-[#0f172a] text-[#ffffff] shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#ffffff] flex items-center justify-center text-[14px] font-bold text-[#0f172a]">
              {isOwner ? 'AD' : 'ST'}
            </div>
            <div>
              <p className="text-[16px] font-bold leading-tight">{isOwner ? 'Admin' : 'Staff'}</p>
              <p className="text-[14px] text-[#94a3b8]">Active Session</p>
            </div>
          </div>
          <button onClick={onChangePin} className="w-full flex items-center justify-center gap-2 py-2 mb-3 bg-[#1e293b] text-[#ffffff] hover:bg-[#334155] border border-[#334155] rounded-full font-semibold text-[14px] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Change PIN
          </button>
          <button onClick={onLogout} className="w-full flex items-center justify-center py-3 bg-[#ffffff] text-[#0f172a] hover:bg-[#e2e8f0] rounded-full font-bold text-[16px] transition-colors">
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;