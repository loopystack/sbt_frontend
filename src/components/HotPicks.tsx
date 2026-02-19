import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";
import { apiMethods } from "../lib/api";
import type { MatchingInfo } from "../store/matchinginfo/types";

const HOT_PICKS_LIMIT = 5;

function formatTimeHHMM(t: string | null | undefined): string {
  if (!t || typeof t !== "string") return "00:00";
  const trimmed = String(t).trim();
  if (/^\d{1,2}:\d{2}:\d{2}/.test(trimmed)) {
    const [h, m] = trimmed.split(":");
    return `${h}:${m}`;
  }
  return trimmed;
}

function formatMatchDate(dateString: string): string {
  const d = new Date(dateString + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Best decimal odds for display (max of 1/X/2). */
function bestOdds(m: MatchingInfo): string {
  const o1 = m.odd_1 != null ? Number(m.odd_1) : 0;
  const oX = m.odd_X != null ? Number(m.odd_X) : 0;
  const o2 = m.odd_2 != null ? Number(m.odd_2) : 0;
  const best = Math.max(o1, oX, o2);
  return best > 0 ? best.toString() : "";
}

export default function HotPicks() {
  const navigate = useNavigate();
  const { getOddsInFormat } = useOddsFormat();
  const [picks, setPicks] = useState<Array<{
    id: number;
    teams: string;
    sport: string;
    league: string;
    country: string;
    odds: string;
    confidence: "High" | "Medium";
    time: string;
    date: string;
    tip: string;
    analysis: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHotPicks = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiMethods.get<{
          odds: MatchingInfo[];
          total: number;
          page: number;
          size: number;
          pages: number;
        }>(`/api/odds/featured?limit=${HOT_PICKS_LIMIT}`);

        if (!result.odds || result.odds.length === 0) {
          setPicks([]);
          return;
        }

        const mapped = result.odds.slice(0, HOT_PICKS_LIMIT).map((m, i) => ({
          id: m.id,
          teams: `${m.home_team} vs ${m.away_team}`,
          sport: "Football",
          league: m.league || "",
          country: m.country || "",
          odds: bestOdds(m),
          confidence: (i < 2 ? "High" : "Medium") as "High" | "Medium",
          time: formatTimeHHMM(m.time),
          date: formatMatchDate(m.date),
          tip: "Compare odds across bookmakers for the best value.",
          analysis: `${m.league ? m.league + " — " : ""}Featured match. Compare odds before placing a bet.`,
        }));
        setPicks(mapped);
      } catch (err) {
        console.error("HotPicks: fetch failed", err);
        setError("Failed to load hot picks");
        setPicks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHotPicks();
  }, []);

  const formatOdds = (odds: string): string => {
    if (!odds || !odds.trim()) return odds || "—";
    const decimalOdds = OddsConverter.stringToDecimal(odds);
    return getOddsInFormat(decimalOdds);
  };

  const handleViewAll = () => navigate("/all-events");
  const handleCompareOdds = (id: number) => navigate(`/all-events?match=${id}`);

  return (
    <section className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 px-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text">Hot Picks</h2>
        <button
          type="button"
          onClick={handleViewAll}
          className="text-accent hover:text-accent/80 text-sm font-medium self-start sm:self-auto"
        >
          View All →
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-xl p-4 sm:p-5 min-h-[280px] sm:min-h-[320px] animate-pulse"
            >
              <div className="h-4 bg-muted/20 rounded w-1/3 mb-4" />
              <div className="h-5 bg-muted/20 rounded w-full mb-3" />
              <div className="h-4 bg-muted/20 rounded w-2/3 mb-4" />
              <div className="h-8 bg-muted/20 rounded w-1/2 mb-4" />
              <div className="h-10 bg-muted/20 rounded w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-surface border border-border rounded-xl p-6 text-center text-muted">
          {error}
        </div>
      ) : picks.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-6 text-center text-muted">
          No hot picks available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {picks.map((pick) => (
            <div
              key={pick.id}
              className="bg-surface border border-border rounded-xl p-4 sm:p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group min-h-[280px] sm:min-h-[320px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0" />
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">
                    {pick.sport}
                  </span>
                </div>
                <span
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                    pick.confidence === "High"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : pick.confidence === "Medium"
                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {pick.confidence}
                </span>
              </div>

              <h3 className="font-bold text-text mb-2 sm:mb-3 text-base sm:text-lg leading-tight line-clamp-2">
                {pick.teams}
              </h3>

              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-xs sm:text-sm text-muted truncate">
                  {pick.league}
                </span>
                <div className="text-right">
                  <div className="text-xs sm:text-sm text-muted">{pick.date}</div>
                  <div className="text-base sm:text-lg font-bold text-accent">
                    {pick.time}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                <div className="text-center">
                  <span className="text-xs text-muted block">Best Odds</span>
                  <span className="text-xl sm:text-2xl font-bold text-text">
                    {formatOdds(pick.odds)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCompareOdds(pick.id)}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors group-hover:scale-105 flex-shrink-0"
                >
                  Compare Odds
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center mb-3 sm:mb-4">
                <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-3 sm:p-4 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-muted mb-2">EXPERT TIP</div>
                    <div className="text-sm text-text leading-relaxed">
                      {pick.tip}
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted mb-1">MATCH ANALYSIS</div>
                  <div className="text-sm text-text">{pick.analysis}</div>
                </div>
              </div>

              <div className="bg-bg rounded-lg p-2 sm:p-3">
                <span className="text-xs text-muted block mb-1">
                  Confidence Level
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/20 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        pick.confidence === "High"
                          ? "bg-green-500 w-full"
                          : pick.confidence === "Medium"
                            ? "bg-yellow-500 w-2/3"
                            : "bg-red-500 w-1/3"
                      }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-text">
                    {pick.confidence}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
