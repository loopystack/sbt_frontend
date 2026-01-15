/**
 * Wallet Balance Display Component
 * Displays available and reserved USDT balance
 */
import React, { useState, useEffect } from 'react';
import { walletService } from '../services/walletService';

interface WalletBalanceDisplayProps {
  asset?: string;
  showLabel?: boolean;
  className?: string;
  refreshTrigger?: number | string; // When this changes, refresh balance
}

const WalletBalanceDisplay: React.FC<WalletBalanceDisplayProps> = ({
  asset = 'USDT',
  showLabel = true,
  className = '',
  refreshTrigger
}) => {
  const [balance, setBalance] = useState<{ available: string; reserved: string; total: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBalance();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [asset, refreshTrigger]); // Refresh when refreshTrigger changes

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const cryptoBalance = await walletService.getCryptoBalance(asset);
      setBalance({
        available: cryptoBalance.available,
        reserved: cryptoBalance.reserved,
        total: cryptoBalance.total
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load balance');
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !balance) {
    return (
      <div className={`${className}`}>
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading balance...</div>
      </div>
    );
  }

  if (error && !balance) {
    return (
      <div className={`${className}`}>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (!balance) return null;

  return (
    <div className={`${className}`}>
      {showLabel && (
        <div className="text-sm font-semibold mb-2">Wallet Balance ({asset})</div>
      )}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Available:</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {parseFloat(balance.available).toFixed(2)} {asset}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Reserved:</span>
          <span className="font-semibold text-yellow-600 dark:text-yellow-400">
            {parseFloat(balance.reserved).toFixed(2)} {asset}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm font-semibold">Total:</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {parseFloat(balance.total).toFixed(2)} {asset}
          </span>
        </div>
      </div>
      <button
        onClick={fetchBalance}
        className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        Refresh
      </button>
    </div>
  );
};

export default WalletBalanceDisplay;
