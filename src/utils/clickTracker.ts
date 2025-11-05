/**
 * Click Tracking Utility
 * Automatically tracks user engagement with matches, buttons, and key actions
 */

import { getBaseUrl } from '../config/api';

const sessionId = localStorage.getItem('session_id') || generateSessionId();

function generateSessionId(): string {
  const id = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('session_id', id);
  return id;
}

interface ClickEvent {
  element_type: string; // 'match_card', 'bet_button', 'value_bet', 'odds_display', 'match_stats'
  element_id: string; // match_id, team name, or unique identifier
  page_path: string;
  meta_data?: {
    match_teams?: string;
    match_league?: string;
    odds_value?: string;
    bet_amount?: number;
    [key: string]: any;
  };
}

/**
 * Track a click event
 */
export async function trackClick(
  elementType: string,
  elementId: string,
  metaData?: Record<string, any>
): Promise<void> {
  try {
    const accessToken = localStorage.getItem('access_token');
    const userId = localStorage.getItem('user_id');
    
    const clickEvent = {
      element_type: elementType,
      element_id: elementId,
      page_path: window.location.pathname + window.location.search,
      session_id: sessionId,
      user_agent: navigator.userAgent,
      meta_data: {
        ...metaData,
        timestamp: new Date().toISOString()
      }
    };

    // Send to backend if authenticated
    if (accessToken) {
      await fetch(
        `${getBaseUrl()}/api/analytics/clicks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(clickEvent)
        }
      );
    }
  } catch (error) {
    // Fail silently - don't interrupt user experience
    console.error('Click tracking error:', error);
  }
}

/**
 * Track page views
 */
export async function trackPageView(
  pagePath: string,
  pageTitle: string,
  metaData?: Record<string, any>
): Promise<void> {
  try {
    const accessToken = localStorage.getItem('access_token');
    
    const pageView = {
      page_path: pagePath,
      page_title: pageTitle,
      session_id: sessionId,
      user_agent: navigator.userAgent,
      meta_data: {
        ...metaData,
        timestamp: new Date().toISOString(),
        referrer: document.referrer
      }
    };

    if (accessToken) {
      await fetch(
        `${getBaseUrl()}/api/analytics/pageviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(pageView)
        }
      );
    }
  } catch (error) {
    console.error('Page view tracking error:', error);
  }
}

/**
 * Track conversion events (signup, deposit, bet placed, bet won)
 */
export async function trackConversion(
  eventType: string,
  elementId: string,
  value: number,
  metaData?: Record<string, any>
): Promise<void> {
  try {
    const accessToken = localStorage.getItem('access_token');
    
    const conversionEvent = {
      event_type: eventType,
      element_id: elementId,
      page_path: window.location.pathname,
      value: value,
      session_id: sessionId,
      user_agent: navigator.userAgent,
      meta_data: {
        ...metaData,
        timestamp: new Date().toISOString()
      }
    };

    if (accessToken) {
      await fetch(
        `${getBaseUrl()}/api/analytics/conversions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(conversionEvent)
        }
      );
    }
  } catch (error) {
    console.error('Conversion tracking error:', error);
  }
}

/**
 * Hook for tracking match interactions
 */
export function useMatchTracking() {
  return {
    trackMatchView: (matchId: string, teams: string, league: string) => {
      trackClick('match_card', matchId, { match_teams: teams, match_league: league });
    },
    
    trackBetClick: (matchId: string, teams: string, outcome: string, odds: string) => {
      trackClick('bet_button', matchId, { 
        match_teams: teams, 
        selected_outcome: outcome, 
        odds_value: odds 
      });
      trackConversion('bet_click', matchId, 0, { 
        match_teams: teams, 
        selected_outcome: outcome 
      });
    },
    
    trackValueBet: (matchId: string, teams: string, ev: number) => {
      trackClick('value_bet', matchId, { 
        match_teams: teams, 
        expected_value: ev 
      });
      trackConversion('value_bet_click', matchId, 0, { 
        match_teams: teams, 
        expected_value: ev 
      });
    },
    
    trackOddsView: (matchId: string, teams: string, oddsType: string) => {
      trackClick('odds_display', matchId, { 
        match_teams: teams, 
        odds_type: oddsType 
      });
    }
  };
}

