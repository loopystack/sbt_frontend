/**
 * Withdrawals Page
 * Display user's withdrawal history with status and cancellation
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { withdrawalService, WithdrawalHistoryItem } from '../services/withdrawalService';
import { walletService } from '../services/walletService';
import { toast } from 'react-toastify';

const Withdrawals: React.FC = () => {
  const REQUIRED_CONFIRMATIONS = 2; // On-chain execution default; backend currently defaults to 2
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [withdrawals, setWithdrawals] = useState<WithdrawalHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalHistoryItem | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const pageSize = 20;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    fetchWithdrawals();
  }, [isAuthenticated, navigate, statusFilter, page]);

  // Handle navigation with new withdrawal ID
  useEffect(() => {
    if (location.state?.newWithdrawalId) {
      fetchWithdrawals();
      // Refresh balance after successful withdrawal
      refreshBalance();
    }
  }, [location.state]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await withdrawalService.getWithdrawals(
        statusFilter,
        pageSize,
        (page - 1) * pageSize
      );
      setWithdrawals(response.withdrawals);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load withdrawals');
      toast.error(err.message || 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  // On-chain execution: Poll for status/confirmations while a withdrawal is active (pending/approved/processing).
  // Stops automatically on final statuses and when user navigates away (effect cleanup).
  const pollingEnabled = withdrawals.some(w => ['pending', 'approved', 'processing'].includes((w.status || '').toLowerCase()));
  useEffect(() => {
    if (!pollingEnabled) return;
    const interval = setInterval(() => {
      fetchWithdrawals();
      refreshBalance();
    }, 15000); // 10–30s recommended
    return () => clearInterval(interval);
  }, [pollingEnabled, statusFilter, page]);

  const refreshBalance = async () => {
    try {
      // Balance will be refreshed by components that need it
      await walletService.getCryptoBalance('USDT');
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  };

  const handleCancel = async (withdrawalId: number) => {
    if (!window.confirm('Are you sure you want to cancel this withdrawal? The funds will be returned to your available balance.')) {
      return;
    }

    setCancellingId(withdrawalId);
    try {
      await withdrawalService.cancelWithdrawal(withdrawalId);
      toast.success('Withdrawal cancelled successfully');
      fetchWithdrawals();
      refreshBalance();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel withdrawal');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'processing':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Withdrawal History</h1>
        {pollingEnabled && (
          <span className="text-sm text-gray-500 dark:text-gray-400" data-testid="withdrawals-polling">
            Updating…
          </span>
        )}
        <button
          onClick={() => navigate('/withdraw')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md"
        >
          New Withdrawal
        </button>
      </div>

      {/* Status Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter(undefined)}
            className={`px-4 py-2 rounded-md font-medium ${
              statusFilter === undefined
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-md font-medium ${
              statusFilter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-md font-medium ${
              statusFilter === 'approved'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-md font-medium ${
              statusFilter === 'rejected'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-4 py-2 rounded-md font-medium ${
              statusFilter === 'cancelled'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Cancelled
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`px-4 py-2 rounded-md font-medium ${
              statusFilter === 'processing'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Processing
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-2 rounded-md font-medium ${
              statusFilter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-4 py-2 rounded-md font-medium ${
              statusFilter === 'failed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Withdrawals Table */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading withdrawals...</p>
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No withdrawals found</p>
          <button
            onClick={() => navigate('/withdraw')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md"
          >
            Create Withdrawal
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{withdrawal.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div>
                          <div className="font-medium">{parseFloat(withdrawal.amount_usd).toFixed(2)} USD</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {parseFloat(withdrawal.amount_crypto).toFixed(4)} {withdrawal.asset}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <code className="text-xs">{maskAddress(withdrawal.to_address)}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(withdrawal.status)}`}>
                            {withdrawal.status}
                          </span>
                          {withdrawal.status === 'processing' && typeof withdrawal.confirmations === 'number' && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {withdrawal.confirmations} / {REQUIRED_CONFIRMATIONS} confirmations
                            </div>
                          )}
                          {withdrawal.tx_hash && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              tx: {maskAddress(withdrawal.tx_hash)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(withdrawal.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {withdrawal.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(withdrawal.id)}
                            disabled={cancellingId === withdrawal.id}
                            data-testid={`withdrawal-cancel-${withdrawal.id}`}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          >
                            {cancellingId === withdrawal.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                          data-testid={`withdrawal-details-${withdrawal.id}`}
                          className="ml-4 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
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
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} withdrawals
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= total}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Withdrawal Details</h2>
                <button
                  onClick={() => setSelectedWithdrawal(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">ID</label>
                  <p className="text-lg font-semibold">#{selectedWithdrawal.id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</label>
                  <p className="text-lg">{parseFloat(selectedWithdrawal.amount_usd).toFixed(2)} USD</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {parseFloat(selectedWithdrawal.amount_crypto).toFixed(4)} {selectedWithdrawal.asset}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">To Address</label>
                  <p className="text-sm font-mono break-all">{selectedWithdrawal.to_address}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Network</label>
                  <p className="text-lg">{selectedWithdrawal.network}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedWithdrawal.status)}`}>
                    {selectedWithdrawal.status}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</label>
                  <p className="text-sm">{formatDate(selectedWithdrawal.created_at)}</p>
                </div>

                {selectedWithdrawal.approved_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved At</label>
                    <p className="text-sm">{formatDate(selectedWithdrawal.approved_at)}</p>
                  </div>
                )}

                {selectedWithdrawal.rejected_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejected At</label>
                    <p className="text-sm">{formatDate(selectedWithdrawal.rejected_at)}</p>
                  </div>
                )}

                {selectedWithdrawal.rejection_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejection Reason</label>
                    <p className="text-sm">{selectedWithdrawal.rejection_reason}</p>
                  </div>
                )}

                {selectedWithdrawal.tx_hash && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Transaction Hash</label>
                    <p className="text-sm font-mono break-all">{selectedWithdrawal.tx_hash}</p>
                    <div className="mt-1">
                      <a
                        href={`https://tronscan.org/#/transaction/${selectedWithdrawal.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View on Tronscan
                      </a>
                    </div>
                  </div>
                )}

                {typeof selectedWithdrawal.confirmations === 'number' && (selectedWithdrawal.status === 'processing' || selectedWithdrawal.status === 'completed') && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Confirmations</label>
                    <p className="text-sm">
                      {selectedWithdrawal.confirmations} / {REQUIRED_CONFIRMATIONS}
                    </p>
                  </div>
                )}

                {selectedWithdrawal.failure_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Failure Reason</label>
                    <p className="text-sm text-red-700 dark:text-red-300">{selectedWithdrawal.failure_reason}</p>
                  </div>
                )}

                {selectedWithdrawal.network_fee && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Network Fee</label>
                    <p className="text-sm">{parseFloat(selectedWithdrawal.network_fee).toFixed(4)} {selectedWithdrawal.asset}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setSelectedWithdrawal(null)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md"
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

export default Withdrawals;
