import React, { useState, useEffect } from "react";
import { apiMethods } from "../../lib/api";

interface CountryTest {
  country_code: string;
  country_name: string;
  allowed: boolean;
  reason?: string;
  restriction_type?: string;
}

interface RegionalRestriction {
  id: number;
  country_code: string;
  country_name: string;
  is_restricted: boolean;
  restriction_type: string | null;
}

export default function ComplianceTesting() {
  const [testResult, setTestResult] = useState<CountryTest | null>(null);
  const [testCountry, setTestCountry] = useState("US");
  const [isTesting, setIsTesting] = useState(false);
  const [restrictions, setRestrictions] = useState<RegionalRestriction[]>([]);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    fetchRestrictions();
  }, []);

  const fetchRestrictions = async () => {
    try {
      const data = await apiMethods.get("/api/analytics/regions");
      setRestrictions(data);
    } catch (err: any) {
      console.error("Failed to fetch restrictions:", err);
    }
  };

  const testGeoBlocking = async (countryCode?: string) => {
    const code = countryCode ?? testCountry;
    if (!code) return;
    try {
      setIsTesting(true);
      setTestCountry(code);
      const result = await apiMethods.get(`/api/analytics/check-country?test_country=${code}`);
      setTestResult(result);
    } catch (err: any) {
      console.error("Failed to test geo-blocking:", err);
    } finally {
      setIsTesting(false);
    }
  };

  const testBannerDisplay = () => {
    setShowBanner(!showBanner);
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Compliance Testing Suite</h2>
        <p className="text-gray-400">Test geo-blocking, responsible gaming banners, and compliance features</p>
      </div>

      {/* Geo-Blocking Test */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">🌍 Geo-Blocking Tester</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Test Country Code (e.g., US, PH, GB)</label>
            <input
              type="text"
              value={testCountry}
              onChange={(e) => setTestCountry(e.target.value.toUpperCase())}
              placeholder="US"
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white"
              maxLength={2}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => testGeoBlocking()}
              disabled={isTesting || !testCountry}
              className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isTesting ? "Testing..." : "Test Geo-Blocking"}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`mt-4 p-4 rounded-lg border ${
            testResult.allowed
              ? "bg-green-500/20 border-green-500/50"
              : "bg-red-500/20 border-red-500/50"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">
                {testResult.country_name} ({testResult.country_code})
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                testResult.allowed
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}>
                {testResult.allowed ? "ALLOWED" : "BLOCKED"}
              </span>
            </div>
            {testResult.reason && (
              <p className="text-sm text-gray-300">{testResult.reason}</p>
            )}
            {testResult.restriction_type && (
              <p className="text-xs text-gray-400 mt-2">Type: {testResult.restriction_type}</p>
            )}
          </div>
        )}
      </div>

      {/* Responsible Gaming Banner Test */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">🎯 Responsible Gaming Banner Tester</h3>
        <button
          onClick={testBannerDisplay}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          {showBanner ? "Hide Banner" : "Show Banner"}
        </button>

        {showBanner && (
          <div className="mt-4 p-6 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-bold text-yellow-400 mb-2">🎲 Responsible Gaming</h4>
                <p className="text-gray-300 text-sm mb-2">
                  Gambling should be fun, not a way to make money. Set limits, take breaks, and play responsibly.
                </p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• Set deposit and betting limits in your profile</p>
                  <p>• Use self-exclusion if you need a break</p>
                  <p>• Get help at: begambleaware.org or gamcare.org.uk</p>
                </div>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg">
                Set Limits
              </button>
              <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg">
                Self-Exclude
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Regional Restrictions List */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">🗺️ Regional Restrictions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400">Country</th>
                <th className="text-left py-3 px-4 text-gray-400">Code</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-gray-400">Type</th>
              </tr>
            </thead>
            <tbody>
              {restrictions.map((restriction) => (
                <tr key={restriction.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">{restriction.country_name}</td>
                  <td className="py-3 px-4 text-gray-400 font-mono">{restriction.country_code}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      restriction.is_restricted
                        ? "bg-red-500/20 text-red-400"
                        : "bg-green-500/20 text-green-400"
                    }`}>
                      {restriction.is_restricted ? "Restricted" : "Allowed"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{restriction.restriction_type || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Scenarios */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">🧪 Test Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-black/50 rounded-lg border border-white/10">
            <h4 className="font-semibold text-white mb-2">Test Allowed Country</h4>
            <p className="text-sm text-gray-400 mb-2">Test access from an allowed country</p>
            <button
              onClick={() => testGeoBlocking("US")}
              className="text-sm px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded"
            >
              Test US
            </button>
          </div>
          <div className="p-4 bg-black/50 rounded-lg border border-white/10">
            <h4 className="font-semibold text-white mb-2">Test Restricted Country</h4>
            <p className="text-sm text-gray-400 mb-2">Test blocking from restricted country</p>
            <button
              onClick={() => testGeoBlocking("PH")}
              className="text-sm px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
            >
              Test Restricted
            </button>
          </div>
          <div className="p-4 bg-black/50 rounded-lg border border-white/10">
            <h4 className="font-semibold text-white mb-2">Banner Preview</h4>
            <p className="text-sm text-gray-400 mb-2">Preview responsible gaming banner</p>
            <button
              onClick={testBannerDisplay}
              className="text-sm px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Toggle Banner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

