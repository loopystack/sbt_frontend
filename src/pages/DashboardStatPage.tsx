import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { bettingService, BettingStats } from "../services/bettingService";

export type StatType = "total-bets" | "success-rate" | "total-loss" | "active-bets";

const STAT_CONFIG: Record<
  StatType,
  {
    title: string;
    subtitle: string;
    gradient: string;
    icon: React.ReactNode;
    emoji: string;
    formatValue: (stats: BettingStats | null, loading: boolean) => React.ReactNode;
  }
> = {
  "total-bets": {
    title: "Total Bets Placed",
    subtitle: "All-time number of bets you have placed",
    gradient: "from-blue-500 via-blue-600 to-indigo-700",
    emoji: "📊",
    icon: (
      <svg className="w-16 h-16 sm:w-20 sm:h-20 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
      </svg>
    ),
    formatValue: (stats, loading) =>
      loading ? (
        <div className="h-16 w-24 bg-white/20 rounded-xl animate-pulse" />
      ) : (
        <span className="text-6xl sm:text-7xl md:text-8xl font-bold tabular-nums tracking-tight">
          {stats?.total_bets ?? 0}
        </span>
      ),
  },
  "success-rate": {
    title: "Success Rate",
    subtitle: "Percentage of settled bets that you won",
    gradient: "from-emerald-500 via-green-600 to-teal-700",
    emoji: "🏆",
    icon: (
      <svg className="w-16 h-16 sm:w-20 sm:h-20 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
    formatValue: (stats, loading) =>
      loading ? (
        <div className="h-16 w-28 bg-white/20 rounded-xl animate-pulse" />
      ) : (
        <span className="text-6xl sm:text-7xl md:text-8xl font-bold tabular-nums tracking-tight">
          {Number(stats?.win_rate ?? 0).toFixed(1)}%
        </span>
      ),
  },
  "total-loss": {
    title: "Total Profit & Loss",
    subtitle: "Net result from all settled bets",
    gradient:
      "from-[#0f766e] via-[#0d9488] to-[#14b8a6]",
    emoji: "💰",
    icon: (
      <svg className="w-16 h-16 sm:w-20 sm:h-20 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
    formatValue: (stats, loading) => {
      const profit = stats?.total_profit ?? 0;
      const rounded = Math.round(profit * 100) / 100;
      const abs = Math.abs(rounded);
      const str = abs.toFixed(2);
      if (loading) return <div className="h-16 w-32 bg-white/20 rounded-xl animate-pulse" />;
      return (
        <span
          className={`text-5xl sm:text-6xl md:text-7xl font-bold tabular-nums tracking-tight ${
            profit >= 0 ? "text-white" : "text-red-100"
          }`}
        >
          {profit >= 0 ? "+" : "−"}${str}
        </span>
      );
    },
  },
  "active-bets": {
    title: "Active Bets",
    subtitle: "Bets still awaiting match result",
    gradient: "from-purple-500 via-violet-600 to-indigo-700",
    emoji: "⚡",
    icon: (
      <svg className="w-16 h-16 sm:w-20 sm:h-20 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    formatValue: (stats, loading) =>
      loading ? (
        <div className="h-16 w-24 bg-white/20 rounded-xl animate-pulse" />
      ) : (
        <span className="text-6xl sm:text-7xl md:text-8xl font-bold tabular-nums tracking-tight">
          {stats?.pending_bets ?? 0}
        </span>
      ),
  },
};

function formatCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return rounded.toFixed(2);
}

export default function DashboardStatPage() {
  const { statType } = useParams<{ statType: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<BettingStats | null>(null);
  const [loading, setLoading] = useState(true);

  const key = (statType as StatType) || "total-bets";
  const config = STAT_CONFIG[key] ?? STAT_CONFIG["total-bets"];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/signin", { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    bettingService
      .getBettingStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate]);

  if (!statType || !STAT_CONFIG[statType as StatType]) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg))] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[hsl(var(--muted))] mb-4">Unknown stat</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isProfit = (stats?.total_profit ?? 0) >= 0;
  const gradientClass =
    key === "total-loss"
      ? isProfit
        ? "from-emerald-500 via-green-600 to-teal-700"
        : "from-red-500 via-rose-600 to-pink-700"
      : config.gradient;

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))]">
      {/* Back bar */}
      <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-[hsl(var(--muted))] hover:text-[hsl(var(--text))] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back to Dashboard</span>
        </button>
      </div>

      {/* Hero card */}
      <div
        className={`mx-4 mt-6 sm:mx-6 sm:mt-8 max-w-2xl mx-auto rounded-3xl bg-gradient-to-br ${gradientClass} p-8 sm:p-12 shadow-2xl overflow-hidden relative`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
            {config.icon}
          </div>
          <p className="text-white/90 text-sm sm:text-base font-medium uppercase tracking-widest mb-1">
            {config.title}
          </p>
          <p className="text-white/70 text-xs sm:text-sm mb-8 max-w-sm">{config.subtitle}</p>
          <div className="text-white flex flex-col items-center justify-center min-h-[120px]">
            {config.formatValue(stats, loading)}
          </div>
          <span className="text-4xl mt-4 opacity-90">{config.emoji}</span>
        </div>
      </div>

      {/* Extra context for this stat */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-8 pb-12">
        <div className="bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-2xl p-6">
          <h3 className="text-[hsl(var(--text))] font-semibold mb-4 text-sm uppercase tracking-wider text-[hsl(var(--muted))]">
            Summary
          </h3>
          {key === "total-bets" && (
            <ul className="space-y-2 text-[hsl(var(--text))] text-sm">
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Total amount wagered</span>
                <span className="font-medium">${stats ? formatCurrency(stats.total_amount_bet) : "0.00"}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Potential winnings (if all won)</span>
                <span className="font-medium">${stats ? formatCurrency(stats.total_potential_win) : "0.00"}</span>
              </li>
            </ul>
          )}
          {key === "success-rate" && (
            <ul className="space-y-2 text-[hsl(var(--text))] text-sm">
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Won</span>
                <span className="font-medium text-emerald-400">{stats?.won_bets ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Lost</span>
                <span className="font-medium text-red-400">{stats?.lost_bets ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Settled bets</span>
                <span className="font-medium">{(stats?.won_bets ?? 0) + (stats?.lost_bets ?? 0)}</span>
              </li>
            </ul>
          )}
          {key === "total-loss" && (
            <ul className="space-y-2 text-[hsl(var(--text))] text-sm">
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Won bets</span>
                <span className="font-medium text-emerald-400">{stats?.won_bets ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Lost bets</span>
                <span className="font-medium text-red-400">{stats?.lost_bets ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Total profit/loss</span>
                <span className={`font-medium ${(stats?.total_profit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(stats?.total_profit ?? 0) >= 0 ? "+" : ""}${stats ? formatCurrency(stats.total_profit) : "0.00"}
                </span>
              </li>
            </ul>
          )}
          {key === "active-bets" && (
            <ul className="space-y-2 text-[hsl(var(--text))] text-sm">
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Total bets</span>
                <span className="font-medium">{stats?.total_bets ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Settled</span>
                <span className="font-medium">{(stats?.won_bets ?? 0) + (stats?.lost_bets ?? 0)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[hsl(var(--muted))]">Pending</span>
                <span className="font-medium text-violet-400">{stats?.pending_bets ?? 0}</span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
