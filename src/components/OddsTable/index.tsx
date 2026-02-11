import React, { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useCountry } from "../../contexts/CountryContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useOddsFormat } from "../../hooks/useOddsFormat";
import { OddsConverter } from "../../utils/oddsConverter";
import { trackClick, trackConversion } from "../../utils/clickTracker";
import { calculateBettingReturnFromAmerican, calculateBettingReturnFromDecimal } from "../../utils/bettingCalculator";
import { useAppDispatch } from "../../store/hooks";
import { getMatchingInfoAction } from "../../store/matchinginfo/actions";
import { authService } from "../../services/authService";
import { bettingService, BettingRecordCreate } from "../../services/bettingService";
import { MatchingInfo, GetMatchingInfoResponse } from "../../store/matchinginfo/types";
import { transformMatchingInfoToMatch } from "../../data/sampleData";
import { getTeamLogo } from "../../utils/teamLogos";
import FantasticLoader from "../FantasticLoader";
import CongratulationsAlert from "../CongratulationsAlert";
import { getBaseUrl } from '../../config/api';
import {
  isSameYearSeasonCountry,
  getSeasonYearsForResults,
  getDefaultResultsSeasonYear,
  formatSeasonLabel as formatSeasonLabelFromConfig,
} from '../../config/seasonFormat';
type Match = {
  id: string;
  time: string;
  status: "Live" | "Upcoming" | "Finished";
  teams: string;
  sport: string;
  league: string;
  result?: string;
  isHistorical?: boolean;
  bookmakers: {
    name: string;
    home: string;
    away: string;
    draw?: string;
    overUnder?: string;
  }[];
  date?: string;
  bookmakerCount?: number;
};
type Bookmaker = {
  name: string;
  home: string;
  away: string;
  draw?: string;
  overUnder?: string;
};
interface OddsTableProps {
  highlightMatchId?: number;
  initialSearchTerm?: string;
}

export default function OddsTable({ highlightMatchId, initialSearchTerm }: OddsTableProps = {}) {
  const dispatch = useAppDispatch();
  const { selectedCountry, selectedLeague, setSelectedLeague, countries } = useCountry();
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { addNewBetNotification } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Helper function to convert name to URL slug (lowercase, hyphenated)
  const toSlug = (name: string): string => {
    return name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  };
  
  // Build URL path like OddsPortal: /football/{country}/{league}/results/ or /football/{country}/{league}/
  const buildLeaguePath = (market: string = "Next Matches"): string => {
    if (!selectedCountry || !selectedLeague) {
      // Fallback to simple routes if no country/league selected
      return market === "Results" ? "/results" : "/next-matches";
    }
    
    const countrySlug = toSlug(selectedCountry.name);
    const leagueSlug = toSlug(selectedLeague.name);
    
    if (market === "Results") {
      return `/football/${countrySlug}/${leagueSlug}/results/`;
    }
    return `/football/${countrySlug}/${leagueSlug}/`;
  };
  
  // Determine initial market from URL pathname
  const getMarketFromPath = (pathname: string): string => {
    if (pathname.includes('/results')) {
      return "Results";
    }
    return "Next Matches"; // Default (matches OddsPortal where no /results means next matches)
  };
  

  // Helper function to check if a match should be highlighted
  const isMatchHighlighted = (match: Match): boolean => {
    if (!highlightMatchId) return false;
    
    // Parse teams from the match
    const [homeTeam, awayTeam] = match.teams.split(' vs ');
    
    // First try exact ID match
    if (parseInt(match.id) === highlightMatchId) {
      return true;
    }
    
    // If ID doesn't match, try to extract team names from URL and match them
    const urlParams = new URLSearchParams(window.location.search);
    const highlightParam = urlParams.get('highlight');
    
    if (highlightParam && highlightParam.includes('_')) {
      const parts = highlightParam.split('_');
      if (parts.length >= 3) {
        const targetHomeTeam = parts[1].replace(/_/g, ' ').toLowerCase();
        const targetAwayTeam = parts[2].replace(/_/g, ' ').toLowerCase();
        
        
        // Flexible team name matching
        const normalizeTeamName = (name: string) => {
          return name.toLowerCase()
            .replace(/fc\s+/g, '') // Remove "FC "
            .replace(/\s+fc$/g, '') // Remove " FC" at end
            .replace(/^the\s+/g, '') // Remove "The " at start
            .replace(/[^\w\s]/g, '') // Remove special characters
            .trim();
        };
        
        const normalizedHomeTarget = normalizeTeamName(targetHomeTeam);
        const normalizedAwayTarget = normalizeTeamName(targetAwayTeam);
        const normalizedHomeMatch = normalizeTeamName(homeTeam);
        const normalizedAwayMatch = normalizeTeamName(awayTeam);
        

        
        // Check if team names match (either direction)
        const homeMatch = normalizedHomeMatch.includes(normalizedHomeTarget) ||
                         normalizedHomeTarget.includes(normalizedHomeMatch) ||
                         normalizedHomeMatch === normalizedHomeTarget;
        
        const awayMatch = normalizedAwayMatch.includes(normalizedAwayTarget) ||
                         normalizedAwayTarget.includes(normalizedAwayMatch) ||
                         normalizedAwayMatch === normalizedAwayTarget;
        
        
        if (homeMatch && awayMatch) {
          return true;
        }
        
        // Also try reverse matching (home vs away swapped)
        const homeMatchReversed = normalizedHomeMatch.includes(normalizedAwayTarget) ||
                                 normalizedAwayTarget.includes(normalizedHomeMatch) ||
                                 normalizedHomeMatch === normalizedAwayTarget;
        
        const awayMatchReversed = normalizedAwayMatch.includes(normalizedHomeTarget) ||
                                 normalizedHomeTarget.includes(normalizedAwayMatch) ||
                                 normalizedAwayMatch === normalizedHomeTarget;
        
        
        if (homeMatchReversed && awayMatchReversed) {
          return true;
        }
        
        // If no match found, log why
        
        // Special case: If we're looking for BEST ODDS matches that don't exist in the main list,
        // we'll log it but NOT highlight anything - only exact matches should be highlighted
        if (highlightMatchId === 1 || highlightMatchId === 2 || highlightMatchId === 3) {
          
          return false; // Don't highlight anything if it's not an exact match
        }
      }
    }
    
    return false;
  };

  // Debug highlighting
  useEffect(() => {
    if (highlightMatchId) {
    }
  }, [highlightMatchId]);

  // Odds format conversion
  const { getOddsInFormat, oddsFormat } = useOddsFormat();
  
  // Helper function to convert and format odds
  const formatOdds = (odds: string): string => {
    if (!odds || odds.trim() === '') {
      return odds || '';
    }
    
    // Use the robust string parser with correct conversion formulas
    const decimalOdds = OddsConverter.stringToDecimal(odds);
    const formatted = getOddsInFormat(decimalOdds);
    return formatted;
  };
  

  // Ref to track if component is mounted and prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Function to fetch user's existing bets and get match_ids
  const fetchUserExistingBets = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setUserBetMatchOutcomes(new Set());
      return;
    }

    try {
      const response = await bettingService.getBettingRecords(1, 50); // Get up to 50 records (API limit)
      
      if (response && response.records) {
        // Filter records for current user first
        const userRecords = response.records.filter(record => {
          const isUserRecord = record.user_id === user.id;
          return isUserRecord;
        });
        
        // Extract (match_id, outcome) so we allow one bet per outcome per match (e.g. home and draw on same match allowed)
        const matchOutcomes = new Set(
          userRecords
            .filter(record => {
              const hasMatchId = record.match_id != null;
              const hasOutcome = record.selected_outcome != null && record.selected_outcome !== "";
              return hasMatchId && hasOutcome;
            })
            .map(record => {
              const key = `${record.match_id}_${(record.selected_outcome || "").toLowerCase()}`;
              return key;
            })
        );
        
        setUserBetMatchOutcomes(matchOutcomes);
      }
    } catch (error: any) {
      // Ignore abort errors (request was cancelled)
      if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
        console.error('Error fetching user bets:', error);
      }
      // Don't set isOddsDisabled here - let the useEffect handle it
    }
  }, [isAuthenticated, user?.id]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancel any pending requests
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Check if user already has a bet on this (match, outcome) — used to block duplicate at place-bet
  const hasUserBetOnOutcome = (matchId: string, outcome: string): boolean => {
    const key = `${matchId}_${(outcome || "").toLowerCase()}`;
    return userBetMatchOutcomes.has(key);
  };

  // Fetch user's existing bets when component loads or user changes (don't disable odds - fetch in background)
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUserExistingBets();
    } else {
      setUserBetMatchOutcomes(new Set());
    }
    // Never disable odds buttons: allow clicking on upcoming/live events immediately.
    // Duplicate (match, outcome) check runs when user clicks "Place Bet".
    setIsOddsDisabled(false);
  }, [fetchUserExistingBets, isAuthenticated, user?.id]);

  const [selectedMarket, setSelectedMarket] = useState(() => getMarketFromPath(location.pathname));
  const [viewMode, setViewMode] = useState<"cards" | "rows">("rows");
  // Same-year leagues (e.g. Brazil): season is one calendar year (2026). Cross-year (e.g. Europe): 2025/2026.
  const isSameYearSeason = isSameYearSeasonCountry(selectedCountry?.name);
  const defaultResultsYear = getDefaultResultsSeasonYear(isSameYearSeason);
  const seasonYears = getSeasonYearsForResults(isSameYearSeason);
  // Default to latest season when Results is selected, undefined for Next Matches
  const [selectedYear, setSelectedYear] = useState<number | undefined>(() => {
    const marketFromPath = getMarketFromPath(location.pathname);
    return marketFromPath === "Results" ? getDefaultResultsSeasonYear(false) : undefined;
  });
  const formatSeasonLabel = (year?: number) => {
    if (year === undefined) return "";
    return formatSeasonLabelFromConfig(year, isSameYearSeason);
  };
  
  // Format time to HH:MM (strip seconds from HH:MM:SS or any longer form)
  const formatTime = (time: string): string => {
    if (!time || time === "LIVE") return time;
    const t = time.trim();
    const parts = t.split(':');
    if (parts.length >= 2) {
      const h = parts[0].replace(/\D/g, '') || '0';
      const m = parts[1].replace(/\D/g, '') || '0';
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
    return t;
  };
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 20;
  const [selectedOdds, setSelectedOdds] = useState<{
    matchId: string;
    type: 'home' | 'draw' | 'away';
    odds: string;
    teams: string;
    league: string;
    stake: string;
    matchDate?: string;
  }[]>([]);
  
  // State to track (match_id, outcome) user has already bet on — one bet per outcome per match (e.g. home + draw allowed)
  const [userBetMatchOutcomes, setUserBetMatchOutcomes] = useState<Set<string>>(new Set());
  
  // State to track if odds buttons should be disabled during data loading
  const [isOddsDisabled, setIsOddsDisabled] = useState(false);
  
  // Validation function to check for multiple bets on same match
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
  
  // Function to check if a match has invalid selections
  const isMatchInvalid = (matchId: string): boolean => {
    return bettingValidation.invalidMatchIds.includes(matchId);
  };
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [isBetSlipCollapsed, setIsBetSlipCollapsed] = useState(false);
  const [isBetSlipHiding, setIsBetSlipHiding] = useState(false);
  const [matchingInfo, setMatchingInfo] = useState<MatchingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  // API pagination state for total counts
  const [apiTotalPages, setApiTotalPages] = useState(1);
  const [apiTotalMatches, setApiTotalMatches] = useState(0);
  const MATCHES_PER_PAGE = 20; // Show only 20 matches per page
  const [animatingOdds, setAnimatingOdds] = useState<{
    matchId: string;
    type: 'home' | 'draw' | 'away';
    odds: string;
    teams: string;
    league: string;
    startPosition: { x: number; y: number };
  } | null>(null);
  const [selectedBetAmount, setSelectedBetAmount] = useState("10");
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [betDetails, setBetDetails] = useState<{
    betAmount: string;
    potentialWin: string;
    teams: string;
  }>({ betAmount: "10", potentialWin: "102.60", teams: "Team A vs Team B" });
  // Get search term from URL parameters (this will be updated when URL changes)
  const urlSearchTerm = searchParams.get('search') || "";
  
  const [searchQuery, setSearchQuery] = useState(urlSearchTerm || initialSearchTerm || "");
  
  // State to track if search should be triggered
  const [shouldTriggerSearch, setShouldTriggerSearch] = useState(false);
  
  // State to track if user is actively editing the search input
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  
  // State to track if we're switching markets (to prevent flash of old data)
  const [isSwitchingMarket, setIsSwitchingMarket] = useState(false);
  const [switchingToMarket, setSwitchingToMarket] = useState<string>("");
  
  // Ref to track the current switching timeout to prevent race conditions
  const switchingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to track last click time for debouncing
  const lastClickTimeRef = useRef<number>(0);
  
  // Robust market switching function that handles rapid clicks
  const handleMarketSwitch = useCallback((market: string) => {
    const now = Date.now();

    // Debounce rapid clicks (ignore clicks within 300ms)
    if (now - lastClickTimeRef.current < 300) {
      return;
    }
    
    // If already switching or clicking the same market, ignore
    if (isSwitchingMarket || market === selectedMarket) {
      return;
    }
    
    // Update last click time
    lastClickTimeRef.current = now;
    
    // Clear any existing timeout
    if (switchingTimeoutRef.current) {
      clearTimeout(switchingTimeoutRef.current);
      switchingTimeoutRef.current = null;
    }
    
    // Set switching state immediately
    setIsSwitchingMarket(true);
    setSwitchingToMarket(market);
    setMatchingInfo([]);
    setLoading(true);
    
    // Navigate to the correct route based on market (OddsPortal-style: /football/{country}/{league}/results/ or /football/{country}/{league}/)
    const route = buildLeaguePath(market);
    
    // Use a longer timeout for more stable switching
    switchingTimeoutRef.current = setTimeout(() => {
      // Navigate to the route
      navigate(route, { replace: true });
      setSelectedMarket(market);
      setCurrentPage(1);
      if (market === "Next Matches") {
        setSelectedYear(undefined);
      } else if (market === "Results") {
        // Default to latest season when switching to Results (2026 for same-year leagues, 2025 for cross-year)
        if (selectedYear === undefined) {
          setSelectedYear(defaultResultsYear);
        }
      }
      switchingTimeoutRef.current = null;
    }, 150);
  }, [isSwitchingMarket, selectedMarket, navigate]);
  
  // Ref to avoid sync/navigate loop: only sync from route when pathname actually changes (e.g. user navigated), not after we just navigated
  const lastPathnameRef = useRef<string>(location.pathname);
  const lastNavigatedToRef = useRef<string | null>(null);

  // Sync market state from route (pathname → state). Run only when pathname changed from outside (not from our own navigate)
  useEffect(() => {
    const pathname = location.pathname;
    const pathnameChanged = lastPathnameRef.current !== pathname;
    lastPathnameRef.current = pathname;

    // If we just navigated to this path, don't sync (avoids setState → re-render → effect → setState loop)
    if (lastNavigatedToRef.current === pathname) {
      lastNavigatedToRef.current = null;
      return;
    }

    const marketFromRoute = getMarketFromPath(pathname);
    if (marketFromRoute !== selectedMarket && !isSwitchingMarket) {
      setSelectedMarket(marketFromRoute);
      setCurrentPage(1);
      if (marketFromRoute === "Next Matches") {
        setSelectedYear(undefined);
      } else if (marketFromRoute === "Results" && selectedYear === undefined) {
        setSelectedYear(defaultResultsYear);
      }
    }
  }, [location.pathname, selectedMarket, isSwitchingMarket, selectedYear, defaultResultsYear]);

  // When viewing Results for a same-year country (e.g. Brazil), use current year (2026) not cross-year default (2025)
  useEffect(() => {
    if (
      selectedMarket === "Results" &&
      isSameYearSeason &&
      selectedYear === getDefaultResultsSeasonYear(false)
    ) {
      setSelectedYear(defaultResultsYear);
    }
  }, [selectedMarket, isSameYearSeason, selectedYear, defaultResultsYear]);

  // Update URL when league/market selection doesn't match route. Guard with ref so we don't navigate repeatedly (stops vibrating loop)
  const countryNameForUrl = selectedCountry?.name ?? "";
  const leagueNameForUrl = selectedLeague?.name ?? "";
  useEffect(() => {
    if (!countryNameForUrl || !leagueNameForUrl || isSwitchingMarket) return;
    const expectedPath = buildLeaguePath(selectedMarket);
    const isOnFootballRoute = location.pathname.includes('/football/');
    if (!isOnFootballRoute || location.pathname === expectedPath) return;
    // Avoid navigating to the same path we already navigated to (breaks loop)
    if (lastNavigatedToRef.current === expectedPath) return;
    lastNavigatedToRef.current = expectedPath;
    navigate(expectedPath, { replace: true });
  }, [countryNameForUrl, leagueNameForUrl, selectedMarket, isSwitchingMarket, navigate, location.pathname]);
  
  // Betting states
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [bettingError, setBettingError] = useState<string>("");
  const [showBetConfirmation, setShowBetConfirmation] = useState(false);
  const [isConfirmingBet, setIsConfirmingBet] = useState(false);
  const [duplicateBetError, setDuplicateBetError] = useState<string>("");
  
  // Get user funds from auth context
  const userFunds = user?.funds_usd || 0;
  
  // Betting functions
  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }
    
    // Check for duplicate (match, outcome) — allow same match with different outcome (e.g. home + draw)
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
    
    // Check if bet amount is greater than 0
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
      const totalBetAmount = selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0);
      
      // Track conversion event (bet placed)
      for (const odds of selectedOdds) {
        trackConversion('bet_placed', odds.matchId, parseFloat(odds.stake || '0'), {
          match_teams: odds.teams,
          selected_outcome: odds.type,
          odds_value: odds.odds
        });
      }
      
      // Deduct funds from database using real API
      await authService.deductFunds(totalBetAmount);
      
      // Save each betting record to database with better error handling
      try {
        
        // Check authentication first
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('No access token found - please sign in again');
        }
        
        for (const odds of selectedOdds) {
          // Get the ACTUAL match date and time from the selected match
          const originalMatch = getMatches().find(m => m.id === odds.matchId);
          let realMatchDate: string | null = null;
          
          
          if (originalMatch && originalMatch.date && originalMatch.time && originalMatch.time !== "LIVE") {
            try {
              // Create datetime string without timezone conversion
              // We want to preserve the exact time as shown in the UI
              const dateTimeString = `${originalMatch.date}T${originalMatch.time}`;
              
              // Create a date object but convert it to a timezone-naive string
              // This prevents timezone conversion issues
              const matchDateTime = new Date(dateTimeString);
              
              if (isNaN(matchDateTime.getTime())) {
                console.error('Invalid datetime from combined date+time:', {
                  originalDate: originalMatch.date,
                  originalTime: originalMatch.time,
                  combined: dateTimeString
                });
                realMatchDate = null;
              } else {
                // Create timezone-naive datetime string by manually formatting
                // This preserves the original time exactly as displayed
                const year = matchDateTime.getFullYear();
                const month = String(matchDateTime.getMonth() + 1).padStart(2, '0');
                const day = String(matchDateTime.getDate()).padStart(2, '0');
                const hours = String(matchDateTime.getHours()).padStart(2, '0');
                const minutes = String(matchDateTime.getMinutes()).padStart(2, '0');
                const seconds = String(matchDateTime.getSeconds()).padStart(2, '0');
                
                // Format as timezone-naive datetime string
                realMatchDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                
              }
            } catch (error) {
              console.error('❌ Error creating match date:', error);
              realMatchDate = null;
            }
          } else {
          }

          // Calculate betting return using consistent utility function
          const stake = parseFloat(odds.stake || '10');
          // Detect if odds are already in decimal format or need conversion
          const oddsString = odds.odds || '2.0';
          const isDecimalFormat = oddsString.includes('.') || (parseFloat(oddsString) >= 1.0 && parseFloat(oddsString) <= 10.0);
          
          const bettingCalculation = isDecimalFormat 
            ? calculateBettingReturnFromDecimal(stake, oddsString)
            : calculateBettingReturnFromAmerican(stake, oddsString);
          
          const bettingRecord: BettingRecordCreate = {
            bet_amount: stake,
            // Potential win = Total Return = Stake × Decimal Odds
            // Example: $10 stake at 2.5 odds = $25 total return
            potential_win: bettingCalculation.totalReturn,
            match_id: odds.matchId ? parseInt(odds.matchId.toString()) : null, // Store exact match ID
            match_teams: odds.teams || 'Unknown Match',
            match_date: realMatchDate, // Save the REAL match date from interface (or null)
            match_league: odds.league || 'Unknown League',
            match_status: originalMatch?.status === "Live" ? "live" : "upcoming",
            selected_outcome: odds.type || 'home',
            selected_team: odds.type === 'home' ? (odds.teams || '').split(' vs ')[0] : 
                          odds.type === 'away' ? (odds.teams || '').split(' vs ')[1] : undefined,
            odds_value: odds.odds || '+100',
            odds_decimal: bettingCalculation.decimalOdds
          };
          
          
          try {
            const savedRecord = await bettingService.createBettingRecord(bettingRecord);
            
            // Add notification immediately after successful bet placement
            if (savedRecord && savedRecord.id) {
              addNewBetNotification(
                savedRecord.id,
                bettingRecord.match_teams,
                bettingRecord.bet_amount,
                bettingRecord.potential_win
              );
            }
          } catch (saveError: any) {
            console.error('❌ Failed to save individual betting record:', saveError);
            throw saveError; // Re-throw to be caught by outer catch block
          }
        }
        
        // Update local state so we don't allow duplicate (match, outcome) on next place-bet
        const newBetOutcomes = new Set(userBetMatchOutcomes);
        selectedOdds.forEach(odds => {
          newBetOutcomes.add(`${odds.matchId}_${(odds.type || "").toLowerCase()}`);
        });
        
        flushSync(() => {
          setUserBetMatchOutcomes(newBetOutcomes);
        });
        
      } catch (recordError: any) {
        console.error('❌ Error saving betting records - FULL ERROR DETAILS:', {
          error: recordError,
          message: recordError.message,
          stack: recordError.stack,
          name: recordError.name,
          status: recordError.status,
          details: recordError.details
        });
        
        // Re-throw the original error without modification to see what's really happening
        throw recordError;
      }
      
      // Refresh user data to get updated funds
      const updatedUser = await authService.getCurrentUser();
      
      // Store bet details for congratulations
      setBetDetails({
        betAmount: totalBetAmount.toFixed(2),
        potentialWin: calculatePotentialWin().toFixed(2),
        teams: selectedOdds.map(odds => odds.teams).join(", ")
      });
      
      // Close confirmation modal first
      setShowBetConfirmation(false);
      setIsConfirmingBet(false);
      
      // Clear selected odds and show congratulations IMMEDIATELY
      setSelectedOdds([]);
      setShowBetSlip(false);
      setIsBetSlipHiding(false);
      setShowCongratulations(true);
      
      // Update auth context with new user data
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: true, user: updatedUser } 
      }));
      
      // Trigger betting data refresh for Dashboard
      window.dispatchEvent(new CustomEvent('bettingDataChanged', {
        detail: { message: 'New bet placed, refresh betting history' }
      }));
      
    } catch (error: any) {
      console.error('❌ BETTING ERROR - FULL DETAILS:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name,
        status: error.status,
        details: error.details,
        fullError: JSON.stringify(error, null, 2)
      });
      
      // Show the actual error message to help with debugging
      setBettingError(error.message || "Unknown error occurred");
      setShowBetConfirmation(true); // Show confirmation again on error
    } finally {
      setIsConfirmingBet(false);
    }
  };
  
  const defaultMatches: Match[] = [
    {
      id: "1",
      time: "LIVE",
      status: "Live",
      teams: "Kansas City Chiefs vs Buffalo Bills",
      sport: "Football",
      league: "NFL",
      date: new Date().toISOString().split('T')[0], // Today's date
      bookmakers: [
        { name: "Bet365", home: "+150", away: "-180", draw: undefined },
        { name: "DraftKings", home: "+155", away: "-175", draw: undefined },
        { name: "FanDuel", home: "+145", away: "-185", draw: undefined }
      ]
    },
    {
      id: "2",
      time: "19:30",
      status: "Upcoming",
      teams: "Lakers vs Warriors",
      sport: "Basketball",
      league: "NBA",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow's date
      bookmakers: [
        { name: "Bet365", home: "-110", away: "-110", draw: undefined },
        { name: "DraftKings", home: "-105", away: "-115", draw: undefined },
        { name: "FanDuel", home: "-108", away: "-112", draw: undefined }
      ]
    },
    {
      id: "3",
      time: "15:00",
      status: "Upcoming",
      teams: "Arsenal vs Chelsea",
      sport: "Football",
      league: "Premier League",
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Day after tomorrow
      bookmakers: [
        { name: "Bet365", home: "+245", away: "-312", draw: "+190" },
        { name: "DraftKings", home: "+250", away: "-305", draw: "+185" },
        { name: "FanDuel", home: "+240", away: "-320", draw: "+195" }
      ]
    },
    {
      id: "4",
      time: "20:45",
      status: "Upcoming",
      teams: "Barcelona vs Real Madrid",
      sport: "Football",
      league: "La Liga",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
      bookmakers: [
        { name: "Bet365", home: "+180", away: "+165", draw: "+210" },
        { name: "DraftKings", home: "+175", away: "+170", draw: "+205" },
        { name: "FanDuel", home: "+185", away: "+160", draw: "+215" }
      ]
    }
  ];
  const getCountryNameFromLeague = (leagueName: string) => {
    for (const country of countries) {
      const foundLeague = country.leagues.find(league => league.name === leagueName);
      if (foundLeague) {
        return country.name;
      }
    }
    return '';
  };

  /** Parse result "H-A" to winning outcome: home win -> '1', draw -> 'X', away win -> '2'. Returns null if invalid. */
  const getWinningOutcomeFromResult = (result: string | null | undefined): '1' | 'X' | '2' | null => {
    if (!result || !/^\d+-\d+$/.test(String(result).trim())) return null;
    const [h, a] = String(result).trim().split('-').map(Number);
    if (h > a) return '1';
    if (h < a) return '2';
    return 'X';
  };

  /** Only treat as a real match score (e.g. 1-0, 2-1). Rejects scraper garbage like 19-523 or impossible scores like 18-17. */
  const isValidFootballScore = (result: string | null | undefined): boolean => {
    const s = result == null ? "" : String(result).trim();
    if (!s) return false;
    const m = s.match(/^(\d+)-(\d+)$/);
    if (!m) return false;
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    // Realistic football: each side rarely above 10; cap at 15 to reject time/ID garbage (e.g. 18-17)
    return a >= 0 && a <= 15 && b >= 0 && b <= 15;
  };

  const formatScore = (score: string): string => {
    if (!score || score === "" || score === "-") return "-";
    
    if (score.includes(':')) {
      const parts = score.split(':');
      if (parts.length === 2) {
        const homeScore = parts[0].replace(/^0+/, '');
        const awayScore = parts[1].replace(/^0+/, '');
        
        if (!homeScore && !awayScore) return "0-0";
        
        return `${homeScore || '0'}-${awayScore || '0'}`;
      }
    }
    
    return score;
  };

  const getMatches = (): Match[] => {
    // If we have API data, use it directly (backend already handles all filtering)
    if (matchingInfo && matchingInfo.length > 0) {
      // Backend already handles:
      // - Search filtering (home_team)
      // - Year filtering (season)
      // - Country/league filtering
      // - Date filtering (Next Matches vs Results)
      // - Pagination
      const transformed = transformMatchingInfoToMatch(matchingInfo);
      // On Results tab, only show matches with a valid score (reject scraper garbage like 19-523)
      if (selectedMarket === "Results") {
        return transformed.filter((m) => isValidFootballScore(m.result));
      }
      return transformed;
    }
    
    if (selectedLeague && selectedLeague.matches.length > 0) {
      const leagueMatches = selectedLeague.matches.map((match: any) => ({
        id: match.id,
        time: match.time,
        status: "Upcoming" as const,
        teams: `${match.team1} vs ${match.team2}`,
        sport: "Football",
        league: selectedLeague.name,
        bookmakers: [
          { name: "Bet365", home: match.homeOdds || "+150", away: match.awayOdds || "-180", draw: match.drawOdds || "+200" },
          { name: "DraftKings", home: match.homeOdds || "+155", away: match.awayOdds || "-175", draw: match.drawOdds || "+195" },
          { name: "FanDuel", home: match.homeOdds || "+145", away: match.awayOdds || "-185", draw: match.drawOdds || "+205" }
        ],
        date: match.date || new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        bookmakerCount: match.bookmakers || 3
      }));
      
      // Check if matches have valid odds
      const hasValidOdds = leagueMatches.some((match: Match) => 
        match.bookmakers.some((bm: Bookmaker) => bm.home && bm.away)
      );
      
      if (!hasValidOdds) {
        return defaultMatches;
      }
      
      return leagueMatches;
    }
    
    if (selectedCountry) {
      const allMatches: Match[] = selectedCountry.leagues.flatMap((league: any) => 
        league.matches.map((match: any) => ({
          id: match.id,
          time: match.time,
          status: "Upcoming" as const,
          teams: `${match.team1} vs ${match.team2}`,
          sport: "Football",
          league: league.name,
          bookmakers: [
            { name: "Bet365", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds },
            { name: "DraftKings", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds },
            { name: "FanDuel", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds }
          ],
          date: match.date,
          bookmakerCount: match.bookmakers
        }))
      );
      
      return allMatches;
    }
    
    return defaultMatches;
  };
  const matches = getMatches();
  const markets = ["Results", "Next Matches"];
  const groupMatchesByDate = (matches: Match[]) => {
    const grouped: { [key: string]: Match[] } = {};
    
    matches.forEach(match => {
      const date = match.date || 'No Date';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(match);
    });
    
    const isResults = selectedMarket === "Results";
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => {
        if (dateA === 'No Date') return 1;
        if (dateB === 'No Date') return -1;
        const a = new Date(dateA).getTime();
        const b = new Date(dateB).getTime();
        return isResults ? b - a : a - b;
      })
      .map(([date, matches]) => ({ 
        date, 
        matches: matches.sort((a, b) => {
          const timeA = a.time.replace(':', '');
          const timeB = b.time.replace(':', '');
          return isResults ? parseInt(timeB) - parseInt(timeA) : parseInt(timeA) - parseInt(timeB);
        })
      }));
  };
  const allGroupedMatches = groupMatchesByDate(matches);
  
  // Use server-side pagination - no need to slice data since API already returns paginated results
  const allMatches = allGroupedMatches.flatMap(({ matches }) => matches);
  
  // For pagination info display - use API data when available, fallback to local count
  const totalMatches = apiTotalMatches > 0 ? apiTotalMatches : allMatches.length;
  const totalPages = apiTotalPages > 0 ? apiTotalPages : Math.ceil(allMatches.length / matchesPerPage);
  
  // For display calculations
  const startIndex = (currentPage - 1) * matchesPerPage;
  const endIndex = startIndex + matchesPerPage;
  
  // No slicing needed - API already returns the correct page data
  // Don't render matches when switching markets to prevent flash
  const groupedMatches = isSwitchingMarket ? [] : allGroupedMatches;
  const handleOddsClick = (match: Match, type: 'home' | 'draw' | 'away', odds: string, event: React.MouseEvent) => {
    // Track click for CTR analytics
    trackClick('match_odds', match.id, {
      match_teams: match.teams,
      match_league: match.league,
      selected_outcome: type,
      odds_value: odds,
      match_id: match.id
    });
    
    // Clear any previous error messages
    setDuplicateBetError("");
    setBettingError("");

    const selectedBet = {
      matchId: match.id,
      type,
      odds,
      teams: match.teams,
      league: match.league,
      stake: "10",
      matchDate: match.date
    };
    
    // Clear duplicate bet error when selecting new odds
    setDuplicateBetError("");
    
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const startPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    const isAlreadySelected = selectedOdds.some(
      odds => odds.matchId === match.id && odds.type === type
    );
    
    if (isAlreadySelected) {
      setSelectedOdds(prev => prev.filter(
        odds => !(odds.matchId === match.id && odds.type === type)
      ));
      // Clear duplicate bet error when removing odds
      setDuplicateBetError("");
      if (selectedOdds.length === 1) {
        setIsBetSlipHiding(true);
        setTimeout(() => {
          setShowBetSlip(false);
          setIsBetSlipHiding(false);
        }, 500);
      }
    } else {
      setAnimatingOdds({
        ...selectedBet,
        startPosition
      });
      
      setTimeout(() => {
        setSelectedOdds(prev => [...prev, selectedBet]);
        setAnimatingOdds(null);
        setShowBetSlip(true);
        setIsBetSlipCollapsed(false); // Reset collapsed state when new odds are added
      }, 300);
    }
  };
  const isOddsSelected = (matchId: string, type: 'home' | 'draw' | 'away') => {
    return selectedOdds.some(odds => odds.matchId === matchId && odds.type === type);
  };
  const handleBetAmountClick = (amount: string) => {
    setSelectedBetAmount(amount);
    // Update all individual stakes when buttons are clicked
    setSelectedOdds(prev => prev.map(odds => ({
      ...odds,
      stake: amount
    })));
  };

  const handleIndividualStakeChange = (matchId: string, type: 'home' | 'draw' | 'away', newStake: string) => {
    setSelectedOdds(prev => prev.map(odds => 
      odds.matchId === matchId && odds.type === type
        ? { ...odds, stake: newStake }
        : odds
    ));
  };

  // Convert American odds to decimal odds (consistent with OddsConverter)
  const americanToDecimal = (americanOdds: string): number => {
    // Use the same logic as OddsConverter for consistency
    return OddsConverter.stringToDecimal(americanOdds);
  };

  // Calculate total odds (multiply all decimal odds)
  const calculateTotalOdds = (): number => {
    return selectedOdds.reduce((total, odds) => {
      // Detect if odds are already in decimal format or need conversion
      const oddsString = odds.odds || '2.0';
      const isDecimalFormat = oddsString.includes('.') || (parseFloat(oddsString) >= 1.0 && parseFloat(oddsString) <= 10.0);
      
      const decimalOdd = isDecimalFormat 
        ? parseFloat(oddsString)
        : americanToDecimal(oddsString);
      return total * decimalOdd;
    }, 1);
  };

  // Calculate potential win based on individual bets (Single mode)
  const calculatePotentialWin = (): number => {
    return selectedOdds.reduce((totalWin, odds) => {
      const stake = parseFloat(odds.stake || '0');
      // Detect if odds are already in decimal format or need conversion
      const oddsString = odds.odds || '2.0';
      const isDecimalFormat = oddsString.includes('.') || (parseFloat(oddsString) >= 1.0 && parseFloat(oddsString) <= 10.0);
      
      const calculation = isDecimalFormat 
        ? calculateBettingReturnFromDecimal(stake, oddsString)
        : calculateBettingReturnFromAmerican(stake, oddsString);
      return totalWin + calculation.totalReturn;
    }, 0);
  };

  // Convert decimal odds back to American/Moneyline format
  const decimalToAmerican = (decimalOdds: number): string => {
    if (decimalOdds >= 2.0) {
      return `+${Math.round((decimalOdds - 1) * 100)}`;
    } else {
      return `${Math.round(-100 / (decimalOdds - 1))}`;
    }
  };

  // Get total odds in American format
  const getTotalOddsAmerican = (): string => {
    const decimalOdds = calculateTotalOdds();
    return decimalToAmerican(decimalOdds);
  };

  // Handle clicks outside odd buttons to collapse betslip
  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Check if the click is on an odd button by looking for specific classes
    const button = target.closest('button');
    const isOddButton = button && (
      button.className.includes('bg-yellow-500') ||
      button.className.includes('hover:bg-surface/50') ||
      button.className.includes('hover:bg-bg/50')
    );
    
    // Check if the click is on a navigation button
    const isNavigationButton = button && (
      button.className.includes('hover:bg-white/10') ||
      button.className.includes('hover:bg-white/5') ||
      button.className.includes('bg-gradient-to-r') ||
      button.className.includes('hover:text-white') ||
      button.className.includes('text-gray-400') ||
      button.closest('nav') !== null
    );
    
    // Check if the click is inside the betslip modal content area (not header)
    const isInsideBetSlipContent = target.closest('.betslip-content');
    
    // Check if the click is specifically on the betslip header
    const isBetSlipHeader = target.closest('.betslip-header');
    
    // Debug logging
    if (button) {

    }
    
    // Only collapse if clicking outside both the betslip content, header, odd buttons, and navigation buttons
    if (showBetSlip && !isOddButton && !isNavigationButton && !isInsideBetSlipContent && !isBetSlipHeader) {
      setIsBetSlipCollapsed(true);
    }
  };

  // Handle betslip header click to expand
  const handleBetSlipHeaderClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling
    setIsBetSlipCollapsed(false);
  };
  const getDateColor = () => theme === 'light' ? 'text-blue-600' : 'text-blue-400';
  const getTeamColor = () => theme === 'light' ? 'text-green-700' : 'text-green-300';
  const getLeagueColor = () => theme === 'light' ? 'text-amber-700' : 'text-yellow-400';
  const getTimeColor = () => theme === 'light' ? 'text-cyan-700' : 'text-cyan-300';
  const getHomeOddsColor = () => theme === 'light' ? 'text-orange-700' : 'text-orange-300';
  const getAwayOddsColor = () => theme === 'light' ? 'text-pink-700' : 'text-pink-300';
  const getDrawOddsColor = () => theme === 'light' ? 'text-emerald-700' : 'text-emerald-300';
  const getBookmakerColor = () => theme === 'light' ? 'text-purple-700' : 'text-purple-300';
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live": return "text-red-400 bg-red-500/20 border-red-500/30";
      case "Upcoming": return "text-blue-400 bg-blue-500/20 border-blue-500/30";
      case "Finished": return "text-muted bg-muted/20 border-muted/30";
      default: return "text-muted bg-muted/20 border-muted/30";
    }
  };
  // Ref to track current fetch request and cancel previous ones
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  // Use primitive values so callback identity is stable when context re-renders with new object refs
  const countryName = selectedCountry?.name ?? "";
  const leagueName = selectedLeague?.name ?? "";

  const fetchCurrentPageMatches = useCallback(async () => {
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;

    try {
      setLoading(true);

      const params: any = {
        page: currentPage,
        size: MATCHES_PER_PAGE
      };

      if (selectedMarket === "Results") {
        params.season = selectedYear ?? defaultResultsYear;
      } else if (selectedYear) {
        params.season = selectedYear;
      }

      if (searchQuery.trim()) {
        params.home_team = searchQuery.trim();
      } else {
        if (leagueName && countryName) {
          params.league = leagueName;
          params.country = countryName;
        } else if (countryName) {
          params.country = countryName;
        }
      }

      if (selectedMarket === "Next Matches") {
        const today = new Date().toISOString().split('T')[0];
        params.date_from = today;
      } else if (selectedMarket === "Results") {
        const today = new Date().toISOString().split('T')[0];
        params.date_to = today;
      }

      const result = await dispatch(getMatchingInfoAction(params)).unwrap();

      if (abortController.signal.aborted) return;

      setMatchingInfo(result.odds);
      setApiTotalPages(result.pages);
      setApiTotalMatches(result.total);

      setTimeout(() => {
        if (!abortController.signal.aborted) {
          setIsSwitchingMarket(false);
          setSwitchingToMarket("");
        }
      }, 200);
    } catch (error: any) {
      if (error?.name === 'AbortError' || abortController.signal.aborted) return;
      console.error("Error fetching matching info:", error);
      setTimeout(() => {
        if (!abortController.signal.aborted) {
          setIsSwitchingMarket(false);
          setSwitchingToMarket("");
        }
      }, 200);
    } finally {
      if (!abortController.signal.aborted) setLoading(false);
    }
  }, [dispatch, currentPage, selectedYear, defaultResultsYear, countryName, leagueName, selectedMarket, searchQuery]);

  // Debounce fetch so rapid effect runs (e.g. from reset + route sync) result in one request
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const FETCH_DEBOUNCE_MS = 80;

  useEffect(() => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(() => {
      fetchDebounceRef.current = null;
      fetchCurrentPageMatches();
    }, FETCH_DEBOUNCE_MS);
    return () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
        fetchDebounceRef.current = null;
      }
    };
  }, [fetchCurrentPageMatches]);

  // Reset to page 1 when filters change (use primitive deps to avoid extra runs)
  useEffect(() => {
    setSearchQuery("");
    setCurrentPage(1);
  }, [countryName, leagueName, selectedYear, selectedMarket]);

  // Only trigger search when shouldTriggerSearch is true
  useEffect(() => {
    if (shouldTriggerSearch) {
      setCurrentPage(1); // Reset to first page when searching
      setShouldTriggerSearch(false); // Reset the trigger
    }
  }, [shouldTriggerSearch]);

  // Update search query when URL search parameter changes (only if user is not editing)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || "";
    
    // Only update from URL if user is not actively editing the input
    if (!isEditingSearch && urlSearchTerm !== searchQuery) {
      setSearchQuery(urlSearchTerm);
      // Trigger search if there's a search term in URL
      if (urlSearchTerm.trim()) {
        setShouldTriggerSearch(true);
      }
    }
  }, [searchParams, searchQuery, isEditingSearch]);
  
  // Update search query when initialSearchTerm prop changes (for backward compatibility)
  useEffect(() => {
    if (initialSearchTerm && !urlSearchTerm) {
      setSearchQuery(initialSearchTerm);
    }
  }, [initialSearchTerm, urlSearchTerm]);

  // Helper function to handle search and update URL parameters
  const handleSearch = useCallback(() => {
    const trimmedQuery = searchQuery.trim();
    
    // Update URL parameters to persist search across navigation
    const newSearchParams = new URLSearchParams(searchParams);
    if (trimmedQuery) {
      newSearchParams.set('search', trimmedQuery);
    } else {
      newSearchParams.delete('search');
    }
    
    // Update URL without triggering navigation
    setSearchParams(newSearchParams, { replace: true });
    
    // Reset editing state since search is being performed
    setIsEditingSearch(false);
    
    // Trigger the actual search
    setShouldTriggerSearch(true);
  }, [searchQuery, searchParams, setSearchParams]);

  // Helper function to handle pagination with scroll-to-top
  const handlePageChange = useCallback((newPage: number) => {
    // Scroll to top immediately when changing pages (especially important for mobile)
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    // Update the current page
    setCurrentPage(newPage);
    
  }, []);

  // Helper function to highlight search terms in text
  const highlightSearchTerm = useCallback((text: string, searchTerm: string) => {
    if (!searchTerm.trim()) {
      return text;
    }
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span key={index} className="bg-yellow-300 text-black font-semibold px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);
  

  // Add global click listener for betslip collapse
  useEffect(() => {
    if (showBetSlip) {
      document.addEventListener('click', handleOutsideClick);
      return () => {
        document.removeEventListener('click', handleOutsideClick);
      };
    }
  }, [showBetSlip, selectedOdds]);

  // Reset bet amount to $10 when betslip opens
  useEffect(() => {
    if (showBetSlip) {
      setSelectedBetAmount("10");
    }
  }, [showBetSlip]);

  // When navigating from Next Matches with addToSlip in state, add that selection to the slip and show betslip
  useEffect(() => {
    const state = location.state as { addToSlip?: { matchId: string; type: 'home' | 'draw' | 'away'; odds: string; teams: string; league: string; stake: string; matchDate?: string; matchTime?: string } } | undefined;
    const add = state?.addToSlip;
    if (!add) return;
    setSelectedOdds(prev => {
      const already = prev.some(o => o.matchId === add.matchId && o.type === add.type);
      if (already) return prev;
      return [...prev, { ...add, matchDate: add.matchDate }];
    });
    setShowBetSlip(true);
    setIsBetSlipCollapsed(false);
    setSelectedBetAmount(add.stake || "10");
    navigate(location.pathname + location.search, { replace: true, state: {} });
  }, [location.state]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
      }
    };
  }, []);
  if (loading || isSwitchingMarket) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-bg via-surface to-bg">
        <FantasticLoader 
          size="large" 
          text={isSwitchingMarket ? `Switching to ${switchingToMarket}...` : "Loading odds for you..."} 
        />
      </div>
    );
  }
    return (
    <section>
      {selectedLeague && (
        <div className="text-sm text-muted mb-4 px-2">
          Home {'>'} Football {'>'} {selectedCountry?.name || getCountryNameFromLeague(selectedLeague.name)} {'>'} {selectedLeague.name}
        </div>
      )}
      
      <div className="mb-4 sm:mb-6 px-2">
        {/* Title at the top */}
        <h2 className="text-xl sm:text-2xl font-bold text-text mb-4">
          {searchQuery.trim() 
            ? `Global Search Results for "${searchQuery}"`
            : selectedYear 
              ? selectedLeague
                ? `${selectedLeague.name} ${formatSeasonLabel(selectedYear)} Results`
                : `${formatSeasonLabel(selectedYear)} Results Only` 
              : selectedLeague && selectedCountry
                ? `${selectedCountry.name} ${selectedLeague.name} Matches`
                : selectedMarket === "Results"
                  ? "Match Results"
                  : selectedMarket === "Next Matches"
                    ? "Upcoming Matches"
                    : selectedCountry 
                      ? `${selectedCountry.name} - Football` 
                      : 'Live Matches'
          }
        </h2>
        
        {/* Desktop: Two-row layout to keep market buttons visible */}
        <div className="hidden lg:flex flex-col gap-2">
          <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide">
          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[250px] flex">
            <input
              type="text"
              placeholder="Search teams... (Press Enter to search)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsEditingSearch(true); // Mark that user is actively editing
                // Don't trigger search on every keystroke
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm"
            />
            <button
              onClick={handleSearch}
              className="ml-2 px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
              title="Search teams"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsEditingSearch(true); // Set as editing to prevent URL sync from restoring the search
                  // Only clear the input text, don't clear results or change URL
                }}
                className="ml-1 px-2 py-2 text-muted hover:text-text"
                title="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Show mode toggle */}
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                viewMode === "cards"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("rows")}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                viewMode === "rows"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          {markets.map((market) => (
            <button
              key={market}
              onClick={() => handleMarketSwitch(market)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                selectedMarket === market
                  ? "bg-accent text-white shadow-lg"
                  : "bg-surface text-muted hover:text-text hover:bg-surface/80 border border-border"
              }`}
            >
              {market}
            </button>
          ))}
          </div>
          {selectedMarket === "Results" && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
                {seasonYears.map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      const newYear = selectedYear === year ? undefined : year;
                      setSelectedYear(newYear);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                      selectedYear === year
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-muted hover:text-text hover:bg-surface/80"
                    }`}
                  >
                    {formatSeasonLabel(year)}
                  </button>
                ))}
              </div>
              {totalMatches > 0 && (
                <p className="text-sm text-muted">
                  {searchQuery.trim() 
                    ? `${totalMatches} matches found`
                    : selectedYear && selectedLeague
                      ? `${totalMatches} matches`
                      : selectedYear && !selectedLeague
                        ? `${totalMatches} matches`
                        : `${totalMatches} matches`
                  }
                </p>
              )}
            </div>
          )}
        </div>

        {/* Mobile: Two-row layout */}
        <div className="lg:hidden space-y-2">
          {/* Row 1: Search + Market buttons (Results) OR Search only (Next Matches) */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {/* Search Box */}
            <div className="relative min-w-[200px] sm:min-w-[250px] flex">
              <input
                type="text"
                placeholder="Search teams... (Press Enter to search)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsEditingSearch(true); // Mark that user is actively editing
                  // Don't trigger search on every keystroke
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm"
              />
              <button
                onClick={handleSearch}
                className="ml-2 px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
                title="Search teams"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setIsEditingSearch(true); // Set as editing to prevent URL sync from restoring the search
                    // Only clear the input text, don't clear results or change URL
                  }}
                  className="ml-1 px-2 py-2 text-muted hover:text-text"
                  title="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Market buttons - show on same row for Results, separate row for Next Matches */}
            {selectedMarket === "Results" && (
              <div className="flex gap-1">
                {markets.map((market) => (
                  <button
                    key={market}
                    onClick={() => {
                      
                      // Set switching state and clear data immediately to prevent flash
                      setIsSwitchingMarket(true);
                      setMatchingInfo([]);
                      setLoading(true);
                      
                      // Use setTimeout to ensure state updates are processed
                      setTimeout(() => {
                        setSelectedMarket(market);
                        setCurrentPage(1);
                        if (market === "Next Matches") {
                          setSelectedYear(undefined);
                        }
                      }, 100);
                    }}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      selectedMarket === market
                        ? "bg-accent text-white shadow-lg"
                        : "bg-surface text-muted hover:text-text hover:bg-surface/80 border border-border"
                    }`}
                  >
                    {market === "Results" ? "Results" : "Next"}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Row 2: Market buttons (Next Matches) OR Year filters (Results) */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {selectedMarket === "Next Matches" ? (
              // Show market buttons on second row for Next Matches
              <div className="flex gap-1">
                {markets.map((market) => (
                  <button
                    key={market}
                    onClick={() => {
                      
                      // Set switching state and clear data immediately to prevent flash
                      setIsSwitchingMarket(true);
                      setMatchingInfo([]);
                      setLoading(true);
                      
                      // Use setTimeout to ensure state updates are processed
                      setTimeout(() => {
                        setSelectedMarket(market);
                        setCurrentPage(1);
                        if (market === "Next Matches") {
                          setSelectedYear(undefined);
                        }
                      }, 100);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      selectedMarket === market
                        ? "bg-accent text-white shadow-lg"
                        : "bg-surface text-muted hover:text-text hover:bg-surface/80 border border-border"
                    }`}
                  >
                    {market}
                  </button>
                ))}
              </div>
            ) : (
              // Show year filters on second row for Results
              <div className="flex flex-col gap-2">
                <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
                  {seasonYears.map(year => (
                    <button
                      key={year}
                      onClick={() => {
                        const newYear = selectedYear === year ? undefined : year;
                        setSelectedYear(newYear);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                        selectedYear === year
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-muted hover:text-text hover:bg-surface/80"
                      }`}
                    >
                      {formatSeasonLabel(year)}
                    </button>
                  ))}
                </div>
                {totalMatches > 0 && (
                  <p className="text-sm text-muted">
                    {searchQuery.trim() 
                      ? `${totalMatches} matches found`
                      : selectedYear && selectedLeague
                        ? `${totalMatches} matches`
                        : selectedYear && !selectedLeague
                          ? `${totalMatches} matches`
                          : `${totalMatches} matches`
                    }
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Betting disabled indicator */}
      {isOddsDisabled && isAuthenticated && (
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <div className="text-sm text-blue-300">
            <span className="font-medium">Checking your previous bets...</span>
            <span className="text-blue-200 ml-2">Betting temporarily disabled for your safety</span>
          </div>
        </div>
      )}
      
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groupedMatches.map(({ date, matches }) => 
            matches.map((match: Match) => (
              <div 
                key={match.id} 
                className={`relative overflow-hidden rounded-xl p-4 transition-all duration-500 ${
                  isMatchHighlighted(match)
                    ? 'bg-gradient-to-br from-yellow-400/20 via-orange-400/15 to-red-400/10 border-2 border-yellow-400 shadow-2xl shadow-yellow-400/30 transform scale-105 animate-glow-pulse'
                    : isMatchInvalid(match.id)
                    ? 'bg-surface border-2 border-red-500 hover:shadow-lg animate-pulse'
                    : 'bg-surface border border-border hover:shadow-lg'
                }`}
              >
                {/* Debug highlighting */}
                {isMatchHighlighted(match) && (
                  <div className="absolute top-1 right-1 text-xs text-yellow-400 font-bold bg-yellow-400/20 px-2 py-1 rounded-full">
                    ✨ HIGHLIGHTED ✨
                  </div>
                )}
                {isMatchHighlighted(match) && (
                  <>
                    {/* Animated background glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 animate-pulse rounded-xl"></div>
                    
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer opacity-40"></div>
                    
                    {/* Sparkle effects */}
                    <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-sparkle"></div>
                    <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-orange-400 rounded-full animate-sparkle animation-delay-300"></div>
                    <div className="absolute top-1/2 left-2 w-1 h-1 bg-red-400 rounded-full animate-sparkle animation-delay-700"></div>
                    
                    {/* Rotating border gradient */}
                    <div className="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 animate-spin-slow opacity-60"></div>
                    
                    {/* Floating particles */}
                    <div className="absolute top-1 right-1 w-1 h-1 bg-yellow-300 rounded-full animate-bounce-gentle"></div>
                    <div className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-orange-300 rounded-full animate-bounce-gentle animation-delay-500"></div>
                  </>
                )}
                
                {/* Blurred background and overlay for better text readability */}
                <div 
                  className="absolute inset-0 rounded-xl"
                  style={{
                    backgroundImage: `url('/assets/card_background/soccer_background.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: 'blur(3px)',
                    transform: 'scale(1.1)'
                  }}
                ></div>
                <div className="absolute inset-0 bg-black/30 rounded-xl"></div>
                
                {/* Content with relative positioning to stay above effects */}
                <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-text truncate">{match.league}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted">{match.date}</div>
                    <div className="text-xs text-muted">{formatTime(match.time)}</div>
                  </div>
                </div>
                
                 <div className="mb-4 min-h-[80px] flex flex-col justify-center">
                   <div className="flex items-center justify-between">
                     {/* First Team */}
                     <div className="flex flex-col items-center text-center flex-1">
                       <div className="mb-2">
                         {getTeamLogo(match.teams.split(' vs ')[0], selectedCountry?.name || getCountryNameFromLeague(match.league)) && (
                           <img 
                             src={getTeamLogo(match.teams.split(' vs ')[0], selectedCountry?.name || getCountryNameFromLeague(match.league))!}
                             alt={`${match.teams.split(' vs ')[0]} icon`}
                             className="w-8 h-8"
                             onError={(e) => {
                               e.currentTarget.style.display = 'none';
                             }}
                           />
                         )}
                       </div>
                       <div className="text-sm font-medium text-text text-center">
                         {highlightSearchTerm(match.teams.split(' vs ')[0], searchQuery)}
                       </div>
                     </div>

                     {/* Score - only show result on Results tab; Next Matches always show VS/Upcoming */}
                     <div className="flex flex-col items-center mx-4">
                       {selectedMarket === "Results" && isValidFootballScore(match.result) ? (
                         <div className="text-2xl font-bold text-green-500">
                           {formatScore(match.result!)}
                         </div>
                       ) : (
                         <div className="text-lg font-bold text-muted">VS</div>
                       )}
                     </div>

                     {/* Second Team */}
                     <div className="flex flex-col items-center text-center flex-1">
                       <div className="mb-2">
                         {getTeamLogo(match.teams.split(' vs ')[1], selectedCountry?.name || getCountryNameFromLeague(match.league)) && (
                           <img 
                             src={getTeamLogo(match.teams.split(' vs ')[1], selectedCountry?.name || getCountryNameFromLeague(match.league))!}
                             alt={`${match.teams.split(' vs ')[1]} icon`}
                             className="w-8 h-8"
                             onError={(e) => {
                               e.currentTarget.style.display = 'none';
                             }}
                           />
                         )}
                       </div>
                       <div className="text-sm font-medium text-text text-center">
                         {highlightSearchTerm(match.teams.split(' vs ')[1], searchQuery)}
                       </div>
                     </div>
                   </div>
                 </div>
                
                {match.isHistorical ? (
                  <div className="border-t border-border/50 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted">Historical Odds</span>
                      <span className="text-xs text-blue-500 font-medium">Past Match</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {(() => {
                        const homeOdd = OddsConverter.stringToDecimal(match.bookmakers[0]?.home || '0');
                        const drawOdd = OddsConverter.stringToDecimal(match.bookmakers[0]?.draw || '0');
                        const awayOdd = OddsConverter.stringToDecimal(match.bookmakers[0]?.away || '0');
                        const odds = [
                          { value: homeOdd, label: '1' as const, text: formatOdds(match.bookmakers[0]?.home || '-') },
                          { value: drawOdd, label: 'X' as const, text: formatOdds(match.bookmakers[0]?.draw || '-') },
                          { value: awayOdd, label: '2' as const, text: formatOdds(match.bookmakers[0]?.away || '-') }
                        ];
                        const sortedOdds = [...odds].sort((a, b) => b.value - a.value);
                        const getOddColor = (oddValue: number) => {
                          if (oddValue === sortedOdds[0].value) return 'text-green-500';
                          if (oddValue === sortedOdds[1].value) return 'text-red-500';
                          return 'text-blue-500';
                        };
                        return odds.map((odd, index) => (
                          <div key={index} className="text-center">
                            <div className="text-xs text-muted mb-1">{odd.label}</div>
                            <div className={`w-full py-2 px-1 text-sm font-semibold ${getOddColor(odd.value)}`}>
                              {odd.text}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-border/50 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted">1x2</span>
                      <button className="text-xs text-muted hover:text-text">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div className="text-xs text-muted mb-1">1</div>
                          <button 
                            data-testid={`odds-button-${match.id}-home`}
                            disabled={isOddsDisabled}
                            className={`w-full py-2 px-1 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                              isOddsDisabled 
                                ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                                : isOddsSelected(match.id, 'home') 
                                  ? 'bg-yellow-500 text-black border-yellow-500' 
                                  : 'bg-transparent text-text border-border hover:bg-bg/50 hover:border-border/80'
                            }`}
                            onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'home', match.bookmakers[0]?.home || '-', e)}
                          >
                            {formatOdds(match.bookmakers[0]?.home || '-')}
                          </button>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted mb-1">X</div>
                          <button 
                            data-testid={`odds-button-${match.id}-draw`}
                            disabled={isOddsDisabled}
                            className={`w-full py-2 px-1 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                              isOddsDisabled 
                                ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                                : isOddsSelected(match.id, 'draw') 
                                  ? 'bg-yellow-500 text-black border-yellow-500' 
                                  : 'bg-transparent text-text border-border hover:bg-bg/50 hover:border-border/80'
                            }`}
                            onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'draw', match.bookmakers[0]?.draw || '-', e)}
                          >
                            {formatOdds(match.bookmakers[0]?.draw || '-')}
                          </button>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted mb-1">2</div>
                          <button 
                            data-testid={`odds-button-${match.id}-away`}
                            disabled={isOddsDisabled}
                            className={`w-full py-2 px-1 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                              isOddsDisabled 
                                ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                                : isOddsSelected(match.id, 'away') 
                                  ? 'bg-yellow-500 text-black border-yellow-500' 
                                  : 'bg-transparent text-text border-border hover:bg-bg/50 hover:border-border/80'
                            }`}
                            onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'away', match.bookmakers[0]?.away || '-', e)}
                          >
                            {formatOdds(match.bookmakers[0]?.away || '-')}
                          </button>
                        </div>
                      </div>
                  </div>
                )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">

          <div className="grid grid-cols-12 gap-x-4 gap-y-2 px-4 sm:px-5 py-3 text-sm font-medium text-muted bg-surface/50 border-b border-border/50">
            <div className="col-span-2 text-center">Date</div>
            <div className="col-span-1 text-center">Time</div>
            <div className="col-span-4 pr-4">Match</div>
            <div className="col-span-2 text-center px-4">Result</div>
            <div className="col-span-3 flex justify-center gap-2 pl-2">
              <div className="min-w-[44px] text-center">1</div>
              <div className="min-w-[44px] text-center">X</div>
              <div className="min-w-[44px] text-center">2</div>
            </div>
          </div>
          
          <div>
            {groupedMatches.map(({ date, matches }) =>
              matches.map((match: Match, matchIndex: number) => {
                const isLastMatchOfDay = matchIndex === matches.length - 1;
                return (
                <div 
                  key={match.id} 
                  className={`relative grid grid-cols-12 gap-x-4 gap-y-2 px-4 sm:px-5 py-3 transition-all duration-500 text-sm border-b ${
                    isMatchHighlighted(match)
                      ? 'bg-gradient-to-r from-yellow-400/15 via-orange-400/10 to-red-400/15 border-l-4 border-l-yellow-400 shadow-lg shadow-yellow-400/20 transform scale-[1.02]'
                      : 'hover:bg-surface/30'
                  } ${
                    isLastMatchOfDay ? 'border-b border-gray-400/50' : 'border-b border-border/30'
                  }`}
                >
                  {/* Debug highlighting for list view */}
                  {isMatchHighlighted(match) && (
                    <div className="absolute top-0 right-0 text-xs text-yellow-400 font-bold bg-yellow-400/20 px-2 py-1 rounded-full z-10">
                      ✨ HIGHLIGHTED ✨
                    </div>
                  )}
                  {isMatchHighlighted(match) && (
                    <>
                      {/* Animated left border */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 via-orange-400 to-red-400 animate-pulse"></div>
                      
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-60"></div>
                      
                      {/* Sparkle dots */}
                      <div className="absolute top-1 right-1 w-1 h-1 bg-yellow-400 rounded-full animate-sparkle"></div>
                      <div className="absolute bottom-1 right-1 w-1 h-1 bg-orange-400 rounded-full animate-sparkle animation-delay-500"></div>
                      
                      {/* Floating indicator */}
                      <div className="absolute top-1/2 right-0 w-0.5 h-4 bg-gradient-to-b from-yellow-400 to-orange-400 animate-bounce-gentle"></div>
                    </>
                  )}

                  <div className="col-span-2 flex items-center justify-center">
                    <div className="text-sm text-muted">{match.date}</div>
                  </div>
                  
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-sm text-muted">{formatTime(match.time)}</span>
                  </div>
                  
                  <div className="col-span-4 flex items-center pr-4">
                    <div className="flex items-center gap-2 w-full min-w-0">
                      {getTeamLogo(match.teams.split(' vs ')[0], selectedCountry?.name || getCountryNameFromLeague(match.league)) && (
                        <img 
                          src={getTeamLogo(match.teams.split(' vs ')[0], selectedCountry?.name || getCountryNameFromLeague(match.league))!}
                          alt={`${match.teams.split(' vs ')[0]} icon`}
                          className="w-4 h-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-sm font-medium text-text truncate">{highlightSearchTerm(match.teams.split(' vs ')[0], searchQuery)}</span>
                      <span className="text-sm text-muted font-bold px-1">VS</span>
                      {getTeamLogo(match.teams.split(' vs ')[1], selectedCountry?.name || getCountryNameFromLeague(match.league)) && (
                        <img 
                          src={getTeamLogo(match.teams.split(' vs ')[1], selectedCountry?.name || getCountryNameFromLeague(match.league))!}
                          alt={`${match.teams.split(' vs ')[1]} icon`}
                          className="w-4 h-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-sm font-medium text-text truncate">{highlightSearchTerm(match.teams.split(' vs ')[1], searchQuery)}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex items-center justify-center px-4">
                    {selectedMarket === "Results" && isValidFootballScore(match.result) ? (
                      <div className="text-sm font-semibold text-green-400">
                        {formatScore(match.result!)}
                      </div>
                    ) : (
                      <div className="text-sm text-muted">
                        {match.status === "Live" ? "LIVE" : "Upcoming"}
                      </div>
                    )}
                  </div>

                  <div className="col-span-3 flex items-center justify-center pl-2 gap-2">
                    {match.isHistorical ? (
                      <div className="flex items-center gap-1">
                        {(() => {
                          const homeOdd = OddsConverter.stringToDecimal(match.bookmakers[0]?.home || '0');
                          const drawOdd = OddsConverter.stringToDecimal(match.bookmakers[0]?.draw || '0');
                          const awayOdd = OddsConverter.stringToDecimal(match.bookmakers[0]?.away || '0');
                          const odds = [
                            { value: homeOdd, label: '1' as const, text: formatOdds(match.bookmakers[0]?.home || '-') },
                            { value: drawOdd, label: 'X' as const, text: formatOdds(match.bookmakers[0]?.draw || '-') },
                            { value: awayOdd, label: '2' as const, text: formatOdds(match.bookmakers[0]?.away || '-') }
                          ];
                          const sortedOdds = [...odds].sort((a, b) => b.value - a.value);
                          const getOddColor = (oddValue: number) => {
                            if (oddValue === sortedOdds[0].value) return 'text-green-500';
                            if (oddValue === sortedOdds[1].value) return 'text-red-500';
                            return 'text-blue-500';
                          };
                          return odds.map((odd, index) => (
                            <div key={index} className="text-center min-w-[44px]">
                              <div className={`text-sm font-semibold ${getOddColor(odd.value)}`}>
                                {odd.text}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button 
                          data-testid={`odds-button-${match.id}-home`}
                          disabled={isOddsDisabled}
                          className={`text-sm font-semibold min-w-[40px] py-1 rounded border transition-all duration-200 ${
                            isOddsDisabled 
                              ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                              : isOddsSelected(match.id, 'home') 
                                ? 'bg-yellow-500 text-black border-yellow-500' 
                                : 'text-text hover:bg-surface/50 border-border hover:border-border/80'
                          }`}
                          onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'home', match.bookmakers[0]?.home || '-', e)}
                        >
                          {formatOdds(match.bookmakers[0]?.home || '-')}
                        </button>
                        <button 
                          data-testid={`odds-button-${match.id}-draw`}
                          disabled={isOddsDisabled}
                          className={`text-sm font-semibold min-w-[40px] py-1 rounded border transition-all duration-200 ${
                            isOddsDisabled 
                              ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                              : isOddsSelected(match.id, 'draw') 
                                ? 'bg-yellow-500 text-black border-yellow-500' 
                                : 'text-text hover:bg-surface/50 border-border hover:border-border/80'
                          }`}
                          onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'draw', match.bookmakers[0]?.draw || '-', e)}
                        >
                          {formatOdds(match.bookmakers[0]?.draw || '-')}
                        </button>
                        <button 
                          data-testid={`odds-button-${match.id}-away`}
                          disabled={isOddsDisabled}
                          className={`text-sm font-semibold min-w-[40px] py-1 rounded border transition-all duration-200 ${
                            isOddsDisabled 
                              ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                              : isOddsSelected(match.id, 'away') 
                                ? 'bg-yellow-500 text-black border-yellow-500' 
                                : 'text-text hover:bg-surface/50 border-border hover:border-border/80'
                          }`}
                          onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'away', match.bookmakers[0]?.away || '-', e)}
                        >
                          {formatOdds(match.bookmakers[0]?.away || '-')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}
      {animatingOdds && (
        <div 
          className="fixed w-4 h-4 bg-yellow-500 rounded-full z-50 pointer-events-none"
          style={{
            left: animatingOdds.startPosition.x - 8,
            top: animatingOdds.startPosition.y - 8,
            animation: 'circleToDialog 0.3s ease-out forwards'
          }}
        />
      )}
      {(showBetSlip || isBetSlipHiding) && selectedOdds.length > 0 && (
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
          <div 
            className={`betslip-content transition-all duration-300 ease-in-out ${
              isBetSlipCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[600px] opacity-100'
            }`}
            style={{
              transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out'
            }}
          >
            <div className="flex border-b border-border" onClick={(e) => e.stopPropagation()}>
              <button className="flex-1 py-2 text-sm font-medium text-yellow-500 border-b-2 border-yellow-500">Single</button>
              <button className="flex-1 py-2 text-sm font-medium text-muted/50 cursor-not-allowed" disabled>Combo</button>
              <button className="flex-1 py-2 text-sm font-medium text-muted/50 cursor-not-allowed" disabled>System</button>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto betting-slip-scroll" onClick={(e) => e.stopPropagation()}>
            {selectedOdds.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No bets selected</p>
                <p className="text-xs text-muted/70 mt-1">Click on odds to add them to your betslip</p>
              </div>
            ) : (
              selectedOdds.map((odds, index) => (
              <div key={`${odds.matchId}-${odds.type}`} className="bg-surface border border-border rounded-lg p-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="flex items-center gap-2">
                        {odds.type === 'home' ? (
                          <>
                            {getTeamLogo(odds.teams.split(' vs ')[0], selectedCountry?.name) && (
                              <img
                                src={getTeamLogo(odds.teams.split(' vs ')[0], selectedCountry?.name)!}
                                alt={`${odds.teams.split(' vs ')[0]} icon`}
                                className="w-6 h-6"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <span className="text-sm font-medium text-text">{highlightSearchTerm(odds.teams.split(' vs ')[0], searchQuery)}</span>
                          </>
                        ) : odds.type === 'away' ? (
                          <>
                            {getTeamLogo(odds.teams.split(' vs ')[1], selectedCountry?.name) && (
                              <img
                                src={getTeamLogo(odds.teams.split(' vs ')[1], selectedCountry?.name)!}
                                alt={`${odds.teams.split(' vs ')[1]} icon`}
                                className="w-6 h-6"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <span className="text-sm font-medium text-text">{highlightSearchTerm(odds.teams.split(' vs ')[1], searchQuery)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-text">Draw</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-9 space-y-1">
                      <div className="text-xs text-muted">{odds.teams}</div>
                      <div className="text-xs text-muted">1x2</div>
                    </div>
                                         <div className="flex items-center justify-between">
                       <span className="text-lg font-bold text-text">{formatOdds(odds.odds)}</span>
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
                      setSelectedOdds(prev => prev.filter(
                        item => !(item.matchId === odds.matchId && item.type === odds.type)
                      ));
                      // Clear duplicate bet error when removing odds
                      setDuplicateBetError("");
                      if (selectedOdds.length === 1) {
                        setIsBetSlipHiding(true);
                        setTimeout(() => {
                          setShowBetSlip(false);
                          setIsBetSlipHiding(false);
                        }, 500);
                      }
                    }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
            )}
            
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
            
            <div className="flex gap-2 mb-3">
              <button className="flex-1 py-3 bg-surface border border-border text-text rounded-lg text-sm font-medium">SHARE</button>
              <button 
                className="flex-1 py-3 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePlaceBet}
                disabled={isPlacingBet || isConfirmingBet || !bettingValidation.isValid}
              >
                {isAuthenticated ? (
                  isPlacingBet || isConfirmingBet ? "PLACING BET..." : "PLACE BET"
                ) : "LOGIN"}
              </button>
            </div>
            
            {!isAuthenticated && (
              <div className="text-center mb-3">
                <span className="text-xs text-muted">Don't you have an account? </span>
                <button 
                  className="text-xs text-yellow-500 hover:underline font-medium"
                  onClick={() => navigate("/signin")}
                >
                  Join Now!
                </button>
              </div>
            )}
            <div className="flex items-center justify-center gap-4 text-muted">
              <button className="flex items-center gap-1 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button className="flex items-center gap-1 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Odds Settings</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
      
             {totalPages > 1 && (
         <div className="flex items-center justify-center gap-2 mt-8 px-2">
           <button
             onClick={() => handlePageChange(1)}
             disabled={currentPage === 1}
             className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
               currentPage === 1
                 ? 'bg-surface text-muted cursor-not-allowed'
                 : 'bg-surface text-text hover:bg-surface/80 border border-border'
             }`}
           >
             First
           </button>
           
           <button
             onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
             disabled={currentPage === 1}
             className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
               currentPage === 1
                 ? 'bg-surface text-muted cursor-not-allowed'
                 : 'bg-surface text-text hover:bg-surface/80 border border-border'
             }`}
           >
             Previous
           </button>
           
           <div className="flex items-center gap-1">
             {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
               let pageNum;
               if (totalPages <= 5) {
                 pageNum = i + 1;
               } else if (currentPage <= 3) {
                 pageNum = i + 1;
               } else if (currentPage >= totalPages - 2) {
                 pageNum = totalPages - 4 + i;
               } else {
                 pageNum = currentPage - 2 + i;
               }
               
               return (
                 <button
                   key={pageNum}
                   onClick={() => handlePageChange(pageNum)}
                   className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                     currentPage === pageNum
                       ? 'bg-accent text-white'
                       : 'bg-surface text-text hover:bg-surface/80 border border-border'
                   }`}
                 >
                   {pageNum}
                 </button>
               );
             })}
           </div>
           
           <button
             onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
             disabled={currentPage === totalPages}
             className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
               currentPage === totalPages
                 ? 'bg-surface text-muted cursor-not-allowed'
                 : 'bg-surface text-text hover:bg-surface/80 border border-border'
             }`}
           >
             Next
           </button>
           
           <button
             onClick={() => handlePageChange(totalPages)}
             disabled={currentPage === totalPages}
             className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
               currentPage === totalPages
                 ? 'bg-surface text-muted cursor-not-allowed'
                 : 'bg-surface text-text hover:bg-surface/80 border border-border'
             }`}
           >
             Last
           </button>
         </div>
       )}
      
             {totalMatches > 0 && (
         <div className="text-center mt-4 text-sm text-muted">
          {selectedYear 
            ? selectedLeague
              ? `Showing ${totalMatches} ${selectedLeague.name} matches from ${formatSeasonLabel(selectedYear)} only (${Math.ceil(totalMatches / matchesPerPage)} pages)`
              : `Showing ${totalMatches} matches from ${formatSeasonLabel(selectedYear)} only (${Math.ceil(totalMatches / matchesPerPage)} pages)`
             : selectedLeague
               ? `Showing all ${totalMatches} ${selectedCountry?.name} ${selectedLeague.name} matches (${Math.ceil(totalMatches / matchesPerPage)} pages)`
               : `Showing ${Math.min(startIndex + 1, totalMatches)}-${Math.min(endIndex, totalMatches)} of ${totalMatches} matches`
           }
         </div>
       )}

      {/* Beautiful Bet Confirmation Modal */}
      {showBetConfirmation && (
        <>
          {/* Confetti Animation */}
          <div className="fixed inset-0 pointer-events-none z-[100001]">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#A29BFE', '#FD79A8'][Math.floor(Math.random() * 8)]
                  }}
                />
              </div>
            ))}
          </div>

          {/* Main Modal */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100000] p-4">
            <div className="relative w-full max-w-lg mx-auto">
              {/* Background Glow Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 rounded-3xl blur-xl"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl"></div>
              
              {/* Main Card */}
              <div 
                className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-xl overflow-hidden"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-red-500/5 animate-gradient-shift"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-aurora"></div>
                
                {/* Floating Particles */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-8 left-8 w-2 h-2 bg-yellow-400 rounded-full animate-floating-particles animation-delay-100"></div>
                  <div className="absolute top-12 right-12 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-floating-particles animation-delay-300"></div>
                  <div className="absolute bottom-12 left-12 w-1 h-1 bg-pink-400 rounded-full animate-floating-particles animation-delay-500"></div>
                  <div className="absolute bottom-8 right-8 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-floating-particles animation-delay-700"></div>
                </div>
                
                {/* Shimmer Effect */}
                <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer opacity-50"></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center animate-pulse-glow">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">🎯 Confirm Your Bet</h3>
                        <p className="text-sm text-white/70">Double-check your selections</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBetConfirmation(false)}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm border border-white/20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Main Question */}
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow backdrop-blur-sm border border-yellow-500/30">
                        <span className="text-4xl">🤔</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Ready to Place Your Bet?</h2>
                      <p className="text-white/80">Make sure everything looks good before confirming!</p>
                    </div>

                    {/* Bet Details */}
                    <div className="space-y-4 mb-8">
                      {/* Your Bets */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">🎲</span>
                          <h4 className="text-white font-semibold">Your Selections</h4>
                        </div>
                        <div className="space-y-3">
                          {selectedOdds.map((odds, index) => (
                            <div key={index} className="bg-white/5 rounded-xl p-3 border border-white/10">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="text-white font-medium text-sm mb-1">{highlightSearchTerm(odds.teams, searchQuery)}</div>
                                  <div className="text-white/70 text-xs">
                                    {odds.type === 'home' ? highlightSearchTerm(odds.teams.split(' vs ')[0], searchQuery) : 
                                     odds.type === 'away' ? highlightSearchTerm(odds.teams.split(' vs ')[1], searchQuery) : 'Draw'} 
                                    <span className="text-yellow-400 font-semibold ml-2">({formatOdds(odds.odds)})</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-white font-bold">${odds.stake}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="relative bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        {/* Loading Overlay */}
                        {isConfirmingBet && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-6">
                              {/* Soccer Ball Loading Effect */}
                              <div className="relative">
                                <div className="w-16 h-16 animate-football-bounce shadow-lg">
                                  {/* Real Soccer Ball Image */}
                                  <img 
                                    src="/assets/soccer_ball.png" 
                                    alt="Soccer Ball" 
                                    className="w-full h-full object-contain drop-shadow-lg"
                                  />
                                  
                                  {/* Golden Glow Effect */}
                                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 blur-sm animate-football-spin"></div>
                                </div>
                                
                                {/* Bouncing shadow */}
                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-black/20 rounded-full blur-sm animate-football-bounce" style={{animationDelay: '0.1s'}}></div>
                              </div>
                              
                              <p className="text-yellow-300 font-bold text-lg text-center animate-pulse">
                                ⚽ Placing your bet...
                              </p>
                              <p className="text-white/80 text-sm text-center">
                                Please wait while we process your bet...
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Summary Content */}
                        <div className={isConfirmingBet ? "blur-sm" : ""}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">💰</span>
                            <h4 className="text-white font-semibold">Bet Summary</h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-white/80">Total Bet Amount:</span>
                              <span className="text-white font-bold">
                                ${selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/80">Potential Win:</span>
                              <span className="text-green-400 font-bold text-lg">
                                ${calculatePotentialWin().toFixed(2)}
                              </span>
                            </div>
                            <hr className="border-white/10 my-2" />
                            <div className="flex justify-between items-center">
                              <span className="text-white/80">Current Balance:</span>
                              <span className="text-blue-400 font-medium">${userFunds.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/80">After Bet:</span>
                              <span className="text-orange-400 font-medium">
                                ${(userFunds - selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => setShowBetConfirmation(false)}
                        disabled={isConfirmingBet}
                        className="flex-1 py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm border border-white/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>❌</span>
                          <span>Cancel</span>
                        </span>
                      </button>
                      <button
                        onClick={confirmBet}
                        disabled={isConfirmingBet}
                        className="flex-1 py-4 px-6 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-yellow-500/25 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>🚀</span>
                          <span>Place Bet!</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

             {/* Congratulations Alert */}
      <CongratulationsAlert
        isVisible={showCongratulations}
        onClose={() => setShowCongratulations(false)}
        betAmount={betDetails.betAmount}
        potentialWin={betDetails.potentialWin}
        teams={betDetails.teams}
      />
    </section>
  );
}
