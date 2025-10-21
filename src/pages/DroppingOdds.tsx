import React, { useState } from "react";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import OddsTable from "../components/OddsTable";

export default function DroppingOdds() {
  const { selectedLeague } = useCountry();
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("12-hours");
  const [selectedDroppingFilter, setSelectedDroppingFilter] = useState("20-percent");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all-types");
  const [selectedSport, setSelectedSport] = useState("Football");

  const timeFilters = [
    { id: "12-hours", label: "Last 12 hours" },
    { id: "24-hours", label: "Last 24 hours" },
    { id: "48-hours", label: "Last 48 hours" }
  ];

  const droppingFilters = [
    { id: "20-percent", label: "20% dropping bookies" },
    { id: "30-percent", label: "30% dropping bookies" },
    { id: "50-percent", label: "50% dropping bookies" }
  ];

  const typeFilters = [
    { id: "all-types", label: "All types" },
    { id: "1x2", label: "1X2" },
    { id: "ht-ft", label: "HT/FT" },
    { id: "dnb", label: "DNB" }
  ];

  const sports = [
    { name: "All sports", icon: "🏆" },
    { name: "Football", icon: "⚽" },
    { name: "Basketball", icon: "🏀" },
    { name: "Tennis", icon: "🎾" },
    { name: "Baseball", icon: "⚾" }
  ];

  const matches = [
    {
      id: "1",
      sport: "Football",
      country: "Bulgaria",
      league: "Vtora liga",
      betType: "HT/FT",
      date: "17 Aug, 02:00",
      teams: "Pirin Blagoevgrad - Lok. Gorna",
      currentOdds: "79/1",
      previousOdds: "49/1",
      dropPercentage: -38,
      bestCurrentOdds: "59/1",
      bookmaker: "bets.io"
    },
    {
      id: "2",
      sport: "Football",
      country: "Belarus",
      league: "Vysshaya Liga",
      betType: "1X2",
      date: "16 Aug, 23:00",
      teams: "Zhodino - Slutsk",
      currentOdds: "11/1",
      previousOdds: "133/20",
      dropPercentage: -36,
      bestCurrentOdds: "6/1",
      bookmaker: "bet-at-home"
    },
    {
      id: "3",
      sport: "Football",
      country: "England",
      league: "NPL Premier Division",
      betType: "1X2",
      date: "16 Aug, 14:30",
      teams: "Hednesford - Workington",
      currentOdds: "137/10",
      previousOdds: "429/50",
      dropPercentage: -35,
      bestCurrentOdds: "9/1",
      bookmaker: "PINNACLE"
    },
    {
      id: "4",
      sport: "Hockey",
      country: "Australia",
      league: "AIHL",
      betType: "Home/Away",
      date: "16 Aug, 14:30",
      teams: "Central Coast Rhinos - Brisbane Lightning",
      currentOdds: "17/2",
      previousOdds: "21/4",
      dropPercentage: -34,
      bestCurrentOdds: "11/2",
      bookmaker: "bet-at-home"
    },
    {
      id: "5",
      sport: "Football",
      country: "Turkey",
      league: "1. Lig",
      betType: "1X2",
      date: "17 Aug, 03:30",
      teams: "Adana Demirspor - Corum",
      currentOdds: "37/50",
      previousOdds: "4/25",
      dropPercentage: -33,
      bestCurrentOdds: "6/25",
      bookmaker: "PINNACLE"
    }
  ];

  type Match = typeof matches[0];

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
        <div className="bg-gradient-to-tr from-slate-800 via-slate-700 to-slate-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
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
                className="w-full bg-blue-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-600 transition-all duration-300 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-bl from-amber-500 via-orange-500 to-red-500 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">bet-at-home</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">European Leader</p>
                <p className="text-xs sm:text-sm opacity-95">300€ Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet-at-home")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-tl from-violet-600 via-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">bets.io</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Crypto Sportsbook</p>
                <p className="text-xs sm:text-sm opacity-95">Sport Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bets.io")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="text-sm text-muted">
        Home &gt; Dropping Odds
      </div>

      {/* Page Header - Clean Modern Design */}
      <div className="relative bg-gradient-to-br from-surface via-surface to-red-500/5 border-2 border-border rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
        {/* Subtle pattern background */}
        <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(239, 68, 68) 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
        
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-red-500/10 via-transparent to-orange-500/10"></div>
        
        {/* Accent border animation */}
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-red-500 via-orange-500 to-amber-500"></div>
        
        {/* Floating decorative elements */}
        <div className="absolute top-4 right-4 w-64 h-64 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-4 left-1/2 w-48 h-48 bg-gradient-to-tl from-orange-500/10 to-transparent rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Icon and Title */}
            <div className="flex items-start gap-4">
              {/* Gradient Icon */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              
              {/* Title and Description */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text">
                    Dropping Odds Tracker
                  </h1>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400">
                    Real-time Analysis
                  </span>
                </div>
                <p className="text-sm text-muted max-w-3xl leading-relaxed">
                  Dropping odds occur when bookmakers reduce odds for a specific outcome. Identify these movements early for betting advantage.
                </p>
              </div>
            </div>
            
            {/* Right: Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-2 lg:text-right flex-shrink-0">
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-2xl font-bold text-accent">24h</div>
                <div className="text-xs text-muted">Tracking</div>
              </div>
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-2xl font-bold text-accent">-20%</div>
                <div className="text-xs text-muted">Min Drop</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section - Enhanced Design */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="font-semibold text-text text-sm">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Time Period</label>
            <select
              value={selectedTimeFilter}
              onChange={(e) => setSelectedTimeFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 hover:bg-surface"
            >
              {timeFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block">Drop Percentage</label>
            <select
              value={selectedDroppingFilter}
              onChange={(e) => setSelectedDroppingFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 hover:bg-surface"
            >
              {droppingFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block">Bet Type</label>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 hover:bg-surface"
            >
              {typeFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sport Tabs - Enhanced Design */}
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
                  ? "bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-lg transform scale-105"
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

      {/* Mobile Matches View */}
      <div className="block lg:hidden space-y-4">
        {Object.entries(matches.reduce((groups, match) => {
          const key = `${match.sport} / ${match.country} / ${match.league}`;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(match);
          return groups;
        }, {} as Record<string, Match[]>)).map(([key, group]) => (
          <div key={key} className="space-y-3">
            {/* League Header */}
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>{key.includes('Football') ? '⚽' : key.includes('Hockey') ? '🏒' : '🎾'}</span>
              <span className="text-xs sm:text-sm">{key}</span>
            </div>
            
            {/* Bet Type */}
            <div className="text-xs text-muted ml-4 sm:ml-6">
              {group[0]?.betType}
            </div>

            {/* Match Cards */}
            {group.map((match) => (
              <div key={match.id} className="bg-surface border border-border rounded-lg p-3 sm:p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                <div className="space-y-3">
                  {/* Match Info */}
                  <div className="space-y-1">
                    <div className="font-medium text-text text-sm sm:text-base">{match.teams}</div>
                    <div className="text-xs text-muted">{match.betType} • {match.date}</div>
                  </div>

                  {/* Dropping Odds */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">Current Odds</div>
                      <div className="text-sm font-medium text-text">{match.currentOdds}</div>
                      <div className="text-xs text-muted">{match.previousOdds}</div>
                    </div>
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">Drop</div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-red-400 text-xs">↓</span>
                        <span className="text-red-400 text-xs font-medium">{match.dropPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Best Current Odds */}
                  <div className="text-center pt-2 border-t border-border/50">
                    <div className="text-xs text-muted mb-1">Best Current Odds</div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">
                        {match.bestCurrentOdds}
                      </span>
                      <span className="text-xs text-muted">{match.bookmaker}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop Matches View */}
      <div className="hidden lg:block">
        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
          <div className="col-span-3 text-sm font-medium text-muted">Match</div>
          <div className="col-span-2 text-sm font-medium text-muted">Bet Type</div>
          <div className="col-span-2 text-sm font-medium text-muted">Date/Time</div>
          <div className="col-span-2 text-sm font-medium text-muted text-center">Dropping Odds</div>
          <div className="col-span-3 text-sm font-medium text-muted text-center">Best Current Odds</div>
        </div>

        {/* Matches Content */}
        <div className="space-y-4">
          {Object.entries(matches.reduce((groups, match) => {
            const key = `${match.sport} / ${match.country} / ${match.league}`;
            if (!groups[key]) {
              groups[key] = [];
            }
            groups[key].push(match);
            return groups;
          }, {} as Record<string, Match[]>)).map(([key, group]) => (
            <div key={key} className="space-y-4">
              {/* League Header */}
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>{key.includes('Football') ? '⚽' : key.includes('Hockey') ? '🏒' : '🎾'}</span>
                <span>{key}</span>
              </div>
              
              {/* Bet Type */}
              <div className="text-xs text-muted ml-6">
                {group[0]?.betType}
              </div>

              {/* Match Rows */}
              {group.map((match) => (
                <div key={match.id} className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Match Info */}
                    <div className="col-span-3">
                      <div className="font-medium text-text">{match.teams}</div>
                    </div>

                    {/* Bet Type */}
                    <div className="col-span-2 text-sm text-muted">
                      {match.betType}
                    </div>

                    {/* Date/Time */}
                    <div className="col-span-2 text-sm text-muted">
                      {match.date}
                    </div>

                    {/* Dropping Odds */}
                    <div className="col-span-2 text-center">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-text">{match.currentOdds}</div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-red-400 text-xs">↓</span>
                          <span className="text-red-400 text-xs font-medium">{match.dropPercentage}%</span>
                        </div>
                        <div className="text-xs text-muted">{match.previousOdds}</div>
                      </div>
                    </div>

                    {/* Best Current Odds */}
                    <div className="col-span-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">
                          {match.bestCurrentOdds}
                        </span>
                        <span className="text-xs text-muted">{match.bookmaker}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
