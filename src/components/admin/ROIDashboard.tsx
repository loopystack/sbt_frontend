import React, { useState, useEffect } from "react";
import { apiMethods } from "../../lib/api";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ROIMetrics {
  total_revenue: number;
  total_cost: number;
  net_profit: number;
  roi_percentage: number;
  period_days: number;
  roi_by_source: Record<string, number>;
  roi_by_campaign: Record<string, number>;
  daily_roi_trend: Array<{
    date: string;
    revenue: number;
    cost: number;
    roi: number;
  }>;
}

const EMPTY_ROI: ROIMetrics = {
  total_revenue: 0,
  total_cost: 0,
  net_profit: 0,
  roi_percentage: 0,
  period_days: 30,
  roi_by_source: {},
  roi_by_campaign: {},
  daily_roi_trend: [],
};

export default function ROIDashboard() {
  const [roiData, setRoiData] = useState<ROIMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  useEffect(() => {
    fetchROIData();
  }, [selectedPeriod]);

  const fetchROIData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiMethods.get(`/api/analytics/roi-dashboard?days=${selectedPeriod}`);
      setRoiData(data);
    } catch (err: any) {
      console.error("Failed to fetch ROI data:", err);
      const message = err?.status === 403 ? "Admin access required" : (err?.message || "Failed to load ROI data.");
      setError(message);
      setRoiData(EMPTY_ROI);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !roiData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const data = roiData ?? EMPTY_ROI;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 flex items-center justify-between">
          <span className="text-amber-200">{error}</span>
          <button
            type="button"
            onClick={fetchROIData}
            className="px-3 py-1 rounded bg-amber-500/30 text-amber-200 hover:bg-amber-500/50"
          >
            Retry
          </button>
        </div>
      )}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">ROI Dashboard</h2>
        <div className="flex gap-4">
          {[7, 30, 90, 365].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedPeriod === days
                  ? "bg-purple-500 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {days === 365 ? "1y" : `${days}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Total Revenue</div>
          <div className="text-3xl font-bold text-green-400">${data.total_revenue.toLocaleString()}</div>
        </div>
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Total Cost</div>
          <div className="text-3xl font-bold text-red-400">${data.total_cost.toLocaleString()}</div>
        </div>
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Net Profit</div>
          <div className="text-3xl font-bold text-white">${data.net_profit.toLocaleString()}</div>
        </div>
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">ROI</div>
          <div className={`text-3xl font-bold ${data.roi_percentage >= 0 ? "text-green-400" : "text-red-400"}`}>
            {data.roi_percentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Daily ROI Trend */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Daily ROI Trend</h3>
        {data.daily_roi_trend && data.daily_roi_trend.length > 0 ? (
          <div style={{ height: "300px" }}>
            <Line
              data={{
                labels: data.daily_roi_trend.map(item => {
                  try {
                    return new Date(item.date).toLocaleDateString();
                  } catch (e) {
                    return item.date || 'Unknown';
                  }
                }),
                datasets: [
                  {
                    label: "ROI %",
                    data: data.daily_roi_trend.map(item => item.roi || 0),
                    borderColor: "#8B5CF6",
                    backgroundColor: "rgba(139, 92, 246, 0.1)",
                    tension: 0.4,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: { color: "#9CA3AF" },
                  },
                },
                scales: {
                  x: {
                    ticks: { color: "#9CA3AF" },
                    grid: { color: "#374151" },
                  },
                  y: {
                    ticks: { color: "#9CA3AF" },
                    grid: { color: "#374151" },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p>No daily ROI trend data available for this period.</p>
          </div>
        )}
      </div>

      {/* ROI by Source */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">ROI by Source</h3>
        {Object.keys(data.roi_by_source).length > 0 ? (
          <div style={{ height: "300px" }}>
            <Bar
              data={{
                labels: Object.keys(data.roi_by_source),
                datasets: [
                  {
                    label: "ROI %",
                    data: Object.values(data.roi_by_source),
                    backgroundColor: "#8B5CF6",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: { color: "#9CA3AF" },
                  },
                },
                scales: {
                  x: {
                    ticks: { color: "#9CA3AF" },
                    grid: { color: "#374151" },
                  },
                  y: {
                    ticks: { color: "#9CA3AF" },
                    grid: { color: "#374151" },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p>No ROI data by source available.</p>
            <p className="text-sm mt-2">Cost tracking per source is not yet implemented. ROI by source will appear once cost tracking is enabled.</p>
          </div>
        )}
      </div>

      {/* ROI by Campaign */}
      {Object.keys(data.roi_by_campaign).length > 0 && (
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">ROI by Campaign</h3>
          <div style={{ height: "300px" }}>
            <Bar
              data={{
                labels: Object.keys(data.roi_by_campaign),
                datasets: [
                  {
                    label: "ROI %",
                    data: Object.values(data.roi_by_campaign),
                    backgroundColor: "#3B82F6",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: { color: "#9CA3AF" },
                  },
                },
                scales: {
                  x: {
                    ticks: { color: "#9CA3AF" },
                    grid: { color: "#374151" },
                  },
                  y: {
                    ticks: { color: "#9CA3AF" },
                    grid: { color: "#374151" },
                  },
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

