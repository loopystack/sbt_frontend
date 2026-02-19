import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";
import { MatchingInfo } from "../store/matchinginfo/types";
import { apiMethods } from "../lib/api";

// Custom hook for animated counting
const useCountUp = (end: number, duration: number = 2000, delay: number = 0) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasStarted(true);
      const startTime = Date.now();
      const startValue = 0;

      const updateCount = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (end - startValue) * easeOutQuart);
        
        setCount(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(updateCount);
        }
      };
      
      requestAnimationFrame(updateCount);
    }, delay);

    return () => clearTimeout(timer);
  }, [end, duration, delay]);

  return { count, hasStarted };
};

export default function HeroSection() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [featuredMatches, setFeaturedMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Handle search - redirect to matches page with search term
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      return;
    }
    
    const encodedTerm = encodeURIComponent(searchTerm.trim());
    const targetUrl = `/all-events?search=${encodedTerm}`;
    
    
    // Navigate to all-events page (odds table) with search term as URL parameter
    navigate(targetUrl);
  };

  // Statistics state - start with null to indicate loading
  const [statistics, setStatistics] = useState<{
    bookmakers: number;
    sports: number;
    daily_matches: number;
  } | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);
  
  // Odds format conversion
  const { getOddsInFormat, oddsFormat } = useOddsFormat();
  
  // Fetch real statistics from API
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setStatisticsLoading(true);
        setStatisticsError(null);
        
        // Log the URL being called for debugging
        const apiUrl = "/api/odds/statistics";
        console.log("🔍 Fetching statistics from:", apiUrl);
        
        const stats = await apiMethods.get<{
          bookmakers: number;
          sports: number;
          daily_matches: number;
        }>(apiUrl);
        
        console.log("✅ Statistics received:", stats);
        
        // Validate response has all required fields
        if (stats && typeof stats.bookmakers === 'number' && typeof stats.sports === 'number' && typeof stats.daily_matches === 'number') {
          setStatistics({
            bookmakers: Math.max(0, stats.bookmakers),
            sports: Math.max(0, stats.sports),
            daily_matches: Math.max(0, stats.daily_matches)
          });
        } else {
          throw new Error("Invalid statistics response format");
        }
      } catch (error) {
        console.error("❌ HeroSection: Error fetching statistics:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to load statistics";
        console.error("Error details:", {
          message: errorMessage,
          error: error,
          stack: error instanceof Error ? error.stack : undefined
        });
        setStatisticsError(errorMessage);
        // Don't set fallback values - let the UI handle the loading/error state
      } finally {
        setStatisticsLoading(false);
      }
    };
    
    fetchStatistics();
  }, []);
  
  // Animated counters - only animate when we have real data
  const { count: bookmakersCount } = useCountUp(statistics?.bookmakers ?? 0, 2000, 0);
  const { count: sportsCount } = useCountUp(statistics?.sports ?? 0, 2000, 0);
  const { count: matchesCount } = useCountUp(statistics?.daily_matches ?? 0, 2000, 0);
  
  // Fetch upcoming matches: try /featured first, fallback to /upcoming if it fails or is empty
  useEffect(() => {
    const formatTimeHHMM = (t: string | null | undefined): string => {
      if (t == null || typeof t !== "string") return "00:00";
      const trimmed = String(t).trim();
      if (/^\d{1,2}:\d{2}:\d{2}/.test(trimmed)) {
        const [h, m] = trimmed.split(":");
        return `${h ?? "0"}:${m ?? "00"}`;
      }
      return trimmed;
    };

    const mapResultToMatches = (odds: MatchingInfo[], formatMatchDateFn: (d: string) => string) =>
      odds.slice(0, 9).map((match: MatchingInfo) => ({
        id: match.id,
        teams: `${match.home_team} vs ${match.away_team}`,
        league: `${match.country ?? ""} ${match.league ?? ""}`.trim(),
        time: formatTimeHHMM(match.time),
        date: formatMatchDateFn(String(match.date)),
        odds: {
          home: match.odd_1 != null ? String(match.odd_1) : null,
          away: match.odd_2 != null ? String(match.odd_2) : null,
          draw: match.odd_X != null ? String(match.odd_X) : null,
        },
        status: "Upcoming",
      }));

    const fetchFeaturedMatches = async () => {
      try {
        setLoading(true);
        const shape = {
          odds: [] as MatchingInfo[],
          total: 0,
          page: 1,
          size: 50,
          pages: 1,
        };
        let result: typeof shape;
        try {
          result = await apiMethods.get<typeof shape>("/api/odds/featured?limit=50");
        } catch (featuredErr) {
          console.warn("HeroSection: featured API failed, using upcoming", featuredErr);
          result = await apiMethods.get<typeof shape>("/api/odds/upcoming?limit=50");
        }
        if (!result.odds || result.odds.length === 0) {
          setFeaturedMatches([]);
          return;
        }
        setFeaturedMatches(mapResultToMatches(result.odds, formatMatchDate));
      } catch (error) {
        console.error("❌ HeroSection: Error fetching featured matches:", error);
        setFeaturedMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedMatches();
  }, []);

  // Helper function to format match date (e.g. "Feb 13")
  const formatMatchDate = (dateString: string): string => {
    const matchDate = new Date(dateString + "T00:00:00");
    return matchDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Debug: Log when odds format changes
  useEffect(() => {
  }, [oddsFormat]);
  
  // Debug: Log featured matches state
  useEffect(() => {
  }, [featuredMatches, loading]);
  
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

  return (
    <section className="mb-6 sm:mb-8">
      <div className="bg-gradient-to-br from-surface to-bg border border-border rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 relative">
        <div className="hidden lg:block absolute left-0 bottom-0">
          <img 
            src="/assets/LeftMan.png" 
            alt="Betting Expert" 
            className="object-contain rounded-xl"
          />
          

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 right-1/6 animate-money-spray-1">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/3 right-1/3 animate-money-spray-2">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-2/5 right-1/8 animate-money-spray-3">
              <span className="text-yellow-400 text-3xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-2/5 right-1/4 animate-money-spray-4">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-3/5 right-1/6 animate-money-spray-5">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-3/5 right-1/3 animate-money-spray-6">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/4 right-1/10 animate-money-spray-7">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/4 right-1/5 animate-money-spray-8">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/2 right-1/12 animate-money-spray-9">
              <span className="text-yellow-400 text-3xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/2 right-1/4 animate-money-spray-10">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/3 right-0 animate-money-spray-11">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-2/5 right-1/2 animate-money-spray-12">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/6 right-1/8 animate-money-spray-13">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-4/5 right-1/4 animate-money-spray-14">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-3/5 right-1/8 animate-money-spray-15">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 lg:ml-60">
          <div className="text-center mb-4 sm:mb-6 lg:mb-8 p-2 sm:p-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-text mb-3 sm:mb-4">
              Find the Best Betting Odds
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted max-w-2xl mx-auto px-2">
              Compare odds from top bookmakers worldwide and get the biggest payouts on your bets
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto mb-4 sm:mb-6 lg:mb-8 px-2">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for teams, leagues, or matches..."
                className="w-full px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 pr-16 sm:pr-20 lg:pr-24 bg-bg border border-border rounded-xl text-text placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm sm:text-base"
              />
               <button 
                 onClick={handleSearch}
                 disabled={!searchTerm.trim()}
                 className="absolute right-0 top-0 h-full px-3 sm:px-4 lg:px-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-r-xl transition-colors text-xs sm:text-sm flex items-center justify-center"
               >
                 Search
               </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6 max-w-4xl mx-auto px-2">
            {statisticsLoading ? (
              // Loading state - show skeleton
              <>
                <div className="text-center">
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-muted/30 mb-1 sm:mb-2 animate-pulse">
                    --
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base text-muted">Bookmakers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-muted/30 mb-1 sm:mb-2 animate-pulse">
                    --
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base text-muted">Sports</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-muted/30 mb-1 sm:mb-2 animate-pulse">
                    --
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base text-muted">Daily Matches</div>
                </div>
              </>
            ) : statisticsError ? (
              // Error state - show error message
              <div className="col-span-3 text-center">
                <div className="text-sm text-muted/70">
                  Statistics unavailable
                </div>
              </div>
            ) : statistics ? (
              // Success state - show real data
              <>
                <div className="text-center">
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-text mb-1 sm:mb-2">
                    {bookmakersCount > 0 ? `${bookmakersCount}+` : '0'}
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base text-muted">Bookmakers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-text mb-1 sm:mb-2">
                    {sportsCount > 0 ? `${sportsCount}+` : '0'}
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base text-muted">Sports</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-text mb-1 sm:mb-2">
                    {matchesCount > 0 ? `${matchesCount}+` : '0'}
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base text-muted">Daily Matches</div>
                </div>
              </>
            ) : (
              // Fallback - should not happen, but just in case
              <div className="col-span-3 text-center">
                <div className="text-sm text-muted/70">
                  Loading statistics...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-text mb-3 sm:mb-4 px-2">Featured Matches</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-3 sm:p-4 lg:p-5 animate-pulse">
                <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                  <div className="h-6 bg-muted/20 rounded-full w-20"></div>
                  <div className="text-right">
                    <div className="h-4 bg-muted/20 rounded w-16 mb-1"></div>
                    <div className="h-5 bg-muted/20 rounded w-12"></div>
                  </div>
                </div>
                <div className="h-5 bg-muted/20 rounded w-full mb-2 sm:mb-3"></div>
                <div className="h-4 bg-muted/20 rounded w-24 mb-2 sm:mb-3 lg:mb-4"></div>
                <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 lg:mb-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-muted/20 rounded w-12"></div>
                    <div className="h-4 bg-muted/20 rounded w-16"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-muted/20 rounded w-12"></div>
                    <div className="h-4 bg-muted/20 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-8 bg-muted/20 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : featuredMatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {featuredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-surface border border-border rounded-xl p-3 sm:p-4 lg:p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                <span className="px-2 sm:px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/30">
                  {match.status}
                </span>
                <div className="text-right">
                  <div className="text-xs sm:text-sm text-muted">{match.date}</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-text">{match.time}</div>
                </div>
              </div>
              
              <h3 className="font-bold text-text text-sm sm:text-base lg:text-lg mb-2 sm:mb-3 leading-tight line-clamp-2">
                {match.teams}
              </h3>
              
              <div className="text-xs sm:text-sm text-muted mb-2 sm:mb-3 lg:mb-4">{match.league}</div>
              
              <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 lg:mb-4">
                {match.odds.home && match.odds.away && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Home:</span>
                    <span className="font-semibold text-text">{formatOdds(match.odds.home)}</span>
                  </div>
                )}
                {match.odds.away && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Away:</span>
                    <span className="font-semibold text-text">{formatOdds(match.odds.away)}</span>
                  </div>
                )}
                {match.odds.draw && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Draw:</span>
                    <span className="font-semibold text-text">{formatOdds(match.odds.draw)}</span>
                  </div>
                )}
                {match.odds.overUnder && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">O/U:</span>
                    <span className="font-semibold text-text">{match.odds.overUnder}</span>
                  </div>
                )}
                {match.odds.spread && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Spread:</span>
                    <span className="font-semibold text-text">{match.odds.spread}</span>
                  </div>
                )}
              </div>
              
              <button className="w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors group-hover:scale-105">
                Compare Odds
              </button>
            </div>
          ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-muted text-sm mb-2">No upcoming matches available</div>
            <div className="text-xs text-muted/70">Check back later for new matches</div>
          </div>
        )}
      </div>
    </section>
  );
}
