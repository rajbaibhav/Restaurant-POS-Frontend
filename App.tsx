import React, { useState, useMemo, useEffect } from 'react';
import { Table, TableStatus, OrderItem, Transaction, StaffMember, MenuItem } from './types';
import { fetchMenu, fetchTables, fetchTransactions, updateTableOrder as apiUpdateTableOrder, finalizeTransaction as apiFinalizeTransaction, fetchCurrentUser } from './services/backendApi';
import Dashboard from './components/Dashboard';
import OrderModule from './components/OrderModule';
import BillingModule from './components/BillingModule';
import CheckoutMap from './components/CheckoutMap';
import SalesHistory from './components/SalesHistory';
import AdminDashboard from './components/AdminDashboard';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import ChangePinModal from './components/ChangePinModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import BluetoothPrinterModal from './components/BluetoothPrinterModal';
import { bluetoothPrinter, PrinterState } from './services/bluetoothPrinter';


// ── Backend response mappers ─────────────────────────────────────────────────
const mapMenuItem = (m: Record<string, unknown>): MenuItem => ({
  id: String(m._id),
  name: String(m.name),
  price: Number(m.price),
  category: String(m.category),
  image: String(m.image || 'https://via.placeholder.com/150'),
  isVeg: Boolean(m.isVeg),
  status: m.status
    ? (String(m.status) as MenuItem['status'])
    : (m.isAvailable ? 'current' : 'not_selling'),
});

const mapTable = (t: Record<string, unknown>): Table => ({
  id: Number(t.tableId),
  status: String(t.status).toLowerCase() as TableStatus,
  currentOrder: (
    (t.currentOrder as { menuItemId: { _id?: string } | string; quantity: number }[]) || []
  ).map((o) => ({
    menuItemId:
      typeof o.menuItemId === 'object' && o.menuItemId !== null
        ? String((o.menuItemId as { _id?: string })._id || o.menuItemId)
        : String(o.menuItemId),
    quantity: o.quantity,
  })),
});

const mapTransaction = (tx: Record<string, unknown>): Transaction => ({
  id: String(tx.receiptId || tx._id),
  tableId: Number(tx.tableId),
  items: (
    (tx.items as { menuItemId: { _id?: string } | string; quantity: number }[]) || []
  ).map((item) => ({
    menuItemId:
      typeof item.menuItemId === 'object' && item.menuItemId !== null
        ? String((item.menuItemId as { _id?: string })._id || item.menuItemId)
        : String(item.menuItemId),
    quantity: item.quantity,
  })),
  subtotal: Number(tx.subtotal),
  tax: 0,
  serviceCharge: 0,
  total: Number(tx.total),
  timestamp: new Date(String(tx.createdAt)),
  paymentMethod: tx.paymentMethod as Transaction['paymentMethod'],
});
// ─────────────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // GLOBAL MENU STATE
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [view, setView] = useState<'dashboard' | 'order' | 'billing' | 'checkout-map' | 'bill-registry' | 'admin-dashboard'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState<boolean>(false);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState<boolean>(false);
  const [printerState, setPrinterState] = useState<PrinterState>(bluetoothPrinter.getState());

  useEffect(() => {
    const unsub = bluetoothPrinter.subscribe((state) => setPrinterState(state));
    return () => unsub();
  }, []);


  // Restore role on page refresh: if a token already exists in localStorage,
  // validate it against the backend and recover isOwner without requiring a new login
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setIsAuthChecked(true);
      return;
    }

    fetchCurrentUser(savedToken)
      .then(user => {
        setIsOwner(user.role === 'admin');
        setToken(savedToken);
        setIsAuthenticated(true);
        if (user.role === 'admin') setView('admin-dashboard');
      })
      .catch(() => {
        // Token is expired or invalid — clear everything and force re-login
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setToken(null);
      })
      .finally(() => {
        setIsAuthChecked(true);
      });
  }, []);

  const navigateTo = (v: any) => {
    if (v !== 'order' && v !== 'billing') setSelectedTableId(null);
    setView(v);
    setIsSidebarOpen(false);
  };

  const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId) || null, [tables, selectedTableId]);

  const handleLogin = async (role: 'owner' | 'staff', token: string) => {
    setIsOwner(role === 'owner');
    setIsAuthenticated(true);
    setToken(token);
    if (role === 'owner') setView('admin-dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    localStorage.removeItem('token');
    setView('dashboard');
    setSelectedTableId(null);
    setIsSidebarOpen(false);
  };

  const handleTableClick = (id: number, action?: 'order' | 'bill') => {
    const table = tables.find(t => t.id === id);
    if (!table) return;
    setSelectedTableId(id);
    if (action === 'bill') setView('billing');
    else setView('order');
  };

  const updateTableOrder = async (tableId: number, newItems: OrderItem[]) => {
    if (!token) return;
    try {
      await apiUpdateTableOrder(tableId, newItems, token);
      // Refetch tables after update, mapping backend shape to frontend types
      const rawTables = await fetchTables(token);
      setTables((rawTables as Record<string, unknown>[]).map(mapTable));
      setSelectedTableId(null);
      setView('dashboard');
    } catch (err) {
      // Optionally handle error
    }
  };

  const finalizeTransaction = async (transaction: Transaction) => {
    if (!token) return;
    try {
      // Backend only needs tableId + paymentMethod; it recalculates totals securely
      await apiFinalizeTransaction(transaction.tableId, transaction.paymentMethod, token);
      // Refetch tables and transactions after finalizing, mapping backend shapes
      const [rawTables, rawTxs] = await Promise.all([
        fetchTables(token),
        fetchTransactions(token)
      ]);
      setTables((rawTables as Record<string, unknown>[]).map(mapTable));
      setTransactions((rawTxs as Record<string, unknown>[]).map(mapTransaction));
      setSelectedTableId(null);
      setView('bill-registry');
    } catch (err) {
      // Optionally handle error
    }
  };

  // Fetch menu, tables, transactions after login
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
        const [rawMenu, rawTables] = await Promise.all([
          fetchMenu(token),
          fetchTables(token),
        ]);

        setMenuItems((rawMenu as Record<string, unknown>[]).map(mapMenuItem));
        setTables((rawTables as Record<string, unknown>[]).map(mapTable));

        if (isOwner) {
          const rawTxs = await fetchTransactions(token);
          setTransactions((rawTxs as Record<string, unknown>[]).map(mapTransaction));
        } else {
          setTransactions([]);
        }
      } catch (err) {
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };
    if (isAuthenticated && token) fetchData();
  }, [isAuthenticated, token, isOwner]);

  if (!isAuthChecked) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#ffffff] text-[#475569] text-[16px] font-medium">
        Restoring session...
      </div>
    );
  }

  if (!isAuthenticated) return <Auth onLogin={handleLogin} staffMembers={staffMembers} />;

  return (
    // FIX 1: Changed h-screen to h-[100dvh] for proper mobile browser height.
    // Changed bg-slate-50 to bg-[#ffffff] for the Uber-style B2B theme.
    <div className="flex h-[100dvh] w-screen bg-[#ffffff] overflow-hidden relative font-sans">
      <Sidebar
        currentView={view}
        isOwner={isOwner}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        onNavigate={navigateTo}
        onChangePin={() => setIsChangePinModalOpen(true)}
        onOpenBluetooth={() => setIsBluetoothModalOpen(true)}
      />

      {/* FIX 2: Added min-w-0 and min-h-0 to prevent flexbox children from breaking layout boundaries */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">

        {/* Mobile Header */}
        <header className="lg:hidden bg-[#ffffff] border-b border-[#e2e2e2] px-5 py-4 flex items-center justify-between shrink-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-[#efefef] rounded-full text-[#000000] transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="font-bold text-[#000000] text-[18px] tracking-tight">Eat & Park</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBluetoothModalOpen(true)}
              className={`p-2 rounded-full border transition-colors ${
                printerState.isConnected
                  ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#059669]'
                  : 'bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]'
              }`}
              title="Bluetooth Thermal Printer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7l10 10-5 5V2l5 5L7 17" />
              </svg>
            </button>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${isOwner ? 'bg-[#000000] text-[#ffffff]' : 'bg-[#efefef] text-[#000000]'}`}>
              {isOwner ? 'AD' : 'ST'}
            </div>
          </div>
        </header>

        {/* Main Content Area Wrapper */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 min-h-0 overflow-hidden">

          {/* Desktop Header */}
          <header className="hidden lg:flex mb-8 justify-between items-center shrink-0">
            <div>
              <h1 className="text-[32px] font-bold text-[#000000] tracking-tight leading-tight">Eat & Park POS</h1>
              <p className="text-[#4b4b4b] text-[14px] font-medium mt-1">Terminal #01 • {view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')}</p>
            </div>
            <button
              onClick={() => setIsBluetoothModalOpen(true)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border text-[13px] font-semibold transition-all shadow-sm ${
                printerState.isConnected
                  ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0] hover:bg-[#d1fae5]'
                  : 'bg-[#f8fafc] text-[#475569] border-[#e2e8f0] hover:bg-[#f1f5f9]'
              }`}
            >
              <svg className={`w-4 h-4 ${printerState.isConnected ? 'text-[#059669]' : 'text-[#2563eb]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7l10 10-5 5V2l5 5L7 17" />
              </svg>
              <span>{printerState.isConnected ? printerState.deviceName || 'Thermal Printer' : 'Bluetooth Printer'}</span>
              <span className={`w-2 h-2 rounded-full ${printerState.isConnected ? 'bg-[#10b981] animate-pulse' : 'bg-[#94a3b8]'}`}></span>
            </button>
          </header>

          {/* View Routing - isLoading guard prevents race condition where tables render before menu items */}
          <div className="flex-1 min-h-0 relative">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-[#475569] text-[16px] font-medium">Loading...</p>
              </div>
            ) : (
              <>
                {view === 'dashboard' && <div className="h-full overflow-y-auto pr-1"><Dashboard tables={tables} onTableClick={handleTableClick} menuItems={menuItems} /></div>}

                {view === 'checkout-map' && <div className="h-full overflow-y-auto pr-1"><CheckoutMap tables={tables} onSelectTable={(id) => { setSelectedTableId(id); setView('billing'); }} menuItems={menuItems} /></div>}

                {view === 'bill-registry' && <SalesHistory transactions={transactions} menuItems={menuItems} />}

                {view === 'admin-dashboard' && isOwner && (
                  <div className="h-full overflow-y-auto pr-1">
                    <AdminDashboard
                      transactions={transactions}
                      tables={tables}
                      menuItems={menuItems} setMenuItems={setMenuItems}
                    />
                  </div>
                )}

                {view === 'order' && selectedTable && <OrderModule table={selectedTable} onConfirmOrder={(items) => updateTableOrder(selectedTable.id, items)} onGenerateBill={() => { setView('billing'); }} onBack={() => { setSelectedTableId(null); setView('dashboard'); }} menuItems={menuItems} />}

                {view === 'billing' && selectedTable && <div className="h-full overflow-y-auto"><BillingModule table={selectedTable} onFinalize={finalizeTransaction} onBack={() => { setView('dashboard'); }} menuItems={menuItems} /></div>}
              </>
            )}
          </div>
        </main>
      </div>
      <PWAInstallPrompt />
      {isChangePinModalOpen && (
        <ChangePinModal
          token={token || ''}
          onClose={() => setIsChangePinModalOpen(false)}
        />
      )}
      <BluetoothPrinterModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
      />
    </div>
  );
};

export default App;