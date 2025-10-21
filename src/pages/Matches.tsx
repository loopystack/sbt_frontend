import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";
import OddsTable from "../components/OddsTable";

export default function Matches() {
  const { selectedLeague } = useCountry();
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedSport, setSelectedSport] = useState("Football");
  const [searchParams] = useSearchParams();
  
  // Get search term from URL parameter
  const searchFromHome = searchParams.get('search');
  
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
    console.log(`Matches: Converting ${odds} -> ${decimalOdds} -> ${formatted} (format: ${oddsFormat})`);
    return formatted;
  };
  
  const [selectedView, setSelectedView] = useState("kickoff");

  const dates = [
    { id: "yesterday", label: "Yesterday" },
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "16-aug", label: "16 Aug" },
    { id: "17-aug", label: "17 Aug" },
    { id: "18-aug", label: "18 Aug" },
    { id: "19-aug", label: "19 Aug" },
    { id: "20-aug", label: "20 Aug" }
  ];

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

  const matches = [
    {
      id: "1",
      league: "Football / Chile / Primera Division Women",
      date: "Today, 14 Aug",
      time: "00:00",
      match: "U. Espanola W 2-1 Coquimbo W",
      odds1: "89/100",
      oddsX: "243/100",
      odds2: "51/20",
      bookmakers: 5,
      bestOdds: "odds1"
    },
    {
      id: "2",
      league: "Football / Chile / Primera Division Women",
      date: "Today, 14 Aug",
      time: "00:00",
      match: "Colo-Colo W 8-0 Huachipato W",
      odds1: "1/100",
      oddsX: "21/1",
      odds2: "49/1",
      bookmakers: 2,
      bestOdds: "odds1"
    },
    {
      id: "3",
      league: "Football / Czech Republic / MOL Cup",
      date: "Today, 14 Aug",
      time: "00:00",
      match: "Lanzhot 1-0 Opava (pen.)",
      odds1: "129/10",
      oddsX: "151/25",
      odds2: "3/20",
      bookmakers: 7,
      bestOdds: "oddsX"
    },
    {
      id: "4",
      league: "Football / Czech Republic / MOL Cup",
      date: "Today, 14 Aug",
      time: "00:00",
      match: "Brumov 1-6 Prostejov",
      odds1: "1017/50",
      oddsX: "453/50",
      odds2: "7/100",
      bookmakers: 6,
      bestOdds: "odds2"
    },
    {
      id: "5",
      league: "Football / Estonia / Estonian Cup",
      date: "Today, 14 Aug",
      time: "00:00",
      match: "Kuressaare 1-2 Paide",
      odds1: "189/25",
      oddsX: "104/25",
      odds2: "6/25",
      bookmakers: 6,
      bestOdds: "odds2"
    }
  ];

  // If a league is selected, show the OddsTable (same as Home page)
  if (selectedLeague) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable initialSearchTerm={searchFromHome || undefined} />
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Claim Cards - Keeping as is */}
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

      {/* Breadcrumb */}
      <div className="text-sm text-muted">
        Home &gt; Next Matches &gt; Next Football Matches
      </div>

      {/* Page Header - Clean Modern Design */}
      <div className="relative bg-gradient-to-br from-surface via-surface to-blue-500/5 border-2 border-border rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
        {/* Subtle pattern background */}
        <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99, 102, 241) 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
        
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-purple-500/10"></div>
        
        {/* Accent border animation */}
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500"></div>
        
        {/* Floating decorative elements */}
        <div className="absolute top-4 right-4 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-4 left-1/2 w-48 h-48 bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Icon and Title */}
            <div className="flex items-start gap-4">
              {/* Gradient Icon */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/>
                  </svg>
                </div>
              </div>
              
              {/* Title and Description */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text">
                    Next Football Matches
                  </h1>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Today, 14 Aug 2025
                  </span>
                </div>
                <p className="text-sm text-muted max-w-3xl leading-relaxed">
                  Betting odds displayed are average/highest across all bookmakers. Click on matches to see all available odds.
                </p>
              </div>
            </div>
            
            {/* Right: Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-2 lg:text-right flex-shrink-0">
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-2xl font-bold text-accent">5</div>
                <div className="text-xs text-muted">Live Matches</div>
              </div>
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-2xl font-bold text-accent">12</div>
                <div className="text-xs text-muted">Bookmakers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filters - Enhanced Design */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="font-semibold text-text text-sm">Select Date</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {dates.map((date) => (
            <button
              key={date.id}
              onClick={() => setSelectedDate(date.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
                selectedDate === date.id
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105"
                  : "bg-bg text-muted hover:text-text hover:bg-surface border border-border hover:shadow-md"
              }`}
            >
              {date.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sport Filters - Enhanced Design */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="font-semibold text-text text-sm">Filter by Sport</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all duration-300 bg-bg text-muted hover:text-text hover:bg-surface border border-border hover:shadow-md flex-shrink-0">
            <span className="text-lg">⭐</span>
            <span className="font-medium text-sm">My Matches</span>
          </button>
          
          {sports.map((sport) => (
            <button
              key={sport.name}
              onClick={() => setSelectedSport(sport.name)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
                selectedSport === sport.name
                  ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg transform scale-105"
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

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-border">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setSelectedView(view.id)}
            className={`px-4 py-3 text-sm font-semibold transition-all duration-200 relative ${
              selectedView === view.id
                ? "text-accent"
                : "text-muted hover:text-accent"
            }`}
          >
            {view.label}
            {selectedView === view.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            )}
          </button>
        ))}
      </div>

      {/* Mobile Match Cards - Enhanced Design */}
      <div className="block lg:hidden space-y-4">
        {matches.map((match) => (
          <div key={match.id} className="group relative bg-surface border border-border rounded-xl p-4 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
            {/* Hover gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10 space-y-4">
              {/* Match Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                      ⚽
                    </div>
                    <span className="text-xs text-muted">{match.league}</span>
                  </div>
                  <h3 className="font-bold text-text text-base leading-tight">
                    {match.match}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-1 ml-3">
                  <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{match.time}</span>
                  </div>
                  <span className="text-xs text-muted">{match.date}</span>
                </div>
              </div>
              
              {/* Odds Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg rounded-lg p-3 text-center hover:bg-surface transition-colors">
                  <div className="text-xs text-muted mb-2 font-medium">Home</div>
                  <div className={`text-base font-bold ${
                    match.bestOdds === 'odds1' 
                      ? 'text-green-500 bg-green-500/10 px-2 py-1 rounded-lg' 
                      : 'text-text'
                  }`}>
                    {formatOdds(match.odds1)}
                  </div>
                </div>
                <div className="bg-bg rounded-lg p-3 text-center hover:bg-surface transition-colors">
                  <div className="text-xs text-muted mb-2 font-medium">Draw</div>
                  <div className={`text-base font-bold ${
                    match.bestOdds === 'oddsX' 
                      ? 'text-green-500 bg-green-500/10 px-2 py-1 rounded-lg' 
                      : 'text-text'
                  }`}>
                    {formatOdds(match.oddsX)}
                  </div>
                </div>
                <div className="bg-bg rounded-lg p-3 text-center hover:bg-surface transition-colors">
                  <div className="text-xs text-muted mb-2 font-medium">Away</div>
                  <div className={`text-base font-bold ${
                    match.bestOdds === 'odds2' 
                      ? 'text-green-500 bg-green-500/10 px-2 py-1 rounded-lg' 
                      : 'text-text'
                  }`}>
                    {formatOdds(match.odds2)}
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-muted" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-xs text-muted">{match.bookmakers} bookmakers</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                  View Odds
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View - Enhanced Design */}
      <div className="hidden lg:block bg-surface border border-border rounded-xl overflow-hidden shadow-lg">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-border">
          <div className="col-span-2 text-sm font-semibold text-text flex items-center gap-2">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Date
          </div>
          <div className="col-span-1 text-sm font-semibold text-text flex items-center gap-2">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Time
          </div>
          <div className="col-span-4 text-sm font-semibold text-text">Match</div>
          <div className="col-span-1 text-sm font-semibold text-text text-center">Home</div>
          <div className="col-span-1 text-sm font-semibold text-text text-center">Draw</div>
          <div className="col-span-1 text-sm font-semibold text-text text-center">Away</div>
          <div className="col-span-2 text-sm font-semibold text-text text-center">Bookmakers</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border">
          {matches.map((match, index) => (
            <div 
              key={match.id} 
              className="group grid grid-cols-12 gap-4 px-6 py-5 hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-purple-500/5 transition-all duration-300 cursor-pointer"
            >
              <div className="col-span-2 flex items-center">
                <div className="text-sm text-muted font-medium">{match.date}</div>
              </div>
              <div className="col-span-1 flex items-center">
                <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{match.time}</span>
                </div>
              </div>
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  ⚽
                </div>
                <div>
                  <div className="font-bold text-text group-hover:text-accent transition-colors">{match.match}</div>
                  <div className="text-xs text-muted mt-0.5">{match.league}</div>
                </div>
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <button className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  match.bestOdds === 'odds1' 
                    ? 'bg-green-500/20 text-green-500 border-2 border-green-500/30 shadow-lg scale-110' 
                    : 'bg-bg text-text hover:bg-surface border border-border hover:shadow-md'
                }`}>
                  {formatOdds(match.odds1)}
                </button>
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <button className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  match.bestOdds === 'oddsX' 
                    ? 'bg-green-500/20 text-green-500 border-2 border-green-500/30 shadow-lg scale-110' 
                    : 'bg-bg text-text hover:bg-surface border border-border hover:shadow-md'
                }`}>
                  {formatOdds(match.oddsX)}
                </button>
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <button className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  match.bestOdds === 'odds2' 
                    ? 'bg-green-500/20 text-green-500 border-2 border-green-500/30 shadow-lg scale-110' 
                    : 'bg-bg text-text hover:bg-surface border border-border hover:shadow-md'
                }`}>
                  {formatOdds(match.odds2)}
                </button>
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
                    <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm font-bold text-accent">{match.bookmakers}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
