import React, { useState, useEffect } from "react";
import { apiMethods } from "../../lib/api";

interface ComplianceDashboard {
  total_users: number;
  users_with_limits: number;
  active_session_timeouts: number;
  cooling_off_active: number;
  self_excluded_users: number;
  recent_alerts: Array<{
    id: number;
    user_id: number;
    alert_type: string;
    severity: string;
    message: string;
    acknowledged: boolean;
    created_at: string;
  }>;
  at_risk_users: number;
}

interface RegionalRestriction {
  id: number;
  country_code: string;
  country_name: string;
  is_restricted: boolean;
  restriction_type: string | null;
  restricted_features: string[] | null;
}

export default function ComplianceDashboardComponent() {
  const [dashboardData, setDashboardData] = useState<ComplianceDashboard | null>(null);
  const [restrictions, setRestrictions] = useState<RegionalRestriction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRestriction, setEditingRestriction] = useState<RegionalRestriction | null>(null);
  const [isAddingRestriction, setIsAddingRestriction] = useState(false);
  const [isUpdatingRestriction, setIsUpdatingRestriction] = useState(false);
  const [formData, setFormData] = useState({
    country_code: "",
    country_name: "",
    is_restricted: false,
    restriction_type: "",
    restricted_features: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [dashboard, regionData] = await Promise.all([
        apiMethods.get("/api/analytics/compliance/dashboard"),
        apiMethods.get("/api/analytics/regions")
      ]);
      
      setDashboardData(dashboard);
      setRestrictions(regionData);
    } catch (err: any) {
      console.error("Failed to fetch compliance data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRestriction = async () => {
    // Check if country already exists
    const exists = restrictions.find(r => r.country_code === formData.country_code);
    if (exists) {
      alert(`Restriction for ${formData.country_name} (${formData.country_code}) already exists. Please use the Edit button to update it.`);
      return;
    }

    setIsAddingRestriction(true);
    try {
      const newRestriction = {
        country_code: formData.country_code,
        country_name: formData.country_name,
        is_restricted: formData.is_restricted,
        restriction_type: formData.restriction_type || null,
        restricted_features: formData.restricted_features.length > 0 ? formData.restricted_features : null,
        notes: formData.is_restricted ? "Legal restrictions apply" : null
      };

      await apiMethods.post("/api/analytics/regions", newRestriction);
      await fetchData();
      setShowAddModal(false);
      setFormData({
        country_code: "",
        country_name: "",
        is_restricted: false,
        restriction_type: "",
        restricted_features: []
      });
    } catch (err: any) {
      console.error("Failed to add restriction:", err);
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to add restriction";
      alert(`Failed to add restriction: ${errorMessage}`);
    } finally {
      setIsAddingRestriction(false);
    }
  };

  const handleEditRestriction = async (restriction: RegionalRestriction) => {
    setEditingRestriction(restriction);
    setFormData({
      country_code: restriction.country_code,
      country_name: restriction.country_name,
      is_restricted: restriction.is_restricted,
      restriction_type: restriction.restriction_type || "",
      restricted_features: restriction.restricted_features || []
    });
    setShowEditModal(true);
  };

  const handleUpdateRestriction = async () => {
    if (!editingRestriction) return;

    setIsUpdatingRestriction(true);
    try {
      const updated = {
        is_restricted: formData.is_restricted,
        restriction_type: formData.restriction_type || null,
        restricted_features: formData.restricted_features.length > 0 ? formData.restricted_features : null,
        notes: formData.is_restricted ? "Legal restrictions apply" : null
      };

      await apiMethods.put(`/api/analytics/regions/${editingRestriction.id}`, updated);
      await fetchData();
      setShowEditModal(false);
      setEditingRestriction(null);
      setFormData({
        country_code: "",
        country_name: "",
        is_restricted: false,
        restriction_type: "",
        restricted_features: []
      });
    } catch (err: any) {
      console.error("Failed to update restriction:", err);
      alert("Failed to update restriction. Please try again.");
    } finally {
      setIsUpdatingRestriction(false);
    }
  };

  const handleDeleteRestriction = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this restriction?")) return;

    try {
      await apiMethods.delete(`/api/analytics/regions/${id}`);
      await fetchData();
    } catch (err: any) {
      console.error("Failed to delete restriction:", err);
      alert("Failed to delete restriction. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '🟡';
      default:
        return '🔵';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center space-x-2">
          <span className="text-3xl">🛡️</span>
          <span>Compliance Dashboard</span>
        </h2>
        <p className="text-gray-400">Monitor responsible gaming and regional compliance</p>
      </div>

      {/* Compliance Stats Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users */}
          <div className="bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-blue-500/20 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-white">{dashboardData.total_users}</p>
            <div className="mt-2 w-full bg-black/20 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Users with Limits */}
          <div className="bg-gradient-to-br from-purple-500/20 via-violet-500/10 to-purple-500/20 border border-purple-500/30 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚙️</span>
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Users with Limits</h3>
            <p className="text-3xl font-bold text-white">{dashboardData.users_with_limits}</p>
            <div className="mt-2 w-full bg-black/20 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full" 
                style={{ width: `${(dashboardData.users_with_limits / dashboardData.total_users * 100)}%` }}></div>
            </div>
          </div>

          {/* Self-Excluded */}
          <div className="bg-gradient-to-br from-red-500/20 via-rose-500/10 to-red-500/20 border border-red-500/30 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🚫</span>
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Self-Excluded Users</h3>
            <p className="text-3xl font-bold text-white">{dashboardData.self_excluded_users}</p>
            <div className="mt-2 w-full bg-black/20 rounded-full h-2">
              <div className="bg-gradient-to-r from-red-500 to-rose-500 h-2 rounded-full" 
                style={{ width: `${dashboardData.self_excluded_users > 0 ? Math.min((dashboardData.self_excluded_users / dashboardData.total_users * 100), 100) : 0}%` }}></div>
            </div>
          </div>

          {/* At Risk Users */}
          <div className="bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-yellow-500/20 border border-yellow-500/30 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">At Risk Users</h3>
            <p className="text-3xl font-bold text-white">{dashboardData.at_risk_users}</p>
            <div className="mt-2 w-full bg-black/20 rounded-full h-2">
              <div className="bg-gradient-to-r from-yellow-500 to-amber-500 h-2 rounded-full" style={{ width: '15%' }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        {dashboardData && (
          <div className="bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <span className="text-2xl">🔔</span>
                <span>Recent Alerts</span>
              </h3>
              <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-sm font-semibold">
                {dashboardData.recent_alerts.length} Active
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dashboardData.recent_alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">✅</div>
                  <p>No active compliance alerts</p>
                </div>
              ) : (
                dashboardData.recent_alerts.map((alert) => (
                  <div key={alert.id} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{getSeverityIcon(alert.severity)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-white capitalize">{alert.alert_type.replace('_', ' ')}</p>
                          <span className="text-xs text-gray-400">
                            {new Date(alert.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{alert.message}</p>
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-xs px-2 py-1 rounded bg-black/20">
                            User ID: {alert.user_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Regional Restrictions */}
        <div className="bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <span className="text-2xl">🌍</span>
              <span>Regional Restrictions</span>
            </h3>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-300 rounded-lg hover:border-purple-500/50 transition-all text-sm font-medium"
            >
              Add Restriction
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {restrictions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🌐</div>
                <p>No regional restrictions configured</p>
              </div>
            ) : (
              restrictions.map((restriction) => (
                <div
                  key={restriction.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    restriction.is_restricted
                      ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      restriction.is_restricted
                        ? 'bg-red-500/20'
                        : 'bg-emerald-500/20'
                    }`}>
                      {restriction.is_restricted ? '🚫' : '✅'}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{restriction.country_name}</p>
                      <p className="text-xs text-gray-400">{restriction.country_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      restriction.is_restricted
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {restriction.is_restricted ? 'Restricted' : 'Allowed'}
                    </span>
                    <button
                      onClick={() => handleEditRestriction(restriction)}
                      className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded hover:bg-purple-500/30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRestriction(restriction.id)}
                      className="px-2 py-1 text-xs bg-red-500/20 text-red-300 border border-red-500/30 rounded hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Compliance Documentation */}
      <div className="bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <span className="text-2xl">📋</span>
          <span>Compliance Documentation & Policies</span>
        </h3>

        <div className="space-y-6">
          {/* Responsible Gaming */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-blue-400 mb-2 flex items-center space-x-2">
              <span>🎯</span>
              <span>Responsible Gaming</span>
            </h4>
            <p className="text-gray-300 text-sm mb-3">
              We are committed to promoting responsible gaming and protecting our users from gambling-related harm. Our platform includes comprehensive safeguards to ensure a safe and controlled betting environment.
            </p>
            <ul className="list-disc list-inside text-gray-400 text-sm space-y-1 ml-4">
              <li>Daily, weekly, and monthly deposit limits</li>
              <li>Session time limits and cooling-off periods</li>
              <li>Self-exclusion options (temporary and permanent)</li>
              <li>Real-time spending and betting limits</li>
              <li>Age verification and KYC compliance</li>
            </ul>
          </div>

          {/* Self-Exclusion Policy */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-red-400 mb-2 flex items-center space-x-2">
              <span>🚫</span>
              <span>Self-Exclusion</span>
            </h4>
            <p className="text-gray-300 text-sm mb-3">
              Users can self-exclude from the platform at any time. Once self-exclusion is activated, the account is immediately blocked from all betting, deposits, and withdrawals.
            </p>
            <div className="text-gray-400 text-sm space-y-1">
              <p><strong className="text-white">Temporary:</strong> 24 hours to 6 months</p>
              <p><strong className="text-white">Permanent:</strong> Irreversible account closure</p>
            </div>
          </div>

          {/* Regional Restrictions */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-purple-400 mb-2 flex items-center space-x-2">
              <span>🌍</span>
              <span>Regional Restrictions</span>
            </h4>
            <p className="text-gray-300 text-sm mb-3">
              Access is restricted in certain jurisdictions due to local gambling laws. Users from these regions cannot access betting, deposits, or withdrawals.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="bg-black/20 rounded p-2">
                <p className="text-white font-medium text-sm">Restricted (5 countries)</p>
                <p className="text-gray-400 text-xs mt-1">Germany, Netherlands, Norway, China, Japan</p>
              </div>
              <div className="bg-black/20 rounded p-2">
                <p className="text-white font-medium text-sm">Allowed (15 countries)</p>
                <p className="text-gray-400 text-xs mt-1">US, UK, Italy, France, Spain, others</p>
              </div>
            </div>
          </div>

          {/* Deposit Limits */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-green-400 mb-2 flex items-center space-x-2">
              <span>💰</span>
              <span>Default Limits</span>
            </h4>
            <p className="text-gray-300 text-sm mb-3">
              All users have automatic deposit and betting limits to prevent excessive spending.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
              <div className="bg-black/20 rounded p-2">
                <p className="text-white font-medium text-xs">Daily</p>
                <p className="text-gray-400 text-xs mt-1">$1,000 deposit<br/>$2,000 betting</p>
              </div>
              <div className="bg-black/20 rounded p-2">
                <p className="text-white font-medium text-xs">Weekly</p>
                <p className="text-gray-400 text-xs mt-1">$5,000 deposit</p>
              </div>
              <div className="bg-black/20 rounded p-2">
                <p className="text-white font-medium text-xs">Monthly</p>
                <p className="text-gray-400 text-xs mt-1">$20,000 deposit</p>
              </div>
            </div>
          </div>

          {/* Compliance Monitoring */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center space-x-2">
              <span>👁️</span>
              <span>Monitoring & Alerts</span>
            </h4>
            <p className="text-gray-300 text-sm mb-3">
              Our platform actively monitors user behavior and generates compliance alerts for:
            </p>
            <ul className="list-disc list-inside text-gray-400 text-sm space-y-1 ml-4">
              <li>Deposit limit violations</li>
              <li>Betting limit violations</li>
              <li>Session timeout warnings</li>
              <li>Unusual betting patterns</li>
              <li>High-value transactions</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Add Regional Restriction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country Code</label>
                <input
                  type="text"
                  value={formData.country_code}
                  onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 bg-black/40 border border-gray-600 rounded-lg text-white"
                  placeholder="US"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country Name</label>
                <input
                  type="text"
                  value={formData.country_name}
                  onChange={(e) => setFormData({ ...formData, country_name: e.target.value })}
                  className="w-full px-4 py-2 bg-black/40 border border-gray-600 rounded-lg text-white"
                  placeholder="United States"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_restricted}
                  onChange={(e) => setFormData({ ...formData, is_restricted: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-gray-300">Is Restricted</label>
              </div>
              {formData.is_restricted && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Restriction Type</label>
                  <select
                    value={formData.restriction_type}
                    onChange={(e) => setFormData({ ...formData, restriction_type: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select Type</option>
                    <option value="full_block">Full Block</option>
                    <option value="betting_block">Betting Block</option>
                    <option value="deposit_block">Deposit Block</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddRestriction}
                disabled={isAddingRestriction}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isAddingRestriction ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  "Add"
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({
                    country_code: "",
                    country_name: "",
                    is_restricted: false,
                    restriction_type: "",
                    restricted_features: []
                  });
                }}
                disabled={isAddingRestriction}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRestriction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Edit Regional Restriction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <div className="px-4 py-2 bg-black/40 border border-gray-600 rounded-lg text-white">
                  {editingRestriction.country_name} ({editingRestriction.country_code})
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_restricted}
                  onChange={(e) => setFormData({ ...formData, is_restricted: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-gray-300">Is Restricted</label>
              </div>
              {formData.is_restricted && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Restriction Type</label>
                  <select
                    value={formData.restriction_type}
                    onChange={(e) => setFormData({ ...formData, restriction_type: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select Type</option>
                    <option value="full_block">Full Block</option>
                    <option value="betting_block">Betting Block</option>
                    <option value="deposit_block">Deposit Block</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleUpdateRestriction}
                disabled={isUpdatingRestriction}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isUpdatingRestriction ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRestriction(null);
                  setFormData({
                    country_code: "",
                    country_name: "",
                    is_restricted: false,
                    restriction_type: "",
                    restricted_features: []
                  });
                }}
                disabled={isUpdatingRestriction}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

