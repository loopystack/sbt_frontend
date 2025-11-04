import React, { useState, useEffect } from "react";
import { apiMethods } from "../../lib/api";

interface MonitoringMetrics {
  active_users: number;
  active_sessions: number;
  transactions_per_minute: number;
  error_rate: number;
  avg_response_time: number;
  conversion_funnel: Record<string, number>;
  system_health: string;
  timestamp: string;
}

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const data = await apiMethods.get("/api/analytics/monitoring");
      setMetrics(data);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Failed to fetch monitoring metrics:", err);
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy": return "text-green-400 bg-green-500/20";
      case "degraded": return "text-yellow-400 bg-yellow-500/20";
      case "critical": return "text-red-400 bg-red-500/20";
      default: return "text-gray-400 bg-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* System Health Banner */}
      <div className={`backdrop-blur-xl border rounded-xl p-6 ${getHealthColor(metrics.system_health)} border-current/20`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">System Monitoring</h2>
            <p className="opacity-80">Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}</p>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-70 mb-1">System Status</div>
            <div className="text-3xl font-bold">{metrics.system_health.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Active Users</div>
          <div className="text-3xl font-bold text-white">{metrics.active_users}</div>
          <div className="text-xs text-gray-500 mt-1">Last 30 minutes</div>
        </div>
        
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Active Sessions</div>
          <div className="text-3xl font-bold text-white">{metrics.active_sessions}</div>
          <div className="text-xs text-gray-500 mt-1">Last 5 minutes</div>
        </div>
        
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Transactions/min</div>
          <div className="text-3xl font-bold text-white">{metrics.transactions_per_minute.toFixed(1)}</div>
          <div className="text-xs text-gray-500 mt-1">Hourly average</div>
        </div>
        
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Error Rate</div>
          <div className={`text-3xl font-bold ${
            metrics.error_rate > 10 ? "text-red-400" :
            metrics.error_rate > 5 ? "text-yellow-400" :
            "text-green-400"
          }`}>
            {metrics.error_rate.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Failed transactions</div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Conversion Funnel (Last 7 Days)</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Signups</span>
              <span className="text-white font-semibold">{metrics.conversion_funnel.signups}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: "100%" }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">First Deposits</span>
              <span className="text-white font-semibold">{metrics.conversion_funnel.first_deposit}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all" 
                style={{ width: `${Math.min((metrics.conversion_funnel.first_deposit / metrics.conversion_funnel.signups * 100) || 0, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">First Bets</span>
              <span className="text-white font-semibold">{metrics.conversion_funnel.first_bet}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all" 
                style={{ 
                  width: `${Math.min(
                    metrics.conversion_funnel.first_deposit > 0 
                      ? (metrics.conversion_funnel.first_bet / metrics.conversion_funnel.first_deposit * 100)
                      : (metrics.conversion_funnel.first_bet / Math.max(metrics.conversion_funnel.signups, 1) * 100),
                    100
                  )}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Response Time */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Average Response Time</h3>
            <p className="text-gray-400 text-sm">API endpoint response time</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${
              metrics.avg_response_time > 500 ? "text-red-400" :
              metrics.avg_response_time > 200 ? "text-yellow-400" :
              "text-green-400"
            }`}>
              {metrics.avg_response_time.toFixed(0)}ms
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

