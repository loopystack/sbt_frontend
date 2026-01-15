/**
 * Bet Modal Component
 * Modal for placing bets using internal USDT wallet
 */
import React, { useState, useEffect } from 'react';
import { betService, BetPlaceRequest } from '../services/betService';
import { walletService } from '../services/walletService';
import { toast } from 'react-toastify';

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: number;
  marketKey: string;
  selectionKey: string;
  oddsDecimal: number;
  matchHomeTeam?: string;
  matchAwayTeam?: string;
  onBetPlaced?: () => void;
}

const BetModal: React.FC<BetModalProps> = ({
  isOpen,
  onClose,
  matchId,
  marketKey,
  selectionKey,
  oddsDecimal,
  matchHomeTeam,
  matchAwayTeam,
  onBetPlaced
}) => {
  const [stake, setStake] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<{ available: string; reserved: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchBalance();
    }
  }, [isOpen]);

  const fetchBalance = async () => {
    try {
      const cryptoBalance = await walletService.getCryptoBalance('USDT');
      setBalance({
        available: cryptoBalance.available,
        reserved: cryptoBalance.reserved
      });
    } catch (err: any) {
      console.error('Failed to fetch balance:', err);
    }
  };

  const calculateProfit = (stakeAmount: number): number => {
    return stakeAmount * (oddsDecimal - 1);
  };

  const calculatePayout = (stakeAmount: number): number => {
    return stakeAmount * oddsDecimal;
  };

  const handlePlaceBet = async () => {
    setError('');
    
    const stakeAmount = parseFloat(stake);
    
    if (!stake || isNaN(stakeAmount) || stakeAmount <= 0) {
      setError('Please enter a valid stake amount');
      return;
    }

    if (stakeAmount < 1) {
      setError('Minimum stake is 1.00 USDT');
      return;
    }

    if (stakeAmount > 10000) {
      setError('Maximum stake is 10,000.00 USDT');
      return;
    }

    if (balance && parseFloat(balance.available) < stakeAmount) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);

    try {
      const request: BetPlaceRequest = {
        match_id: matchId,
        market_key: marketKey,
        selection_key: selectionKey,
        odds_decimal: oddsDecimal,
        stake: stakeAmount,
        currency: 'USDT'
      };

      const bet = await betService.placeBet(request);
      
      toast.success(`Bet placed successfully! Bet ID: ${bet.id}`);
      setStake('');
      
      // Refresh balance immediately after placing bet
      await fetchBalance();
      
      onBetPlaced?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to place bet');
      toast.error(err.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const stakeAmount = parseFloat(stake) || 0;
  const profit = calculateProfit(stakeAmount);
  const payout = calculatePayout(stakeAmount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Place Bet</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Match Info */}
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {matchHomeTeam && matchAwayTeam ? (
              <div>{matchHomeTeam} vs {matchAwayTeam}</div>
            ) : (
              <div>Match ID: {matchId}</div>
            )}
            <div className="mt-1">
              <span className="font-semibold">{marketKey}</span> - {selectionKey}
            </div>
            <div className="mt-1">
              Odds: <span className="font-semibold">{oddsDecimal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        {balance && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Available:</span>
                <span className="font-semibold">{parseFloat(balance.available).toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Reserved:</span>
                <span className="font-semibold">{parseFloat(balance.reserved).toFixed(2)} USDT</span>
              </div>
            </div>
          </div>
        )}

        {/* Stake Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Stake (USDT)</label>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            placeholder="Enter stake amount"
            min="1"
            max="10000"
            step="0.01"
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        {/* Profit/Payout Preview */}
        {stakeAmount > 0 && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded">
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Potential Profit:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {profit.toFixed(2)} USDT
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Total Payout:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {payout.toFixed(2)} USDT
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handlePlaceBet}
            disabled={loading || !stake || parseFloat(stake) <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Placing...' : 'Place Bet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetModal;
