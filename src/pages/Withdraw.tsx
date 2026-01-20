/**
 * Withdraw Page
 * User interface for requesting withdrawals (USDT TRC20 only in initial implementation)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { withdrawalService, WithdrawalIntentCreate } from '../services/withdrawalService';
import { walletService } from '../services/walletService';
import { toast } from 'react-toastify';

const Withdraw: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [amountUsdt, setAmountUsdt] = useState<string>('');
  const [toAddress, setToAddress] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Balance state
  const [availableBalance, setAvailableBalance] = useState<string>('0');
  const [reservedBalance, setReservedBalance] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    fetchBalance();
  }, [isAuthenticated, navigate]);

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const balance = await walletService.getCryptoBalance('USDT');
      setAvailableBalance(balance.available);
      setReservedBalance(balance.reserved);
    } catch (err: any) {
      console.error('Failed to fetch balance:', err);
      toast.error('Failed to load balance');
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Client-side validation
    const amount = parseFloat(amountUsdt);
    if (!amount || amount <= 0) {
      setError('Amount must be greater than 0');
      setLoading(false);
      return;
    }

    if (parseFloat(availableBalance) < amount) {
      setError(`Insufficient balance. Available: ${availableBalance} USDT`);
      setLoading(false);
      return;
    }

    if (!toAddress.trim()) {
      setError('Please enter a valid wallet address');
      setLoading(false);
      return;
    }

    // Initial implementation: TRC20 only, USDT only
    const withdrawalData: WithdrawalIntentCreate = {
      asset: 'USDT',
      network: 'TRC20',
      amount_crypto: amountUsdt,
      to_address: toAddress.trim(),
      memo: memo.trim() || undefined,
      // Generate client_request_id for idempotency (optional but recommended)
      client_request_id: `withdraw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    try {
      const result = await withdrawalService.initiateWithdrawal(withdrawalData);
      toast.success('Withdrawal request submitted successfully!');
      
      // Refresh balance to show updated available/reserved
      await fetchBalance();
      
      // Navigate to withdrawal history
      navigate('/withdrawals', { state: { newWithdrawalId: result.id } });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit withdrawal request';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Withdraw Funds</h1>

      {/* Balance Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your USDT Balance</h2>
        {loadingBalance ? (
          <p className="text-gray-600 dark:text-gray-400">Loading balance...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {parseFloat(availableBalance).toFixed(2)} USDT
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Reserved</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {parseFloat(reservedBalance).toFixed(2)} USDT
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="asset" className="block text-sm font-medium mb-2">
              Asset (USDT only in initial implementation)
            </label>
            <input
              type="text"
              id="asset"
              value="USDT"
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="network" className="block text-sm font-medium mb-2">
              Network (TRC20 only in initial implementation)
            </label>
            <input
              type="text"
              id="network"
              value="TRC20"
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium mb-2">
              Amount (USDT)
            </label>
            <input
              type="number"
              id="amount"
              data-testid="withdraw-amount"
              step="0.01"
              min="0.01"
              value={amountUsdt}
              onChange={(e) => setAmountUsdt(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter amount in USDT"
            />
            <p className="text-sm text-gray-500 mt-1">
              Available: {parseFloat(availableBalance).toFixed(2)} USDT
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="address" className="block text-sm font-medium mb-2">
              Wallet Address (TRC20)
            </label>
            <input
              type="text"
              id="address"
              data-testid="withdraw-address"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter your TRC20 wallet address"
            />
            <p className="text-sm text-gray-500 mt-1">
              Ensure this is a valid TRC20 (TRON) USDT address
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="memo" className="block text-sm font-medium mb-2">
              Memo (Optional)
            </label>
            <input
              type="text"
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Memo/tag if required"
            />
            <p className="text-sm text-gray-500 mt-1">
              Not required for TRC20 USDT withdrawals
            </p>
          </div>

          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Network fees apply. Funds will be locked (moved to reserved)
              until the withdrawal is processed. You can cancel pending withdrawals from your history.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || loadingBalance}
            data-testid="withdraw-submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Withdrawal Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Withdraw;
