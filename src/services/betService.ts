/**
 * Bet Service
 * Handles bet placement and management using internal USDT wallet
 */
import { getBaseUrl } from '../config/api';

export type BetStatus = 'pending' | 'won' | 'lost' | 'void' | 'cancelled' | 'settling';

export interface Bet {
  id: number;
  user_id: number;
  match_id: number;
  market_key: string;
  selection_key: string;
  odds_decimal: number;
  stake: number;
  currency: string;
  status: BetStatus;
  settle_version: number;
  placed_at: string;
  settled_at?: string;
  potential_profit: number;
  potential_payout: number;
  profit?: number;  // Actual profit if settled
  payout?: number;  // Actual payout if settled
}

export interface BetWithMatch extends Bet {
  match_home_team?: string;
  match_away_team?: string;
  match_date?: string;
  match_league?: string;
}

export interface BetPlaceRequest {
  match_id: number;
  market_key: string;
  selection_key: string;
  odds_decimal: number;
  stake: number;
  currency?: string;
}

export interface BetListResponse {
  bets: Bet[];
  total: number;
  limit: number;
  offset: number;
}

export interface BetSettleRequest {
  outcome: 'WIN' | 'LOSS' | 'VOID';
}

class BetService {
  private baseUrl = getBaseUrl();

  private getAuthHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Place a bet using internal USDT wallet
   */
  async placeBet(request: BetPlaceRequest): Promise<Bet> {
    const response = await fetch(`${this.baseUrl}/api/bets/place`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        ...request,
        currency: request.currency || 'USDT'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to place bet');
    }

    return response.json();
  }

  /**
   * Get user's bets with optional status filter
   */
  async getBets(status?: BetStatus, limit: number = 100, offset: number = 0): Promise<BetListResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    if (status) {
      params.append('status', status);
    }

    const response = await fetch(`${this.baseUrl}/api/bets?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get bets');
    }

    return response.json();
  }

  /**
   * Get a specific bet by ID
   */
  async getBet(betId: number): Promise<BetWithMatch> {
    const response = await fetch(`${this.baseUrl}/api/bets/${betId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get bet');
    }

    return response.json();
  }

  /**
   * Cancel a pending bet (unlock reserved funds)
   */
  async cancelBet(betId: number): Promise<Bet> {
    const response = await fetch(`${this.baseUrl}/api/bets/${betId}/cancel`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to cancel bet');
    }

    return response.json();
  }

  /**
   * Settle a bet (Admin only)
   */
  async settleBet(betId: number, outcome: 'WIN' | 'LOSS' | 'VOID'): Promise<Bet> {
    const response = await fetch(`${this.baseUrl}/api/bets/${betId}/settle`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ outcome })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to settle bet');
    }

    return response.json();
  }
}

export const betService = new BetService();
