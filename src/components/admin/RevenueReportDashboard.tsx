/**
 * Revenue Report Dashboard (GGR/NGR + cashflow)
 * Displays daily ledger-based revenue and on-chain cashflow; allows running the report for a date.
 */
import React, { useState, useEffect } from 'react';
import { getBaseUrl } from '../../config/api';
import { toast } from 'react-toastify';

interface DailyRevenueReport {
  id: number;
  report_date: string;
  asset: string;
  total_staked: number;
  losing_stakes: number;
  winning_profit_paid: number;
  ggr: number;
  bonuses: number;
  fees: number;
  ngr: number;
  total_deposited_onchain: number;
  total_withdrawn_onchain: number;
  net_inflow: number;
  created_at: string | null;
}

interface Summary {
  total_staked: number;
  losing_stakes: number;
  winning_profit_paid: number;
  ggr: number;
  ngr: number;
  total_deposited_onchain: number;
  total_withdrawn_onchain: number;
  net_inflow: number;
  from_date: string;
  to_date: string;
  asset: string;
}

const defaultFromDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};
const defaultToDate = () => new Date().toISOString().slice(0, 10);

const RevenueReportDashboard: React.FC = () => {
  const [reports, setReports] = useState<DailyRevenueReport[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [runDate, setRunDate] = useState('');
  const [running, setRunning] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        asset: 'USDT',
        limit: '90',
        offset: '0',
      });
      const res = await fetch(`${getBaseUrl()}/api/admin/system/revenue-report/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch revenue reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load reports');
      toast.error(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        asset: 'USDT',
      });
      const res = await fetch(`${getBaseUrl()}/api/admin/system/revenue-report/summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSummary(data);
    } catch {
      setSummary(null);
    }
  };

  useEffect(() => {
    if (fromDate && toDate) {
      fetchList();
      fetchSummary();
    }
  }, [fromDate, toDate]);

  const runReport = async () => {
    const dateToRun = runDate || undefined;
    setRunning(true);
    try {
      const token = localStorage.getItem('token');
      const params = dateToRun ? `?date=${dateToRun}` : '';
      const res = await fetch(`${getBaseUrl()}/api/admin/system/revenue-report/run${params}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to run revenue report');
      const data = await res.json();
      toast.success(data.message || 'Report computed and stored');
      setRunDate('');
      fetchList();
      fetchSummary();
    } catch (e: any) {
      toast.error(e.message || 'Failed to run report');
    } finally {
      setRunning(false);
    }
  };

  const formatMoney = (n: number) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const formatDate = (s: string) => new Date(s).toLocaleDateString();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Revenue Report (GGR / NGR & Cashflow)</h2>
        <p className="text-gray-400">
          Daily betting performance (stakes, GGR, NGR) and on-chain cashflow from the ledger. Run the job to compute for a date.
        </p>
      </div>

      {/* Run report */}
      <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 mb-6 border border-purple-500/20">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Compute report for date (optional)</label>
            <input
              type="date"
              value={runDate}
              onChange={(e) => setRunDate(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>
          <button
            onClick={runReport}
            disabled={running}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-md transition-colors"
          >
            {running ? 'Running…' : 'Run report (default: yesterday)'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 mb-6 border border-purple-500/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">From date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">To date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 border border-purple-500/20">
            <p className="text-gray-400 text-sm">GGR (period)</p>
            <p className="text-xl font-bold text-white">{formatMoney(summary.ggr)} USDT</p>
          </div>
          <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 border border-purple-500/20">
            <p className="text-gray-400 text-sm">NGR (period)</p>
            <p className="text-xl font-bold text-white">{formatMoney(summary.ngr)} USDT</p>
          </div>
          <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 border border-purple-500/20">
            <p className="text-gray-400 text-sm">Deposits (on-chain)</p>
            <p className="text-xl font-bold text-green-400">{formatMoney(summary.total_deposited_onchain)} USDT</p>
          </div>
          <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 border border-purple-500/20">
            <p className="text-gray-400 text-sm">Withdrawals (on-chain)</p>
            <p className="text-xl font-bold text-amber-400">{formatMoney(summary.total_withdrawn_onchain)} USDT</p>
          </div>
        </div>
      )}
      {summary && (
        <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 mb-6 border border-purple-500/20">
          <p className="text-gray-400 text-sm">Net inflow (period)</p>
          <p className={`text-xl font-bold ${summary.net_inflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatMoney(summary.net_inflow)} USDT
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.from_date} → {summary.to_date}
          </p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading revenue reports…</div>
      ) : reports.length === 0 ? (
        <div className="bg-black/30 backdrop-blur-xl rounded-lg p-8 text-center border border-purple-500/20">
          <p className="text-gray-400">No revenue reports in this range. Run the report for a date to populate.</p>
        </div>
      ) : (
        <div className="bg-black/30 backdrop-blur-xl rounded-lg border border-purple-500/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Staked</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Losing stakes</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Win profit paid</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">GGR</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">NGR</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Deposits</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Withdrawals</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Net inflow</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900/50 divide-y divide-gray-700">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(r.report_date)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">{formatMoney(r.total_staked)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">{formatMoney(r.losing_stakes)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">{formatMoney(r.winning_profit_paid)}</td>
                    <td className="px-4 py-3 text-sm text-right text-white font-medium">{formatMoney(r.ggr)}</td>
                    <td className="px-4 py-3 text-sm text-right text-white font-medium">{formatMoney(r.ngr)}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-400">{formatMoney(r.total_deposited_onchain)}</td>
                    <td className="px-4 py-3 text-sm text-right text-amber-400">{formatMoney(r.total_withdrawn_onchain)}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${r.net_inflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatMoney(r.net_inflow)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueReportDashboard;
