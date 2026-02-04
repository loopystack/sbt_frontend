/**
 * Wallet Service
 * Handles wallet balance operations including unified balance (Stripe + Crypto)
 */
import { getBaseUrl } from '../config/api';

export interface UnifiedBalanceResponse {
  total_balance_usd: string;
  total_available_usd: string;
  total_reserved_usd: string;
  breakdown: {
    fiat: {
      amount: string;
      currency: string;
      source: string;
      available: string;
      reserved: string;
    };
    crypto: {
      asset: string;
      amount: string;
      available: string;
      reserved: string;
      usd_equivalent: string;
      usd_available: string;
      usd_reserved: string;
      source: string;
      usd_price: string;
    };
  };
  currency: string;
}

export interface CryptoBalanceResponse {
  asset: string;
  available: string;
  reserved: string;
  total: string;
}

class WalletService {
  private baseUrl = getBaseUrl();

  /**
   * Get unified total balance (Stripe + Crypto)
   */
  async getTotalBalance(): Promise<UnifiedBalanceResponse> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const response = await fetch(`${this.baseUrl}/api/wallet/total-balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get total balance');
    }

    return response.json();
  }

  /**
   * Get crypto balance for specific asset
   */
  async getCryptoBalance(asset: string = 'USDT'): Promise<CryptoBalanceResponse> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const response = await fetch(`${this.baseUrl}/api/wallet/balance?asset=${asset}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get crypto balance');
    }

    return response.json();
  }

  /**
   * Get wallet transactions (ledger)
   */
  async getTransactions(asset?: string, limit: number = 100, offset: number = 0) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    if (asset) {
      params.append('asset', asset);
    }

    const response = await fetch(`${this.baseUrl}/api/wallet/transactions?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get transactions');
    }

    return response.json();
  }
}

export const walletService = new WalletService();
