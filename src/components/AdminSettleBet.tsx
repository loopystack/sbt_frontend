/**
 * Admin Settle Bet Component
 * Admin-only component for settling bets (staging/testing)
 */
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { betService } from '../services/betService';
import { toast } from 'react-toastify';

interface AdminSettleBetProps {
  betId: number;
  onSettled?: () => void;
}

const AdminSettleBet: React.FC<AdminSettleBetProps> = ({ betId, onSettled }) => {
  const { user } = useAuth();
  const [outcome, setOutcome] = useState<'WIN' | 'LOSS' | 'VOID'>('WIN');
  const [loading, setLoading] = useState(false);

  // Only show for admin users
  if (!user?.is_superuser) {
    return null;
  }

  const handleSettle = async () => {
    if (!window.confirm(`Are you sure you want to settle bet ${betId} as ${outcome}?`)) {
      return;
    }

    setLoading(true);
    try {
      await betService.settleBet(betId, outcome);
      toast.success(`Bet ${betId} settled as ${outcome}`);
      onSettled?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to settle bet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
      <div className="text-sm font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
        Admin: Settle Bet #{betId}
      </div>
      <div className="flex gap-2 items-center">
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as 'WIN' | 'LOSS' | 'VOID')}
          className="px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="WIN">WIN</option>
          <option value="LOSS">LOSS</option>
          <option value="VOID">VOID</option>
        </select>
        <button
          onClick={handleSettle}
          disabled={loading}
          className="px-4 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
        >
          {loading ? 'Settling...' : 'Settle'}
        </button>
      </div>
    </div>
  );
};

export default AdminSettleBet;
