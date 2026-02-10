import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import OddsTable from "../components/OddsTable";
import { useAppDispatch } from "../store/hooks";
import { getMatchingInfoAction } from "../store/matchinginfo/actions";
import type { MatchingInfo } from "../store/matchinginfo/types";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { getTeamLogo } from "../utils/teamLogos";
import { calculateBettingReturnFromDecimal } from "../utils/bettingCalculator";
import { authService } from "../services/authService";
import { bettingService, BettingRecordCreate } from "../services/bettingService";
import CongratulationsAlert from "../components/CongratulationsAlert";

const PAGE_SIZE = 20;

function countryForLogo(country: string | undefined): string | undefined {
  if (!country) return undefined;
  return country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();
}

type SlipSelection = {
  matchId: string;
  type: "home" | "draw" | "away";
  odds: string;
  teams: string;
  league: string;
  stake: string;
  matchDate?: string;
  matchTime?: string;
};

function parseLocalDate(ymd: string): Date {
  const datePart = ymd.trim().split("T")[0].slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatMatchDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}`;
}

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

function getOddsColorClass(o1: number, oX: number, o2: number, which: "1" | "X" | "2"): string {
  const vals = [o1, oX, o2].filter((x) => x != null && !Number.isNaN(x));
  if (vals.length === 0) return "text-muted";
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const v = which === "1" ? o1 : which === "X" ? oX : o2;
  if (v == null || Number.isNaN(v)) return "text-muted";
  if (v >= max) return "text-green-500";
  if (v <= min) return "text-blue-400";
  return "text-red-400";
}

const leagueIdToName: Record<string, string> = {
  premier: "Premier League",
  laliga: "La Liga",
  bundesliga: "Bundesliga",
  seriea: "Serie A",
  champions: "Champions League",
};

const OUTCOME_TO_TYPE: Record<"1" | "X" | "2", "home" | "draw" | "away"> = { "1": "home", X: "draw", "2": "away" };

export default function AllEvents() {
  const { selectedLeague: contextSelectedLeague, selectedCountry } = useCountry();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addNewBetNotification } = useNotifications();
  const { getOddsInFormat } = useOddsFormat();
  const [selectedSport, setSelectedSport] = useState("All sports");
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [searchParams] = useSearchParams();
  const [allEvents, setAllEvents] = useState<MatchingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [selectedOdds, setSelectedOdds] = useState<SlipSelection[]>([]);
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [isBetSlipCollapsed, setIsBetSlipCollapsed] = useState(false);
  const [isBetSlipHiding, setIsBetSlipHiding] = useState(false);
  const [selectedBetAmount, setSelectedBetAmount] = useState("10");
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isConfirmingBet, setIsConfirmingBet] = useState(false);
  const [bettingError, setBettingError] = useState("");
  const [duplicateBetError, setDuplicateBetError] = useState("");
  const [showBetConfirmation, setShowBetConfirmation] = useState(false);
  const [userBetMatchIds, setUserBetMatchIds] = useState<Set<string>>(new Set());
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [betDetails, setBetDetails] = useState({ betAmount: "", potentialWin: "", teams: "" });

  const searchFromHome = searchParams.get("search");

  const validateBettingSelections = () => {
    const matchCounts = new Map<string, number>();
    const invalidMatchIds = new Set<string>();
    selectedOdds.forEach((odds) => {
      const n = (matchCounts.get(odds.matchId) || 0) + 1;
      matchCounts.set(odds.matchId, n);
      if (n > 1) invalidMatchIds.add(odds.matchId);
    });
    return { isValid: invalidMatchIds.size === 0, invalidMatchIds: Array.from(invalidMatchIds) };
  };
  const bettingValidation = validateBettingSelections();
  const userFunds = user?.funds_usd ?? 0;

  const addToBetslip = (event: MatchingInfo, outcome: "1" | "X" | "2") => {
    const oddsVal = outcome === "1" ? event.odd_1 : outcome === "X" ? event.odd_X : event.odd_2;
    if (oddsVal == null) return;
    const type = OUTCOME_TO_TYPE[outcome];
    const teams = `${event.home_team} vs ${event.away_team}`;
    const slipItem: SlipSelection = {
      matchId: String(event.id),
      type,
      odds: String(oddsVal),
      teams,
      league: event.league,
      stake: "10",
      matchDate: event.date,
      matchTime: event.time ?? undefined,
    };
    const isAlreadySelected = selectedOdds.some((o) => o.matchId === slipItem.matchId && o.type === slipItem.type);
    if (isAlreadySelected) {
      setSelectedOdds((prev) => prev.filter((o) => !(o.matchId === slipItem.matchId && o.type === slipItem.type)));
      setDuplicateBetError("");
      if (selectedOdds.length === 1) {
        setIsBetSlipHiding(true);
        setTimeout(() => {
          setShowBetSlip(false);
          setIsBetSlipHiding(false);
        }, 500);
      }
    } else {
      setSelectedOdds((prev) => [...prev, slipItem]);
      setShowBetSlip(true);
      setIsBetSlipCollapsed(false);
    }
  };

  const isOddsSelected = (matchId: number, type: "1" | "X" | "2") =>
    selectedOdds.some((o) => o.matchId === String(matchId) && o.type === OUTCOME_TO_TYPE[type]);

  const handleBetSlipHeaderClick = () => setIsBetSlipCollapsed((c) => !c);
  const handleBetAmountClick = (amount: string) => {
    setSelectedBetAmount(amount);
    setSelectedOdds((prev) => prev.map((o) => ({ ...o, stake: amount })));
  };
  const handleIndividualStakeChange = (matchId: string, type: "home" | "draw" | "away", newStake: string) => {
    setSelectedOdds((prev) =>
      prev.map((o) => (o.matchId === matchId && o.type === type ? { ...o, stake: newStake } : o))
    );
  };

  const calculatePotentialWin = (): number =>
    selectedOdds.reduce((sum, o) => {
      const stake = parseFloat(o.stake || "0");
      const calc = calculateBettingReturnFromDecimal(stake, o.odds || "2.0");
      return sum + calc.totalReturn;
    }, 0);

  const handlePlaceBet = () => {
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }
    if (selectedOdds.some((o) => userBetMatchIds.has(o.matchId))) {
      setDuplicateBetError("Bet Placed Already!");
      return;
    }
    if (!bettingValidation.isValid) {
      setBettingError("Cannot place multiple bets on the same match");
      return;
    }
    const totalBetAmount = selectedOdds.reduce((total, o) => total + parseFloat(o.stake || "0"), 0);
    if (totalBetAmount <= 0) {
      setBettingError("Amount must be greater than 0");
      return;
    }
    if (totalBetAmount > userFunds) {
      setBettingError("Balance is not enough, plz add fund");
      return;
    }
    setBettingError("");
    setDuplicateBetError("");
    setShowBetConfirmation(true);
  };

  const confirmBet = async () => {
    setIsConfirmingBet(true);
    try {
      const totalBetAmount = selectedOdds.reduce((total, o) => total + parseFloat(o.stake || "0"), 0);
      await authService.deductFunds(totalBetAmount);
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No access token - please sign in again");
      for (const o of selectedOdds) {
        const stake = parseFloat(o.stake || "10");
        const calc = calculateBettingReturnFromDecimal(stake, o.odds || "2.0");
        let matchDate: string | null = null;
        if (o.matchDate && o.matchTime && o.matchTime !== "LIVE") {
          const t = o.matchTime.trim();
          const parts = t.split(":");
          const h = (parts[0]?.replace(/\D/g, "") || "0").padStart(2, "0");
          const m = (parts[1]?.replace(/\D/g, "") || "0").padStart(2, "0");
          matchDate = `${o.matchDate}T${h}:${m}:00`;
        }
        const record: BettingRecordCreate = {
          bet_amount: stake,
          potential_win: calc.totalReturn,
          match_id: parseInt(o.matchId, 10),
          match_teams: o.teams,
          match_date: matchDate,
          match_league: o.league,
          match_status: "upcoming",
          selected_outcome: o.type,
          selected_team: o.type === "home" ? o.teams.split(" vs ")[0] : o.type === "away" ? o.teams.split(" vs ")[1] : undefined,
          odds_value: o.odds,
          odds_decimal: calc.decimalOdds,
        };
        const saved = await bettingService.createBettingRecord(record);
        if (saved?.id) addNewBetNotification(saved.id, record.match_teams, record.bet_amount, record.potential_win);
      }
      setUserBetMatchIds((prev) => {
        const next = new Set(prev);
        selectedOdds.forEach((o) => next.add(o.matchId));
        return next;
      });
      const potentialWin = calculatePotentialWin();
      setBetDetails({
        betAmount: totalBetAmount.toFixed(2),
        potentialWin: potentialWin.toFixed(2),
        teams: selectedOdds.map((o) => o.teams).join(", "),
      });
      setShowCongratulations(true);
      setShowBetConfirmation(false);
      setSelectedOdds([]);
      setShowBetSlip(false);
      setIsBetSlipHiding(false);
      window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { isAuthenticated: true, user: await authService.getCurrentUser() } }));
      window.dispatchEvent(new CustomEvent("bettingDataChanged", { detail: { message: "New bet placed" } }));
    } catch (err: unknown) {
      setBettingError(err instanceof Error ? err.message : "Failed to place bet");
    } finally {
      setIsConfirmingBet(false);
    }
  };

  const sports = [
    { name: "All sports", icon: "🏆" },
    { name: "Football", icon: "⚽" },
    { name: "Basketball", icon: "🏀" },
    { name: "Tennis", icon: "🎾" },
    { name: "Baseball", icon: "⚾" },
    { name: "Hockey", icon: "🏒" }
  ];
  const dateFilters = [
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" }
  ];
  const leagueFilters = [
    { id: "all", label: "All Leagues" },
    { id: "premier", label: "Premier League" },
    { id: "laliga", label: "LaLiga" },
    { id: "bundesliga", label: "Bundesliga" },
    { id: "seriea", label: "Serie A" },
    { id: "champions", label: "Champions League" }
  ];

  const getDateRange = useCallback(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    if (selectedDate === "tomorrow") {
      const t2 = new Date(today);
      t2.setDate(t2.getDate() + 1);
      const d2 = String(t2.getDate()).padStart(2, "0");
      const m2 = String(t2.getMonth() + 1).padStart(2, "0");
      return { date_from: `${t2.getFullYear()}-${m2}-${d2}`, date_to: `${t2.getFullYear()}-${m2}-${d2}` };
    }
    if (selectedDate === "week") {
      const tEnd = new Date(today);
      tEnd.setDate(tEnd.getDate() + 6);
      const de = String(tEnd.getDate()).padStart(2, "0");
      const me = String(tEnd.getMonth() + 1).padStart(2, "0");
      return { date_from: todayStr, date_to: `${tEnd.getFullYear()}-${me}-${de}` };
    }
    if (selectedDate === "month") {
      const tEnd = new Date(today);
      tEnd.setDate(tEnd.getDate() + 30);
      const de = String(tEnd.getDate()).padStart(2, "0");
      const me = String(tEnd.getMonth() + 1).padStart(2, "0");
      return { date_from: todayStr, date_to: `${tEnd.getFullYear()}-${me}-${de}` };
    }
    return { date_from: todayStr, date_to: todayStr };
  }, [selectedDate]);

  const fetchAllEvents = useCallback(async () => {
    if (contextSelectedLeague) return;
    setLoading(true);
    try {
      const { date_from, date_to } = getDateRange();
      const leagueParam = selectedLeague !== "all" ? leagueIdToName[selectedLeague] || selectedLeague : undefined;
      const result = await dispatch(getMatchingInfoAction({
        page: currentPage,
        size: PAGE_SIZE,
        date_from,
        date_to,
        league: leagueParam,
      })).unwrap();
      setAllEvents(result.odds);
      setTotalPages(result.pages);
      setTotalMatches(result.total);
    } catch {
      setAllEvents([]);
      setTotalPages(0);
      setTotalMatches(0);
    } finally {
      setLoading(false);
    }
  }, [contextSelectedLeague, currentPage, selectedDate, selectedLeague, getDateRange, dispatch]);

  useEffect(() => {
    if (!contextSelectedLeague) fetchAllEvents();
  }, [contextSelectedLeague, fetchAllEvents]);

  useEffect(() => {
    if (!contextSelectedLeague) setCurrentPage(1);
  }, [selectedDate, selectedLeague, contextSelectedLeague]);
  // If a league is selected from context OR if there's a search term, show the OddsTable
  if (contextSelectedLeague || searchFromHome) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable initialSearchTerm={searchFromHome || undefined} />
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-lime-500 via-green-500 to-emerald-500 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">BC.GAME</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Crypto Casino</p>
                <p className="text-xs sm:text-sm opacity-95">100% + Free Bet</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BC.GAME")}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">bet-at-home</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">European Leader</p>
                <p className="text-xs sm:text-sm opacity-95">300€ Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet-at-home")}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">BETINASIA</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Premium Sportsbook</p>
                <p className="text-xs sm:text-sm opacity-95">100% Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETINASIA")}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="text-sm text-muted px-2">
        Home &gt; All Events
      </div>
      <div className="space-y-3 sm:space-y-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          All Events - Complete Sports Betting Coverage
        </h1>
        <p className="text-muted text-sm max-w-4xl leading-relaxed">
          Discover all available sporting events across all leagues and competitions. From major 
          tournaments to local matches, find the best odds and betting opportunities for every 
          sport and event. Filter by sport, date, or league to find exactly what you're looking for.
        </p>
      </div>
      <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 shadow-sm mx-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <span className="text-sm font-medium text-muted">Filters:</span>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            >
              {dateFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            >
              {leagueFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
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
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent border-t-transparent" />
        </div>
      )}
      {!loading && allEvents.length === 0 && (
        <div className="text-center py-12 px-4 text-muted">
          <p className="text-lg font-medium">No events for this period</p>
          <p className="text-sm mt-1">Try changing the date range or league filter.</p>
        </div>
      )}
      {!loading && allEvents.length > 0 && (
        <>
      <div className="block lg:hidden space-y-3 px-2">
        {Object.entries(allEvents.reduce((groups, event) => {
          const key = `Football / ${event.country} / ${event.league}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(event);
          return groups;
        }, {} as Record<string, MatchingInfo[]>)).map(([key, group]) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg bg-bg border border-border border-l-4 border-l-accent">
              <span className="text-lg" aria-hidden>⚽</span>
              <span className="text-sm font-semibold text-text tracking-wide">{key}</span>
            </div>
            {group.map((event) => {
              const o1 = event.odd_1 ?? 0;
              const oX = event.odd_X ?? 0;
              const o2 = event.odd_2 ?? 0;
              return (
                <div key={event.id} className="bg-surface border border-border rounded-xl p-3 sm:p-4 hover:bg-bg/50 transition-colors shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">{formatMatchDate(event.date)}</span>
                        <span className="text-sm font-medium text-text">{formatTimeHHMM(event.time)}</span>
                      </div>
                      <span className="text-xs text-muted">{event.bets} bookmakers</span>
                    </div>
                    <div className="space-y-1 flex flex-col items-center text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {getTeamLogo(event.home_team, countryForLogo(event.country)) ? (
                          <img src={getTeamLogo(event.home_team, countryForLogo(event.country))!} alt="" className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        ) : null}
                        <span className="font-medium text-text text-sm sm:text-base">{event.home_team}</span>
                        <span className="text-muted text-sm">vs</span>
                        {getTeamLogo(event.away_team, countryForLogo(event.country)) ? (
                          <img src={getTeamLogo(event.away_team, countryForLogo(event.country))!} alt="" className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        ) : null}
                        <span className="font-medium text-text text-sm sm:text-base">{event.away_team}</span>
                      </div>
                      <div className="text-xs text-muted">Football • {event.country} • {event.league}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addToBetslip(event, "1"); }}
                        disabled={event.odd_1 == null}
                        className="text-center py-1 rounded hover:bg-bg/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <div className="text-xs text-muted mb-1">1</div>
                        <div className={`text-sm font-medium ${getOddsColorClass(o1, oX, o2, "1")}`}>
                          {event.odd_1 != null ? getOddsInFormat(event.odd_1) : "—"}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addToBetslip(event, "X"); }}
                        disabled={event.odd_X == null}
                        className="text-center py-1 rounded hover:bg-bg/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <div className="text-xs text-muted mb-1">X</div>
                        <div className={`text-sm font-medium ${getOddsColorClass(o1, oX, o2, "X")}`}>
                          {event.odd_X != null ? getOddsInFormat(event.odd_X) : "—"}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addToBetslip(event, "2"); }}
                        disabled={event.odd_2 == null}
                        className="text-center py-1 rounded hover:bg-bg/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <div className="text-xs text-muted mb-1">2</div>
                        <div className={`text-sm font-medium ${getOddsColorClass(o1, oX, o2, "2")}`}>
                          {event.odd_2 != null ? getOddsInFormat(event.odd_2) : "—"}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="hidden lg:block rounded-xl border border-border overflow-hidden shadow-sm bg-surface">
        <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-bg border-b border-border">
          <div className="col-span-1 text-sm font-medium text-muted text-center">Date</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">Time</div>
          <div className="col-span-4 text-sm font-medium text-muted text-center">Match</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">1</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">X</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">2</div>
          <div className="col-span-2 text-sm font-medium text-muted text-center">B's</div>
        </div>
        <div className="space-y-3">
          {Object.entries(allEvents.reduce((groups, event) => {
            const key = `Football / ${event.country} / ${event.league}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(event);
            return groups;
          }, {} as Record<string, MatchingInfo[]>)).map(([key, group]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-center gap-2.5 py-3 px-5 bg-bg border border-border border-l-4 border-l-accent rounded-lg">
                <span className="text-lg" aria-hidden>⚽</span>
                <span className="text-sm font-semibold text-text tracking-wide">{key}</span>
              </div>
              {group.map((event) => {
                const o1 = event.odd_1 ?? 0;
                const oX = event.odd_X ?? 0;
                const o2 = event.odd_2 ?? 0;
                const countryKey = countryForLogo(event.country);
                const homeLogo = getTeamLogo(event.home_team, countryKey);
                const awayLogo = getTeamLogo(event.away_team, countryKey);
                return (
                  <div key={event.id} className="bg-surface border border-border rounded-xl p-4 hover:bg-bg/50 transition-colors shadow-sm">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-1 flex justify-center">
                        <div className="text-sm text-muted">{formatMatchDate(event.date)}</div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <div className="text-sm font-medium text-text">{formatTimeHHMM(event.time)}</div>
                      </div>
                      <div className="col-span-4 flex justify-center">
                        <div className="flex flex-col items-center justify-center text-center space-y-1">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {homeLogo ? (
                              <img src={homeLogo} alt="" className="w-7 h-7 object-contain flex-shrink-0" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            ) : null}
                            <span className="font-medium text-text">{event.home_team}</span>
                            <span className="text-muted text-sm">vs</span>
                            {awayLogo ? (
                              <img src={awayLogo} alt="" className="w-7 h-7 object-contain flex-shrink-0" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            ) : null}
                            <span className="font-medium text-text">{event.away_team}</span>
                          </div>
                          <div className="text-xs text-muted">Football • {event.country} • {event.league}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addToBetslip(event, "1"); }}
                        disabled={event.odd_1 == null}
                        className="col-span-1 text-center py-1 rounded hover:bg-bg/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className={`text-sm font-medium ${getOddsColorClass(o1, oX, o2, "1")}`}>
                          {event.odd_1 != null ? getOddsInFormat(event.odd_1) : "—"}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addToBetslip(event, "X"); }}
                        disabled={event.odd_X == null}
                        className="col-span-1 text-center py-1 rounded hover:bg-bg/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className={`text-sm font-medium ${getOddsColorClass(o1, oX, o2, "X")}`}>
                          {event.odd_X != null ? getOddsInFormat(event.odd_X) : "—"}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addToBetslip(event, "2"); }}
                        disabled={event.odd_2 == null}
                        className="col-span-1 text-center py-1 rounded hover:bg-bg/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className={`text-sm font-medium ${getOddsColorClass(o1, oX, o2, "2")}`}>
                          {event.odd_2 != null ? getOddsInFormat(event.odd_2) : "—"}
                        </div>
                      </button>
                      <div className="col-span-2 flex justify-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm text-muted">{event.bets}</span>
                          <span className="text-xs text-muted">bookmakers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-4 py-4 px-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 rounded-lg bg-surface border border-border text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg"
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {currentPage} of {totalPages} ({totalMatches} events)
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 rounded-lg bg-surface border border-border text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg"
          >
            Next
          </button>
        </div>
      )}
        </>
      )}
      <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 mx-2">
        <h3 className="text-lg font-semibold text-text mb-4">Events Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-text">{totalMatches}</div>
            <div className="text-sm text-muted">Total Events</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-text">{allEvents.length}</div>
            <div className="text-sm text-muted">On This Page</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-text">{totalPages}</div>
            <div className="text-sm text-muted">Pages</div>
          </div>
        </div>
      </div>
      {(showBetSlip || isBetSlipHiding) && selectedOdds.length > 0 && (
        <div
          className={`fixed bottom-4 right-4 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50 ${isBetSlipCollapsed ? "h-16" : "h-auto"}`}
          style={{
            transform: isBetSlipHiding ? "translateY(100%)" : "translateY(0)",
            opacity: isBetSlipHiding ? 0 : 1,
            transition: "transform 0.5s ease-in-out, opacity 0.5s ease-in-out",
          }}
        >
          <div
            className="bg-yellow-500 text-black px-4 py-3 rounded-t-xl flex items-center justify-between cursor-pointer hover:bg-yellow-400 transition-colors"
            onClick={handleBetSlipHeaderClick}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">Betslip</span>
              <div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">
                {selectedOdds.length}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">QUICK BET</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <svg className={`w-4 h-4 transition-transform ${isBetSlipCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className={`transition-all duration-300 ${isBetSlipCollapsed ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[600px] opacity-100"}`}>
            <div className="flex border-b border-border">
              <button type="button" className="flex-1 py-2 text-sm font-medium text-yellow-500 border-b-2 border-yellow-500">Single</button>
              <button type="button" className="flex-1 py-2 text-sm font-medium text-muted/50 cursor-not-allowed" disabled>Combo</button>
              <button type="button" className="flex-1 py-2 text-sm font-medium text-muted/50 cursor-not-allowed" disabled>System</button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {selectedOdds.map((odds) => (
                <div key={`${odds.matchId}-${odds.type}`} className="bg-surface border border-border rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
                        </div>
                        <div className="flex items-center gap-2">
                          {odds.type === "home" && getTeamLogo(odds.teams.split(" vs ")[0], selectedCountry?.name) && (
                            <img src={getTeamLogo(odds.teams.split(" vs ")[0], selectedCountry?.name)!} alt="" className="w-6 h-6" />
                          )}
                          {odds.type === "away" && getTeamLogo(odds.teams.split(" vs ")[1], selectedCountry?.name) && (
                            <img src={getTeamLogo(odds.teams.split(" vs ")[1], selectedCountry?.name)!} alt="" className="w-6 h-6" />
                          )}
                          <span className="text-sm font-medium text-text">
                            {odds.type === "home" ? odds.teams.split(" vs ")[0] : odds.type === "away" ? odds.teams.split(" vs ")[1] : "Draw"}
                          </span>
                        </div>
                      </div>
                      <div className="ml-9 space-y-1">
                        <div className="text-xs text-muted">{odds.teams}</div>
                        <div className="text-xs text-muted">1x2</div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-text">{getOddsInFormat(parseFloat(odds.odds))}</span>
                        <input
                          type="text"
                          className="w-20 px-2 py-1 bg-bg border border-border rounded text-sm text-text"
                          placeholder="10"
                          value={odds.stake}
                          onChange={(e) => handleIndividualStakeChange(odds.matchId, odds.type, e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-400"
                      onClick={() => {
                        setSelectedOdds((prev) => prev.filter((o) => !(o.matchId === odds.matchId && o.type === odds.type)));
                        setDuplicateBetError("");
                        if (selectedOdds.length <= 1) {
                          setIsBetSlipHiding(true);
                          setTimeout(() => { setShowBetSlip(false); setIsBetSlipHiding(false); }, 500);
                        }
                      }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mb-4">
                {["10", "20", "50"].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${selectedBetAmount === amount ? "bg-yellow-500 text-black" : "bg-surface border border-border text-text hover:bg-bg/50"}`}
                    onClick={() => handleBetAmountClick(amount)}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Total Bet</span>
                  <span className="text-text">${selectedOdds.reduce((t, o) => t + parseFloat(o.stake || "0"), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">POTENTIAL WIN</span>
                  <span className="text-text">${calculatePotentialWin().toFixed(2)}</span>
                </div>
              </div>
              {!isAuthenticated ? (
                <div className="flex items-center gap-2 mb-4 p-3 bg-bg/50 rounded-lg">
                  <span className="text-sm text-muted">Please, login to place bet</span>
                </div>
              ) : duplicateBetError ? (
                <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                  <p className="text-sm text-orange-400 mb-3">{duplicateBetError}</p>
                  <button type="button" className="w-full py-3 bg-orange-500 text-white rounded-lg text-sm font-medium" onClick={() => setDuplicateBetError("")}>OK</button>
                </div>
              ) : bettingError ? (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                  <p className="text-sm text-red-400 mb-3">{bettingError}</p>
                  <button type="button" className="w-full py-3 bg-yellow-500 text-black rounded-lg text-sm font-medium" onClick={() => navigate("/profile")}>DEPOSIT</button>
                </div>
              ) : (
                <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg ${bettingValidation.isValid ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                  <span className={`text-sm ${bettingValidation.isValid ? "text-green-400" : "text-red-400"}`}>
                    {bettingValidation.isValid ? "Ready to place your bet!" : "At least one of the selections is invalid!"}
                  </span>
                </div>
              )}
              <div className="flex gap-2 mb-3">
                <button type="button" className="flex-1 py-3 bg-surface border border-border text-text rounded-lg text-sm font-medium">SHARE</button>
                <button
                  type="button"
                  className="flex-1 py-3 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePlaceBet}
                  disabled={isPlacingBet || isConfirmingBet || !bettingValidation.isValid}
                >
                  {isAuthenticated ? (isPlacingBet || isConfirmingBet ? "PLACING BET..." : "PLACE BET") : "LOGIN"}
                </button>
              </div>
              {!isAuthenticated && (
                <div className="text-center mb-3">
                  <span className="text-xs text-muted">Don&apos;t you have an account? </span>
                  <button type="button" className="text-xs text-yellow-500 hover:underline font-medium" onClick={() => navigate("/signin")}>Join Now!</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showBetConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setShowBetConfirmation(false)}>
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-slate-800/80 px-5 py-4 border-b border-slate-700 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Confirm Your Bet</h2>
                  <p className="text-sm text-slate-400">Double-check your selections</p>
                </div>
              </div>
              <button type="button" className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300" onClick={() => setShowBetConfirmation(false)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Ready to place */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 mb-3 text-3xl">🤔</div>
                <h3 className="text-lg font-bold text-white">Ready to Place Your Bet?</h3>
                <p className="text-sm text-slate-400 mt-1">Make sure everything looks good before confirming!</p>
              </div>
              {/* Your Selections */}
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-slate-400">🎲</span>
                  <h4 className="font-semibold text-white">Your Selections</h4>
                </div>
                <div className="space-y-3">
                  {selectedOdds.map((o) => {
                    const selectionLabel = o.type === "home" ? `${o.teams.split(" vs ")[0]} (${getOddsInFormat(parseFloat(o.odds))})` : o.type === "away" ? `${o.teams.split(" vs ")[1]} (${getOddsInFormat(parseFloat(o.odds))})` : `Draw (${getOddsInFormat(parseFloat(o.odds))})`;
                    return (
                      <div key={`${o.matchId}-${o.type}`} className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-white font-medium text-sm">{o.teams}</p>
                          <p className="text-slate-400 text-xs">{selectionLabel}</p>
                        </div>
                        <span className="text-white font-semibold">${parseFloat(o.stake || "0").toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Bet Summary */}
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-slate-400">💰</span>
                  <h4 className="font-semibold text-white">Bet Summary</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Bet Amount:</span>
                    <span className="text-white font-medium">${selectedOdds.reduce((t, o) => t + parseFloat(o.stake || "0"), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Potential Win:</span>
                    <span className="text-green-400 font-semibold">${calculatePotentialWin().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Current Balance:</span>
                    <span className="text-blue-400 font-medium">${userFunds.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">After Bet:</span>
                    <span className="text-amber-400 font-medium">${(userFunds - selectedOdds.reduce((t, o) => t + parseFloat(o.stake || "0"), 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-3">
                <button type="button" className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl flex items-center justify-center gap-2" onClick={() => setShowBetConfirmation(false)}>
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Cancel
                </button>
                <button type="button" className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg" onClick={confirmBet} disabled={isConfirmingBet}>
                  <span>🚀</span>
                  {isConfirmingBet ? "Placing..." : "Place Bet!"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <CongratulationsAlert
        isVisible={showCongratulations}
        onClose={() => setShowCongratulations(false)}
        betAmount={betDetails.betAmount}
        potentialWin={betDetails.potentialWin}
        teams={betDetails.teams}
      />
      <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 mx-2">
        <h3 className="text-lg font-semibold text-text mb-4">About All Events</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-text">Comprehensive Coverage</h4>
            <p className="text-sm text-muted leading-relaxed">
              Our All Events page provides complete coverage of sporting events from around the 
              world. From major international tournaments to local league matches, you'll find 
              betting opportunities for every sport and competition.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-text">Best Odds Guarantee</h4>
            <p className="text-sm text-muted leading-relaxed">
              We aggregate odds from multiple bookmakers to ensure you always get the best 
              available odds. Green-highlighted odds indicate the best value for each market, 
              helping you maximize your potential returns.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


