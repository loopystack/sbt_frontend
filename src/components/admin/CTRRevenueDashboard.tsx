import React, { useState, useEffect } from "react";
import { apiMethods } from "../../lib/api";
import { getTeamLogo } from "../../utils/teamLogos";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface CTRMetrics {
  element_type: string;
  total_clicks: number;
  total_views: number;
  ctr_percentage: number;
  unique_users: number;
  period_days: number;
}

interface RevenueMetrics {
  total_revenue: number;
  total_deposits: number;
  total_withdrawals: number;
  total_bet_volume: number;
  platform_profit: number;
  margin_percentage: number;
  period_days: number;
  daily_average: number;
}

interface MatchCTR {
  match_name: string;
  league: string;
  total_clicks: number;
  unique_users: number;
  avg_odds: number;
  top_outcome: string;
  outcome_distribution: Record<string, number>;
}

export default function CTRRevenueDashboard() {
  const [ctrMetrics, setCtrMetrics] = useState<CTRMetrics[]>([]);
  const [matchCTR, setMatchCTR] = useState<MatchCTR[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState<'elements' | 'matches'>('elements');

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      let ctrData, matchCTRData, revenueData;
      
      const analyticsOptions = { timeout: 45000 };
      try {
        ctrData = await apiMethods.get(`/api/analytics/ctr-metrics?days=${selectedPeriod}`, analyticsOptions);
      } catch (err: any) {
        console.error("❌ Failed to fetch CTR metrics:", err);
        console.error("❌ Full error:", JSON.stringify(err, null, 2));
        ctrData = [];
      }
      
      try {
        matchCTRData = await apiMethods.get(`/api/analytics/ctr-by-matches?days=${selectedPeriod}`, analyticsOptions);
      } catch (err: any) {
        console.error("❌ Failed to fetch match CTR:", err);
        console.error("❌ Error type:", typeof err);
        console.error("❌ Error response:", err.response);
        console.error("❌ Error message:", err.message);
        console.error("❌ Full error object:", err);
        matchCTRData = [];
      }
      
      try {
        revenueData = await apiMethods.get(`/api/analytics/revenue?days=${selectedPeriod}`, analyticsOptions);
      } catch (err: any) {
        console.error("❌ Failed to fetch revenue:", err);
        revenueData = null;
      }
      
      setCtrMetrics(ctrData);
      setMatchCTR(matchCTRData);
      setRevenueMetrics(revenueData);
    } catch (err: any) {
      console.error("❌ Failed to fetch analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text("CTR & Revenue Analytics Report", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Period: Last ${selectedPeriod} days`, 14, 36);
    doc.setTextColor(0, 0, 0);
    
    let yPos = 45;
    
    // Revenue Overview Section
    if (revenueMetrics) {
      doc.setFontSize(14);
      doc.text("Revenue Overview", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      const revenueData = [
        ["Total Revenue", `$${revenueMetrics.total_revenue.toLocaleString()}`],
        ["Total Deposits", `$${revenueMetrics.total_deposits.toLocaleString()}`],
        ["Total Withdrawals", `$${revenueMetrics.total_withdrawals.toLocaleString()}`],
        ["Total Bet Volume", `$${revenueMetrics.total_bet_volume.toLocaleString()}`],
        ["Platform Profit", `$${revenueMetrics.platform_profit.toLocaleString()}`],
        ["Margin %", `${revenueMetrics.margin_percentage.toFixed(2)}%`],
        ["Daily Average", `$${revenueMetrics.daily_average.toLocaleString()}`]
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [["Metric", "Value"]],
        body: revenueData,
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [138, 43, 226] },
        margin: { left: 14 }
      });
      
      yPos = yPos + revenueData.length * 7 + 10;
    }
    
    // CTR Metrics Section
    doc.setFontSize(14);
    doc.text("Click-Through Rate (CTR) Metrics", 14, yPos);
    yPos += 8;
    
    if (activeTab === 'elements' && ctrMetrics.length > 0) {
      const ctrData = ctrMetrics.map(metric => [
        metric.element_type.toUpperCase(),
        metric.total_clicks.toString(),
        metric.total_views.toString(),
        `${metric.ctr_percentage.toFixed(2)}%`,
        metric.unique_users.toString()
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [["Element Type", "Clicks", "Views", "CTR %", "Unique Users"]],
        body: ctrData,
        theme: "striped",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [138, 43, 226] },
        margin: { left: 14 }
      });
      
      yPos = yPos + ctrData.length * 8 + 15;
    } else if (activeTab === 'matches' && matchCTR.length > 0) {
      const matchData = matchCTR.slice(0, 15).map(match => [
        match.match_name,
        match.league,
        match.total_clicks.toString(),
        match.unique_users.toString(),
        match.avg_odds.toFixed(2),
        match.top_outcome.toUpperCase()
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [["Match", "League", "Clicks", "Unique Users", "Avg Odds", "Top Outcome"]],
        body: matchData,
        theme: "striped",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [138, 43, 226] },
        margin: { left: 14 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 }
        }
      });
    }
    
    // Save the PDF
    const fileName = `CTR_Revenue_Report_${selectedPeriod}days_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">📊 CTR & Revenue Analytics</h2>
          <p className="text-gray-400">Track performance metrics and revenue streams</p>
        </div>
        <div className="flex items-center space-x-2">
          {[7, 30, 90, 365].map(days => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === days
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  : 'bg-black/40 text-gray-400 hover:bg-black/60'
              }`}
            >
              {days === 7 ? '7d' : days === 30 ? '30d' : days === 90 ? '90d' : '1y'}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Overview Cards */}
      {revenueMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-emerald-500/20 border border-emerald-500/30 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <span className="text-emerald-400 text-sm font-semibold">+{revenueMetrics.margin_percentage}%</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-white">${revenueMetrics.total_revenue.toLocaleString()}</p>
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-full bg-black/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>

          {/* Total Deposits */}
          <div className="bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-blue-500/20 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💵</span>
              </div>
              <span className="text-blue-400 text-sm font-semibold">↑ 12%</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Deposits</h3>
            <p className="text-3xl font-bold text-white">${revenueMetrics.total_deposits.toLocaleString()}</p>
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-full bg-black/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: '72%' }}></div>
              </div>
            </div>
          </div>

          {/* Bet Volume */}
          <div className="bg-gradient-to-br from-purple-500/20 via-violet-500/10 to-purple-500/20 border border-purple-500/30 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <span className="text-purple-400 text-sm font-semibold">↑ 24%</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Bet Volume</h3>
            <p className="text-3xl font-bold text-white">${revenueMetrics.total_bet_volume.toLocaleString()}</p>
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-full bg-black/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>

          {/* Platform Profit */}
          <div className="bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/30 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <span className="text-amber-400 text-sm font-semibold">↑ 18%</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Platform Profit</h3>
            <p className="text-3xl font-bold text-white">${revenueMetrics.platform_profit.toLocaleString()}</p>
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-full bg-black/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-amber-500 to-yellow-500 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 mb-6 bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-xl p-2">
        <button
          onClick={() => {
            setActiveTab('elements');
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'elements'
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 By Element Type
        </button>
        <button
          onClick={() => {
            setActiveTab('matches');
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'matches'
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ⚽ By Match
        </button>
      </div>

      {/* CTR Metrics Table */}
      <div className="bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <span className="text-2xl">🎯</span>
            <span>{activeTab === 'elements' ? 'Element Click-Through Rate' : 'Match Click-Through Rate'}</span>
            <span className="text-sm text-gray-400 ml-4">
              ({activeTab === 'elements' ? ctrMetrics.length : matchCTR.length} {activeTab === 'elements' ? 'elements' : 'matches'})
            </span>
          </h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => fetchData()} 
              className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg hover:border-blue-500/50 transition-all text-sm font-medium"
            >
              🔄 Refresh
            </button>
            <button 
              onClick={exportToPDF}
              className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-300 rounded-lg hover:border-purple-500/50 transition-all text-sm font-medium"
            >
              📄 Export Report
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'elements' ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Element Type</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Total Clicks</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Total Views</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">CTR (%)</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Unique Users</th>
                </tr>
              </thead>
              <tbody>
                {ctrMetrics.map((metric, index) => (
                  <tr key={index} className="border-b border-gray-700/50 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-sm">
                            {metric.element_type === 'button' && '🔘'}
                            {metric.element_type === 'link' && '🔗'}
                            {metric.element_type === 'banner' && '📢'}
                            {metric.element_type === 'cta' && '⚡'}
                            {!['button', 'link', 'banner', 'cta'].includes(metric.element_type) && '📋'}
                          </span>
                        </div>
                        <span className="text-white font-medium capitalize">{metric.element_type}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-white font-semibold">
                      {metric.total_clicks.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-300">
                      {metric.total_views.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        metric.ctr_percentage > 5 ? 'bg-emerald-500/20 text-emerald-400' :
                        metric.ctr_percentage > 2 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {metric.ctr_percentage.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-300">
                      {metric.unique_users.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {ctrMetrics.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No CTR data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Match</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">League</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Total Clicks</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Unique Users</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Avg Odds</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Top Outcome</th>
                </tr>
              </thead>
              <tbody>
                {matchCTR.map((match, index) => (
                  <tr key={index} className="border-b border-gray-700/50 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const teams = match.match_name.split(' vs ');
                          const homeTeam = teams[0];
                          const awayTeam = teams[1];
                          return (
                            <>
                              {getTeamLogo(homeTeam, match.league) && (
                                <img
                                  src={getTeamLogo(homeTeam, match.league)!}
                                  alt={homeTeam}
                                  className="w-5 h-5 object-contain"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                              <span className="text-white font-medium">{homeTeam}</span>
                              <span className="text-gray-500 text-sm">vs</span>
                              {getTeamLogo(awayTeam, match.league) && (
                                <img
                                  src={getTeamLogo(awayTeam, match.league)!}
                                  alt={awayTeam}
                                  className="w-5 h-5 object-contain"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                              <span className="text-white font-medium">{awayTeam}</span>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {match.league}
                    </td>
                    <td className="text-right py-3 px-4 text-white font-semibold">
                      {match.total_clicks.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-300">
                      {match.unique_users.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-purple-400 font-semibold">
                      {match.avg_odds.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold capitalize ${
                        match.top_outcome === 'home' ? 'bg-blue-500/20 text-blue-400' :
                        match.top_outcome === 'away' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {match.top_outcome}
                      </span>
                    </td>
                  </tr>
                ))}
                {matchCTR.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No match CTR data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Daily Average Revenue */}
      {revenueMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <span className="text-2xl">📅</span>
              <span>Daily Average Revenue</span>
            </h4>
            <div className="flex items-end space-x-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Average per day</p>
                <p className="text-4xl font-bold text-emerald-400">
                  ${revenueMetrics.daily_average.toLocaleString()}
                </p>
              </div>
              <div className="text-right ml-auto">
                <p className="text-gray-400 text-sm mb-1">Period</p>
                <p className="text-2xl font-semibold text-white">{revenueMetrics.period_days} days</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Revenue Distribution</span>
                <span>{((revenueMetrics.daily_average * revenueMetrics.period_days) / revenueMetrics.total_revenue * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-green-500 h-3 rounded-full"
                  style={{ width: '85%' }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <span className="text-2xl">💸</span>
              <span>Withdrawals</span>
            </h4>
            <div className="flex items-end space-x-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Withdrawn</p>
                <p className="text-4xl font-bold text-blue-400">
                  ${revenueMetrics.total_withdrawals.toLocaleString()}
                </p>
              </div>
              <div className="text-right ml-auto">
                <p className="text-gray-400 text-sm mb-1">% of Deposits</p>
                <p className="text-2xl font-semibold text-white">
                  {((revenueMetrics.total_withdrawals / revenueMetrics.total_deposits) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Net Position</span>
                <span className="text-emerald-400 font-semibold">
                  +${(revenueMetrics.total_deposits - revenueMetrics.total_withdrawals).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

