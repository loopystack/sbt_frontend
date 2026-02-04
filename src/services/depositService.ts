/**
 * Deposit Service
 * Service for handling deposit operations
 */
import { getBaseUrl } from '../config/api';

export interface DepositIntentCreate {
  asset: string;
  network: string;
  amount_usd: number;
}

export interface DepositIntentResponse {
  id: number;
  asset: string;
  network: string;
  address: string;
  memo?: string;
  amount_usd: number;
  qr_code: string;
  explorer_url: string;
  required_confirmations: number;
  expires_at: string;
  status: string;
}

export interface DepositStatusResponse {
  id: number;
  status: string;
  confirmations: number;
  required_confirmations: number;
  tx_hash?: string;
  expires_at: string;
  settled_at?: string;
}

export interface DepositHistoryItem {
  id: number;
  asset: string;
  network: string;
  address: string;
  amount_usd: number;
  amount_crypto?: number;
  status: string;
  confirmations: number;
  required_confirmations: number;
  tx_hash?: string;
  created_at: string;
  updated_at: string;
  detected_at?: string;
  confirmed_at?: string;
  settled_at?: string;
  expires_at: string;
}

export interface CryptoAsset {
  asset: string;
  networks: string[];
  memo_required: boolean;
}

class DepositService {
  private baseUrl = getBaseUrl();

  /**
   * Create a new deposit intent
   */
  async initiateDeposit(data: DepositIntentCreate): Promise<DepositIntentResponse> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const response = await fetch(`${this.baseUrl}/api/deposits/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to initiate deposit');
    }

    return response.json();
  }

  /**
   * Get deposit status by ID
   */
  async getDepositStatus(depositId: number): Promise<DepositStatusResponse> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const response = await fetch(`${this.baseUrl}/api/deposits/${depositId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get deposit status');
    }

    return response.json();
  }

  /**
   * Get deposit history
   */
  async getDepositHistory(limit: number = 50, offset: number = 0): Promise<DepositHistoryItem[]> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const response = await fetch(`${this.baseUrl}/api/deposits/history?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get deposit history');
    }

    return response.json();
  }

  /**
   * Get supported crypto assets
   */
  async getSupportedAssets(): Promise<CryptoAsset[]> {
    const response = await fetch(`${this.baseUrl}/api/deposits/supported-assets`);
    
    if (!response.ok) {
      throw new Error('Failed to get supported assets');
    }

    return response.json();
  }
}

export const depositService = new DepositService();
