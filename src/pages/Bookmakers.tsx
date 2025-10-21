
import React, { useState } from "react";
import { openBettingSiteByName } from "../config/bettingSites";
export default function Bookmakers() {
  const [selectedTab, setSelectedTab] = useState("BOOKIE INFO");
  const subNavigationTabs = [
    "BOOKIE INFO",
    "BONUS OFFERS", 
    "ODDS QUALITY",
    "BETTING APPS"
  ];
  const bookmakers = [
    {
      id: "1",
      name: "888 sport",
      logo: "888 sport",
      logoColor: "bg-black text-white",
      rating: "5/5",
      reviewLink: "888sport Review",
      features: [
        "30,000+ Events Monthly",
        "More than 40 Sports",
        "Highly rated betting app"
      ],
      payout: "92.1%",
      inPlayPayout: null,
      payoutLabel: "Average payout"
    },
    {
      id: "2",
      name: "bet365",
      logo: "bet365",
      logoColor: "bg-green-600 text-white",
      rating: "5/5",
      reviewLink: "bet365.us Review",
      features: [
        "Extensive live betting options",
        "More markets than other online bookmaker",
        "One of the best betting apps"
      ],
      payout: null,
      inPlayPayout: null,
      payoutLabel: null
    },
    {
      id: "3",
      name: "BET MGM",
      logo: "BET MGM",
      logoColor: "bg-black text-yellow-400",
      rating: "5/5",
      reviewLink: "BetMGM.us Review",
      features: [
        'Exclusive "Bonus Wheel" feature for rewarding active bettors',
        "Virtual sports section with a wide range of simulated events",
        "Access to VIP rewards program with personalized offers and promotions"
      ],
      payout: "92.94%",
      inPlayPayout: "89.80%",
      payoutLabel: "Average payout"
    },
    {
      id: "4",
      name: "PINNA CLE",
      logo: "PINNA CLE",
      logoColor: "bg-black text-white",
      rating: "5/5",
      reviewLink: "Pinnacle Review",
      features: [
        "Best odds in the industry",
        "High betting limits",
        "Professional betting platform"
      ],
      payout: "93.26%",
      inPlayPayout: "92.68%",
      payoutLabel: "Average payout"
    },
    {
      id: "5",
      name: "William Hill",
      logo: "William Hill",
      logoColor: "bg-blue-600 text-white",
      rating: "4.8/5",
      reviewLink: "William Hill Review",
      features: [
        "Established brand with long history",
        "Comprehensive sports coverage",
        "Excellent customer service"
      ],
      payout: "91.5%",
      inPlayPayout: "89.2%",
      payoutLabel: "Average payout"
    },
    {
      id: "6",
      name: "Lad brokes",
      logo: "Lad brokes",
      logoColor: "bg-red-600 text-white",
      rating: "4.7/5",
      reviewLink: "Ladbrokes Review",
      features: [
        "High street presence",
        "Competitive odds",
        "User-friendly interface"
      ],
      payout: "90.8%",
      inPlayPayout: "88.5%",
      payoutLabel: "Average payout"
    },
    {
      id: "7",
      name: "Coral",
      logo: "Coral",
      logoColor: "bg-orange-500 text-white",
      rating: "4.6/5",
      reviewLink: "Coral Review",
      features: [
        "Great mobile experience",
        "Regular promotions",
        "Fast payouts"
      ],
      payout: "90.2%",
      inPlayPayout: "87.9%",
      payoutLabel: "Average payout"
    },
    {
      id: "8",
      name: "Betfair",
      logo: "Betfair",
      logoColor: "bg-green-500 text-white",
      rating: "4.5/5",
      reviewLink: "Betfair Review",
      features: [
        "Exchange betting platform",
        "Best odds guaranteed",
        "Advanced trading tools"
      ],
      payout: "89.7%",
      inPlayPayout: "86.4%",
      payoutLabel: "Average payout"
    }
  ];
  return (
    <section className="space-y-4 sm:space-y-8 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Claim Cards - Keeping as is */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
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
        <div className="bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">BETMGM</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">US Sportsbook</p>
                <p className="text-xs sm:text-sm opacity-95">$1,500 Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETMGM")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
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
      </div>
      {/* Breadcrumb */}
      <div className="text-sm text-muted">
        Home &gt; Bookmakers
      </div>
      
      {/* Page Header - Clean Modern Design */}
      <div className="relative bg-gradient-to-br from-surface via-surface to-violet-500/5 border-2 border-border rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
        {/* Subtle pattern background */}
        <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(139, 92, 246) 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
        
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 via-transparent to-purple-500/10"></div>
        
        {/* Accent border animation */}
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-violet-500 via-purple-500 to-fuchsia-500"></div>
        
        {/* Floating decorative elements */}
        <div className="absolute top-4 right-4 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-4 left-1/2 w-48 h-48 bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Icon and Title */}
            <div className="flex items-start gap-4">
              {/* Gradient Icon */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                  </svg>
                </div>
              </div>
              
              {/* Title and Description */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text">
                    Best Online Bookmakers
                  </h1>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg text-sm font-semibold text-violet-600 dark:text-violet-400">
                    Aug 2025
                  </span>
                </div>
                <p className="text-sm text-muted max-w-3xl leading-relaxed">
                  Detailed bookmaker reviews with bonuses, navigation, payment methods, and mobile apps.
                </p>
              </div>
            </div>
            
            {/* Right: Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-2 lg:text-right flex-shrink-0">
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-2xl font-bold text-accent">8</div>
                <div className="text-xs text-muted">Bookmakers</div>
              </div>
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-2xl font-bold text-accent">5★</div>
                <div className="text-xs text-muted">Top Rated</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-1 border-b border-border">
        {subNavigationTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
              selectedTab === tab
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent "
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-text">
          Bookmakers ({bookmakers.length})
        </h2>
        <div className="space-y-6">
          {bookmakers.map((bookmaker) => (
            <div key={bookmaker.id} className="bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300">
              {bookmaker.payout && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-semibold">{bookmaker.payout}</span> {bookmaker.payoutLabel}
                    {bookmaker.inPlayPayout && (
                      <span className="ml-4">
                        <span className="font-semibold">{bookmaker.inPlayPayout}</span> Avg. In-play Odds Payout
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 ${bookmaker.logoColor} rounded-lg flex items-center justify-center font-bold text-lg text-center`}>
                      {bookmaker.logo}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-lg">★</span>
                      <span className="font-semibold text-text">{bookmaker.rating}</span>
                    </div>
                  </div>
                  <div>
                    <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm underline">
                      {bookmaker.reviewLink}
                    </a>
                  </div>
                  <div className="space-y-2">
                    {bookmaker.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-black dark:text-white text-sm">✓</span>
                        <span className="text-sm text-text">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-2 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <button className="bg-gray-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors hover:scale-105">
                      Visit Bookmaker
                    </button>
                    <div>
                      <a href="#" className="text-xs text-muted hover:text-accent transition-colors underline">
                        Terms and Conditions
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Why Choose Our Recommended Bookmakers?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-text">Licensed & Regulated</h4>
            <p className="text-sm text-muted leading-relaxed">
              All recommended bookmakers are fully licensed and regulated by recognized gaming 
              authorities. This ensures your funds are protected and you're playing on fair, 
              secure platforms.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-text">Competitive Odds & Payouts</h4>
            <p className="text-sm text-muted leading-relaxed">
              Our selected bookmakers offer some of the best odds in the industry with high 
              payout percentages. This maximizes your potential returns and gives you the best 
              value for your bets.
            </p>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Choosing the Right Bookmaker</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              🎯
            </div>
            <h4 className="font-medium text-text mb-2">Compare Odds</h4>
            <p className="text-sm text-muted">Always compare odds across multiple bookmakers to get the best value.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              🔒
            </div>
            <h4 className="font-medium text-text mb-2">Check Licensing</h4>
            <p className="text-sm text-muted">Ensure the bookmaker is licensed and regulated in your jurisdiction.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              💰
            </div>
            <h4 className="font-medium text-text mb-2">Review Bonuses</h4>
            <p className="text-sm text-muted">Look for welcome bonuses and ongoing promotions to maximize value.</p>
          </div>
        </div>
      </div>
    </section>
  );
}


