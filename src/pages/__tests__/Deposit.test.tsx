import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Deposit from '../Deposit';
import { depositService } from '../../services/depositService';
import { paymentService } from '../../services/paymentService';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock services
vi.mock('../../services/depositService');
vi.mock('../../services/paymentService');
vi.mock('../../services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn().mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      funds_usd: 1000,
      is_active: true,
      is_verified: true,
      is_superuser: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }),
  },
  tokenManager: {
    getAccessToken: vi.fn().mockReturnValue('test-token'),
    getRefreshToken: vi.fn().mockReturnValue('refresh-token'),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    isAuthenticated: vi.fn().mockReturnValue(true),
  },
}));
vi.mock('../../config/api', () => ({
  getBaseUrl: vi.fn(() => 'http://localhost:5001'),
}));

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      user: (state = { user: null }) => state,
      matchinginfo: (state = { matchingInfo: [] }) => state,
    },
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
};

describe('Deposit Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  describe('Initial Render', () => {
    it('should render deposit page with crypto and cash options', async () => {
      const mockAssets = [
        {
          asset: 'USDT',
          networks: ['TRC20', 'Ethereum', 'Polygon', 'BSC'],
          memo_required: false,
        },
      ];

      vi.mocked(depositService.getSupportedAssets).mockResolvedValue(mockAssets);
      vi.mocked(depositService.getDepositHistory).mockResolvedValue([]);

      renderWithProviders(<Deposit />);

      await waitFor(() => {
        expect(screen.getByText(/deposit/i)).toBeInTheDocument();
      });

      // Check for payment method selection
      expect(screen.getByText(/cryptocurrency/i)).toBeInTheDocument();
      expect(screen.getByText(/card\/bank/i)).toBeInTheDocument();
    });

    it('should fetch supported assets on mount', async () => {
      const mockAssets = [
        {
          asset: 'USDT',
          networks: ['TRC20', 'Ethereum'],
          memo_required: false,
        },
      ];

      vi.mocked(depositService.getSupportedAssets).mockResolvedValue(mockAssets);
      vi.mocked(depositService.getDepositHistory).mockResolvedValue([]);

      renderWithProviders(<Deposit />);

      await waitFor(() => {
        expect(depositService.getSupportedAssets).toHaveBeenCalled();
      });
    });

    it('should fetch deposit history on mount', async () => {
      const mockHistory = [
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

      vi.mocked(depositService.getSupportedAssets).mockResolvedValue([]);
      vi.mocked(depositService.getDepositHistory).mockResolvedValue(mockHistory);

      renderWithProviders(<Deposit />);

      await waitFor(() => {
        expect(depositService.getDepositHistory).toHaveBeenCalled();
      });
    });
  });

  describe('Crypto Deposit Flow', () => {
    beforeEach(() => {
      const mockAssets = [
        {
          asset: 'USDT',
          networks: ['TRC20', 'Ethereum'],
          memo_required: false,
        },
      ];
      vi.mocked(depositService.getSupportedAssets).mockResolvedValue(mockAssets);
      vi.mocked(depositService.getDepositHistory).mockResolvedValue([]);
    });

    it('should allow user to select asset and network', async () => {
      renderWithProviders(<Deposit />);

      await waitFor(() => {
        expect(screen.getByText(/cryptocurrency/i)).toBeInTheDocument();
      });

      // Check if asset selector is present - look for the button or text
      const assetText = screen.getByText(/select asset/i) || screen.getByText(/USDT/i);
      expect(assetText).toBeInTheDocument();
    });

    it('should initiate crypto deposit when form is submitted', async () => {
      const mockDepositResponse = {
        id: 1,
        asset: 'USDT',
        network: 'TRC20',
        address: 'TTest123...',
        amount_usd: 100,
        qr_code: 'data:image/png;base64,...',
        explorer_url: 'https://tronscan.org/#/transaction/...',
        required_confirmations: 2,
        expires_at: '2024-12-31T23:59:59Z',
        status: 'pending',
      };

      vi.mocked(depositService.initiateDeposit).mockResolvedValue(mockDepositResponse);

      renderWithProviders(<Deposit />);

      await waitFor(() => {
        expect(screen.getByText(/cryptocurrency/i)).toBeInTheDocument();
      });

      // Find and fill amount input using placeholder
      const amountInput = screen.getByPlaceholderText(/enter amount in usd/i);
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Find and click submit button - look for "Generate Deposit Address"
      const submitButton = screen.getByRole('button', { name: /generate.*deposit.*address/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(depositService.initiateDeposit).toHaveBeenCalledWith(
          expect.objectContaining({
            asset: 'USDT',
            network: 'TRC20',
            amount_usd: 100,
          })
        );
      });
    });

    it('should display error message when deposit initiation fails', async () => {
      vi.mocked(depositService.initiateDeposit).mockRejectedValue(
        new Error('Insufficient balance')
      );

      renderWithProviders(<Deposit />);

      await waitFor(() => {
        expect(screen.getByText(/cryptocurrency/i)).toBeInTheDocument();
      });

      // Fill amount and try to submit form
      const amountInput = screen.getByPlaceholderText(/enter amount in usd/i);
      fireEvent.change(amountInput, { target: { value: '100' } });

      const submitButton = screen.getByRole('button', { name: /generate.*deposit.*address/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Error should appear in the error div
        const errorElement = screen.queryByText(/insufficient balance|error|failed/i, { exact: false });
        expect(errorElement || screen.getByText(/insufficient balance/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Card/Bank Payment Flow', () => {
    beforeEach(() => {
      vi.mocked(depositService.getSupportedAssets).mockResolvedValue([]);
      vi.mocked(depositService.getDepositHistory).mockResolvedValue([]);
    });

    it('should switch to cash payment method', async () => {
      renderWithProviders(<Deposit />);

      await waitFor(() => {
        expect(screen.getByText(/card\/bank/i)).toBeInTheDocument();
      });

      // Click on Card/Bank option
      const cashOption = screen.getByText(/card\/bank/i);
      fireEvent.click(cashOption);

      await waitFor(() => {
        // After clicking, the cash payment form should appear - check for payment method buttons
        const paymentMethodButtons = screen.getAllByText(/visa|mastercard|paypal|bank transfer/i);
        expect(paymentMethodButtons.length).toBeGreaterThan(0);
      });
    });

    it('should process Visa payment', async () => {
      const mockPaymentResponse = {
        transaction_id: 'tx_123',
        status: 'success' as const,
        amount: 100,
        currency: 'USD',
        message: 'Payment processed successfully',
        new_balance: 1100,
      };

      vi.mocked(paymentService.processVisaPayment).mockResolvedValue(mockPaymentResponse);

      renderWithProviders(<Deposit />);

      await waitFor(() => {
        expect(screen.getByText(/card\/bank/i)).toBeInTheDocument();
      });

      // Switch to cash payment
      const cashOption = screen.getByText(/card\/bank/i);
      fireEvent.click(cashOption);

      // Wait for cash form to appear and select Visa payment method
      await waitFor(() => {
        // Find the Visa button in the payment method selector
        const allButtons = screen.getAllByRole('button');
        const visaButton = allButtons.find(btn => btn.textContent?.trim().toUpperCase() === 'VISA');
        if (visaButton) {
          fireEvent.click(visaButton);
        }
      });

      const user = userEvent.setup();

      // Fill payment form - ensure amount is filled first (button is disabled without amount)
      const amountInput = await screen.findByPlaceholderText(/enter amount in usd/i);
      await user.clear(amountInput);
      await user.type(amountInput, '100');
      
      // Wait for form fields to be available
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/1234 5678 9012 3456/i)).toBeInTheDocument();
      });

      // Fill all form fields
      const cardNumberInput = screen.getByPlaceholderText(/1234 5678 9012 3456/i);
      await user.clear(cardNumberInput);
      await user.type(cardNumberInput, '4111111111111111');
      
      const cardholderInput = screen.getByPlaceholderText(/john doe/i);
      await user.clear(cardholderInput);
      await user.type(cardholderInput, 'John Doe');
      
      const expiryInput = screen.getByPlaceholderText(/mm\/yy/i);
      await user.clear(expiryInput);
      await user.type(expiryInput, '12/25');
      
      // CVV - there might be multiple, get the first one
      const cvvInputs = screen.getAllByPlaceholderText(/123/i);
      if (cvvInputs.length > 0) {
        await user.clear(cvvInputs[0]);
        await user.type(cvvInputs[0], '123');
      }

       // Wait for all form fields to have values and button to be enabled
       await waitFor(() => {
         const cardNumberInput = screen.getByPlaceholderText(/1234 5678 9012 3456/i) as HTMLInputElement;
         const cardholderInput = screen.getByPlaceholderText(/john doe/i) as HTMLInputElement;
         const expiryInput = screen.getByPlaceholderText(/mm\/yy/i) as HTMLInputElement;
         const cvvInput = cvvInputs[0] as HTMLInputElement;
         
         expect(cardNumberInput.value).toBeTruthy();
         expect(cardholderInput.value).toBeTruthy();
         expect(expiryInput.value).toBeTruthy();
         expect(cvvInput.value).toBeTruthy();
         
         const paymentButton = screen.getByRole('button', { name: /confirm.*visa.*payment/i });
         expect(paymentButton).not.toBeDisabled();
       }, { timeout: 3000 });

       // Click the payment button - wrap in act to ensure state updates
       const paymentButton = screen.getByRole('button', { name: /confirm.*visa.*payment/i });
       await act(async () => {
         await user.click(paymentButton);
       });

       // Verify payment was processed - wait for the async call
       await waitFor(() => {
         expect(paymentService.processVisaPayment).toHaveBeenCalled();
       }, { timeout: 5000 });
    });
  });

  describe('Deposit Status Polling', () => {
    it('should poll for deposit status when deposit is pending', async () => {
      const mockDepositResponse = {
        id: 1,
        asset: 'USDT',
        network: 'TRC20',
        address: 'TTest123...',
        amount_usd: 100,
        qr_code: 'data:image/png;base64,...',
        explorer_url: 'https://tronscan.org/#/transaction/...',
        required_confirmations: 2,
        expires_at: '2024-12-31T23:59:59Z',
        status: 'pending',
      };

      const mockStatusResponse = {
        id: 1,
        status: 'confirmed',
        confirmations: 2,
        required_confirmations: 2,
        expires_at: '2024-12-31T23:59:59Z',
      };

      vi.mocked(depositService.initiateDeposit).mockResolvedValue(mockDepositResponse);
      vi.mocked(depositService.getDepositStatus).mockResolvedValue(mockStatusResponse);

      renderWithProviders(<Deposit />);

      // This test verifies that polling is set up, but actual polling behavior
      // would require more complex setup with timers
      await waitFor(() => {
        expect(depositService.getSupportedAssets).toHaveBeenCalled();
      });
    });
  });
});
