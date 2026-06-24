import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Table, TableStatus, MenuItem } from '../types';
import SoldItemsLogs from './SoldItemsLogs';
import {
  fetchAllUsers,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  updateMenuItemStatus,
  addMenuItemApi,
} from '../services/backendApi';

interface BackendUser {
  _id: string;
  name: string;
  userId?: string;
  role: string;
  status: 'approved' | 'pending';
}

interface AdminDashboardProps {
  transactions: Transaction[];
  tables: Table[];
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
}

type MenuStatus = 'current' | 'pending' | 'not_selling';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  transactions, tables, menuItems, setMenuItems 
}) => {
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Staff state — fetched from backend
  const [staffMembers, setStaffMembers] = useState<BackendUser[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Admin resetting a staff member's PIN state
  const [resetPinUser, setResetPinUser] = useState<BackendUser | null>(null);
  const [adminNewPin, setAdminNewPin] = useState('');
  const [adminConfirmPin, setAdminConfirmPin] = useState('');
  const [adminResetError, setAdminResetError] = useState<string | null>(null);
  const [adminResetSuccess, setAdminResetSuccess] = useState(false);
  const [isAdminResetSubmitting, setIsAdminResetSubmitting] = useState(false);
  
  const getLocalYMD = (d: Date) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const [filterDate, setFilterDate] = useState(getLocalYMD(new Date()));
  

  const [activeMenuTab, setActiveMenuTab] = useState<MenuStatus>('current');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemIsVeg, setNewItemIsVeg] = useState(true);

  const todayYMD = getLocalYMD(new Date());
  const todayTransactions = transactions.filter(tx => getLocalYMD(tx.timestamp) === todayYMD);
  const totalRevenueToday = todayTransactions.reduce((acc, t) => acc + t.total, 0);
  const activeTablesCount = tables.filter(t => t.status !== TableStatus.AVAILABLE).length;
  
  let totalItemsSoldToday = todayTransactions.reduce((acc, t) => acc + t.items.reduce((sum, item) => sum + item.quantity, 0), 0);
  tables.forEach(t => { totalItemsSoldToday += t.currentOrder.reduce((acc, item) => acc + item.quantity, 0); });

  // Fetch staff when the modal opens
  useEffect(() => {
    if (!isStaffModalOpen) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setIsStaffLoading(true);
    setStaffError(null);
    fetchAllUsers(token)
      .then((users: BackendUser[]) => setStaffMembers(users))
      .catch(() => setStaffError('Failed to load staff. Please try again.'))
      .finally(() => setIsStaffLoading(false));
  }, [isStaffModalOpen]);

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    // Staff creation is handled via /auth/register — not directly from admin panel.
    alert('To add staff, ask them to register via the login screen. Then approve them here.');
  };

  const toggleStaffAccess = async (id: string, currentStatus: 'approved' | 'pending') => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    try {
      await apiUpdateUser(id, { status: newStatus }, token);
      setStaffMembers(prev =>
        prev.map(s => s._id === id ? { ...s, status: newStatus } : s)
      );
    } catch {
      alert('Failed to update staff access.');
    }
  };

  const deleteStaffMember = async (id: string, name: string) => {
    if (!window.confirm(`Delete account for ${name}?`)) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await apiDeleteUser(id, token);
      setStaffMembers(prev => prev.filter(s => s._id !== id));
    } catch {
      alert('Failed to delete staff member.');
    }
  };

  const handleAdminResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinUser) return;
    setAdminResetError(null);

    if (adminNewPin.length !== 4 || adminConfirmPin.length !== 4) {
      setAdminResetError('PIN must be exactly 4 digits.');
      return;
    }

    if (adminNewPin !== adminConfirmPin) {
      setAdminResetError('The PINs do not match.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    setIsAdminResetSubmitting(true);
    try {
      await apiUpdateUser(resetPinUser._id, { newPin: adminNewPin, confirmNewPin: adminConfirmPin }, token);
      setAdminResetSuccess(true);
      setTimeout(() => {
        setResetPinUser(null);
        setAdminNewPin('');
        setAdminConfirmPin('');
        setAdminResetSuccess(false);
      }, 1500);
    } catch (err: any) {
      setAdminResetError(err.message || 'Failed to reset PIN. Please try again.');
    } finally {
      setIsAdminResetSubmitting(false);
    }
  };

  const handleMoveMenu = async (id: string, newStatus: MenuStatus) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await updateMenuItemStatus(id, newStatus, token);
      setMenuItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } catch {
      alert('Failed to update menu item status.');
    }
  };

  const handleAddNewMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice || !newItemCategory) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const formData = new FormData();
    formData.append('name', newItemName);
    formData.append('price', newItemPrice);
    formData.append('category', newItemCategory);
    formData.append('isVeg', String(newItemIsVeg));
    formData.append('status', 'pending');
    formData.append('isAvailable', 'true');
    try {
      const created = await addMenuItemApi(formData, token);
      const newItem: MenuItem = {
        id: created._id,
        name: created.name,
        price: created.price,
        category: created.category,
        isVeg: created.isVeg,
        image: created.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80',
        status: 'pending',
      };
      setMenuItems(prev => [newItem, ...prev]);
      setNewItemName(''); setNewItemPrice(''); setNewItemCategory(''); setNewItemIsVeg(true);
      alert('Added to Pending list!');
    } catch {
      alert('Failed to add menu item. Ensure you are connected to the backend.');
    }
  };

  const pendingMenuItems = menuItems.filter(m => m.status === 'pending');
  const notSellingMenuItems = menuItems.filter(m => m.status === 'not_selling');
  const currentMenuItems = menuItems.filter(m => m.status === 'current');
  const searchedCurrentItems = currentMenuItems.filter(item => item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) || item.category.toLowerCase().includes(menuSearchQuery.toLowerCase()));
  const searchedCategories = Array.from(new Set(searchedCurrentItems.map(m => m.category)));
  const existingAllCategories = Array.from(new Set(menuItems.map(m => m.category)));

  const tableAnalytics = useMemo(() => {
    const isToday = filterDate === todayYMD;
    let dayTotalRevenue = 0;
    const stats = Array.from({ length: 6 }, (_, i) => {
        const tableId = i + 1;
        let collectedRev = 0, liveRev = 0, totalItems = 0;
        const itemsMap: Record<string, number> = {};
        const dayTxs = transactions.filter(tx => tx.tableId === tableId && getLocalYMD(tx.timestamp) === filterDate);
        
        dayTxs.forEach(tx => {
            collectedRev += tx.total; dayTotalRevenue += tx.total;
            tx.items.forEach(item => {
                totalItems += item.quantity;
                const menuInfo = menuItems.find(m => m.id === item.menuItemId);
                itemsMap[menuInfo?.name || 'Unknown'] = (itemsMap[menuInfo?.name || 'Unknown'] || 0) + item.quantity;
            });
        });

        if (isToday) {
            const liveTable = tables.find(t => t.id === tableId);
            if (liveTable && liveTable.currentOrder.length > 0) {
                liveTable.currentOrder.forEach(item => {
                    totalItems += item.quantity;
                    const menuInfo = menuItems.find(m => m.id === item.menuItemId);
                    itemsMap[menuInfo?.name || 'Unknown'] = (itemsMap[menuInfo?.name || 'Unknown'] || 0) + item.quantity;
                    liveRev += (menuInfo?.price || 0) * item.quantity;
                });
            }
        }
        return { tableId, collectedRev, liveRev, totalItems, itemsMap };
    });
    return { stats, dayTotalRevenue };
  }, [filterDate, transactions, tables, todayYMD, menuItems]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      <div className="mb-2">
        <h2 className="text-[32px] font-bold text-[#0f172a] tracking-tight">Admin Portal</h2>
        <p className="text-[#475569] text-[16px] mt-1">Management overview and system configuration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#253b80] rounded-xl p-6 sm:p-8 text-[#ffffff] shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
          <p className="text-[12px] font-bold text-[#f1f5f9] uppercase tracking-wide mb-2">Total Revenue Today</p>
          <p className="text-[36px] font-bold tracking-tight">₹{Math.round(totalRevenueToday)}</p>
        </div>
        <div className="bg-[#ffffff] rounded-xl p-6 sm:p-8 border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wide mb-2">Active Tables</p>
          <p className="text-[36px] font-bold text-[#0f172a] tracking-tight">{activeTablesCount} <span className="text-[20px] text-[#94a3b8]">/ {tables.length}</span></p>
        </div>
        <div className="bg-[#ffffff] rounded-xl p-6 sm:p-8 border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wide mb-2">Items Sold Today</p>
          <p className="text-[36px] font-bold text-[#0f172a] tracking-tight">{totalItemsSoldToday}</p>
        </div>
      </div>

      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-6 sm:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
         <h3 className="text-[20px] font-bold text-[#0f172a] mb-6">Quick Actions</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button onClick={() => setIsTableModalOpen(true)} className="h-14 sm:h-16 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] font-medium transition-colors text-[16px]">
                Orders From Tables
            </button>
            <button onClick={() => setIsMenuModalOpen(true)} className="h-14 sm:h-16 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] font-medium transition-colors text-[16px]">
                Manage Menu
            </button>
            <button onClick={() => setIsStaffModalOpen(true)} className="h-14 sm:h-16 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] font-medium transition-colors text-[16px]">
                Staff Access
            </button>
            <button
              onClick={() => setIsLogsOpen(true)}
              className="h-14 sm:h-16 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] font-medium transition-colors text-[16px]"
            >
                Logs
            </button>
         </div>
      </div>

      {isLogsOpen && (
        <SoldItemsLogs
          transactions={transactions}
          menuItems={menuItems}
          onClose={() => setIsLogsOpen(false)}
        />
      )}

      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a] bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-2xl w-full max-w-6xl h-[90dvh] flex flex-col min-h-0 overflow-hidden shadow-2xl">
            
            <div className="relative p-6 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#ffffff] shrink-0">
               <div className="pr-10 sm:pr-0">
                  <h3 className="text-[24px] font-bold text-[#0f172a] tracking-tight">Menu Configuration</h3>
               </div>
               <button onClick={() => setIsMenuModalOpen(false)} className="absolute top-6 right-6 sm:static shrink-0 w-10 h-10 bg-[#f1f5f9] rounded-full flex items-center justify-center text-[#0f172a] hover:bg-[#e2e8f0] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <div className="pt-2 border-b border-[#e2e8f0] flex w-full shrink-0 px-2 sm:px-6">
                {(['current', 'pending', 'not_selling'] as MenuStatus[]).map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveMenuTab(tab)}
                        className={`flex-1 pb-3 pt-2 font-bold transition-colors border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                            activeMenuTab === tab ? 'border-[#2563eb] text-[#0f172a]' : 'border-transparent text-[#475569] hover:text-[#0f172a]'
                        }`}
                    >
                        <span className="text-[12px] sm:text-[14px]">
                            {tab === 'current' && 'Active'}
                            {tab === 'pending' && 'Pending'}
                            {tab === 'not_selling' && 'Inactive'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeMenuTab === tab ? 'bg-[#253b80] text-[#ffffff]' : 'bg-[#f1f5f9] text-[#475569]'}`}>
                            {menuItems.filter(m => m.status === tab).length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#f1f5f9]">
                {activeMenuTab === 'current' && (
                    <div className="flex flex-col h-full min-h-0">
                        <div className="mb-6 shrink-0">
                            <input 
                                type="text" 
                                placeholder="Search dishes..." 
                                value={menuSearchQuery}
                                onChange={(e) => setMenuSearchQuery(e.target.value)}
                                className="w-full max-w-md h-12 px-4 bg-[#ffffff] border border-[#2563eb] rounded-lg font-medium text-[#0f172a] outline-none focus:ring-1 focus:ring-[#2563eb]"
                            />
                        </div>
                        <div className="space-y-6 flex-1">
                            {searchedCategories.map(category => (
                                <div key={category} className="bg-[#ffffff] p-6 rounded-xl border border-[#e2e8f0]">
                                    <h4 className="text-[20px] font-bold text-[#0f172a] mb-4">{category}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {searchedCurrentItems.filter(m => m.category === category).map(item => (
                                            <div key={item.id} className="p-4 border border-[#e2e8f0] rounded-xl flex flex-col justify-between">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="font-bold text-[#0f172a] text-[16px] flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></span>
                                                            {item.name}
                                                        </p>
                                                        <p className="text-[18px] font-bold text-[#0f172a] mt-1">₹{item.price}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleMoveMenu(item.id, 'pending')} className="flex-1 py-2 bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] rounded-full text-[12px] font-medium transition-colors">Make Pending</button>
                                                    <button onClick={() => handleMoveMenu(item.id, 'not_selling')} className="flex-1 py-2 bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] rounded-full text-[12px] font-medium transition-colors">Stop Selling</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeMenuTab === 'pending' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 bg-[#ffffff] p-6 rounded-xl border border-[#e2e8f0] h-fit">
                            <h4 className="text-[14px] font-bold text-[#0f172a] mb-4">Add Menu Item</h4>
                            <form onSubmit={handleAddNewMenuItem} className="space-y-4">
                                <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} required placeholder="Dish Name" className="w-full h-12 border border-[#e2e8f0] rounded-lg px-4 text-[14px] outline-none focus:border-[#2563eb]"/>
                                <div className="flex gap-4">
                                    <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} required placeholder="Price" className="w-full h-12 border border-[#e2e8f0] rounded-lg px-4 text-[14px] outline-none focus:border-[#2563eb]"/>
                                    <select value={newItemIsVeg ? 'veg' : 'nonveg'} onChange={e => setNewItemIsVeg(e.target.value === 'veg')} className="w-full h-12 border border-[#e2e8f0] rounded-lg px-4 text-[14px] outline-none focus:border-[#2563eb]">
                                        <option value="veg">Veg</option>
                                        <option value="nonveg">Non-Veg</option>
                                    </select>
                                </div>
                                <select value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} required className="w-full h-12 border border-[#e2e8f0] rounded-lg px-4 text-[14px] outline-none focus:border-[#2563eb]">
                                    <option value="">Select Category</option>
                                    <option value="MOMOS">Momos</option>
                                    <option value="NOODLES">Noodles</option>
                                    <option value="PAW BHAJI">Paw Bhaji</option>
                                    <option value="DOSA">Dosa</option>
                                    <option value="UTTAPAM">Uttapam</option>
                                    <option value="BEVERAGES">Beverages</option>
                                    <option value="SHAKE">Shake</option>
                                    <option value="BLOSSOM">Blossom</option>
                                    <option value="LASSI">Lassi</option>
                                    <option value="SOFT MOCKTAILS">Soft Mocktails</option>
                                    <option value="BEVERAGES & SHAKES">Beverages &amp; Shakes</option>
                                    <option value="DESERT">Desert</option>
                                    <option value="SOUP">Soup</option>
                                    <option value="CURDS & RAITA">Curds &amp; Raita</option>
                                    <option value="SALAD">Salad</option>
                                    <option value="PAPAD">Papad</option>
                                    <option value="VEG STARTER">Veg Starter</option>
                                    <option value="NON VEG STARTER">Non Veg Starter</option>
                                    <option value="EAT N PARK SPECIAL">Eat N Park Special</option>
                                    <option value="MAIN COURSE (VEG)">Main Course (Veg)</option>
                                    <option value="DAL">Dal</option>
                                    <option value="OIL FRIED CHICKEN">Oil Fried Chicken</option>
                                    <option value="MAIN COURSE CHICKEN">Main Course Chicken</option>
                                    <option value="MAIN COURSE MUTTON">Main Course Mutton</option>
                                    <option value="ROTI">Roti</option>
                                    <option value="RICE">Rice</option>
                                    <option value="BIRYANI">Biryani</option>
                                    <option value="SEA FOOD">Sea Food</option>
                                    <option value="DESSERT">Dessert</option>
                                </select>
                                <button type="submit" className="w-full h-12 bg-[#253b80] hover:bg-[#0093d5] text-[#ffffff] rounded-full font-bold text-[14px] mt-2 transition-colors">Add to Pending</button>
                            </form>
                        </div>
                        <div className="lg:col-span-2 space-y-4">
                            {pendingMenuItems.length === 0 ? (
                                <p className="text-[#94a3b8] text-[14px] font-medium py-10 text-center">No pending items.</p>
                            ) : (
                                pendingMenuItems.map(item => (
                                    <div key={item.id} className="bg-[#ffffff] p-4 border border-[#e2e8f0] rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <div>
                                            <p className="font-bold text-[#0f172a] text-[16px]">{item.name}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-[14px] font-bold text-[#475569]">₹{item.price}</p>
                                                <p className="text-[12px] font-medium text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-md">{item.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleMoveMenu(item.id, 'current')} className="px-4 py-2 bg-[#253b80] hover:bg-[#0093d5] transition-colors text-[#ffffff] rounded-full text-[12px] font-medium">Publish</button>
                                            <button onClick={() => handleMoveMenu(item.id, 'not_selling')} className="px-4 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors text-[#0f172a] rounded-full text-[12px] font-medium">Drop</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
                {activeMenuTab === 'not_selling' && (
                  <div className="space-y-4">
                    {notSellingMenuItems.length === 0 ? (
                        <p className="text-[#94a3b8] text-[14px] font-medium py-10 text-center">No inactive items.</p>
                    ) : (
                        notSellingMenuItems.map(item => (
                            <div key={item.id} className="bg-[#ffffff] p-4 border border-[#e2e8f0] rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 opacity-75">
                                <div>
                                    <p className="font-bold text-[#475569] line-through text-[16px]">{item.name}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleMoveMenu(item.id, 'current')} className="px-4 py-2 bg-[#253b80] hover:bg-[#0093d5] transition-colors text-[#ffffff] rounded-full text-[12px] font-medium">Republish</button>
                                </div>
                            </div>
                        ))
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* --- STAFF MANAGEMENT MODAL --- */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a] bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-2xl w-full max-w-4xl h-[90dvh] flex flex-col min-h-0 overflow-hidden shadow-2xl">
            
            {/* STANDARDIZED HEADER */}
            <div className="relative p-6 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#ffffff] shrink-0">
               <div className="pr-10 sm:pr-0">
                 <h3 className="text-[24px] font-bold text-[#0f172a] tracking-tight">Staff Management</h3>
               </div>
               <button onClick={() => setIsStaffModalOpen(false)} className="absolute top-6 right-6 sm:static shrink-0 w-10 h-10 bg-[#f1f5f9] rounded-full flex items-center justify-center text-[#0f172a] hover:bg-[#e2e8f0] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

             <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-[#f1f5f9]">
               <div>
                 <h4 className="text-[14px] font-bold text-[#0f172a] mb-4">Active Directory</h4>
                 <div className="space-y-3">
                    {isStaffLoading ? (
                      <p className="text-[14px] font-medium text-[#475569] py-4 text-center">Loading...</p>
                    ) : staffError ? (
                      <p className="text-[14px] font-medium text-[#0f172a] py-4 text-center">{staffError}</p>
                    ) : (
                      staffMembers.map(staff => (
                        <div key={staff._id} className="p-4 border border-[#e2e8f0] rounded-xl flex items-center justify-between bg-[#ffffff]">
                           <div>
                              <p className="font-bold text-[#0f172a] text-[16px]">{staff.name}</p>
                              <p className="text-[12px] text-[#475569] mt-1">Role: {staff.role}</p>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => toggleStaffAccess(staff._id, staff.status)} className={`px-4 py-2 rounded-full text-[12px] font-medium ${staff.status === 'approved' ? 'bg-[#253b80] text-[#ffffff]' : 'bg-[#f1f5f9] text-[#475569]'}`}>
                                  {staff.status === 'approved' ? 'Active' : 'Revoked'}
                               </button>
                               <button 
                                 onClick={() => setResetPinUser(staff)} 
                                 title="Reset PIN"
                                 className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] flex items-center justify-center"
                               >
                                 🔑
                               </button>
                               <button onClick={() => deleteStaffMember(staff._id, staff.name)} className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] flex items-center justify-center">
                                   X
                               </button>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
               </div>
               <div>
                 <div className="bg-[#ffffff] border border-[#e2e8f0] p-6 rounded-xl">
                    <h4 className="text-[14px] font-bold text-[#0f172a] mb-4">Create New Account</h4>
                    <form onSubmit={handleAddStaff} className="space-y-4">
                       <p className="text-[14px] text-[#475569] leading-relaxed">Staff members can self-register from the login screen. Once registered, their account will appear here as <strong>Revoked</strong> until you activate it.</p>
                       <button type="submit" className="w-full h-12 bg-[#253b80] hover:bg-[#0093d5] transition-colors text-[#ffffff] rounded-full font-bold text-[14px]">Got it</button>
                    </form>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TABLE ANALYTICS MODAL --- */}
      {isTableModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a] bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-2xl w-full max-w-6xl h-[90dvh] flex flex-col min-h-0 overflow-hidden shadow-2xl">
            
            {/* STANDARDIZED HEADER */}
            <div className="relative p-6 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#ffffff] shrink-0">
               <div className="pr-10 sm:pr-0">
                  <h3 className="text-[24px] font-bold text-[#0f172a] tracking-tight">Table Insights</h3>
               </div>
               <div className="flex gap-4 items-center">
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} max={todayYMD} className="w-full sm:w-auto h-10 px-4 border border-[#e2e8f0] focus:border-[#2563eb] rounded-lg text-[14px] font-medium outline-none"/>
               </div>
               <button onClick={() => setIsTableModalOpen(false)} className="absolute top-6 right-6 sm:static shrink-0 w-10 h-10 bg-[#f1f5f9] rounded-full flex items-center justify-center text-[#0f172a] hover:bg-[#e2e8f0] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#f1f5f9] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tableAnalytics.stats.map(stat => (
                      <div key={stat.tableId} className="bg-[#ffffff] rounded-xl p-6 border border-[#e2e8f0] flex flex-col">
                          <div className="flex justify-between items-start mb-6">
                              <h4 className="text-[20px] font-bold text-[#0f172a]">Table {stat.tableId}</h4>
                              <p className="text-[20px] font-bold text-[#0f172a]">{stat.totalItems} Items</p>
                          </div>
                          <div className="mb-6 space-y-2">
                              <div className="flex justify-between items-center">
                                  <p className="text-[12px] font-medium text-[#475569] uppercase">Collected</p>
                                  <p className="font-bold text-[16px] text-[#0f172a]">₹{stat.collectedRev}</p>
                              </div>
                              {filterDate === todayYMD && stat.liveRev > 0 && (
                                  <div className="flex justify-between items-center">
                                      <p className="text-[12px] font-medium text-[#475569] uppercase">Pending</p>
                                      <p className="font-bold text-[16px] text-[#0f172a]">₹{stat.liveRev}</p>
                                  </div>
                              )}
                          </div>
                          <div className="flex-1">
                              <p className="text-[12px] font-bold text-[#94a3b8] uppercase border-b border-[#e2e8f0] pb-2 mb-3">Itemized</p>
                              <div className="flex flex-wrap gap-2">
                                  {Object.entries(stat.itemsMap).map(([itemName, qty]) => (
                                      <div key={itemName} className="bg-[#f1f5f9] rounded px-2 py-1 flex items-center gap-2">
                                          <span className="text-[12px] font-medium text-[#0f172a]">{itemName}</span>
                                          <span className="text-[12px] font-bold text-[#475569]">x{qty}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADMIN STAFF RESET PIN MODAL --- */}
      {resetPinUser && (
        <div className="fixed inset-0 bg-[#0f172a] bg-opacity-65 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#ffffff] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#e2e8f0] transform scale-100 transition-all duration-300">
            
            {/* Modal Header */}
            <div className="relative p-6 border-b border-[#e2e8f0] bg-[#ffffff] flex items-center justify-between">
              <div>
                <h3 className="text-[20px] font-bold text-[#0f172a] tracking-tight">Reset Staff PIN</h3>
                <p className="text-[13px] text-[#475569] mt-0.5">Reset security PIN for {resetPinUser.name}</p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setResetPinUser(null);
                  setAdminNewPin('');
                  setAdminConfirmPin('');
                  setAdminResetError(null);
                }} 
                disabled={adminResetSuccess || isAdminResetSubmitting}
                className="w-8 h-8 bg-[#f1f5f9] rounded-full flex items-center justify-center text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a] transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {adminResetSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                  <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center text-green-600 animate-bounce">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-[18px] font-bold text-[#0f172a]">PIN Reset Successful!</h4>
                    <p className="text-[14px] text-[#475569] mt-1">{resetPinUser.name}'s PIN has been updated.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAdminResetPin} className="space-y-5">
                  {adminResetError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[14px] font-medium flex items-start gap-2.5">
                      <svg className="w-5 h-5 shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{adminResetError}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-[#0f172a] uppercase tracking-wider block">New 4-Digit PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={adminNewPin}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '');
                        if (cleaned.length <= 4) setAdminNewPin(cleaned);
                      }}
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
                      value={adminConfirmPin}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '');
                        if (cleaned.length <= 4) setAdminConfirmPin(cleaned);
                      }}
                      placeholder="••••"
                      maxLength={4}
                      required
                      className="w-full h-12 border border-[#e2e8f0] focus:border-[#253b80] focus:ring-1 focus:ring-[#253b80] rounded-xl px-4 text-[18px] font-mono tracking-widest text-center outline-none transition-colors"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setResetPinUser(null);
                        setAdminNewPin('');
                        setAdminConfirmPin('');
                        setAdminResetError(null);
                      }}
                      disabled={isAdminResetSubmitting}
                      className="flex-1 h-12 border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569] hover:text-[#0f172a] rounded-full font-bold text-[14px] transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAdminResetSubmitting || adminNewPin.length !== 4 || adminConfirmPin.length !== 4}
                      className="flex-1 h-12 bg-[#253b80] hover:bg-[#1e293b] text-[#ffffff] rounded-full font-bold text-[14px] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isAdminResetSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Resetting...
                        </>
                      ) : (
                        'Reset PIN'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;