/**
 * My Bets Page
 * Display user's betting history with status and details
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { betService, Bet, BetStatus } from '../services/betService';
import { toast } from 'react-toastify';

const MyBets: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BetStatus | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchBets();
    }
  }, [isAuthenticated, statusFilter]);

  const fetchBets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await betService.getBets(statusFilter, 100, 0);
      setBets(response.bets);
    } catch (err: any) {
      setError(err.message || 'Failed to load bets');
      toast.error(err.message || 'Failed to load bets');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBet = async (betId: number) => {
    if (!window.confirm('Are you sure you want to cancel this bet? The stake will be returned to your available balance.')) {
      return;
    }

    try {
      await betService.cancelBet(betId);
      toast.success('Bet cancelled successfully');
      fetchBets(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel bet');
    }
  };

  const getStatusColor = (status: BetStatus): string => {
    switch (status) {
      case 'won':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'lost':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'void':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Please sign in to view your bets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">My Bets</h1>
        
        {/* Status Filter */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setStatusFilter(undefined)}
            className={`px-4 py-2 rounded ${
              statusFilter === undefined
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded ${
              statusFilter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('won')}
            className={`px-4 py-2 rounded ${
              statusFilter === 'won'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Won
          </button>
          <button
            onClick={() => setStatusFilter('lost')}
            className={`px-4 py-2 rounded ${
              statusFilter === 'lost'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Lost
          </button>
          <button
            onClick={() => setStatusFilter('void')}
            className={`px-4 py-2 rounded ${
              statusFilter === 'void'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Void
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading bets...</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && bets.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">No bets found</p>
        </div>
      )}

      {!loading && bets.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">ID</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Match</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Market</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Selection</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-right">Odds</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-right">Stake</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-right">
                  {bets.some(b => b.status === 'won' || b.status === 'lost') ? 'Profit/Payout' : 'Potential Profit'}
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Status</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Placed At</th>
                {bets.some(b => b.settled_at) && (
                  <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Settled At</th>
                )}
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((bet) => (
                <tr key={bet.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">{bet.id}</td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                    Match #{bet.match_id}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">{bet.market_key}</td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">{bet.selection_key}</td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-right">
                    {bet.odds_decimal.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-right">
                    {bet.stake.toFixed(2)} {bet.currency}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-right">
                    {bet.status === 'won' && bet.profit !== undefined ? (
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        +{bet.profit.toFixed(2)} {bet.currency}
                        {bet.payout && ` (Payout: ${bet.payout.toFixed(2)})`}
                      </span>
                    ) : bet.status === 'lost' ? (
                      <span className="text-red-600 dark:text-red-400">
                        -{bet.stake.toFixed(2)} {bet.currency}
                      </span>
                    ) : bet.status === 'void' || bet.status === 'cancelled' ? (
                      <span className="text-gray-600 dark:text-gray-400">
                        0.00 {bet.currency}
                      </span>
                    ) : (
                      <span>
                        {bet.potential_profit.toFixed(2)} {bet.currency}
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(bet.status)}`}>
                      {bet.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">
                    {formatDate(bet.placed_at)}
                  </td>
                  {bet.settled_at && (
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">
                      {formatDate(bet.settled_at)}
                    </td>
                  )}
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                    {bet.status === 'pending' && (
                      <button
                        onClick={() => handleCancelBet(bet.id)}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyBets;
