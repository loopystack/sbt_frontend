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

export default function ROIDashboard() {
  const [roiData, setRoiData] = useState<ROIMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  useEffect(() => {
    fetchROIData();
  }, [selectedPeriod]);

  const fetchROIData = async () => {
    try {
      setIsLoading(true);
      const data = await apiMethods.get(`/api/analytics/roi-dashboard?days=${selectedPeriod}`);
      setRoiData(data);
    } catch (err: any) {
      console.error("Failed to fetch ROI data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!roiData) return null;

  return (
    <div className="space-y-6">
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
          <div className="text-3xl font-bold text-green-400">${roiData.total_revenue.toLocaleString()}</div>
        </div>
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Total Cost</div>
          <div className="text-3xl font-bold text-red-400">${roiData.total_cost.toLocaleString()}</div>
        </div>
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Net Profit</div>
          <div className="text-3xl font-bold text-white">${roiData.net_profit.toLocaleString()}</div>
        </div>
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">ROI</div>
          <div className={`text-3xl font-bold ${roiData.roi_percentage >= 0 ? "text-green-400" : "text-red-400"}`}>
            {roiData.roi_percentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Daily ROI Trend */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Daily ROI Trend</h3>
        <div style={{ height: "300px" }}>
          <Line
            data={{
              labels: roiData.daily_roi_trend.map(item => new Date(item.date).toLocaleDateString()),
              datasets: [
                {
                  label: "ROI %",
                  data: roiData.daily_roi_trend.map(item => item.roi),
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
      </div>

      {/* ROI by Source */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">ROI by Source</h3>
        <div style={{ height: "300px" }}>
          <Bar
            data={{
              labels: Object.keys(roiData.roi_by_source),
              datasets: [
                {
                  label: "ROI %",
                  data: Object.values(roiData.roi_by_source),
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
      </div>

      {/* ROI by Campaign */}
      {Object.keys(roiData.roi_by_campaign).length > 0 && (
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">ROI by Campaign</h3>
          <div style={{ height: "300px" }}>
            <Bar
              data={{
                labels: Object.keys(roiData.roi_by_campaign),
                datasets: [
                  {
                    label: "ROI %",
                    data: Object.values(roiData.roi_by_campaign),
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

