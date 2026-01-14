import { describe, it, expect, beforeEach, vi } from 'vitest';
import { depositService } from '../depositService';
import { getBaseUrl } from '../../config/api';

// Mock the API base URL
vi.mock('../../config/api', () => ({
  getBaseUrl: vi.fn(() => 'http://localhost:5001'),
}));

describe('DepositService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('initiateDeposit', () => {
    it('should successfully initiate a deposit', async () => {
      const mockResponse = {
        id: 1,
        asset: 'USDT',
        network: 'TRC20',
        address: 'TTest123...',
        memo: undefined,
        amount_usd: 100,
        qr_code: 'data:image/png;base64,...',
        explorer_url: 'https://tronscan.org/#/transaction/...',
        required_confirmations: 2,
        expires_at: '2024-12-31T23:59:59Z',
        status: 'pending',
      };

      localStorage.setItem('token', 'test-token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await depositService.initiateDeposit({
        asset: 'USDT',
        network: 'TRC20',
        amount_usd: 100,
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('http://localhost:5001/api/deposits/initiate');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
      // Check that token was retrieved from localStorage
      expect(localStorage.getItem('token')).toBe('test-token');
      expect(callArgs[1].headers['Authorization']).toBe('Bearer test-token');
      expect(JSON.parse(callArgs[1].body)).toEqual({
        asset: 'USDT',
        network: 'TRC20',
        amount_usd: 100,
      });
    });

    it('should throw error when API returns error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Insufficient balance' }),
      });

      localStorage.setItem('token', 'test-token');

      await expect(
        depositService.initiateDeposit({
          asset: 'USDT',
          network: 'TRC20',
          amount_usd: 100,
        })
      ).rejects.toThrow('Insufficient balance');
    });

    it('should throw error when token is missing', async () => {
      localStorage.removeItem('token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Unauthorized' }),
      });

      await expect(
        depositService.initiateDeposit({
          asset: 'USDT',
          network: 'TRC20',
          amount_usd: 100,
        })
      ).rejects.toThrow();
    });
  });

  describe('getDepositStatus', () => {
    it('should successfully get deposit status', async () => {
      const mockResponse = {
        id: 1,
        status: 'confirmed',
        confirmations: 2,
        required_confirmations: 2,
        tx_hash: '0x123...',
        expires_at: '2024-12-31T23:59:59Z',
        settled_at: '2024-12-31T12:00:00Z',
      };

      localStorage.setItem('token', 'test-token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await depositService.getDepositStatus(1);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('http://localhost:5001/api/deposits/1');
      expect(callArgs[1].method).toBe('GET');
      expect(localStorage.getItem('token')).toBe('test-token');
      expect(callArgs[1].headers['Authorization']).toBe('Bearer test-token');
    });

    it('should throw error when deposit not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Deposit not found' }),
      });

      localStorage.setItem('token', 'test-token');

      await expect(depositService.getDepositStatus(999)).rejects.toThrow(
        'Deposit not found'
      );
    });
  });

  describe('getDepositHistory', () => {
    it('should successfully get deposit history', async () => {
      const mockResponse = [
        {
          id: 1,
          asset: 'USDT',
          network: 'TRC20',
          address: 'TTest123...',
          amount_usd: 100,
          status: 'settled',
          confirmations: 2,
          required_confirmations: 2,
          created_at: '2024-12-01T00:00:00Z',
          updated_at: '2024-12-01T00:05:00Z',
          expires_at: '2024-12-31T23:59:59Z',
        },
      ];

      localStorage.setItem('token', 'test-token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await depositService.getDepositHistory(50, 0);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('http://localhost:5001/api/deposits/history?limit=50&offset=0');
      expect(callArgs[1].method).toBe('GET');
      expect(localStorage.getItem('token')).toBe('test-token');
      expect(callArgs[1].headers['Authorization']).toBe('Bearer test-token');
    });

    it('should use default pagination parameters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      localStorage.setItem('token', 'test-token');

      await depositService.getDepositHistory();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/deposits/history?limit=50&offset=0',
        expect.any(Object)
      );
    });
  });

  describe('getSupportedAssets', () => {
    it('should successfully get supported assets', async () => {
      const mockResponse = [
        {
          asset: 'USDT',
          networks: ['TRC20', 'Ethereum', 'Polygon', 'BSC'],
          memo_required: false,
        },
        {
          asset: 'USDC',
          networks: ['Ethereum', 'Polygon', 'Base', 'BSC'],
          memo_required: false,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await depositService.getSupportedAssets();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/deposits/supported-assets'
      );
    });

    it('should throw error when API fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(depositService.getSupportedAssets()).rejects.toThrow(
        'Failed to get supported assets'
      );
    });
  });
});
