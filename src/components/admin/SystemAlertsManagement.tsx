/**
 * System Alerts Management Component
 * Displays and manages system alerts with filtering and actions
 */
import React, { useState, useEffect } from 'react';
import { getBaseUrl } from '../../config/api';
import { toast } from 'react-toastify';

interface SystemAlert {
  id: number;
  type: string;
  severity: string;
  message: string;
  context?: any;
  status: string;
  dedupe_key: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by?: number;
  resolved_by?: number;
}

interface AlertsResponse {
  alerts: SystemAlert[];
  total: number;
  offset: number;
  limit: number;
}

const SystemAlertsManagement: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const pageSize = 20;

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter, page]);

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        status_filter: statusFilter || '',
        severity_filter: severityFilter || '',
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString()
      });

      const response = await fetch(`${getBaseUrl()}/api/admin/system/alerts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data: AlertsResponse = await response.json();
      setAlerts(data.alerts);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load alerts');
      toast.error(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getBaseUrl()}/api/admin/system/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      toast.success('Alert acknowledged');
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to acknowledge alert');
    }
  };

  const resolveAlert = async (alertId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getBaseUrl()}/api/admin/system/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }

      toast.success('Alert resolved');
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'info':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'text-yellow-400';
      case 'acknowledged':
        return 'text-blue-400';
      case 'resolved':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTypeDisplayName = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">System Alerts</h2>
        <p className="text-gray-400">Monitor and manage system alerts and issues</p>
      </div>

      {/* Filters */}
      <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 mb-6 border border-purple-500/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('open');
                setSeverityFilter('');
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

      {/* Alerts Table */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-black/30 backdrop-blur-xl rounded-lg p-8 text-center border border-purple-500/20">
          <p className="text-gray-400">No alerts found</p>
        </div>
      ) : (
        <>
          <div className="bg-black/30 backdrop-blur-xl rounded-lg border border-purple-500/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
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
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {getTypeDisplayName(alert.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                        {alert.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(alert.status) === 'text-yellow-400' ? 'bg-yellow-500/20 border border-yellow-500/50' : getStatusColor(alert.status) === 'text-blue-400' ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
                          {alert.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(alert.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {alert.status === 'open' && (
                            <button
                              onClick={() => acknowledgeAlert(alert.id)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Acknowledge
                            </button>
                          )}
                          {(alert.status === 'open' || alert.status === 'acknowledged') && (
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              className="text-green-400 hover:text-green-300"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedAlert(alert)}
                            className="text-purple-400 hover:text-purple-300"
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
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} alerts
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

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Alert Details</h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Type</label>
                    <p className="text-white font-medium">{getTypeDisplayName(selectedAlert.type)}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Severity</label>
                    <span className={`px-2 py-1 rounded-full text-xs border ${getSeverityColor(selectedAlert.severity)}`}>
                      {selectedAlert.severity.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(selectedAlert.status) === 'text-yellow-400' ? 'bg-yellow-500/20 border-yellow-500/50' : getStatusColor(selectedAlert.status) === 'text-blue-400' ? 'bg-blue-500/20 border-blue-500/50' : 'bg-green-500/20 border-green-500/50'}`}>
                      {selectedAlert.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Created</label>
                    <p className="text-white font-medium">{formatDate(selectedAlert.created_at)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Message</label>
                  <p className="text-white">{selectedAlert.message}</p>
                </div>

                {selectedAlert.context && (
                  <div>
                    <label className="text-gray-400 text-sm">Context</label>
                    <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedAlert.context, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm">Dedupe Key</label>
                  <p className="text-gray-300 font-mono text-sm">{selectedAlert.dedupe_key}</p>
                </div>

                {(selectedAlert.acknowledged_at || selectedAlert.resolved_at) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAlert.acknowledged_at && (
                      <div>
                        <label className="text-gray-400 text-sm">Acknowledged</label>
                        <p className="text-white font-medium">{formatDate(selectedAlert.acknowledged_at)}</p>
                        {selectedAlert.acknowledged_by && (
                          <p className="text-gray-400 text-xs">By user #{selectedAlert.acknowledged_by}</p>
                        )}
                      </div>
                    )}
                    {selectedAlert.resolved_at && (
                      <div>
                        <label className="text-gray-400 text-sm">Resolved</label>
                        <p className="text-white font-medium">{formatDate(selectedAlert.resolved_at)}</p>
                        {selectedAlert.resolved_by && (
                          <p className="text-gray-400 text-xs">By user #{selectedAlert.resolved_by}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                {selectedAlert.status === 'open' && (
                  <button
                    onClick={() => {
                      acknowledgeAlert(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
                {(selectedAlert.status === 'open' || selectedAlert.status === 'acknowledged') && (
                  <button
                    onClick={() => {
                      resolveAlert(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                  >
                    Resolve
                  </button>
                )}
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
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

export default SystemAlertsManagement;