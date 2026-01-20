/**
 * Withdrawal Service
 * Service for handling withdrawal operations
 */
import { getBaseUrl } from '../config/api';

export interface WithdrawalIntentCreate {
  asset: string;
  network: string;
  amount_crypto: string;
  to_address: string;
  memo?: string;
  client_request_id?: string;
}

export interface WithdrawalIntentResponse {
  id: number;
  asset: string;
  network: string;
  amount_crypto: string;
  amount_usd: string;
  to_address: string;
  memo?: string;
  status: string;
  tx_hash?: string;
  confirmations?: number;
  processed_at?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  network_fee?: string;
  platform_fee: string;
  created_at: string;
  estimated_completion?: string;
}

export interface WithdrawalStatusResponse {
  id: number;
  status: string;
  tx_hash?: string;
  confirmations: number;
  required_confirmations: number;
  created_at: string;
  processed_at?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  network_fee?: string;
}

export interface WithdrawalHistoryItem {
  id: number;
  asset: string;
  network: string;
  amount_crypto: string;
  amount_usd: string;
  to_address: string;
  memo?: string;
  status: string;
  network_fee?: string;
  platform_fee: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  tx_hash?: string;
  confirmations?: number;
  processed_at?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
}

export interface WithdrawalListResponse {
  withdrawals: WithdrawalHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

class WithdrawalService {
  private baseUrl = getBaseUrl();

  /**
   * Create a new withdrawal request
   */
  async initiateWithdrawal(data: WithdrawalIntentCreate): Promise<WithdrawalIntentResponse> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseUrl}/api/withdrawals/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to initiate withdrawal');
    }

    return response.json();
  }

  /**
   * Get withdrawal status by ID
   */
  async getWithdrawalStatus(withdrawalId: number): Promise<WithdrawalStatusResponse> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseUrl}/api/withdrawals/${withdrawalId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get withdrawal status');
    }

    return response.json();
  }

  /**
   * List user's withdrawal history
   */
  async getWithdrawals(
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<WithdrawalListResponse> {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      limit: limit.toString(),
      skip: offset.toString()
    });
    if (status) {
      params.append('status_filter', status);
    }

    const response = await fetch(`${this.baseUrl}/api/withdrawals?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get withdrawals');
    }

    return response.json();
  }

  /**
   * Cancel a pending withdrawal
   */
  async cancelWithdrawal(withdrawalId: number): Promise<void> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseUrl}/api/withdrawals/${withdrawalId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to cancel withdrawal');
    }

    return response.json();
  }
}

export const withdrawalService = new WithdrawalService();
