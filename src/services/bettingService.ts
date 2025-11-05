import { api } from '../lib/api';
import { getBaseUrl } from '../config/api';

const BASE_URL = '/api/betting';

export interface BettingRecord {
  id: number;
  user_id: number;
  bet_amount: number;
  potential_win: number;
  actual_profit?: number;
  match_id?: number;
  match_teams: string;
  match_date?: string;
  match_league?: string;
  match_status: string;
  selected_outcome: string;
  selected_team?: string;
  odds_value: string;
  odds_decimal: number;
  bet_status: string;
  is_settled: boolean;
  settlement_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface BettingRecordCreate {
  bet_amount: number;
  potential_win: number;
  match_id?: number | null;  // Direct link to odds table
  match_teams: string;
  match_date?: string | null;
  match_league?: string;
  match_status: string;
  selected_outcome: string;
  selected_team?: string;
  odds_value: string;
  odds_decimal: number;
}

export interface BettingRecordResponse {
  records: BettingRecord[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface BettingStats {
  total_bets: number;
  total_amount_bet: number;
  total_potential_win: number;
  won_bets: number;
  lost_bets: number;
  pending_bets: number;
  total_profit: number;
  win_rate: number;
}

export const bettingService = {
  // Create a new betting record
  createBettingRecord: async (record: BettingRecordCreate): Promise<BettingRecord> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    try {
      const result = await api<BettingRecord>(`${BASE_URL}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ API call failed with full details:', {
        error,
        errorMessage: error.message,
        errorStatus: error.status,
        errorDetails: error.details,
        errorName: error.name,
        fullError: JSON.stringify(error, null, 2)
      });
      
      // Provide specific error messages based on the error type
      if (error.status === 401) {
        throw new Error('Authentication failed - please sign in again');
      } else if (error.status === 422) {
        throw new Error(`Validation error: ${error.message}`);
      } else if (error.status === 500) {
        throw new Error('Server error - please try again later');
      } else if (error.message?.includes('Network error')) {
        throw new Error('Network error - check your connection');
      } else {
        throw new Error(`Failed to create betting record: ${error.message || 'Unknown error'}`);
      }
    }
  },

  // Get betting records with pagination
  getBettingRecords: async (
    page: number = 1, 
    perPage: number = 10, 
    status?: string
  ): Promise<BettingRecordResponse> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    return api<BettingRecordResponse>(`${BASE_URL}/records?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get betting statistics
  getBettingStats: async (): Promise<BettingStats> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    return api<BettingStats>(`${BASE_URL}/records/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Fix missing match dates in existing records
  fixMissingMatchDates: async (): Promise<{ message: string; updated_count: number }> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    return api<{ message: string; updated_count: number }>(`${BASE_URL}/fix-missing-dates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  },
};
