import React, { useState } from "react";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import OddsTable from "../components/OddsTable";
export default function SureBets() {
  const { selectedLeague } = useCountry();
  const [selectedSport, setSelectedSport] = useState("All sports");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("today");
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
  const sampleSureBets = [
    {
      id: "1",
      sport: "Football",
      league: "Premier League",
      teams: "Arsenal vs Chelsea",
      date: "Today, 20:00",
      bet1: { outcome: "Arsenal Win", odds: "2.10", bookmaker: "Bet365" },
      bet2: { outcome: "Chelsea Win", odds: "2.05", bookmaker: "William Hill" },
      profit: "2.5%",
      stake: "£100",
      return: "£102.50"
    },
    {
      id: "2",
      sport: "Tennis",
      league: "Wimbledon",
      teams: "Djokovic vs Medvedev",
      date: "Tomorrow, 15:30",
      bet1: { outcome: "Djokovic Win", odds: "1.85", bookmaker: "Betway" },
      bet2: { outcome: "Medvedev Win", odds: "2.15", bookmaker: "Ladbrokes" },
      profit: "3.2%",
      stake: "£100",
      return: "£103.20"
    }
  ];
  const hasSureBets = false;

  // If a league is selected, show the OddsTable (same as Home page)
  if (selectedLeague) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable />
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Claim Cards - Keeping as is */}
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
      {/* Breadcrumb */}
      <div className="text-sm text-muted">
        Home &gt; Sure Bets
      </div>
      
      {/* Page Header - Clean Modern Design */}
      <div className="relative bg-gradient-to-br from-surface via-surface to-green-500/5 border-2 border-border rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
        {/* Subtle pattern background */}
        <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(34, 197, 94) 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
        
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 via-transparent to-emerald-500/10"></div>
        
        {/* Accent border animation */}
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-green-500 via-emerald-500 to-teal-500"></div>
        
        {/* Floating decorative elements */}
        <div className="absolute top-4 right-4 w-64 h-64 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-4 left-1/2 w-48 h-48 bg-gradient-to-tl from-emerald-500/10 to-transparent rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Icon and Title */}
            <div className="flex items-start gap-4">
              {/* Gradient Icon */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              
              {/* Title and Description */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text">
                    Sure Bets - Arbitrage
                  </h1>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-sm font-semibold text-green-600 dark:text-green-400">
                    Guaranteed Profit
                  </span>
                  <a 
                    href="#" 
                    className="inline-flex items-center gap-1 px-3 py-1 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-lg text-sm font-semibold text-accent transition-all duration-300"
                  >
                    Get More
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-muted max-w-3xl leading-relaxed">
                  Win guaranteed profit by betting on different outcomes with arbitrage odds from different bookmakers.
                </p>
              </div>
            </div>
            
            {/* Right: Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-2 lg:text-right flex-shrink-0">
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-2xl font-bold text-accent">0</div>
                <div className="text-xs text-muted">Available</div>
              </div>
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-2xl font-bold text-accent">2-5%</div>
                <div className="text-xs text-muted">Avg Profit</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filter Section */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="font-semibold text-text text-sm">Time Period Filter</h3>
        </div>
        <select
          value={selectedTimeFilter}
          onChange={(e) => setSelectedTimeFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:bg-surface"
        >
          {timeFilters.map((filter) => (
            <option key={filter.id} value={filter.id}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Sport Tabs */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="font-semibold text-text text-sm">Filter by Sport</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {sports.map((sport) => (
            <button
              key={sport.name}
              onClick={() => setSelectedSport(sport.name)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
                selectedSport === sport.name
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-105"
                  : "bg-bg text-muted hover:text-text hover:bg-surface border border-border hover:shadow-md"
              }`}
            >
              <span className="text-lg">{sport.icon}</span>
              <span className="font-medium text-sm">{sport.name}</span>
            </button>
          ))}
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all duration-300 bg-bg text-muted hover:text-text hover:bg-surface border border-border hover:shadow-md flex-shrink-0">
            <span className="font-medium text-sm">More</span>
            <span className="text-lg">⌄</span>
          </button>
        </div>
      </div>
      {hasSureBets ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="block lg:hidden space-y-3 px-2">
            {sampleSureBets.map((bet) => (
              <div key={bet.id} className="bg-surface border border-border rounded-lg p-3 sm:p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="font-medium text-text text-sm sm:text-base">{bet.teams}</div>
                    <div className="text-xs sm:text-sm text-muted">{bet.sport} • {bet.league}</div>
                    <div className="text-xs text-muted">{bet.date}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">Bet 1</div>
                      <div className="text-sm font-medium text-text">{bet.bet1.outcome}</div>
                      <div className="text-xs text-muted">{bet.bet1.odds}</div>
                      <div className="text-xs text-accent">{bet.bet1.bookmaker}</div>
                    </div>
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">Bet 2</div>
                      <div className="text-sm font-medium text-text">{bet.bet2.outcome}</div>
                      <div className="text-xs text-muted">{bet.bet2.odds}</div>
                      <div className="text-xs text-accent">{bet.bet2.bookmaker}</div>
                    </div>
                  </div>
                  <div className="text-center pt-2 border-t border-border/50">
                    <div className="text-sm font-bold text-green-400 mb-1">{bet.profit} Profit</div>
                    <div className="text-xs text-muted">Stake: {bet.stake} | Return: {bet.return}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
              <div className="col-span-3 text-sm font-medium text-muted">Match</div>
              <div className="col-span-2 text-sm font-medium text-muted">Date/Time</div>
              <div className="col-span-2 text-sm font-medium text-muted text-center">Bet 1</div>
              <div className="col-span-2 text-sm font-medium text-muted text-center">Bet 2</div>
              <div className="col-span-3 text-sm font-medium text-muted text-center">Profit & Stakes</div>
            </div>
            <div className="space-y-4">
              {sampleSureBets.map((bet) => (
                <div key={bet.id} className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <div className="font-medium text-text">{bet.teams}</div>
                      <div className="text-sm text-muted">{bet.sport} • {bet.league}</div>
                    </div>
                    <div className="col-span-2 text-sm text-muted">
                      {bet.date}
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-text">{bet.bet1.outcome}</div>
                        <div className="text-xs text-muted">{bet.bet1.odds}</div>
                        <div className="text-xs text-accent">{bet.bet1.bookmaker}</div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-text">{bet.bet2.outcome}</div>
                        <div className="text-xs text-muted">{bet.bet2.odds}</div>
                        <div className="text-xs text-accent">{bet.bet2.bookmaker}</div>
                      </div>
                    </div>
                    <div className="col-span-3 text-center">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-green-400">{bet.profit} Profit</div>
                        <div className="text-xs text-muted">Stake: {bet.stake}</div>
                        <div className="text-xs text-muted">Return: {bet.return}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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


