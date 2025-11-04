import React, { useState, useEffect } from "react";
import { apiMethods } from "../../lib/api";

interface HeatmapCoordinate {
  x: number;
  y: number;
  clicks: number;
  conversions: number;
  intensity: number;
}

interface ElementHeatmap {
  element_type: string;
  clicks: number;
  conversions: number;
  ctr: number;
}

interface HeatmapData {
  page_path: string;
  coordinates: HeatmapCoordinate[];
  element_heatmap: ElementHeatmap[];
}

export default function ConversionHeatmap() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagePath, setPagePath] = useState("/dashboard");
  const [days, setDays] = useState(30);

  const commonPages = ["/dashboard", "/betting", "/odds", "/wallet", "/profile"];

  useEffect(() => {
    fetchHeatmap();
  }, [pagePath, days]);

  const fetchHeatmap = async () => {
    try {
      setIsLoading(true);
      const data = await apiMethods.get(`/api/analytics/heatmap?page_path=${encodeURIComponent(pagePath)}&days=${days}`);
      setHeatmapData(data);
    } catch (err: any) {
      console.error("Failed to fetch heatmap data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity > 0.8) return "bg-red-500";
    if (intensity > 0.6) return "bg-orange-500";
    if (intensity > 0.4) return "bg-yellow-500";
    if (intensity > 0.2) return "bg-green-500";
    return "bg-blue-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!heatmapData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Failed to load heatmap data</p>
          <button
            onClick={fetchHeatmap}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Create a visual representation (simplified grid)
  const hasData = heatmapData.coordinates && heatmapData.coordinates.length > 0;
  const maxX = hasData ? Math.max(...heatmapData.coordinates.map(c => c.x), 800) : 800;
  const maxY = hasData ? Math.max(...heatmapData.coordinates.map(c => c.y), 600) : 600;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Conversion Heatmap</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Page Path</label>
            <select
              value={pagePath}
              onChange={(e) => setPagePath(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white"
            >
              {commonPages.map((page) => (
                <option key={page} value={page}>{page}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Time Period (days)</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Element Heatmap Stats */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Element Type Performance</h3>
        {heatmapData.element_heatmap && heatmapData.element_heatmap.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400">Element Type</th>
                  <th className="text-left py-3 px-4 text-gray-400">Clicks</th>
                  <th className="text-left py-3 px-4 text-gray-400">Conversions</th>
                  <th className="text-left py-3 px-4 text-gray-400">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.element_heatmap.map((element, idx) => (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-3 px-4 text-white">{element.element_type}</td>
                    <td className="py-3 px-4 text-gray-400">{element.clicks}</td>
                    <td className="py-3 px-4 text-gray-400">{element.conversions}</td>
                    <td className="py-3 px-4 text-green-400">
                      {element.clicks > 0 ? ((element.conversions / element.clicks) * 100).toFixed(2) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No element click data available for this page and time period.</p>
            <p className="text-sm mt-2">Click tracking data will appear here once users interact with elements on this page.</p>
          </div>
        )}
      </div>

      {/* Visual Heatmap */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Click Heatmap</h3>
        <div className="relative bg-black/50 rounded-lg p-4" style={{ minHeight: "400px" }}>
          {hasData ? (
            <>
              <div className="text-sm text-gray-400 mb-4">
                Hover over areas to see click details. Colors indicate click intensity.
              </div>
              <div className="relative" style={{ width: `${Math.min(maxX, 1000)}px`, height: `${Math.min(maxY, 800)}px` }}>
                {heatmapData.coordinates.map((coord, idx) => (
                  <div
                    key={idx}
                    className={`absolute ${getIntensityColor(coord.intensity)} rounded-full opacity-70 hover:opacity-100 transition-opacity cursor-pointer`}
                    style={{
                      left: `${(coord.x / maxX) * 100}%`,
                      top: `${(coord.y / maxY) * 100}%`,
                      width: `${Math.max(10, coord.clicks * 2)}px`,
                      height: `${Math.max(10, coord.clicks * 2)}px`,
                    }}
                    title={`Clicks: ${coord.clicks}, Conversions: ${coord.conversions}, Intensity: ${(coord.intensity * 100).toFixed(1)}%`}
                  />
                ))}
              </div>
              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
                <span>Legend:</span>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 rounded"></div> Low</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded"></div> Medium</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded"></div> High</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500 rounded"></div> Very High</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded"></div> Maximum</div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-400 text-lg mb-2">No click data available</p>
                <p className="text-gray-500 text-sm">
                  No clicks have been tracked for <strong>{pagePath}</strong> in the last {days} days.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Click data will appear here once users interact with elements on this page.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

