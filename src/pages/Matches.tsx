import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useParams, useNavigate, useLocation } from "react-router-dom";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import type { Country } from "../contexts/CountryContext";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";
import OddsTable from "../components/OddsTable";
import { useAppDispatch } from "../store/hooks";
import { getMatchingInfoAction } from "../store/matchinginfo/actions";
import type { MatchingInfo } from "../store/matchinginfo/types";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/authService";
import { bettingService, BettingRecordCreate } from "../services/bettingService";
import { trackConversion } from "../utils/clickTracker";
import { calculateBettingReturnFromAmerican, calculateBettingReturnFromDecimal } from "../utils/bettingCalculator";
import { useNotifications } from "../contexts/NotificationContext";
import CongratulationsAlert from "../components/CongratulationsAlert";
import { getTeamLogo } from "../utils/teamLogos";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

const PAGE_SIZE = 20;

/** Build date tab id from a Date (use local YYYY-MM-DD so timezone doesn't shift the day) */
function getDateTabId(d: Date, rel: "yesterday" | "today" | "tomorrow" | null): string {
  if (rel === "yesterday") return "yesterday";
  if (rel === "today") return "today";
  if (rel === "tomorrow") return "tomorrow";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateTabLabel(d: Date, rel: "yesterday" | "today" | "tomorrow" | null): string {
  if (rel === "yesterday") return "Yesterday";
  if (rel === "today") return "Today";
  if (rel === "tomorrow") return "Tomorrow";
  const day = d.getDate();
  const mon = d.toLocaleString("en-GB", { month: "short" });
  return `${day} ${mon}`;
}

/** Parse YYYY-MM-DD as local calendar date (avoids UTC off-by-one; strips time if present) */
function parseLocalDate(ymd: string): Date {
  const datePart = ymd.trim().split("T")[0].slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
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
    target = parseLocalDate(selectedDateId);
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
    target = parseLocalDate(selectedDateId);
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

/** Format match date for display in the table (parse as local date so tab and column match, e.g. "14 Feb") */
function formatMatchDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
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

/** Return Tailwind class for odds by value: highest=green, middle=red, lowest=blue (text + subtle bg for visibility). */
function getOddsColorClass(
  o1: number,
  oX: number,
  o2: number,
  which: "1" | "X" | "2"
): string {
  const sorted = [
    { v: o1, k: "1" as const },
    { v: oX, k: "X" as const },
    { v: o2, k: "2" as const },
  ].sort((a, b) => b.v - a.v);
  const rank = sorted.findIndex((x) => x.k === which);
  if (rank === 0) return "text-green-400 bg-green-500/20 px-2 py-0.5 rounded";
  if (rank === 1) return "text-red-400 bg-red-500/20 px-2 py-0.5 rounded";
  return "text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded";
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

export default function Matches() {
  const { selectedLeague, selectedCountry, setSelectedCountry, setSelectedLeague, countries } = useCountry();
  const params = useParams<{ country?: string; league?: string }>();
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedSport, setSelectedSport] = useState("Football");
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Betslip state (for /next-matches page - stay on page instead of navigating)
  const [selectedOdds, setSelectedOdds] = useState<SlipSelection[]>([]);
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [isBetSlipCollapsed, setIsBetSlipCollapsed] = useState(false);
  const [isBetSlipHiding, setIsBetSlipHiding] = useState(false);
  const [selectedBetAmount, setSelectedBetAmount] = useState("10");
  const isOnNextMatchesPage = location.pathname === "/next-matches";
  const { isAuthenticated, user } = useAuth();
  const { addNewBetNotification } = useNotifications();
  
  // Betting state
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isConfirmingBet, setIsConfirmingBet] = useState(false);
  const [showBetConfirmation, setShowBetConfirmation] = useState(false);
  const [bettingError, setBettingError] = useState("");
  const [duplicateBetError, setDuplicateBetError] = useState("");
  const [betDetails, setBetDetails] = useState<{ betAmount: string; potentialWin: string; teams: string } | null>(null);
  const [userBetMatchOutcomes, setUserBetMatchOutcomes] = useState<Set<string>>(new Set());
  
  const userFunds = user?.funds_usd || 0;
  
  // Helper functions for betslip
  const handleBetAmountClick = (amount: string) => {
    setSelectedBetAmount(amount);
    setSelectedOdds(prev => prev.map(odds => ({ ...odds, stake: amount })));
  };
  
  const handleBetSlipHeaderClick = () => {
    setIsBetSlipCollapsed(!isBetSlipCollapsed);
  };
  
  const highlightSearchTerm = useCallback((text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? <mark key={index} className="bg-yellow-500/30">{part}</mark> : part
    );
  }, []);
  
  const handleIndividualStakeChange = (matchId: string, type: "home" | "draw" | "away", newStake: string) => {
    setSelectedOdds(prev => prev.map(odds => 
      odds.matchId === matchId && odds.type === type
        ? { ...odds, stake: newStake }
        : odds
    ));
  };
  
  const calculatePotentialWin = (): number => {
    if (selectedOdds.length === 0) return 0;

    const totalDecimalOdds = selectedOdds.reduce((product, odds) => {
      const decimalOdds = OddsConverter.stringToDecimal(odds.odds || "2.0");
      return product * decimalOdds;
    }, 1);

    const totalStake = selectedOdds.reduce(
      (total, odds) => total + parseFloat(odds.stake || "0"),
      0
    );

    return totalStake * totalDecimalOdds;
  };
  
  const formatOddsForSlip = (odds: string): string => {
    if (!odds || odds === '-' || odds === 'N/A') return '—';
    const decimalOdds = OddsConverter.stringToDecimal(odds);
    if (isNaN(decimalOdds) || decimalOdds < 1.01) return '—';
    return getOddsInFormat(decimalOdds);
  };
  
  // Validation functions
  const validateBettingSelections = () => {
    const matchCounts = new Map<string, number>();
    const invalidMatchIds = new Set<string>();
    
    selectedOdds.forEach(odds => {
      const currentCount = matchCounts.get(odds.matchId) || 0;
      matchCounts.set(odds.matchId, currentCount + 1);
      
      if (currentCount + 1 > 1) {
        invalidMatchIds.add(odds.matchId);
      }
    });
    
    return {
      isValid: invalidMatchIds.size === 0,
      invalidMatchIds: Array.from(invalidMatchIds)
    };
  };
  
  const bettingValidation = validateBettingSelections();
  
  const hasUserBetOnOutcome = (matchId: string, outcome: string): boolean => {
    const key = `${matchId}_${(outcome || "").toLowerCase()}`;
    return userBetMatchOutcomes.has(key);
  };
  
  // Fetch user's existing bets
  useEffect(() => {
    const fetchUserExistingBets = async () => {
      if (!isAuthenticated || !user?.id) {
        setUserBetMatchOutcomes(new Set());
        return;
      }
      
      try {
        const response = await bettingService.getBettingRecords(1, 50);
        const outcomes = new Set<string>();
        if (response && response.records) {
          const userRecords = response.records.filter((record: any) => record.user_id === user?.id);
          userRecords.forEach((bet: any) => {
            if (bet.match_id && bet.selected_outcome) {
              outcomes.add(`${bet.match_id}_${bet.selected_outcome.toLowerCase()}`);
            }
          });
        }
        setUserBetMatchOutcomes(outcomes);
      } catch (error) {
        console.error('Failed to fetch user bets:', error);
      }
    };
    
    fetchUserExistingBets();
  }, [isAuthenticated, user?.id]);
  
  // Handle place bet
  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }
    
    // Check for duplicate (match, outcome)
    const duplicateSelections = selectedOdds.filter(odds => hasUserBetOnOutcome(odds.matchId, odds.type));
    if (duplicateSelections.length > 0) {
      setDuplicateBetError("You already have a bet on one of these selections (same match + outcome). Remove it or pick another outcome.");
      return;
    }
    
    // Check for invalid betting selections
    if (!bettingValidation.isValid) {
      setBettingError("Cannot place multiple bets on the same match");
      return;
    }
    
    // Prevent rapid clicking
    if (isPlacingBet || isConfirmingBet || showBetConfirmation) {
      return;
    }
    
    const totalBetAmount = selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0);
    
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
  
  // Confirm bet
  const confirmBet = async () => {
    setIsConfirmingBet(true);
    
    try {
      const totalBetAmount = selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0);
      
      // Track conversion events
      for (const odds of selectedOdds) {
        trackConversion('bet_placed', odds.matchId, parseFloat(odds.stake || '0'), {
          match_teams: odds.teams,
          selected_outcome: odds.type,
          odds_value: odds.odds
        });
      }
      
      // Deduct funds
      await authService.deductFunds(totalBetAmount);
      
      // Save betting records
      for (const odds of selectedOdds) {
        const originalMatch = allMatches.find(m => String(m.id) === odds.matchId);
        let realMatchDate: string | null = null;
        
        if (originalMatch && originalMatch.date && originalMatch.time && originalMatch.time !== "LIVE") {
          try {
            const dateTimeString = `${originalMatch.date}T${originalMatch.time}`;
            const matchDateTime = new Date(dateTimeString);
            
            if (!isNaN(matchDateTime.getTime())) {
              const year = matchDateTime.getFullYear();
              const month = String(matchDateTime.getMonth() + 1).padStart(2, '0');
              const day = String(matchDateTime.getDate()).padStart(2, '0');
              const hours = String(matchDateTime.getHours()).padStart(2, '0');
              const minutes = String(matchDateTime.getMinutes()).padStart(2, '0');
              const seconds = String(matchDateTime.getSeconds()).padStart(2, '0');
              realMatchDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
            }
          } catch (error) {
            console.error('Error creating match date:', error);
          }
        }
        
        const stake = parseFloat(odds.stake || '10');
        const oddsString = odds.odds || '2.0';
        const isDecimalFormat = oddsString.includes('.') || (parseFloat(oddsString) >= 1.0 && parseFloat(oddsString) <= 10.0);
        
        const bettingCalculation = isDecimalFormat 
          ? calculateBettingReturnFromDecimal(stake, oddsString)
          : calculateBettingReturnFromAmerican(stake, oddsString);
        
        const bettingRecord: BettingRecordCreate = {
          bet_amount: stake,
          potential_win: bettingCalculation.totalReturn,
          match_id: odds.matchId ? parseInt(odds.matchId.toString()) : null,
          match_teams: odds.teams || 'Unknown Match',
          match_date: realMatchDate,
          match_league: odds.league || 'Unknown League',
          match_status: originalMatch?.time === "LIVE" ? "live" : "upcoming",
          selected_outcome: odds.type || 'home',
          selected_team: odds.type === 'home' ? (odds.teams || '').split(' vs ')[0] : 
                        odds.type === 'away' ? (odds.teams || '').split(' vs ')[1] : undefined,
          odds_value: odds.odds || '+100',
          odds_decimal: bettingCalculation.decimalOdds
        };
        
        try {
          const savedRecord = await bettingService.createBettingRecord(bettingRecord);
          if (savedRecord && savedRecord.id) {
            addNewBetNotification(
              savedRecord.id,
              bettingRecord.match_teams,
              bettingRecord.bet_amount,
              bettingRecord.potential_win
            );
          }
        } catch (saveError: any) {
          console.error('Failed to save betting record:', saveError);
          throw saveError;
        }
      }
      
      // Update user bet outcomes
      const newBetOutcomes = new Set(userBetMatchOutcomes);
      selectedOdds.forEach(odds => {
        newBetOutcomes.add(`${odds.matchId}_${(odds.type || "").toLowerCase()}`);
      });
      setUserBetMatchOutcomes(newBetOutcomes);
      
      // Refresh user data
      await authService.getCurrentUser();
      
      // Store bet details for congratulations
      setBetDetails({
        betAmount: totalBetAmount.toFixed(2),
        potentialWin: calculatePotentialWin().toFixed(2),
        teams: selectedOdds.map(odds => odds.teams).join(", ")
      });
      
      // Close confirmation and clear betslip
      setShowBetConfirmation(false);
      setIsConfirmingBet(false);
      setSelectedOdds([]);
      setShowBetSlip(false);
      
    } catch (error: any) {
      console.error('Error placing bet:', error);
      setBettingError(error.message || "Failed to place bet. Please try again.");
      setIsConfirmingBet(false);
      setShowBetConfirmation(false);
    }
  };

  // Get search term from URL parameter
  const searchFromHome = searchParams.get('search');

  // Odds format conversion
  const { getOddsInFormat, oddsFormat } = useOddsFormat();

  // Helper function to convert and format odds (accepts string or number from API)
  // Returns empty string for null/invalid odds instead of "—" or "1.0"
  const formatOdds = (odds: string | number | null | undefined): string => {
    // Handle null/undefined explicitly
    if (odds == null || odds === undefined) {
      return '';
    }
    
    const s = typeof odds === 'number' ? String(odds) : (odds || '');
    const raw = s?.trim() ?? '';
    
    // Check for invalid/empty values - return empty string instead of "—"
    if (raw === '' || raw === '-' || raw.toUpperCase() === 'N/A' || raw === '0' || raw === '0.0' || raw === '0.00') {
      return '';
    }
    
    const decimalOdds = OddsConverter.stringToDecimal(s);
    
    // Check if conversion resulted in invalid odds (NaN or less than 1.01) - return empty string
    if (Number.isNaN(decimalOdds) || decimalOdds < 1.01) {
      return '';
    }
    
    return getOddsInFormat(decimalOdds);
  };

  const [selectedView, setSelectedView] = useState("kickoff");

  // Dynamic date tabs: Today, Tomorrow, then next 5 days (no Yesterday for Next Matches)
  const dates = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const out: { id: string; label: string }[] = [];
    for (let i = 0; i <= 6; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const rel = i === 0 ? "today" : i === 1 ? "tomorrow" : null;
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
          Add your chosen pick to the betslip by clicking the odds.
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
              const o1 = m.odd_1 ?? 0; const oX = m.odd_X ?? 0; const o2 = m.odd_2 ?? 0;
              const leaguePath = `/football/${toSlug(m.country)}/${toSlug(m.league)}/`;
              const addToSlip = (type: "home" | "draw" | "away", oddsVal: number) => (e: React.MouseEvent) => {
                e.stopPropagation();
                const bet: SlipSelection = {
                  matchId: String(m.id),
                  type,
                  odds: String(oddsVal),
                  teams: `${m.home_team} vs ${m.away_team}`,
                  league: m.league,
                  stake: "10",
                  matchDate: m.date,
                  matchTime: m.time ?? undefined,
                };
                if (isOnNextMatchesPage) {
                  // On /next-matches: add to betslip, stay on page
                  const isAlreadySelected = selectedOdds.some(
                    o => o.matchId === bet.matchId && o.type === bet.type
                  );
                  if (isAlreadySelected) {
                    setSelectedOdds(prev => {
                      const filtered = prev.filter(
                        o => !(o.matchId === bet.matchId && o.type === bet.type)
                      );
                      if (filtered.length === 0) {
                        setShowBetSlip(false);
                      }
                      return filtered;
                    });
                  } else {
                    setSelectedOdds(prev => [...prev, bet]);
                    setShowBetSlip(true);
                    setIsBetSlipCollapsed(false);
                  }
                } else {
                  // On league page: navigate with state (existing behavior)
                  navigate(leaguePath, { state: { addToSlip: bet } });
                }
              };
              return (
                <div
                  key={m.id}
                  className="bg-surface border border-border rounded-lg p-3 sm:p-4 hover:bg-bg/50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <button
                        type="button"
                        onClick={() => navigate(leaguePath)}
                        className="flex-1 min-w-0 text-left hover:opacity-90"
                      >
                        <h3 className="font-semibold text-text text-sm sm:text-base leading-tight line-clamp-2">
                          {m.home_team} vs {m.away_team}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted mt-1">Football / {m.country} / {m.league}</p>
                      </button>
                      <div className="flex flex-col items-end gap-2 ml-3">
                        <span className="text-xs sm:text-sm font-semibold text-text">{formatTimeHHMM(m.time)}</span>
                        <span className="text-xs text-muted">{formatMatchDate(m.date)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {(() => {
                        const odd1Formatted = formatOdds(m.odd_1);
                        const oddXFormatted = formatOdds(m.odd_X);
                        const odd2Formatted = formatOdds(m.odd_2);
                        const odd1Valid = odd1Formatted !== '';
                        const oddXValid = oddXFormatted !== '';
                        const odd2Valid = odd2Formatted !== '';
                        return (
                          <>
                            <button
                              type="button"
                              onClick={odd1Valid ? addToSlip("home", Number(m.odd_1) || 0) : undefined}
                              disabled={!odd1Valid}
                              className={`text-center py-1 rounded transition-colors ${
                                odd1Valid 
                                  ? 'hover:bg-bg/80 cursor-pointer' 
                                  : 'opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="text-xs text-muted mb-1">1</div>
                              <div className={`text-xs sm:text-sm font-semibold inline-block ${odd1Valid ? getOddsColorClass(o1, oX, o2, "1") : 'text-muted'}`}>
                                {odd1Formatted}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={oddXValid ? addToSlip("draw", Number(m.odd_X) || 0) : undefined}
                              disabled={!oddXValid}
                              className={`text-center py-1 rounded transition-colors ${
                                oddXValid 
                                  ? 'hover:bg-bg/80 cursor-pointer' 
                                  : 'opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="text-xs text-muted mb-1">X</div>
                              <div className={`text-xs sm:text-sm font-semibold inline-block ${oddXValid ? getOddsColorClass(o1, oX, o2, "X") : 'text-muted'}`}>
                                {oddXFormatted}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={odd2Valid ? addToSlip("away", Number(m.odd_2) || 0) : undefined}
                              disabled={!odd2Valid}
                              className={`text-center py-1 rounded transition-colors ${
                                odd2Valid 
                                  ? 'hover:bg-bg/80 cursor-pointer' 
                                  : 'opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="text-xs text-muted mb-1">2</div>
                              <div className={`text-xs sm:text-sm font-semibold inline-block ${odd2Valid ? getOddsColorClass(o1, oX, o2, "2") : 'text-muted'}`}>
                                {odd2Formatted}
                              </div>
                            </button>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="text-center">
                        <div className="text-xs text-muted">Bookmakers</div>
                        <div className="text-sm font-bold text-accent">{m.bets ?? 0}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(leaguePath)}
                        className="text-xs text-accent hover:underline"
                      >
                        View league
                      </button>
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
                const o1 = m.odd_1 ?? 0; const oX = m.odd_X ?? 0; const o2 = m.odd_2 ?? 0;
                const leaguePath = `/football/${toSlug(m.country)}/${toSlug(m.league)}/`;
                const addToSlip = (type: "home" | "draw" | "away", oddsVal: number) => (e: React.MouseEvent) => {
                  e.stopPropagation();
                  const bet: SlipSelection = {
                    matchId: String(m.id),
                    type,
                    odds: String(oddsVal),
                    teams: `${m.home_team} vs ${m.away_team}`,
                    league: m.league,
                    stake: "10",
                    matchDate: m.date,
                    matchTime: m.time ?? undefined,
                  };
                  if (isOnNextMatchesPage) {
                    // On /next-matches: add to betslip, stay on page
                    const isAlreadySelected = selectedOdds.some(
                      o => o.matchId === bet.matchId && o.type === bet.type
                    );
                  if (isAlreadySelected) {
                    setSelectedOdds(prev => {
                      const filtered = prev.filter(
                        o => !(o.matchId === bet.matchId && o.type === bet.type)
                      );
                      if (filtered.length === 0) {
                        setShowBetSlip(false);
                      }
                      return filtered;
                    });
                  } else {
                    setSelectedOdds(prev => [...prev, bet]);
                    setShowBetSlip(true);
                    setIsBetSlipCollapsed(false);
                  }
                } else {
                  // On league page: navigate with state (existing behavior)
                  navigate(leaguePath, { state: { addToSlip: bet } });
                }
                };
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-12 gap-4 items-center px-4 py-3 bg-surface border-b border-border last:border-b-0 hover:bg-bg/50 transition-colors"
                  >
                    <div className="col-span-2 text-sm text-muted">{formatMatchDate(m.date)}</div>
                    <div className="col-span-2 text-sm text-muted">{formatTimeHHMM(m.time)}</div>
                    <div className="col-span-4">
                      <button
                        type="button"
                        onClick={() => navigate(leaguePath)}
                        className="text-left hover:opacity-90"
                      >
                        <div className="font-medium text-text">{m.home_team} vs {m.away_team}</div>
                        <div className="text-xs text-muted">Football / {m.country} / {m.league}</div>
                      </button>
                    </div>
                    {(() => {
                      const odd1Formatted = formatOdds(m.odd_1);
                      const oddXFormatted = formatOdds(m.odd_X);
                      const odd2Formatted = formatOdds(m.odd_2);
                      const odd1Valid = odd1Formatted !== '';
                      const oddXValid = oddXFormatted !== '';
                      const odd2Valid = odd2Formatted !== '';
                      return (
                        <>
                          <button
                            type="button"
                            onClick={odd1Valid ? addToSlip("home", Number(m.odd_1) || 0) : undefined}
                            disabled={!odd1Valid}
                            className={`col-span-1 text-center py-1 rounded transition-colors ${
                              odd1Valid 
                                ? 'hover:bg-bg/80 cursor-pointer' 
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <span className={`text-sm font-semibold inline-block ${odd1Valid ? getOddsColorClass(o1, oX, o2, "1") : 'text-muted'}`}>
                              {odd1Formatted}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={oddXValid ? addToSlip("draw", Number(m.odd_X) || 0) : undefined}
                            disabled={!oddXValid}
                            className={`col-span-1 text-center py-1 rounded transition-colors ${
                              oddXValid 
                                ? 'hover:bg-bg/80 cursor-pointer' 
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <span className={`text-sm font-semibold inline-block ${oddXValid ? getOddsColorClass(o1, oX, o2, "X") : 'text-muted'}`}>
                              {oddXFormatted}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={odd2Valid ? addToSlip("away", Number(m.odd_2) || 0) : undefined}
                            disabled={!odd2Valid}
                            className={`col-span-1 text-center py-1 rounded transition-colors ${
                              odd2Valid 
                                ? 'hover:bg-bg/80 cursor-pointer' 
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <span className={`text-sm font-semibold inline-block ${odd2Valid ? getOddsColorClass(o1, oX, o2, "2") : 'text-muted'}`}>
                              {odd2Formatted}
                            </span>
                          </button>
                        </>
                      );
                    })()}
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

      {/* Betslip for /next-matches page - Elegant Design */}
      {(isOnNextMatchesPage && (showBetSlip || isBetSlipHiding) && selectedOdds.length > 0) && (
        <div 
          className={`fixed bottom-4 right-4 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50 betslip-modal ${
            isBetSlipCollapsed ? 'h-16' : 'h-auto'
          }`}
          style={{
            transform: isBetSlipHiding ? 'translateY(100%)' : 'translateY(0)',
            opacity: isBetSlipHiding ? '0' : '1',
            transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out'
          }}
        >
          {/* Yellow Header */}
          <div 
            className="bg-yellow-500 text-black px-4 py-3 rounded-t-xl flex items-center justify-between cursor-pointer hover:bg-yellow-400 transition-colors betslip-header"
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
              <div className="w-8 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <svg 
                className={`w-4 h-4 transition-transform duration-300 ease-in-out ${
                  isBetSlipCollapsed ? 'rotate-180' : 'rotate-0'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* Content */}
          <div 
            className={`betslip-content transition-all duration-300 ease-in-out ${
              isBetSlipCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[600px] opacity-100'
            }`}
            style={{
              transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out'
            }}
          >
            {/* Tabs */}
            <div className="flex border-b border-border" onClick={(e) => e.stopPropagation()}>
              <button className="flex-1 py-2 text-sm font-medium text-yellow-500 border-b-2 border-yellow-500">Single</button>
              <button className="flex-1 py-2 text-sm font-medium text-muted/50 cursor-not-allowed" disabled>Combo</button>
              <button className="flex-1 py-2 text-sm font-medium text-muted/50 cursor-not-allowed" disabled>System</button>
            </div>
            
            <div className="p-4 max-h-[600px] overflow-y-auto betting-slip-scroll" onClick={(e) => e.stopPropagation()}>
              {selectedOdds.map((odds, index) => (
                <div key={`${odds.matchId}-${odds.type}`} className="bg-surface border border-border rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Team Logo */}
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          {odds.type === 'home' && getTeamLogo(odds.teams.split(' vs ')[0], selectedCountry?.name) ? (
                            <img
                              src={getTeamLogo(odds.teams.split(' vs ')[0], selectedCountry?.name)!}
                              alt={`${odds.teams.split(' vs ')[0]} icon`}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : odds.type === 'away' && getTeamLogo(odds.teams.split(' vs ')[1], selectedCountry?.name) ? (
                            <img
                              src={getTeamLogo(odds.teams.split(' vs ')[1], selectedCountry?.name)!}
                              alt={`${odds.teams.split(' vs ')[1]} icon`}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {odds.type === 'home' ? (
                            <span className="text-sm font-medium text-text">{odds.teams.split(' vs ')[0]}</span>
                          ) : odds.type === 'away' ? (
                            <span className="text-sm font-medium text-text">{odds.teams.split(' vs ')[1]}</span>
                          ) : (
                            <span className="text-sm font-medium text-text">Draw</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-9 space-y-1">
                        <div className="text-xs text-muted">{odds.teams}</div>
                        <div className="text-xs text-muted">1x2</div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-text">{formatOddsForSlip(odds.odds)}</span>
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
                      className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-400 transition-colors"
                      onClick={() => {
                        setSelectedOdds(prev => {
                          const filtered = prev.filter(
                            item => !(item.matchId === odds.matchId && item.type === odds.type)
                          );
                          if (filtered.length === 0) {
                            setIsBetSlipHiding(true);
                            setTimeout(() => {
                              setShowBetSlip(false);
                              setIsBetSlipHiding(false);
                            }, 500);
                          }
                          return filtered;
                        });
                        setDuplicateBetError("");
                      }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Stake Amount Buttons */}
              <div className="flex gap-2 mb-4">
                <button 
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedBetAmount === "10" 
                      ? "bg-yellow-500 text-black" 
                      : "bg-surface border border-border text-text hover:bg-bg/50"
                  }`}
                  onClick={() => handleBetAmountClick("10")}
                >
                  10
                </button>
                <button 
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedBetAmount === "20" 
                      ? "bg-yellow-500 text-black" 
                      : "bg-surface border border-border text-text hover:bg-bg/50"
                  }`}
                  onClick={() => handleBetAmountClick("20")}
                >
                  20
                </button>
                <button 
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedBetAmount === "50" 
                      ? "bg-yellow-500 text-black" 
                      : "bg-surface border border-border text-text hover:bg-bg/50"
                  }`}
                  onClick={() => handleBetAmountClick("50")}
                >
                  50
                </button>
              </div>
              
              {/* Summary */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Total Bet</span>
                  <span className="text-text">${selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">POTENTIAL WIN</span>
                  <span className="text-text">${calculatePotentialWin().toFixed(2)}</span>
                </div>
              </div>
              
              {/* Authentication and Betting States */}
              {!isAuthenticated ? (
                <div className="flex items-center gap-2 mb-4 p-3 bg-bg/50 rounded-lg">
                  <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm text-muted">Please, login to place bet</span>
                </div>
              ) : bettingError ? (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                  <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-400 mb-3">{bettingError}</p>
                  <button 
                    className="w-full py-3 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors"
                    onClick={() => navigate("/profile")}
                  >
                    DEPOSIT
                  </button>
                </div>
              ) : duplicateBetError ? (
                <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                  <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-orange-400 mb-3">{duplicateBetError}</p>
                  <button 
                    className="w-full py-3 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-400 transition-colors"
                    onClick={() => setDuplicateBetError("")}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg ${
                  bettingValidation.isValid 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  {bettingValidation.isValid ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                  <span className={`text-sm ${
                    bettingValidation.isValid ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {bettingValidation.isValid 
                      ? 'Ready to place your bet!' 
                      : 'At least one of the selections is invalid!'
                    }
                  </span>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2 mb-3">
                <button className="flex-1 py-3 bg-surface border border-border text-text rounded-lg text-sm font-medium">SHARE</button>
                <button 
                  onClick={handlePlaceBet}
                  disabled={isPlacingBet || isConfirmingBet || !bettingValidation.isValid || !isAuthenticated}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isPlacingBet || isConfirmingBet || !bettingValidation.isValid || !isAuthenticated
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      : 'bg-yellow-500 text-black hover:bg-yellow-400'
                  }`}
                >
                  {isPlacingBet || isConfirmingBet ? "PLACING BET..." : "PLACE BET"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bet Confirmation Modal */}
      {showBetConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100000] p-4">
          <div className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Confirm Your Bet</h3>
                <button
                  onClick={() => setShowBetConfirmation(false)}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
                  disabled={isConfirmingBet}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {isConfirmingBet ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-white text-lg font-semibold">Placing your bet...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-3">Your Selections</h4>
                      <div className="space-y-2">
                        {selectedOdds.map((odds, index) => (
                          <div key={index} className="bg-white/5 rounded-lg p-3 text-sm">
                            <div className="text-white font-medium">{odds.teams}</div>
                            <div className="text-white/70 text-xs">
                              {odds.type === 'home' ? odds.teams.split(' vs ')[0] : 
                               odds.type === 'away' ? odds.teams.split(' vs ')[1] : 'Draw'} 
                              <span className="text-yellow-400 font-semibold ml-2">({formatOddsForSlip(odds.odds)})</span>
                            </div>
                            <div className="text-white font-bold mt-1">${odds.stake}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-3">Bet Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/80">Total Bet:</span>
                          <span className="text-white font-bold">
                            ${selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/80">Potential Win:</span>
                          <span className="text-green-400 font-bold text-lg">
                            ${calculatePotentialWin().toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/80">Current Balance:</span>
                          <span className="text-blue-400 font-medium">${userFunds.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/80">After Bet:</span>
                          <span className="text-orange-400 font-medium">
                            ${(userFunds - selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowBetConfirmation(false)}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmBet}
                      className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-semibold transition-all"
                    >
                      Confirm Bet
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Congratulations Alert */}
      {betDetails && (
        <CongratulationsAlert
          isVisible={!!betDetails}
          betAmount={betDetails.betAmount}
          potentialWin={betDetails.potentialWin}
          teams={betDetails.teams}
          onClose={() => setBetDetails(null)}
        />
      )}

      </section>
  );
}
