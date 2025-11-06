import React, { useState, useEffect } from "react";
import { apiMethods } from "../../lib/api";

interface Affiliate {
  id: number;
  user_id: number;
  referral_code: string;
  status: string;
  total_referrals: number;
  total_conversions: number;
  total_commission_earned: number;
  total_commission_paid: number;
  commission_rate: number;
  company_name?: string;
  created_at: string;
}

interface Referral {
  id: number;
  referred_user_id: number;
  referral_code_used: string;
  signup_date: string;
  first_deposit_date: string | null;
  is_converted: boolean;
  total_revenue_generated: number;
}

interface Commission {
  id: number;
  affiliate_id: number;
  commission_amount: number;
  status: string;
  transaction_type: string;
  created_at: string;
}

export default function AffiliateDashboard() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'affiliates' | 'commissions'>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAffiliates();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedAffiliate) {
      fetchAffiliateDetails(selectedAffiliate.id);
    }
  }, [selectedAffiliate]);

  const fetchAffiliates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const url = statusFilter === 'all' 
        ? `/api/affiliates/admin/all?page=1&size=100`
        : `/api/affiliates/admin/all?page=1&size=100&status=${statusFilter}`;
      const data = await apiMethods.get(url);
      setAffiliates(data);
    } catch (err: any) {
      console.error("Failed to fetch affiliates:", err);
      setError(err.message || "Failed to load affiliates");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAffiliateDetails = async (affiliateId: number) => {
    try {
      const [referralsData, commissionsData] = await Promise.all([
        apiMethods.get(`/api/affiliates/admin/${affiliateId}/referrals?page=1&size=50`),
        apiMethods.get(`/api/affiliates/admin/${affiliateId}/commissions?page=1&size=50`)
      ]);
      setReferrals(referralsData);
      setCommissions(commissionsData);
    } catch (err: any) {
      console.error("Failed to fetch affiliate details:", err);
    }
  };

  const handleApproveCommission = async (commissionId: number) => {
    try {
      await apiMethods.post(`/api/affiliates/admin/commissions/${commissionId}/approve`);
      if (selectedAffiliate) {
        fetchAffiliateDetails(selectedAffiliate.id);
      }
      fetchAffiliates(); // Refresh list
    } catch (err: any) {
      console.error("Failed to approve commission:", err);
      alert(err.message || "Failed to approve commission");
    }
  };

  const handlePayCommission = async (commissionId: number) => {
    try {
      await apiMethods.post(`/api/affiliates/admin/commissions/${commissionId}/pay`);
      if (selectedAffiliate) {
        fetchAffiliateDetails(selectedAffiliate.id);
      }
      fetchAffiliates(); // Refresh list
    } catch (err: any) {
      console.error("Failed to pay commission:", err);
      alert(err.message || "Failed to pay commission");
    }
  };

  // Calculate overall statistics
  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(a => a.status === 'active').length;
  const totalReferrals = affiliates.reduce((sum, a) => sum + a.total_referrals, 0);
  const totalConversions = affiliates.reduce((sum, a) => sum + a.total_conversions, 0);
  const totalCommissionEarned = affiliates.reduce((sum, a) => parseFloat(String(a.total_commission_earned || 0)), 0);
  const totalCommissionPaid = affiliates.reduce((sum, a) => parseFloat(String(a.total_commission_paid || 0)), 0);
  // Calculate pending commissions: earned - paid (approximate, as we don't have exact pending total)
  // This is an approximation since we don't have a direct pending commissions field per affiliate
  const pendingCommissions = Math.max(0, totalCommissionEarned - totalCommissionPaid);
  const conversionRate = totalReferrals > 0 ? (totalConversions / totalReferrals * 100) : 0;

  if (isLoading && affiliates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading affiliate data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Affiliate Management</h2>
            <p className="text-gray-400">Manage affiliates, referrals, and commissions</p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            <button
              onClick={fetchAffiliates}
              className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg hover:border-purple-500/50 transition-all"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-xl p-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('affiliates')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'affiliates'
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🤝 Affiliates
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'commissions'
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          💰 Commissions
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Total Affiliates</div>
              <div className="text-3xl font-bold text-white">{totalAffiliates}</div>
              <div className="text-xs text-gray-500 mt-1">{activeAffiliates} active</div>
            </div>
            
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Total Referrals</div>
              <div className="text-3xl font-bold text-white">{totalReferrals}</div>
              <div className="text-xs text-gray-500 mt-1">{totalConversions} converted ({conversionRate.toFixed(1)}%)</div>
            </div>
            
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Commissions Earned</div>
              <div className="text-3xl font-bold text-white">${totalCommissionEarned.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">${totalCommissionPaid.toFixed(2)} paid</div>
            </div>
            
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Pending Commissions</div>
              <div className="text-3xl font-bold text-yellow-400">${pendingCommissions.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">Awaiting approval</div>
            </div>
          </div>
        </>
      )}

      {/* Affiliates Tab */}
      {activeTab === 'affiliates' && (
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">All Affiliates</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400">ID</th>
                  <th className="text-left py-3 px-4 text-gray-400">Referral Code</th>
                  <th className="text-left py-3 px-4 text-gray-400">Status</th>
                  <th className="text-right py-3 px-4 text-gray-400">Referrals</th>
                  <th className="text-right py-3 px-4 text-gray-400">Conversions</th>
                  <th className="text-right py-3 px-4 text-gray-400">Commission Rate</th>
                  <th className="text-right py-3 px-4 text-gray-400">Earned</th>
                  <th className="text-right py-3 px-4 text-gray-400">Paid</th>
                  <th className="text-left py-3 px-4 text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((affiliate) => (
                  <tr 
                    key={affiliate.id} 
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => setSelectedAffiliate(affiliate)}
                  >
                    <td className="py-3 px-4 text-white">#{affiliate.id}</td>
                    <td className="py-3 px-4">
                      <span className="text-purple-400 font-mono font-bold">{affiliate.referral_code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        affiliate.status === "active" ? "bg-green-500/20 text-green-400" :
                        affiliate.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {affiliate.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-white">{affiliate.total_referrals}</td>
                    <td className="text-right py-3 px-4 text-white">{affiliate.total_conversions}</td>
                    <td className="text-right py-3 px-4 text-gray-400">{parseFloat(String(affiliate.commission_rate || 0)).toFixed(1)}%</td>
                    <td className="text-right py-3 px-4 text-green-400">${parseFloat(String(affiliate.total_commission_earned || 0)).toFixed(2)}</td>
                    <td className="text-right py-3 px-4 text-blue-400">${parseFloat(String(affiliate.total_commission_paid || 0)).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAffiliate(affiliate);
                          setActiveTab('commissions');
                        }}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {affiliates.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400">
                      No affiliates found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commissions Tab */}
      {activeTab === 'commissions' && (
        <div className="space-y-6">
          {selectedAffiliate ? (
            <>
              <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">
                    Commissions for: <span className="text-purple-400">{selectedAffiliate.referral_code}</span>
                  </h3>
                  <button
                    onClick={() => setSelectedAffiliate(null)}
                    className="px-4 py-2 bg-gray-500/20 border border-gray-500/30 text-gray-300 rounded-lg hover:border-gray-500/50"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {/* Referrals */}
              <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h4 className="text-lg font-bold text-white mb-4">Referrals</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400">User ID</th>
                        <th className="text-left py-3 px-4 text-gray-400">Signup Date</th>
                        <th className="text-left py-3 px-4 text-gray-400">Status</th>
                        <th className="text-right py-3 px-4 text-gray-400">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((referral) => (
                        <tr key={referral.id} className="border-b border-white/5">
                          <td className="py-3 px-4 text-white">#{referral.referred_user_id}</td>
                          <td className="py-3 px-4 text-gray-400">{new Date(referral.signup_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              referral.is_converted ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                            }`}>
                              {referral.is_converted ? "Converted" : "Pending"}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4 text-white">${parseFloat(String(referral.total_revenue_generated || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                      {referrals.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-400">
                            No referrals found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Commissions */}
              <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h4 className="text-lg font-bold text-white mb-4">Commissions</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400">Amount</th>
                        <th className="text-left py-3 px-4 text-gray-400">Type</th>
                        <th className="text-left py-3 px-4 text-gray-400">Status</th>
                        <th className="text-left py-3 px-4 text-gray-400">Date</th>
                        <th className="text-left py-3 px-4 text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((commission) => (
                        <tr key={commission.id} className="border-b border-white/5">
                          <td className="py-3 px-4 text-white">${parseFloat(String(commission.commission_amount || 0)).toFixed(2)}</td>
                          <td className="py-3 px-4 text-gray-400">{commission.transaction_type}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              commission.status === "paid" ? "bg-green-500/20 text-green-400" :
                              commission.status === "approved" ? "bg-blue-500/20 text-blue-400" :
                              "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {commission.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400">{new Date(commission.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              {commission.status === 'pending' && (
                                <button
                                  onClick={() => handleApproveCommission(commission.id)}
                                  className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded text-xs hover:border-blue-500/50"
                                >
                                  Approve
                                </button>
                              )}
                              {commission.status === 'approved' && (
                                <button
                                  onClick={() => handlePayCommission(commission.id)}
                                  className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-300 rounded text-xs hover:border-green-500/50"
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {commissions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-400">
                            No commissions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center">
              <p className="text-gray-400">Select an affiliate from the Affiliates tab to view their commissions</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
