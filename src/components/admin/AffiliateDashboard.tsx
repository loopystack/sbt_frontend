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
  commission_amount: number;
  status: string;
  transaction_type: string;
  created_at: string;
}

interface AffiliateDashboardData {
  affiliate: Affiliate;
  total_referrals: number;
  converted_referrals: number;
  pending_commissions: number;
  approved_commissions: number;
  paid_commissions: number;
  total_revenue_generated: number;
  conversion_rate: number;
  average_revenue_per_referral: number;
  recent_referrals: Referral[];
  recent_commissions: Commission[];
}

export default function AffiliateDashboard() {
  const [dashboardData, setDashboardData] = useState<AffiliateDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    checkAffiliateAndFetch();
  }, []);

  const checkAffiliateAndFetch = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First, check if affiliate account exists (simpler endpoint, less likely to error)
      try {
        const affiliate = await apiMethods.get("/api/affiliates/me");
        // If we get here, affiliate exists - now fetch the dashboard
        if (affiliate) {
          try {
            const dashboardData = await apiMethods.get("/api/affiliates/me/dashboard");
            setDashboardData(dashboardData);
            setShowRegister(false);
          } catch (dashboardErr: any) {
            // Dashboard fetch failed, but affiliate exists
            console.error("Dashboard fetch error:", dashboardErr);
            setError("Failed to load dashboard data. Please try again.");
            setShowRegister(false);
          }
        }
      } catch (affiliateErr: any) {
        // Check if it's a 404 error (affiliate account not found)
        const status = affiliateErr.status || affiliateErr.response?.status;
        if (status === 404 || (affiliateErr.message && affiliateErr.message.includes("not found"))) {
          setShowRegister(true);
          setError(null); // Clear error to show registration form
        } else {
          // Network or other error
          setError(affiliateErr.message || "Failed to check affiliate account. Please check your connection.");
          setShowRegister(false);
        }
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setError(err.message || "An unexpected error occurred");
      setShowRegister(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboard = async () => {
    await checkAffiliateAndFetch();
  };

  const handleRegister = async () => {
    try {
      setIsRegistering(true);
      await apiMethods.post("/api/affiliates/register", {
        company_name: "",
        commission_rate: 10.0,
        commission_type: "revenue_share"
      });
      setShowRegister(false);
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to register as affiliate");
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading affiliate dashboard...</p>
        </div>
      </div>
    );
  }

  if (showRegister) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-white mb-4">Become an Affiliate Partner</h2>
          <p className="text-gray-400 mb-6">
            Start earning commissions by referring users to our platform. Get your unique referral code and start sharing!
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <button
            onClick={handleRegister}
            disabled={isRegistering}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50"
          >
            {isRegistering ? "Registering..." : "Register as Affiliate"}
          </button>
        </div>
      </div>
    );
  }

  if (error && !dashboardData && !showRegister) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { affiliate, conversion_rate, total_revenue_generated } = dashboardData;
  
  // Helper function to safely convert Decimal/string values to numbers
  const toNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  };
  
  // Convert all Decimal values to numbers
  const totalCommissionEarned = toNumber(affiliate.total_commission_earned);
  const totalCommissionPaid = toNumber(affiliate.total_commission_paid);
  const revenueGenerated = toNumber(total_revenue_generated);
  const conversionRateNum = toNumber(conversion_rate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Affiliate Dashboard</h2>
            <p className="text-gray-400">Your referral code: <span className="text-purple-400 font-mono font-bold">{affiliate.referral_code}</span></p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Status</div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
              affiliate.status === "active" ? "bg-green-500/20 text-green-400" :
              affiliate.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
              "bg-red-500/20 text-red-400"
            }`}>
              {affiliate.status.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Total Referrals</div>
          <div className="text-3xl font-bold text-white">{dashboardData.total_referrals}</div>
          <div className="text-xs text-gray-500 mt-1">{dashboardData.converted_referrals} converted</div>
        </div>
        
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Conversion Rate</div>
          <div className="text-3xl font-bold text-white">{conversionRateNum.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-1">Successful conversions</div>
        </div>
        
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Total Commissions</div>
          <div className="text-3xl font-bold text-white">${totalCommissionEarned.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">${totalCommissionPaid.toFixed(2)} paid</div>
        </div>
        
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Revenue Generated</div>
          <div className="text-3xl font-bold text-white">${revenueGenerated.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">From your referrals</div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Recent Referrals</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400">User ID</th>
                <th className="text-left py-3 px-4 text-gray-400">Signup Date</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-gray-400">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.recent_referrals.map((referral) => (
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
                  <td className="py-3 px-4 text-white">${toNumber(referral.total_revenue_generated).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Recent Commissions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400">Amount</th>
                <th className="text-left py-3 px-4 text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.recent_commissions.map((commission) => (
                <tr key={commission.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">${toNumber(commission.commission_amount).toFixed(2)}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

