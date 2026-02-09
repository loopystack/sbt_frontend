import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import type { Country } from "../contexts/CountryContext";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";
import OddsTable from "../components/OddsTable";
import { useAppDispatch } from "../store/hooks";
import { getMatchingInfoAction } from "../store/matchinginfo/actions";
import type { MatchingInfo } from "../store/matchinginfo/types";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

const PAGE_SIZE = 20;

/** Build date tab id and label from a Date (for id use "yesterday"|"today"|"tomorrow" or YYYY-MM-DD) */
function getDateTabId(d: Date, rel: "yesterday" | "today" | "tomorrow" | null): string {
  if (rel === "yesterday") return "yesterday";
  if (rel === "today") return "today";
  if (rel === "tomorrow") return "tomorrow";
  return d.toISOString().slice(0, 10);
}

function getDateTabLabel(d: Date, rel: "yesterday" | "today" | "tomorrow" | null): string {
  if (rel === "yesterday") return "Yesterday";
  if (rel === "today") return "Today";
  if (rel === "tomorrow") return "Tomorrow";
  const day = d.getDate();
  const mon = d.toLocaleString("en-GB", { month: "short" });
  return `${day} ${mon}`;
}

/** Resolve selectedDate (tab id) to date_from and date_to (YYYY-MM-DD) for the API */
function getDateRangeForSelected(selectedDateId: string): { date_from: string; date_to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target: Date;
  if (selectedDateId === "yesterday") {
    target = new Date(today);
    target.setDate(target.getDate() - 1);
  } else if (selectedDateId === "today") {
    target = new Date(today);
  } else if (selectedDateId === "tomorrow") {
    target = new Date(today);
    target.setDate(target.getDate() + 1);
  } else {
    target = new Date(selectedDateId + "T00:00:00");
  }
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  const str = `${y}-${m}-${day}`;
  return { date_from: str, date_to: str };
}

/** Human-readable title for the selected date (e.g. "Today, 4 Feb 2026") */
function getTitleForSelectedDate(selectedDateId: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target: Date;
  let rel: "yesterday" | "today" | "tomorrow" | null = null;
  if (selectedDateId === "yesterday") {
    target = new Date(today);
    target.setDate(target.getDate() - 1);
    rel = "yesterday";
  } else if (selectedDateId === "today") {
    target = new Date(today);
    rel = "today";
  } else if (selectedDateId === "tomorrow") {
    target = new Date(today);
    target.setDate(target.getDate() + 1);
    rel = "tomorrow";
  } else {
    target = new Date(selectedDateId + "T00:00:00");
  }
  const day = target.getDate();
  const mon = target.toLocaleString("en-GB", { month: "short" });
  const year = target.getFullYear();
  const dateStr = `${day} ${mon} ${year}`;
  if (rel === "yesterday") return `Yesterday, ${dateStr}`;
  if (rel === "today") return `Today, ${dateStr}`;
  if (rel === "tomorrow") return `Tomorrow, ${dateStr}`;
  return dateStr;
}

/** Format match date for display in a row (e.g. "Today", "4 Feb") */
function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (t.getTime() === today.getTime()) return "Today";
  if (t.getTime() === tomorrow.getTime()) return "Tomorrow";
  if (t.getTime() === yesterday.getTime()) return "Yesterday";
  return `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}`;
}

/** Format time as HH:MM (strip seconds from HH:MM:SS) */
function formatTimeHHMM(time: string | null | undefined): string {
  if (!time || time === "LIVE") return time || "—";
  const t = time.trim();
  const parts = t.split(":");
  if (parts.length >= 2) {
    const h = (parts[0].replace(/\D/g, "") || "0").padStart(2, "0");
    const m = (parts[1].replace(/\D/g, "") || "0").padStart(2, "0");
    return `${h}:${m}`;
  }
  return t;
}

/** Parse result "H-A" to winning outcome: home win -> '1', draw -> 'X', away win -> '2'. Returns null if invalid. */
function getWinningOutcomeFromResult(result: string | null | undefined): "1" | "X" | "2" | null {
  if (!result || !/^\d+-\d+$/.test(String(result).trim())) return null;
  const [h, a] = String(result).trim().split("-").map(Number);
  if (h > a) return "1";
  if (h < a) return "2";
  return "X";
}

export default function Matches() {
  const { selectedLeague, selectedCountry, setSelectedCountry, setSelectedLeague, countries } = useCountry();
  const params = useParams<{ country?: string; league?: string }>();
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedSport, setSelectedSport] = useState("Football");
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Get search term from URL parameter
  const searchFromHome = searchParams.get('search');

  // Odds format conversion
  const { getOddsInFormat, oddsFormat } = useOddsFormat();

  // Helper function to convert and format odds (accepts string or number from API)
  const formatOdds = (odds: string | number): string => {
    const s = typeof odds === 'number' ? String(odds) : (odds || '');
    if (!s || s.trim() === '') return s;
    const decimalOdds = OddsConverter.stringToDecimal(s);
    return getOddsInFormat(decimalOdds);
  };

  const [selectedView, setSelectedView] = useState("kickoff");

  // Dynamic date tabs: Yesterday, Today, Tomorrow, then next 5 days
  const dates = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const out: { id: string; label: string }[] = [];
    for (let i = -1; i <= 6; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const rel = i === -1 ? "yesterday" : i === 0 ? "today" : i === 1 ? "tomorrow" : null;
      out.push({ id: getDateTabId(d, rel), label: getDateTabLabel(d, rel) });
    }
    return out;
  }, []);

  const sports = [
    { name: "Football", icon: "⚽" },
    { name: "Basketball", icon: "🏀" },
    { name: "Tennis", icon: "🎾" },
    { name: "Baseball", icon: "⚾" },
    { name: "Hockey", icon: "🏒" }
  ];

  const views = [
    { id: "kickoff", label: "Kick off time" },
    { id: "events", label: "Events" }
  ];

  // All-leagues upcoming matches (when no league selected): API state and pagination
  const [allMatches, setAllMatches] = useState<MatchingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  const fetchAllLeaguesMatches = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const { date_from, date_to } = getDateRangeForSelected(selectedDate);
      const result = await dispatch(getMatchingInfoAction({
        page,
        size: PAGE_SIZE,
        date_from,
        date_to,
      })).unwrap();
      setAllMatches(result.odds);
      setTotalPages(result.pages);
      setTotalMatches(result.total);
    } catch {
      setAllMatches([]);
      setTotalPages(0);
      setTotalMatches(0);
    } finally {
      setLoading(false);
    }
  }, [dispatch, selectedDate]);

  useEffect(() => {
    if (!selectedLeague) {
      fetchAllLeaguesMatches(currentPage);
    }
  }, [selectedLeague, currentPage, fetchAllLeaguesMatches]);

  // When changing date tab, reset to page 1
  useEffect(() => {
    if (!selectedLeague) setCurrentPage(1);
  }, [selectedDate, selectedLeague]);

  const pageTitleLabel = getTitleForSelectedDate(selectedDate);

  // On load/refresh: sync URL params to context so /football/england/premier-league/results/ shows the correct league.
  // Only depend on URL and countries so we don't re-run after setting state (avoids "Maximum update depth" loop).
  useEffect(() => {
    const countrySlug = params.country;
    const leagueSlug = params.league;
    if (!countrySlug || !leagueSlug || countries.length === 0) return;

    const country = countries.find((c: Country) => toSlug(c.name) === countrySlug);
    if (!country) return;

    const league = country.leagues.find((l: { name: string }) => toSlug(l.name) === leagueSlug);
    if (!league) return;

    setSelectedCountry(country);
    setSelectedLeague(league);
  }, [params.country, params.league, countries, setSelectedCountry, setSelectedLeague]);

  // On refresh of /football/:country/:league/results/ or /football/:country/:league/, wait for context to sync
  // so we don't flash the "Next Football Matches" fallback — show loading until league matches URL.
  const isLeagueUrl = Boolean(params.country && params.league);
  const leagueSynced =
    selectedLeague &&
    selectedCountry &&
    toSlug(selectedCountry.name) === params.country &&
    toSlug(selectedLeague.name) === params.league;

  if (isLeagueUrl && !leagueSynced) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-400">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }

  // If a league is selected, show the OddsTable (same as Home page)
  if (selectedLeague) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable initialSearchTerm={searchFromHome || undefined} />
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2 text-blue-100">BETINASIA</h3>
                <p className="text-xs sm:text-sm text-blue-200/60 mb-1 sm:mb-2">Premium Sportsbook</p>
                <p className="text-xs sm:text-sm text-blue-200/80">100% Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETINASIA")}
                className="w-full sm:w-auto bg-blue-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-blue-500 transition-all duration-300 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2 text-emerald-100">bet-at-home</h3>
                <p className="text-xs sm:text-sm text-emerald-200/60 mb-1 sm:mb-2">European Leader</p>
                <p className="text-xs sm:text-sm text-emerald-200/80">300€ Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet-at-home")}
                className="w-full sm:w-auto bg-emerald-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-emerald-500 transition-all duration-300 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2 text-purple-100">bets.io</h3>
                <p className="text-xs sm:text-sm text-purple-200/60 mb-1 sm:mb-2">Crypto Sportsbook</p>
                <p className="text-xs sm:text-sm text-purple-200/80">Sport Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bets.io")}
                className="w-full sm:w-auto bg-purple-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-purple-500 transition-all duration-300 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted px-2">
        Home &gt; Next Matches &gt; Next Football Matches
      </div>

      <div className="space-y-3 sm:space-y-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          Next Football Matches: {pageTitleLabel}
        </h1>
        <p className="text-muted text-sm max-w-4xl">
          Betting odds displayed are average/highest across all bookmakers (premium + preferred). 
          Click on matches to see all betting odds available. Add your chosen pick to My Coupon by clicking the odds.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-2 pb-2">
        {dates.map((date) => (
          <button
            key={date.id}
            onClick={() => setSelectedDate(date.id)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
              selectedDate === date.id
                ? "bg-accent text-white shadow-lg"
                : "bg-surface text-muted hover:text-text hover:bg-surface/80 border border-border"
            }`}
          >
            {date.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide px-2 pb-2">
        <button className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg whitespace-nowrap transition-colors duration-200 text-muted hover:text-text hover:bg-bg flex-shrink-0">
          <span className="text-base sm:text-lg">⭐</span>
          <span className="font-medium text-sm sm:text-base">My Matches</span>
        </button>
        
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

      <div className="flex gap-1 border-b border-border px-2">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setSelectedView(view.id)}
            className={`px-3 sm:px-4 py-2 sm:py-3 text-sm font-medium transition-colors duration-200 ${
              selectedView === view.id
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 px-2">
          <div className="animate-pulse text-muted flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading matches…</span>
          </div>
        </div>
      ) : allMatches.length === 0 ? (
        <div className="text-center py-12 px-2 text-muted">
          <p className="font-medium">No matches for this date.</p>
          <p className="text-sm mt-1">Try another date or select a league from the sidebar.</p>
        </div>
      ) : (
        <>
          <div className="block lg:hidden space-y-3 px-2">
            {allMatches.map((m) => {
              const winning = getWinningOutcomeFromResult(m.result);
              const o1 = m.odd_1 ?? 0; const oX = m.odd_X ?? 0; const o2 = m.odd_2 ?? 0;
              const best = winning !== null
                ? (winning === "1" ? "odds1" : winning === "X" ? "oddsX" : "odds2")
                : (o1 >= oX && o1 >= o2 ? "odds1" : oX >= o2 ? "oddsX" : "odds2");
              return (
                <div
                  key={m.id}
                  className="bg-surface border border-border rounded-lg p-3 sm:p-4 hover:bg-bg/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/football/${toSlug(m.country)}/${toSlug(m.league)}/`)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text text-sm sm:text-base leading-tight line-clamp-2">
                          {m.home_team} vs {m.away_team}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted mt-1">Football / {m.country} / {m.league}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-3">
                        <span className="text-xs sm:text-sm font-semibold text-text">{formatTimeHHMM(m.time)}</span>
                        <span className="text-xs text-muted">{formatMatchDate(m.date)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <div className="text-xs text-muted mb-1">1</div>
                        <div className={`text-xs sm:text-sm font-semibold ${best === 'odds1' ? 'text-green-500 bg-green-500/20 px-2 py-1 rounded' : 'text-text'}`}>
                          {formatOdds(m.odd_1 ?? 0)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted mb-1">X</div>
                        <div className={`text-xs sm:text-sm font-semibold ${best === 'oddsX' ? 'text-green-500 bg-green-500/20 px-2 py-1 rounded' : 'text-text'}`}>
                          {formatOdds(m.odd_X ?? 0)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted mb-1">2</div>
                        <div className={`text-xs sm:text-sm font-semibold ${best === 'odds2' ? 'text-green-500 bg-green-500/20 px-2 py-1 rounded' : 'text-text'}`}>
                          {formatOdds(m.odd_2 ?? 0)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="text-center">
                        <div className="text-xs text-muted">Bookmakers</div>
                        <div className="text-sm font-bold text-accent">{m.bets ?? 0}</div>
                      </div>
                      <span className="text-xs text-muted">Tap to open league</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden lg:block">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
              <div className="col-span-2 text-sm font-medium text-muted">Date</div>
              <div className="col-span-2 text-sm font-medium text-muted">Time</div>
              <div className="col-span-4 text-sm font-medium text-muted">Match</div>
              <div className="col-span-1 text-sm font-medium text-muted text-center">1</div>
              <div className="col-span-1 text-sm font-medium text-muted text-center">X</div>
              <div className="col-span-1 text-sm font-medium text-muted text-center">2</div>
              <div className="col-span-1 text-sm font-medium text-muted text-center">B's</div>
            </div>
            <div className="space-y-0">
              {allMatches.map((m) => {
                const winning = getWinningOutcomeFromResult(m.result);
                const o1 = m.odd_1 ?? 0; const oX = m.odd_X ?? 0; const o2 = m.odd_2 ?? 0;
                const best = winning !== null
                  ? (winning === "1" ? "odds1" : winning === "X" ? "oddsX" : "odds2")
                  : (o1 >= oX && o1 >= o2 ? "odds1" : oX >= o2 ? "oddsX" : "odds2");
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-12 gap-4 items-center px-4 py-3 bg-surface border-b border-border last:border-b-0 hover:bg-bg/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/football/${toSlug(m.country)}/${toSlug(m.league)}/`)}
                  >
                    <div className="col-span-2 text-sm text-muted">{formatMatchDate(m.date)}</div>
                    <div className="col-span-2 text-sm text-muted">{formatTimeHHMM(m.time)}</div>
                    <div className="col-span-4">
                      <div className="font-medium text-text">{m.home_team} vs {m.away_team}</div>
                      <div className="text-xs text-muted">Football / {m.country} / {m.league}</div>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${best === 'odds1' ? 'bg-green-500/20 text-green-400' : 'text-muted'}`}>
                        {formatOdds(m.odd_1 ?? 0)}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${best === 'oddsX' ? 'bg-green-500/20 text-green-400' : 'text-muted'}`}>
                        {formatOdds(m.odd_X ?? 0)}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${best === 'odds2' ? 'bg-green-500/20 text-green-400' : 'text-muted'}`}>
                        {formatOdds(m.odd_2 ?? 0)}
                      </span>
                    </div>
                    <div className="col-span-1 text-center text-muted">{m.bets ?? 0}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-border">
              <p className="text-sm text-muted order-2 sm:order-1">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalMatches)} of {totalMatches}
              </p>
              <div className="flex items-center gap-1 order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface border border-border text-text hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1 mx-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[2.25rem] py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-accent text-white'
                            : 'bg-surface border border-border text-text hover:bg-bg'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface border border-border text-text hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
