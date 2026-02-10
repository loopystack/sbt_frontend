import React, { useState, useEffect, useCallback } from "react";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import OddsTable from "../components/OddsTable";
import { getBaseUrl } from "../config/api";

export interface SureBetRow {
  id: string;
  sport: string;
  country: string;
  league: string;
  teams: string;
  date: string;
  time: string;
  best_odd_1: number;
  best_odd_x: number;
  best_odd_2: number;
  profit_percent: number;
  stake_1: number;
  stake_x: number;
  stake_2: number;
  total_stake: number;
  guaranteed_return: number;
}

export default function SureBets() {
  const { selectedLeague } = useCountry();
  const [selectedSport, setSelectedSport] = useState("All sports");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("today");
  const [sureBets, setSureBets] = useState<SureBetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const sports = [
    { name: "All sports", icon: "🏆" },
    { name: "Football", icon: "⚽" },
    { name: "Basketball", icon: "🏀" },
    { name: "Tennis", icon: "🎾" },
    { name: "Baseball", icon: "⚾" },
    { name: "Hockey", icon: "🏒" }
  ];
  const timeFilters = [
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "week", label: "This Week" }
  ];

  const getDateRange = useCallback(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    if (selectedTimeFilter === "tomorrow") {
      const t2 = new Date(today);
      t2.setDate(t2.getDate() + 1);
      const d2 = String(t2.getDate()).padStart(2, "0");
      const m2 = String(t2.getMonth() + 1).padStart(2, "0");
      const tomorrowStr = `${t2.getFullYear()}-${m2}-${d2}`;
      return { date_from: tomorrowStr, date_to: tomorrowStr };
    }
    if (selectedTimeFilter === "week") {
      const tEnd = new Date(today);
      tEnd.setDate(tEnd.getDate() + 6);
      const de = String(tEnd.getDate()).padStart(2, "0");
      const me = String(tEnd.getMonth() + 1).padStart(2, "0");
      const endStr = `${tEnd.getFullYear()}-${me}-${de}`;
      return { date_from: todayStr, date_to: endStr };
    }
    return { date_from: todayStr, date_to: todayStr };
  }, [selectedTimeFilter]);

  const fetchSureBets = useCallback(async () => {
    if (selectedLeague) return;
    setLoading(true);
    try {
      const { date_from, date_to } = getDateRange();
      const params = new URLSearchParams({
        page: String(page),
        size: "20",
        date_from,
        date_to,
      });
      const res = await fetch(`${getBaseUrl()}/api/odds/sure-bets?${params}`);
      if (!res.ok) throw new Error("Failed to fetch sure bets");
      const data = await res.json();
      setSureBets(data.items || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.pages ?? 0);
    } catch {
      setSureBets([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [selectedLeague, page, selectedTimeFilter, getDateRange]);

  useEffect(() => {
    if (selectedLeague) return;
    fetchSureBets();
  }, [selectedLeague, fetchSureBets]);

  useEffect(() => {
    if (!selectedLeague) setPage(1);
  }, [selectedTimeFilter, selectedSport, selectedLeague]);

  const hasSureBets = sureBets.length > 0;

  // If a league is selected, show the OddsTable (same as Home page)
  if (selectedLeague) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable />
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">BC.GAME</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Crypto Casino</p>
                <p className="text-xs sm:text-sm opacity-95">100% + Free Bet</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BC.GAME")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">bet365</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Global Leader</p>
                <p className="text-xs sm:text-sm opacity-95">Safety Net</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet365")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">BETINASIA</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Premium Sportsbook</p>
                <p className="text-xs sm:text-sm opacity-95">100% Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETINASIA")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="text-sm text-muted px-2">
        Home &gt; Sure Bets
      </div>
      <div className="space-y-3 sm:space-y-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          OddsPortal Sure Bets - Find Sure Odds Today
        </h1>
        <p className="text-muted text-sm max-w-4xl leading-relaxed">
          Sure bets are a way for you to win guaranteed profit by betting on two different outcomes 
          thanks to arbitrage odds from different online bookmakers. Due to online betting sites 
          offering different odds for the same markets, you can take advantage and earn profit 
          regardless of the result of the market for the match.
        </p>
        <div className="pt-2">
          <a 
            href="#" 
            className="text-accent hover:text-accent/80 font-semibold text-sm transition-colors"
          >
            Want more than 10 sure bets? GET MORE &gt;&gt;
          </a>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 shadow-sm mx-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <span className="text-sm font-medium text-muted">Filter:</span>
          <select
            value={selectedTimeFilter}
            onChange={(e) => setSelectedTimeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
          >
            {timeFilters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide px-2 pb-2">
        {sports.map((sport) => (
          <button
            key={sport.name}
            onClick={() => setSelectedSport(sport.name)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg whitespace-nowrap transition-colors duration-200 flex-shrink-0 ${
              selectedSport === sport.name
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent hover:bg-bg"
            }`}
          >
            <span className="text-base sm:text-lg">{sport.icon}</span>
            <span className="font-medium text-sm sm:text-base">{sport.name}</span>
          </button>
        ))}
        <button className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg whitespace-nowrap transition-colors duration-200 text-muted hover:text-text hover:bg-bg flex-shrink-0">
          <span className="font-medium text-sm sm:text-base">More</span>
          <span className="text-base sm:text-lg">⌄</span>
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 px-2">
          <div className="animate-pulse text-muted flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading sure bets…</span>
          </div>
        </div>
      ) : hasSureBets ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="block lg:hidden space-y-3 px-2">
            {sureBets.map((bet) => (
              <div key={bet.id} className="bg-surface border border-border rounded-lg p-3 sm:p-4 hover:bg-bg/50 transition-colors">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="font-medium text-text text-sm sm:text-base">{bet.teams}</div>
                    <div className="text-xs sm:text-sm text-muted">{bet.sport} • {bet.league}</div>
                    <div className="text-xs text-muted">{bet.date}, {bet.time}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">1</div>
                      <div className="text-sm font-medium text-text">{bet.best_odd_1}</div>
                      <div className="text-xs text-muted">Stake: ${bet.stake_1.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">X</div>
                      <div className="text-sm font-medium text-text">{bet.best_odd_x}</div>
                      <div className="text-xs text-muted">Stake: ${bet.stake_x.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">2</div>
                      <div className="text-sm font-medium text-text">{bet.best_odd_2}</div>
                      <div className="text-xs text-muted">Stake: ${bet.stake_2.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="text-center pt-2 border-t border-border/50">
                    <div className="text-sm font-bold text-green-400 mb-1">{bet.profit_percent.toFixed(2)}% Profit</div>
                    <div className="text-xs text-muted">Total: ${bet.total_stake.toFixed(2)} → Return: ${bet.guaranteed_return.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
              <div className="col-span-3 text-sm font-medium text-muted">Match</div>
              <div className="col-span-2 text-sm font-medium text-muted">Date/Time</div>
              <div className="col-span-2 text-sm font-medium text-muted text-center">1 (Stake)</div>
              <div className="col-span-2 text-sm font-medium text-muted text-center">X (Stake)</div>
              <div className="col-span-2 text-sm font-medium text-muted text-center">2 (Stake)</div>
              <div className="col-span-1 text-sm font-medium text-muted text-center">Profit</div>
            </div>
            <div className="space-y-0">
              {sureBets.map((bet) => (
                <div key={bet.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 bg-surface border-b border-border last:border-b-0 hover:bg-bg/50">
                  <div className="col-span-3">
                    <div className="font-medium text-text">{bet.teams}</div>
                    <div className="text-sm text-muted">{bet.sport} • {bet.league}</div>
                  </div>
                  <div className="col-span-2 text-sm text-muted">{bet.date}, {bet.time}</div>
                  <div className="col-span-2 text-center text-sm">
                    <span className="font-medium text-text">{bet.best_odd_1}</span>
                    <span className="text-muted ml-1">(${bet.stake_1.toFixed(2)})</span>
                  </div>
                  <div className="col-span-2 text-center text-sm">
                    <span className="font-medium text-text">{bet.best_odd_x}</span>
                    <span className="text-muted ml-1">(${bet.stake_x.toFixed(2)})</span>
                  </div>
                  <div className="col-span-2 text-center text-sm">
                    <span className="font-medium text-text">{bet.best_odd_2}</span>
                    <span className="text-muted ml-1">(${bet.stake_2.toFixed(2)})</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-bold text-green-400">{bet.profit_percent.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 px-2 py-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface border border-border text-text hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted px-2">
                Page {page} of {totalPages} ({total} total)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface border border-border text-text hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 mx-2">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-400 rounded-full flex items-center justify-center">
              <span className="text-text text-xs sm:text-sm font-bold">i</span>
            </div>
            <span className="text-text font-medium text-sm sm:text-base">There are currently no sure bets available!</span>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm text-center">
            Check back later for new arbitrage opportunities or try adjusting your filters.
          </p>
        </div>
      )}
      <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 mx-2">
        <h3 className="text-lg font-semibold text-text mb-4">How Sure Bets Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-text">What are Sure Bets?</h4>
            <p className="text-sm text-muted leading-relaxed">
              Sure bets (also known as arbitrage betting) occur when different bookmakers offer 
              different odds for the same event, creating an opportunity to bet on all possible 
              outcomes and guarantee a profit.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-text">How to Use Them</h4>
            <p className="text-sm text-muted leading-relaxed">
              When you find a sure bet, place the calculated stakes on each outcome with different 
              bookmakers. Regardless of the result, you'll make a guaranteed profit based on the 
              odds difference.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


