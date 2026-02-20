/**
 * Reconciliation Reports Component
 * Displays daily reconciliation reports with filtering and details
 */
import React, { useState, useEffect } from 'react';
import { getBaseUrl } from '../../config/api';
import { toast } from 'react-toastify';

interface ReconciliationReport {
  id: number;
  date: string;
  asset: string;
  network: string;
  total_user_available: { [key: string]: any };
  total_user_reserved: { [key: string]: any };
  total_user_liability: { [key: string]: any };
  platform_hot_wallet_balance: { [key: string]: any };
  platform_cold_wallet_balance?: { [key: string]: any };
  platform_total_balance: { [key: string]: any };
  delta: number;
  status: string;
  created_at: string;
  details?: any;
}

interface ReportsResponse {
  reports: ReconciliationReport[];
  total: number;
  offset: number;
  limit: number;
  start_date: string;
  end_date: string;
}

const ReconciliationReports: React.FC = () => {
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [selectedReport, setSelectedReport] = useState<ReconciliationReport | null>(null);
  const pageSize = 20;

  useEffect(() => {
    fetchReports();
  }, [statusFilter, startDate, endDate, page]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString()
      });
      if (statusFilter) params.set('status_filter', statusFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const response = await fetch(`${getBaseUrl()}/api/admin/system/reconciliation?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reconciliation reports');
      }

      const data: ReportsResponse = await response.json();
      setReports(data.reports);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load reconciliation reports');
      toast.error(err.message || 'Failed to load reconciliation reports');
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const response = await fetch(`${getBaseUrl()}/api/admin/system/reconciliation/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to run reconciliation');
      }

      const result = await response.json();
      toast.success(`Reconciliation completed: ${result.status}, delta: $${result.delta.toFixed(2)}`);
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || 'Failed to run reconciliation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ok':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'warn':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'critical':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'error':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (value: any) => {
    if (typeof value === 'object' && value.USDT) {
      return `$${value.USDT.toFixed(2)}`;
    }
    if (typeof value === 'number') {
      return `$${value.toFixed(2)}`;
    }
    return 'N/A';
  };

  const getLatestReport = async () => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const response = await fetch(`${getBaseUrl()}/api/admin/system/reconciliation/latest`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch latest report');
      }

      const report = await response.json();
      if (report) {
        setSelectedReport(report);
      } else {
        toast.info('No reconciliation reports found');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch latest report');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Reconciliation Reports</h2>
            <p className="text-gray-400">Daily reports comparing internal balances vs on-chain platform assets</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={getLatestReport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              View Latest
            </button>
            <button
              onClick={runReconciliation}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Run Reconciliation
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 mb-6 border border-purple-500/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="">All</option>
              <option value="ok">OK</option>
              <option value="warn">Warning</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Reports Table */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Loading reconciliation reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-black/30 backdrop-blur-xl rounded-lg p-8 text-center border border-purple-500/20">
          <p className="text-gray-400">No reconciliation reports found</p>
        </div>
      ) : (
        <>
          <div className="bg-black/30 backdrop-blur-xl rounded-lg border border-purple-500/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      User Liability
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Platform Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Delta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-900/50 divide-y divide-gray-700">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(report.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {report.asset}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(report.total_user_liability)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(report.platform_total_balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={report.delta === 0 ? 'text-green-400' : 'text-yellow-400'}>
                          ${report.delta.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(report.status)}`}>
                          {report.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} reports
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= total}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  Reconciliation Report - {formatDate(selectedReport.date)}
                </h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Asset</div>
                    <div className="text-white font-bold">{selectedReport.asset}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400">User Liability</div>
                    <div className="text-white font-bold">{formatCurrency(selectedReport.total_user_liability)}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Platform Balance</div>
                    <div className="text-white font-bold">{formatCurrency(selectedReport.platform_total_balance)}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Delta</div>
                    <div className={`font-bold ${selectedReport.delta === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                      ${selectedReport.delta.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.toUpperCase()}
                  </span>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">User Balances</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Available:</span>
                        <span className="text-white">{formatCurrency(selectedReport.total_user_available)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Reserved:</span>
                        <span className="text-white">{formatCurrency(selectedReport.total_user_reserved)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-400">Total Liability:</span>
                        <span className="text-white">{formatCurrency(selectedReport.total_user_liability)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Platform Balances</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Hot Wallet:</span>
                        <span className="text-white">{formatCurrency(selectedReport.platform_hot_wallet_balance)}</span>
                      </div>
                      {selectedReport.platform_cold_wallet_balance && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cold Wallet:</span>
                          <span className="text-white">{formatCurrency(selectedReport.platform_cold_wallet_balance)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-400">Total Balance:</span>
                        <span className="text-white">{formatCurrency(selectedReport.platform_total_balance)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                {selectedReport.details && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Additional Details</h4>
                    <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedReport.details, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="text-sm text-gray-400">
                  Report generated: {formatDate(selectedReport.created_at)}
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationReports;