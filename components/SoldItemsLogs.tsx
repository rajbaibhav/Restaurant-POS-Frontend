import React, { useMemo, useState } from 'react';
import { MenuItem, Transaction } from '../types';

interface SoldItemsLogsProps {
  transactions: Transaction[];
  menuItems: MenuItem[];
  onClose: () => void;
}

type View = 'dates' | 'day' | 'bills';

const RETENTION_DAYS = 30;

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

const getItemLine = (menuItemId: string, quantity: number, menuItems: MenuItem[]) => {
  const menu = menuItems.find((m) => m.id === menuItemId);
  const name = menu?.name || 'Unknown Item';
  const price = menu?.price || 0;
  const lineTotal = price * quantity;
  return { name, quantity, price, lineTotal };
};

const SoldItemsLogs: React.FC<SoldItemsLogsProps> = ({ transactions, menuItems, onClose }) => {
  const [view, setView] = useState<View>('dates');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  const availableDates = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const byDate: Record<string, { revenue: number; bills: number; items: number }> = {};

    transactions.forEach((tx) => {
      const ymd = getLocalYMD(tx.timestamp);
      const txDate = new Date(tx.timestamp);
      if (txDate < cutoff) return;

      if (!byDate[ymd]) {
        byDate[ymd] = { revenue: 0, bills: 0, items: 0 };
      }
      byDate[ymd].revenue += tx.total;
      byDate[ymd].bills += 1;
      byDate[ymd].items += tx.items.reduce((sum, i) => sum + i.quantity, 0);
    });

    return Object.entries(byDate)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  const dayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return transactions.filter((tx) => getLocalYMD(tx.timestamp) === selectedDate);
  }, [selectedDate, transactions]);

  const daySummary = useMemo(() => {
    return {
      totalSales: dayTransactions.reduce((sum, tx) => sum + tx.total, 0),
      totalItems: dayTransactions.reduce(
        (sum, tx) => sum + tx.items.reduce((acc, item) => acc + item.quantity, 0),
        0
      ),
      totalBills: dayTransactions.length,
    };
  }, [dayTransactions]);

  const tableStats = useMemo(() => {
    if (!selectedDate) return [];

    const tableIds = Array.from(new Set(dayTransactions.map((tx) => tx.tableId))).sort(
      (a: number, b: number) => a - b
    );

    return tableIds.map((tableId) => {
      const tableTxs = dayTransactions.filter((tx) => tx.tableId === tableId);
      let totalSales = 0;
      let totalItems = 0;

      tableTxs.forEach((tx) => {
        totalSales += tx.total;
        totalItems += tx.items.reduce((sum, item) => sum + item.quantity, 0);
      });

      return {
        tableId,
        totalSales,
        totalItems,
        totalBills: tableTxs.length,
        bills: tableTxs,
      };
    });
  }, [selectedDate, dayTransactions]);

  const selectedTableBills = useMemo(() => {
    if (selectedTableId === null) return [];
    const stat = tableStats.find((t) => t.tableId === selectedTableId);
    return stat?.bills.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) || [];
  }, [tableStats, selectedTableId]);

  const openDate = (date: string) => {
    setSelectedDate(date);
    setSelectedTableId(null);
    setView('day');
  };

  const openTable = (tableId: number) => {
    setSelectedTableId(tableId);
    setView('bills');
  };

  const goBack = () => {
    if (view === 'bills') {
      setSelectedTableId(null);
      setView('day');
    } else if (view === 'day') {
      setSelectedDate(null);
      setView('dates');
    }
  };

  const headerSubtitle =
    view === 'dates'
      ? 'Select a date to view table-wise sales (retained for 30 days on server).'
      : view === 'day' && selectedDate
        ? formatDisplayDate(selectedDate)
        : selectedDate && selectedTableId !== null
          ? `${formatDisplayDate(selectedDate)} • Table ${selectedTableId}`
          : '';

  return (
    <div className="fixed inset-0 bg-[#0f172a] bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#ffffff] rounded-2xl w-full max-w-6xl h-[90dvh] flex flex-col min-h-0 overflow-hidden shadow-2xl">
        <div className="relative p-6 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#ffffff] shrink-0">
          <div className="pr-10 sm:pr-0 flex items-start gap-3">
            {view !== 'dates' && (
              <button
                onClick={goBack}
                className="shrink-0 w-10 h-10 bg-[#f1f5f9] rounded-full flex items-center justify-center text-[#0f172a] hover:bg-[#e2e8f0] transition-colors mt-0.5"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h3 className="text-[24px] font-bold text-[#0f172a] tracking-tight">Sold Items Logs</h3>
              <p className="text-[14px] text-[#475569] mt-1">{headerSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 sm:static shrink-0 w-10 h-10 bg-[#f1f5f9] rounded-full flex items-center justify-center text-[#0f172a] hover:bg-[#e2e8f0] transition-colors"
            aria-label="Close logs"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Level 2: day summary (only on day view) */}
        {view === 'day' && selectedDate && (
          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-[#e2e8f0] shrink-0 bg-[#f8fafc]">
            <div className="bg-[#ffffff] rounded-lg p-4 border border-[#e2e8f0]">
              <p className="text-[12px] font-bold text-[#94a3b8] uppercase">Day Revenue</p>
              <p className="text-[22px] font-bold text-[#0f172a]">₹{Math.round(daySummary.totalSales)}</p>
            </div>
            <div className="bg-[#ffffff] rounded-lg p-4 border border-[#e2e8f0]">
              <p className="text-[12px] font-bold text-[#94a3b8] uppercase">Items Sold</p>
              <p className="text-[22px] font-bold text-[#0f172a]">{daySummary.totalItems}</p>
            </div>
            <div className="bg-[#253b80] rounded-lg p-4">
              <p className="text-[12px] font-bold text-[#f1f5f9] uppercase">Bills</p>
              <p className="text-[22px] font-bold text-[#ffffff]">{daySummary.totalBills}</p>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#f1f5f9] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {/* Level 1: date list */}
          {view === 'dates' && (
            <>
              {availableDates.length === 0 ? (
                <div className="bg-[#ffffff] rounded-xl p-12 text-center border border-[#e2e8f0]">
                  <h4 className="text-[18px] font-bold text-[#0f172a]">No sales logs yet</h4>
                  <p className="text-[#475569] text-[14px] mt-2">
                    Complete checkouts to see dates here (last {RETENTION_DAYS} days).
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl">
                  {availableDates.map((row) => (
                    <button
                      key={row.date}
                      type="button"
                      onClick={() => openDate(row.date)}
                      className="w-full bg-[#ffffff] rounded-xl p-5 border border-[#e2e8f0] flex items-center justify-between hover:border-[#2563eb] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all text-left group"
                    >
                      <div>
                        <p className="text-[18px] font-bold text-[#0f172a] group-hover:text-[#253b80]">
                          {formatDisplayDate(row.date)}
                        </p>
                        <p className="text-[13px] text-[#475569] mt-1">
                          {row.bills} bill{row.bills !== 1 ? 's' : ''} • {row.items} items
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-[20px] font-bold text-[#0f172a]">₹{Math.round(row.revenue)}</p>
                        <svg
                          className="w-5 h-5 text-[#94a3b8] group-hover:text-[#253b80]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Level 2: table cards for selected date */}
          {view === 'day' && selectedDate && (
            <>
              {daySummary.totalBills === 0 ? (
                <div className="bg-[#ffffff] rounded-xl p-12 text-center border border-[#e2e8f0]">
                  <h4 className="text-[18px] font-bold text-[#0f172a]">No sales on this date</h4>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tableStats.map((stat) => (
                    <button
                      key={stat.tableId}
                      type="button"
                      onClick={() => openTable(stat.tableId)}
                      className="bg-[#ffffff] rounded-xl p-6 border border-[#e2e8f0] flex flex-col text-left hover:border-[#2563eb] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all group"
                    >
                      <div className="flex justify-between items-start mb-6 w-full">
                        <h4 className="text-[20px] font-bold text-[#0f172a] group-hover:text-[#253b80]">
                          Table {stat.tableId}
                        </h4>
                        <p className="text-[20px] font-bold text-[#0f172a]">{stat.totalItems} Items</p>
                      </div>
                      <div className="space-y-2 w-full mb-4">
                        <div className="flex justify-between items-center">
                          <p className="text-[12px] font-medium text-[#475569] uppercase">Collected</p>
                          <p className="font-bold text-[16px] text-[#0f172a]">₹{Math.round(stat.totalSales)}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[12px] font-medium text-[#475569] uppercase">Bills</p>
                          <p className="font-bold text-[16px] text-[#0f172a]">{stat.totalBills}</p>
                        </div>
                      </div>
                      <p className="text-[13px] font-medium text-[#2563eb] mt-auto">
                        View bill-wise details →
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Level 3: bill-wise line items */}
          {view === 'bills' && selectedTableId !== null && (
            <div className="space-y-4 max-w-3xl">
              {selectedTableBills.length === 0 ? (
                <div className="bg-[#ffffff] rounded-xl p-12 text-center border border-[#e2e8f0]">
                  <h4 className="text-[18px] font-bold text-[#0f172a]">No bills for this table</h4>
                </div>
              ) : (
                selectedTableBills.map((bill, index) => {
                  const lines = bill.items.map((item) =>
                    getItemLine(item.menuItemId, item.quantity, menuItems)
                  );

                  return (
                    <div
                      key={bill.id}
                      className="bg-[#ffffff] rounded-xl border border-[#e2e8f0] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
                    >
                      <div className="px-5 py-4 border-b border-[#f1f5f9] flex justify-between items-start gap-4 bg-[#f8fafc]">
                        <div>
                          <p className="text-[12px] font-bold text-[#94a3b8] uppercase">
                            Bill {selectedTableBills.length - index} • INV #{bill.id}
                          </p>
                          <p className="text-[16px] font-bold text-[#0f172a] mt-1">
                            Table {bill.tableId}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="bg-[#f1f5f9] text-[#0f172a] text-[12px] font-bold px-3 py-1 rounded-full uppercase">
                            {bill.paymentMethod}
                          </span>
                          <p className="text-[12px] font-medium text-[#475569] mt-2">
                            {bill.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <ul className="divide-y divide-[#f1f5f9] px-5">
                        {lines.map((line, idx) => (
                          <li
                            key={idx}
                            className="py-3 flex justify-between items-center gap-4"
                          >
                            <div className="min-w-0">
                              <p className="text-[15px] font-medium text-[#0f172a]">
                                <span className="font-bold">{line.quantity}</span>
                                {' × '}
                                {line.name}
                              </p>
                              <p className="text-[12px] text-[#94a3b8] mt-0.5">
                                @ ₹{line.price} each
                              </p>
                            </div>
                            <p className="text-[15px] font-bold text-[#0f172a] shrink-0">
                              ₹{Math.round(line.lineTotal)}
                            </p>
                          </li>
                        ))}
                      </ul>

                      <div className="px-5 py-4 bg-[#f8fafc] border-t border-[#e2e8f0] flex justify-between items-center">
                        <span className="text-[12px] font-bold text-[#475569] uppercase tracking-wide">
                          Bill Total
                        </span>
                        <p className="text-[22px] font-bold text-[#0f172a]">₹{Math.round(bill.total)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoldItemsLogs;
