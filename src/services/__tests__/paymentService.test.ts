import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paymentService } from '../paymentService';
import { getBaseUrl } from '../../config/api';

// Mock the API base URL
vi.mock('../../config/api', () => ({
  getBaseUrl: vi.fn(() => 'http://localhost:5001'),
}));

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('processVisaPayment', () => {
    it('should successfully process Visa payment', async () => {
      const mockPaymentData = {
        card_type: 'visa' as const,
        card_number: '4111111111111111',
        expiry_month: 12,
        expiry_year: 2025,
        cvv: '123',
        cardholder_name: 'John Doe',
        amount: 100,
      };

      const mockResponse = {
        transaction_id: 'tx_123',
        status: 'success' as const,
        amount: 100,
        currency: 'USD',
        message: 'Payment processed successfully',
        new_balance: 1000,
        processing_time: 2,
        gateway: 'stripe',
      };

      localStorage.setItem('token', 'test-token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await paymentService.processVisaPayment(mockPaymentData);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('http://localhost:5001/api/payments/process-card');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
      expect(localStorage.getItem('token')).toBe('test-token');
      expect(callArgs[1].headers['Authorization']).toBe('Bearer test-token');
      expect(JSON.parse(callArgs[1].body)).toMatchObject({
        ...mockPaymentData,
        card_type: 'visa',
      });
    });

    it('should handle validation errors', async () => {
      const mockPaymentData = {
        card_type: 'visa' as const,
        card_number: 'invalid',
        expiry_month: 12,
        expiry_year: 2025,
        cvv: '123',
        cardholder_name: 'John Doe',
        amount: 100,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          detail: [{ msg: 'Invalid card number', field: 'card_number' }],
        }),
      });

      localStorage.setItem('token', 'test-token');

      await expect(
        paymentService.processVisaPayment(mockPaymentData)
      ).rejects.toThrow('Invalid card number');
    });

    it('should handle card declined error', async () => {
      const mockPaymentData = {
        card_type: 'visa' as const,
        card_number: '4111111111111111',
        expiry_month: 12,
        expiry_year: 2025,
        cvv: '123',
        cardholder_name: 'John Doe',
        amount: 100,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Card declined' }),
      });

      localStorage.setItem('token', 'test-token');

      await expect(
        paymentService.processVisaPayment(mockPaymentData)
      ).rejects.toThrow('Card declined');
    });
  });

  describe('processMastercardPayment', () => {
    it('should successfully process Mastercard payment', async () => {
      const mockPaymentData = {
        card_type: 'mastercard' as const,
        card_number: '5555555555554444',
        expiry_month: 12,
        expiry_year: 2025,
        cvv: '123',
        cardholder_name: 'Jane Doe',
        amount: 200,
      };

      const mockResponse = {
        transaction_id: 'tx_456',
        status: 'success' as const,
        amount: 200,
        currency: 'USD',
        message: 'Payment processed successfully',
        new_balance: 1200,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      localStorage.setItem('token', 'test-token');

      const result = await paymentService.processMastercardPayment(mockPaymentData);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/payments/process-card',
        expect.objectContaining({
          body: JSON.stringify({
            ...mockPaymentData,
            card_type: 'mastercard',
          }),
        })
      );
    });
  });

  describe('processBankTransfer', () => {
    it('should successfully process bank transfer', async () => {
      const mockPaymentData = {
        account_number: '1234567890',
        routing_number: '987654321',
        account_holder_name: 'John Doe',
        amount: 500,
      };

      const mockResponse = {
        transaction_id: 'tx_789',
        status: 'pending' as const,
        amount: 500,
        currency: 'USD',
        message: 'Bank transfer initiated',
        new_balance: 1500,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      localStorage.setItem('token', 'test-token');

      const result = await paymentService.processBankTransfer(mockPaymentData);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/payments/process-bank-transfer',
        expect.objectContaining({
          body: JSON.stringify(mockPaymentData),
        })
      );
    });
  });

  describe('processPayPalPayment', () => {
    it('should successfully process PayPal payment', async () => {
      const mockPaymentData = {
        email: 'user@example.com',
        amount: 150,
      };

      const mockResponse = {
        transaction_id: 'tx_paypal_123',
        status: 'success' as const,
        amount: 150,
        currency: 'USD',
        message: 'PayPal payment processed',
        new_balance: 1650,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      localStorage.setItem('token', 'test-token');

      const result = await paymentService.processPayPalPayment(mockPaymentData);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPaymentMethods', () => {
    it('should successfully get payment methods', async () => {
      const mockResponse = {
        payment_methods: [
          {
            type: 'visa',
            name: 'Visa',
            min_amount: 10,
            max_amount: 10000,
            currency: 'USD',
            processing_time: 'Instant',
            fees: '2.9% + $0.30',
            available: true,
          },
          {
            type: 'mastercard',
            name: 'Mastercard',
            min_amount: 10,
            max_amount: 10000,
            currency: 'USD',
            processing_time: 'Instant',
            fees: '2.9% + $0.30',
            available: true,
          },
        ],
      };

      localStorage.setItem('token', 'test-token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await paymentService.getPaymentMethods();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('http://localhost:5001/api/payments/payment-methods');
      expect(callArgs[1].method).toBe('GET');
      expect(localStorage.getItem('token')).toBe('test-token');
      expect(callArgs[1].headers['Authorization']).toBe('Bearer test-token');
    });
  });

  describe('confirmCryptoDeposit', () => {
    it('should successfully confirm crypto deposit', async () => {
      const mockDepositData = {
        amount: 100,
        currency: 'USDT',
        transaction_hash: '0x123...',
        deposit_address: 'TTest123...',
        network: 'TRC20',
      };

      const mockResponse = {
        success: true,
        message: 'Deposit confirmed',
        new_balance: 1100,
        transaction_hash: '0x123...',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      localStorage.setItem('token', 'test-token');

      const result = await paymentService.confirmCryptoDeposit(mockDepositData);

      expect(result).toEqual(mockResponse);
    });
  });
});
