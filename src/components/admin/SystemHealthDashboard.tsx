/**
 * System Health Dashboard Component
 * Displays overall system health, heartbeats, wallet balances, and latest reconciliation
 */
import React, { useState, useEffect } from 'react';
import { getBaseUrl } from '../../config/api';
import { toast } from 'react-toastify';

interface HeartbeatStatus {
  service_name: string;
  last_heartbeat_at: string;
  is_healthy: boolean;
  meta?: any;
}

interface SystemHealthData {
  overall_status: string;
  heartbeats: HeartbeatStatus[];
  open_alerts_count: number;
  hot_wallet_balances: { [key: string]: number | null } | { error: string };
  latest_reconciliation?: {
    date: string;
    status: string;
    delta: number;
  };
}

const SystemHealthDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchHealthData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getBaseUrl()}/api/admin/system/health`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }

      const data: SystemHealthData = await response.json();
      setHealthData(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load system health');
      toast.error(err.message || 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'ok':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'warn':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'error':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatBalance = (balance: number | null) => {
    if (balance === null) return 'N/A';
    return balance.toFixed(2);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-gray-400">Loading system health...</p>
        </div>
      </div>
    );
  }

  if (error || !healthData) {
    return (
      <div className="p-6">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300">{error || 'Failed to load system health'}</p>
          <button
            onClick={fetchHealthData}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overall Status */}
      <div className="bg-black/30 backdrop-blur-xl rounded-lg p-6 border border-purple-500/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">System Health</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadgeColor(healthData.overall_status)}`}>
            {healthData.overall_status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{healthData.heartbeats.length}</div>
            <div className="text-sm text-gray-400">Services Monitored</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{healthData.open_alerts_count}</div>
            <div className="text-sm text-gray-400">Open Alerts</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getStatusColor(healthData.overall_status)}`}>
              {healthData.overall_status.toUpperCase()}
            </div>
            <div className="text-sm text-gray-400">Overall Status</div>
          </div>
        </div>
      </div>

      {/* Heartbeats */}
      <div className="bg-black/30 backdrop-blur-xl rounded-lg p-6 border border-purple-500/20">
        <h3 className="text-xl font-bold text-white mb-4">Service Heartbeats</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthData.heartbeats.map((heartbeat) => (
            <div key={heartbeat.service_name} className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium">{heartbeat.service_name}</h4>
                <span className={`w-3 h-3 rounded-full ${heartbeat.is_healthy ? 'bg-green-400' : 'bg-red-400'}`}></span>
              </div>
              <div className="text-sm text-gray-400">
                Last: {formatDate(heartbeat.last_heartbeat_at)}
              </div>
              {heartbeat.meta && (
                <div className="text-xs text-gray-500 mt-1">
                  {heartbeat.meta.scanned && `Scanned: ${heartbeat.meta.scanned}`}
                  {heartbeat.meta.alerts_created && ` | Alerts: ${heartbeat.meta.alerts_created}`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hot Wallet Balances */}
      <div className="bg-black/30 backdrop-blur-xl rounded-lg p-6 border border-purple-500/20">
        <h3 className="text-xl font-bold text-white mb-4">Hot Wallet Balances</h3>
        {'error' in healthData.hot_wallet_balances ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-300">Error checking wallet balances: {healthData.hot_wallet_balances.error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(healthData.hot_wallet_balances).map(([asset, balance]) => (
              <div key={asset} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{asset}</span>
                  <span className="text-white font-bold">{formatBalance(balance as number)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Reconciliation */}
      {healthData.latest_reconciliation && (
        <div className="bg-black/30 backdrop-blur-xl rounded-lg p-6 border border-purple-500/20">
          <h3 className="text-xl font-bold text-white mb-4">Latest Reconciliation</h3>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400">Date</div>
                <div className="text-white font-medium">
                  {new Date(healthData.latest_reconciliation.date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Status</div>
                <span className={`px-2 py-1 rounded-full text-xs border ${getStatusBadgeColor(healthData.latest_reconciliation.status)}`}>
                  {healthData.latest_reconciliation.status.toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-sm text-gray-400">Delta</div>
                <div className={`font-medium ${healthData.latest_reconciliation.delta === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  ${healthData.latest_reconciliation.delta.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={fetchHealthData}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
        >
          Refresh Health Data
        </button>
      </div>
    </div>
  );
};

export default SystemHealthDashboard;