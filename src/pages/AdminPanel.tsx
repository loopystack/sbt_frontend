import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { isAdminUser } from "../services/authService";
import AdminDashboard from "../components/admin/AdminDashboard";
import UserManagement from "../components/admin/UserManagement";
import BettingManagement from "../components/admin/BettingManagement";
import TransactionManagement from "../components/admin/TransactionManagement";
import WithdrawalManagement from "../components/admin/WithdrawalManagement";
import CTRRevenueDashboard from "../components/admin/CTRRevenueDashboard";
import ComplianceDashboard from "../components/admin/ComplianceDashboard";
import AffiliateDashboard from "../components/admin/AffiliateDashboard";
import ROIDashboard from "../components/admin/ROIDashboard";
import ConversionHeatmap from "../components/admin/ConversionHeatmap";
import ComplianceTesting from "../components/admin/ComplianceTesting";
import SystemHealthDashboard from "../components/admin/SystemHealthDashboard";
import SystemAlertsManagement from "../components/admin/SystemAlertsManagement";
import ReconciliationReports from "../components/admin/ReconciliationReports";
import RevenueReportDashboard from "../components/admin/RevenueReportDashboard";

const VALID_SECTIONS = new Set([
  "dashboard", "revenue-report", "ctr-revenue", "roi", "affiliates", "heatmap",
  "compliance", "compliance-test", "system-health", "system-alerts", "reconciliation",
  "users", "betting", "transactions", "withdrawals"
]);

export default function AdminPanel() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const activeTab = (section && VALID_SECTIONS.has(section)) ? section : "dashboard";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Wait for authentication check to complete before making decisions
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }

    // Only admin users may access /admin routes; redirect regular users to dashboard
    if (!isAdminUser(user)) {
      navigate("/dashboard");
      return;
    }
  }, [isAuthenticated, user, navigate, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-sm">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", name: "Dashboard", icon: "📊" },
    { id: "revenue-report", name: "GGR/NGR & Cashflow", icon: "💰" },
    { id: "ctr-revenue", name: "CTR & Revenue", icon: "📈" },
    { id: "roi", name: "ROI", icon: "💰" },
    { id: "affiliates", name: "Affiliates", icon: "🤝" },
    { id: "heatmap", name: "Heatmaps", icon: "🔥" },
    { id: "compliance", name: "Compliance", icon: "🛡️" },
    { id: "compliance-test", name: "Compliance Test", icon: "🧪" },
    { id: "system-health", name: "System Health", icon: "❤️" },
    { id: "system-alerts", name: "System Alerts", icon: "🚨" },
    { id: "reconciliation", name: "Reconciliation", icon: "⚖️" },
    { id: "users", name: "Users", icon: "👥" },
    { id: "betting", name: "Betting Records", icon: "🎯" },
    { id: "transactions", name: "Transactions", icon: "💵" },
    { id: "withdrawals", name: "Withdrawals", icon: "💸" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Mobile overlay when sidebar open */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        />
      )}

      {/* Left Sidebar - Desktop fixed, Mobile slide-out drawer */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex-shrink-0
          bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50
          transform transition-transform duration-200 ease-out
          lg:translate-x-0
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar brand */}
          <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white truncate">Admin</h1>
              <p className="text-xs text-slate-400 truncate">Sports Betting</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "dashboard") {
                    navigate("/admin");
                  } else {
                    navigate(`/admin/${tab.id}`);
                  }
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                  }
                `}
              >
                <span className="text-lg w-6 text-center flex-shrink-0" aria-hidden>{tab.icon}</span>
                <span className="truncate">{tab.name}</span>
              </button>
            ))}
          </nav>

          {/* Sidebar footer - user & back */}
          <div className="p-3 border-t border-slate-700/50 space-y-2">
            <div className="px-3 py-2 rounded-lg bg-slate-800/50">
              <p className="text-xs text-slate-400">Logged in as</p>
              <p className="text-sm font-medium text-white truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="w-full px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white text-sm font-medium transition-colors"
            >
              Back to Main Site
            </button>
          </div>
        </div>
      </aside>

      {/* Main area: header + content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 bg-black/40 backdrop-blur-xl border-b border-slate-700/50">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
            <p className="text-xs text-slate-400">Sports Betting Management</p>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white">{user?.username}</p>
              <p className="text-xs text-slate-400 truncate max-w-[180px]">{user?.email}</p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="px-3 py-2 rounded-lg bg-slate-600/30 hover:bg-slate-500/40 text-slate-300 hover:text-white text-sm transition-colors"
            >
              Back to Site
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
            {activeTab === "dashboard" && <AdminDashboard onNavigate={(path) => navigate(path)} />}
            {activeTab === "ctr-revenue" && <CTRRevenueDashboard />}
            {activeTab === "roi" && <ROIDashboard />}
            {activeTab === "affiliates" && <AffiliateDashboard />}
            {activeTab === "heatmap" && <ConversionHeatmap />}
            {activeTab === "compliance" && <ComplianceDashboard />}
            {activeTab === "compliance-test" && <ComplianceTesting />}
            {activeTab === "system-health" && <SystemHealthDashboard />}
            {activeTab === "system-alerts" && <SystemAlertsManagement />}
            {activeTab === "revenue-report" && <RevenueReportDashboard />}
            {activeTab === "reconciliation" && <ReconciliationReports />}
            {activeTab === "users" && <UserManagement />}
            {activeTab === "betting" && <BettingManagement />}
            {activeTab === "transactions" && <TransactionManagement />}
            {activeTab === "withdrawals" && <WithdrawalManagement />}
          </div>
        </main>
      </div>
    </div>
  );
}
