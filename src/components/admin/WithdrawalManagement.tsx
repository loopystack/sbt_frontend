/**
 * Withdrawal Management Component
 * Admin interface for managing withdrawal requests (approve/reject/execute/retry)
 */
import React, { useState, useEffect } from 'react';
import { getBaseUrl } from '../../config/api';
import { toast } from 'react-toastify';

interface AdminWithdrawalItem {
  id: number;
  user_id: number;
  asset: string;
  network: string;
  amount_crypto: string;
  amount_usd: string;
  to_address: string;
  memo?: string;
  status: string;
  tx_hash?: string;
  confirmations?: number;
  failure_reason?: string;
  processed_at?: string;
  completed_at?: string;
  failed_at?: string;
  network_fee?: string;
  platform_fee: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
}

interface WithdrawalListResponse {
  withdrawals: AdminWithdrawalItem[];
  total: number;
  page: number;
  page_size: number;
}

const WithdrawalManagement: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [userIdFilter, setUserIdFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const pageSize = 20;

  // Action states
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<AdminWithdrawalItem | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter, userIdFilter, dateFrom, dateTo, page]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        skip: ((page - 1) * pageSize).toString(),
        limit: pageSize.toString()
      });
      
      if (statusFilter) {
        params.append('status_filter', statusFilter);
      }
      if (userIdFilter) {
        params.append('user_id', userIdFilter);
      }
      if (dateFrom) {
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }

      const response = await fetch(`${getBaseUrl()}/api/admin/withdrawals?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch withdrawals');
      }

      const data: WithdrawalListResponse = await response.json();
      setWithdrawals(data.withdrawals);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load withdrawals');
      toast.error(err.message || 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawalId: number) => {
    setActionLoading(withdrawalId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getBaseUrl()}/api/admin/withdrawals/${withdrawalId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          admin_notes: adminNotes || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to approve withdrawal');
      }

      toast.success('Withdrawal approved successfully');
      fetchWithdrawals();
      setSelectedWithdrawal(null);
      setAdminNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (withdrawalId: number) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(withdrawalId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getBaseUrl()}/api/admin/withdrawals/${withdrawalId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reject withdrawal');
      }

      toast.success('Withdrawal rejected successfully. Funds have been unlocked.');
      fetchWithdrawals();
      setSelectedWithdrawal(null);
      setRejectionReason('');
      setAdminNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecute = async (withdrawalId: number) => {
    if (!window.confirm('Execute this approved withdrawal on-chain now?')) return;
    setActionLoading(withdrawalId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getBaseUrl()}/api/admin/withdrawals/${withdrawalId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to execute withdrawal');
      }
      const data = await response.json();
      toast.success(`Execution started. tx_hash: ${data.tx_hash || 'n/a'}`);
      fetchWithdrawals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to execute withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (withdrawalId: number) => {
    if (!window.confirm('Retry this failed withdrawal? This will re-lock funds if needed and re-broadcast.')) return;
    setActionLoading(withdrawalId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getBaseUrl()}/api/admin/withdrawals/${withdrawalId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to retry withdrawal');
      }
      const data = await response.json();
      toast.success(`Retry started. tx_hash: ${data.tx_hash || 'n/a'}`);
      fetchWithdrawals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to retry withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'approved':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'processing':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'rejected':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const maskAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Withdrawal Management</h2>
        <p className="text-gray-400">Approve/reject requests and execute/retry approved/failed withdrawals.</p>
      </div>

      {/* Filters */}
      <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 mb-6 border border-purple-500/20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">User ID</label>
            <input
              type="number"
              value={userIdFilter}
              onChange={(e) => {
                setUserIdFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by user ID"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('pending');
                setUserIdFilter('');
                setDateFrom('');
                setDateTo('');
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

      {/* Withdrawals Table */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Loading withdrawals...</p>
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="bg-black/30 backdrop-blur-xl rounded-lg p-8 text-center border border-purple-500/20">
          <p className="text-gray-400">No withdrawals found</p>
        </div>
      ) : (
        <>
          <div className="bg-black/30 backdrop-blur-xl rounded-lg border border-purple-500/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tx / Confirmations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-900/50 divide-y divide-gray-700">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        #{withdrawal.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {withdrawal.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div>
                          <div className="font-medium text-white">
                            {parseFloat(withdrawal.amount_usd).toFixed(2)} USD
                          </div>
                          <div className="text-gray-400 text-xs">
                            {parseFloat(withdrawal.amount_crypto).toFixed(4)} {withdrawal.asset}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <code className="text-xs">{maskAddress(withdrawal.to_address)}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(withdrawal.status)}`}>
                          {withdrawal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {withdrawal.tx_hash ? (
                          <div>
                            <div className="text-xs font-mono">{maskAddress(withdrawal.tx_hash)}</div>
                            {typeof withdrawal.confirmations === 'number' && (
                              <div className="text-xs text-gray-400">{withdrawal.confirmations} conf</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(withdrawal.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {withdrawal.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(withdrawal.id)}
                                disabled={actionLoading === withdrawal.id}
                                data-testid={`admin-withdrawal-approve-${withdrawal.id}`}
                                className="text-green-400 hover:text-green-300 disabled:opacity-50"
                              >
                                {actionLoading === withdrawal.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setRejectionReason('');
                                  setAdminNotes('');
                                }}
                                disabled={actionLoading === withdrawal.id}
                                data-testid={`admin-withdrawal-reject-${withdrawal.id}`}
                                className="text-red-400 hover:text-red-300 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {withdrawal.status === 'approved' && (
                            <button
                              onClick={() => handleExecute(withdrawal.id)}
                              disabled={actionLoading === withdrawal.id}
                              data-testid={`admin-withdrawal-execute-${withdrawal.id}`}
                              className="text-purple-400 hover:text-purple-300 disabled:opacity-50"
                            >
                              {actionLoading === withdrawal.id ? 'Processing...' : 'Execute'}
                            </button>
                          )}
                          {withdrawal.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(withdrawal.id)}
                              disabled={actionLoading === withdrawal.id}
                              data-testid={`admin-withdrawal-retry-${withdrawal.id}`}
                              className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50"
                            >
                              {actionLoading === withdrawal.id ? 'Processing...' : 'Retry'}
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedWithdrawal(withdrawal)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Details
                          </button>
                        </div>
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
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} withdrawals
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

      {/* Reject Modal */}
      {selectedWithdrawal && selectedWithdrawal.status === 'pending' && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-purple-500/20">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Reject Withdrawal #{selectedWithdrawal.id}</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  data-testid="admin-reject-reason"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  placeholder="Enter reason for rejection"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  placeholder="Internal notes"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedWithdrawal(null);
                    setRejectionReason('');
                    setAdminNotes('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedWithdrawal.id)}
                  disabled={!rejectionReason.trim() || actionLoading === selectedWithdrawal.id}
                  data-testid="admin-reject-confirm"
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === selectedWithdrawal.id ? 'Processing...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details/Approve Modal */}
      {selectedWithdrawal && selectedWithdrawal.status !== 'pending' && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Withdrawal Details #{selectedWithdrawal.id}</h3>
                <button
                  onClick={() => setSelectedWithdrawal(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400">User ID</label>
                    <p className="text-white font-medium">{selectedWithdrawal.user_id}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Status</label>
                    <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full border ${getStatusColor(selectedWithdrawal.status)}`}>
                      {selectedWithdrawal.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-gray-400">Amount USD</label>
                    <p className="text-white font-medium">{parseFloat(selectedWithdrawal.amount_usd).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Amount Crypto</label>
                    <p className="text-white font-medium">
                      {parseFloat(selectedWithdrawal.amount_crypto).toFixed(4)} {selectedWithdrawal.asset}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">Network</label>
                    <p className="text-white font-medium">{selectedWithdrawal.network}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Created At</label>
                    <p className="text-white font-medium">{formatDate(selectedWithdrawal.created_at)}</p>
                  </div>
                  {selectedWithdrawal.approved_at && (
                    <div>
                      <label className="text-gray-400">Approved At</label>
                      <p className="text-white font-medium">{formatDate(selectedWithdrawal.approved_at)}</p>
                    </div>
                  )}
                  {selectedWithdrawal.rejected_at && (
                    <div>
                      <label className="text-gray-400">Rejected At</label>
                      <p className="text-white font-medium">{formatDate(selectedWithdrawal.rejected_at)}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-gray-400">To Address</label>
                  <p className="text-white font-mono text-xs break-all">{selectedWithdrawal.to_address}</p>
                </div>

                {selectedWithdrawal.rejection_reason && (
                  <div>
                    <label className="text-gray-400">Rejection Reason</label>
                    <p className="text-white">{selectedWithdrawal.rejection_reason}</p>
                  </div>
                )}

                {selectedWithdrawal.admin_notes && (
                  <div>
                    <label className="text-gray-400">Admin Notes</label>
                    <p className="text-white">{selectedWithdrawal.admin_notes}</p>
                  </div>
                )}

                {selectedWithdrawal.tx_hash && (
                  <div>
                    <label className="text-gray-400">Tx Hash</label>
                    <p className="text-white font-mono text-xs break-all">{selectedWithdrawal.tx_hash}</p>
                    <a
                      href={`https://tronscan.org/#/transaction/${selectedWithdrawal.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      View on Tronscan
                    </a>
                  </div>
                )}

                {typeof selectedWithdrawal.confirmations === 'number' && (
                  <div>
                    <label className="text-gray-400">Confirmations</label>
                    <p className="text-white">{selectedWithdrawal.confirmations}</p>
                  </div>
                )}

                {selectedWithdrawal.failure_reason && (
                  <div>
                    <label className="text-gray-400">Failure Reason</label>
                    <p className="text-red-300">{selectedWithdrawal.failure_reason}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="mt-6 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {selectedWithdrawal && selectedWithdrawal.status === 'pending' && !rejectionReason && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-purple-500/20">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Approve Withdrawal #{selectedWithdrawal.id}</h3>
              
              <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-md">
                <p className="text-sm text-yellow-200">
                  <strong>Note:</strong> This approval does NOT send funds on-chain. Funds remain locked (reserved)
                  until execution is implemented in a future update.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  placeholder="Internal notes"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedWithdrawal(null);
                    setAdminNotes('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApprove(selectedWithdrawal.id)}
                  disabled={actionLoading === selectedWithdrawal.id}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === selectedWithdrawal.id ? 'Processing...' : 'Confirm Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalManagement;
