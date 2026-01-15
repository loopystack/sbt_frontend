/**
 * Deposit Page
 * Enhanced with both Crypto and Card/Bank (Stripe) payment options
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { depositService, DepositHistoryItem, DepositStatusResponse } from '../services/depositService';
import { paymentService, CardPaymentRequest, BankTransferRequest, PayPalPaymentRequest } from '../services/paymentService';
import { transactionService, Transaction } from '../services/transactionService';
import { getBaseUrl } from '../config/api';

const Deposit: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  
  // Payment method selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'crypto' | 'cash'>('crypto');
  
  // Crypto deposit states
  const [amount, setAmount] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<string>('USDT');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('TRC20');
  const [depositAddress, setDepositAddress] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [explorerUrl, setExplorerUrl] = useState<string>('');
  const [currentDepositId, setCurrentDepositId] = useState<number | null>(null);
  const [depositStatus, setDepositStatus] = useState<string>('');
  const [confirmations, setConfirmations] = useState<number>(0);
  const [requiredConfirmations, setRequiredConfirmations] = useState<number>(2);
  const [txHash, setTxHash] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [supportedAssets, setSupportedAssets] = useState<any[]>([
    { asset: "USDT", networks: ["TRC20"], memo_required: false },  // Only TRC20 for USDT
    { asset: "USDC", networks: ["Ethereum", "Polygon", "Base", "BSC"], memo_required: false },
    { asset: "BNB", networks: ["BSC"], memo_required: false },
    { asset: "TRX", networks: ["TRC20"], memo_required: false },  // TRX uses TRC20 network
    { asset: "BTC", networks: ["Bitcoin"], memo_required: false }
  ]);
  
  // Note: This is the fallback. The actual networks come from the API via fetchSupportedAssets()
  
  // Cash payment states
  const [selectedCashMethod, setSelectedCashMethod] = useState<string>('VISA');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardholderName, setCardholderName] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [routingNumber, setRoutingNumber] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  
  // UI states
  const [history, setHistory] = useState<DepositHistoryItem[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [polling, setPolling] = useState<boolean>(false);
  const [paymentErrors, setPaymentErrors] = useState<any>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Sorting states
  const [sortColumn, setSortColumn] = useState<'id' | 'type' | null>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch deposit history and supported assets on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
      fetchSupportedAssets();
    }
  }, [isAuthenticated]);

  // Week 6 Day 5: Poll for deposit status and history until settled
  useEffect(() => {
    if (!currentDepositId || !polling) return;

    // Stop polling if deposit is settled, failed, or expired
    const finalStatuses = ['settled', 'failed', 'expired'];
    if (finalStatuses.includes(depositStatus)) {
      setPolling(false);
      // Refresh history one final time when settled
      if (depositStatus === 'settled') {
        fetchHistory();
      }
      return;
    }

    // Poll every 5-10 seconds (using 7 seconds as middle ground)
    const interval = setInterval(() => {
      checkDepositStatus(currentDepositId);
      // Also refresh history to show latest status
      fetchHistory();
    }, 7000); // Poll every 7 seconds

    return () => clearInterval(interval);
  }, [currentDepositId, depositStatus, polling]);

  const fetchHistory = async () => {
    try {
      // Fetch crypto deposits
      const deposits = await depositService.getDepositHistory(50, 0);
      setHistory(deposits);
      
      // Fetch payment transactions (Stripe, PayPal, Bank Transfer) - all statuses
      const transactions = await transactionService.getTransactions(1, 50, 'deposit');
      setPaymentHistory(transactions.transactions);
    } catch (err) {
      console.error('Failed to fetch deposit history:', err);
    }
  };

  const fetchSupportedAssets = async () => {
    try {
      const assets = await depositService.getSupportedAssets();
      // Filter networks: For USDT, only allow TRC20 (remove Ethereum, Polygon, BSC, etc.)
      const filteredAssets = assets.map(asset => {
        if (asset.asset === 'USDT') {
          return {
            ...asset,
            networks: asset.networks.filter(n => n === 'TRC20' || n === 'TRON').map(n => n === 'TRON' ? 'TRC20' : n)
          };
        }
        return asset;
      });
      setSupportedAssets(filteredAssets);
      // Ensure TRC20 is selected if USDT is selected
      if (selectedAsset === 'USDT') {
        setSelectedNetwork('TRC20');
      }
    } catch (error) {
      console.error('Failed to fetch supported assets:', error);
      // Keep the default hardcoded values if API fails, but ensure USDT only has TRC20
      const fallbackAssets = supportedAssets.map(asset => {
        if (asset.asset === 'USDT') {
          return { ...asset, networks: ['TRC20'] };
        }
        return asset;
      });
      setSupportedAssets(fallbackAssets);
    }
  };

  const getNetworksForAsset = (asset: string) => {
    const assetData = supportedAssets.find(a => a.asset === asset);
    if (!assetData) return [];
    // For USDT, only return TRC20 (filter out any other networks)
    if (asset === 'USDT') {
      return assetData.networks.filter((n: string) => n === 'TRC20' || n === 'TRON').map((n: string) => n === 'TRON' ? 'TRC20' : n);
    }
    return assetData.networks;
  };

  const getMinDeposit = (currency: string) => {
    const minimums: { [key: string]: string } = {
      USDT: "10",
      USDC: "10",
      BNB: "0.01",
      TRX: "1",
      BTC: "0.00001"
    };
    return minimums[currency] || "0.00001";
  };

  const initiateCryptoDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    if (!isAuthenticated) {
      setError('You must be logged in to deposit');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await depositService.initiateDeposit({
        asset: selectedAsset,
        network: selectedNetwork === "TRC20" ? "TRC20" : selectedNetwork,
        amount_usd: parseFloat(amount)
      });

      setDepositAddress(response.address);
      setQrCode(response.qr_code);
      setExplorerUrl(response.explorer_url);
      setCurrentDepositId(response.id);
      setDepositStatus(response.status);
      setRequiredConfirmations(response.required_confirmations);
      setExpiresAt(response.expires_at);
      setPolling(true);
      
      await fetchHistory();
      setSuccess(`Deposit address generated! Send ${selectedAsset} to this address.`);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate deposit');
    } finally {
      setLoading(false);
    }
  };

  const processCashPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    setIsProcessingPayment(true);
    setError('');
    setSuccess('');
    setPaymentErrors({});

    try {
      const amountNum = parseFloat(amount);

      if (selectedCashMethod === 'VISA' || selectedCashMethod === 'Mastercard') {
        // Validate card fields
        if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
          setPaymentErrors({ general: 'Please fill in all card details' });
          return;
        }

        const [month, year] = expiryDate.split('/');
        const paymentData: CardPaymentRequest = {
          card_type: selectedCashMethod === 'VISA' ? 'visa' : 'mastercard',
          card_number: cardNumber.replace(/\s/g, ''),
          expiry_month: parseInt(month),
          expiry_year: 2000 + parseInt(year),
          cvv: cvv,
          cardholder_name: cardholderName,
          amount: amountNum
        };

        const response = await paymentService.processVisaPayment(paymentData);
        
        if (response.status === 'success') {
          setSuccess(`Payment successful! $${amountNum} has been added to your account.`);
          setAmount('');
          setCardNumber('');
          setCardholderName('');
          setExpiryDate('');
          setCvv('');
          await fetchHistory();
        } else {
          setError(response.message || 'Payment failed');
        }
      } else if (selectedCashMethod === 'PayPal') {
        if (!email) {
          setPaymentErrors({ email: 'Please enter your PayPal email' });
          return;
        }

        const paymentData: PayPalPaymentRequest = {
          email: email,
          amount: amountNum
        };

        const response = await paymentService.processPayPalPayment(paymentData);
        
        if (response.status === 'success') {
          setSuccess(`Payment successful! $${amountNum} has been added to your account.`);
          setAmount('');
          setEmail('');
          await fetchHistory();
        } else {
          setError(response.message || 'Payment failed');
        }
      } else if (selectedCashMethod === 'Bank Transfer') {
        if (!accountNumber || !routingNumber || !accountHolderName) {
          setPaymentErrors({ general: 'Please fill in all bank details' });
          return;
        }

        const paymentData: BankTransferRequest = {
          account_number: accountNumber,
          routing_number: routingNumber,
          account_holder_name: accountHolderName,
          amount: amountNum
        };

        const response = await paymentService.processBankTransfer(paymentData);
        
        if (response.status === 'success') {
          setSuccess(`Bank transfer initiated! $${amountNum} will be added to your account once processed.`);
          setAmount('');
          setAccountNumber('');
          setRoutingNumber('');
          setAccountHolderName('');
          await fetchHistory();
        } else {
          setError(response.message || 'Bank transfer failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const checkDepositStatus = useCallback(async (depositId: number) => {
    try {
      const status: DepositStatusResponse = await depositService.getDepositStatus(depositId);
      setDepositStatus(status.status);
      setConfirmations(status.confirmations);
      setRequiredConfirmations(status.required_confirmations);
      setTxHash(status.tx_hash || '');
      
      // Week 6 Day 5: Stop polling when deposit is settled
      if (status.status === 'settled' || status.settled_at) {
        setSuccess('Deposit confirmed and funds credited to your account!');
        setPolling(false);
        await fetchHistory();
      }
    } catch (err) {
      console.error('Failed to check deposit status:', err);
    }
  }, []);

  const copyAddress = async () => {
    if (depositAddress) {
      try {
        await navigator.clipboard.writeText(depositAddress);
        setSuccess('Address copied to clipboard!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to copy address');
      }
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'detected':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'confirmed':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'settled':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
      case 'expired':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'detected':
        return 'Detected';
      case 'confirmed':
        return 'Confirming';
      case 'settled':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Handle column sorting
  const handleSort = (column: 'id' | 'type') => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Get sorted combined history
  const getSortedHistory = () => {
    // Combine crypto deposits and payment transactions into a unified structure
    const combined: Array<{
      id: number;
      type: 'crypto' | 'card';
      deposit?: DepositHistoryItem;
      payment?: Transaction;
    }> = [
      ...history.map(d => ({ id: d.id, type: 'crypto' as const, deposit: d })),
      ...paymentHistory.map(p => ({ id: p.id, type: 'card' as const, payment: p }))
    ];

    // Sort the combined array
    if (sortColumn === 'id') {
      combined.sort((a, b) => {
        if (sortDirection === 'asc') {
          return a.id - b.id;
        } else {
          return b.id - a.id;
        }
      });
    } else if (sortColumn === 'type') {
      combined.sort((a, b) => {
        const typeA = a.type;
        const typeB = b.type;
        if (sortDirection === 'asc') {
          return typeA.localeCompare(typeB);
        } else {
          return typeB.localeCompare(typeA);
        }
      });
    } else {
      // Default: sort by ID descending (newest first)
      combined.sort((a, b) => b.id - a.id);
    }

    return combined;
  };

  // Sort indicator component
  const SortIndicator = ({ column }: { column: 'id' | 'type' }) => {
    const isActive = sortColumn === column;
    
    if (!isActive) {
      return (
        <span className="ml-2 text-gray-400 opacity-40 group-hover:opacity-70 transition-opacity">
          <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    return (
      <span className="ml-2 text-blue-400">
        {sortDirection === 'asc' ? (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p>Please sign in to deposit funds.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Add Funds</h1>
          <p className="text-gray-400">Choose your preferred payment method</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
            <p className="text-green-400">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Payment Method Tabs */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => {
              setSelectedPaymentMethod('crypto');
              // Clear success message when switching payment methods
              setSuccess('');
            }}
            className={`relative flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-semibold transition-all duration-300 text-sm group overflow-hidden ${
              selectedPaymentMethod === 'crypto'
                ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-black shadow-lg shadow-yellow-500/30'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 border border-gray-700/50'
            }`}
          >
            <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <div className="flex flex-col items-start relative z-10">
              <span className="font-bold">Cryptocurrency</span>
              <span className="text-xs opacity-70">BTC, ETH, USDT +9</span>
            </div>
            {selectedPaymentMethod === 'crypto' && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
          <button
            onClick={() => {
              setSelectedPaymentMethod('cash');
              // Clear success message when switching payment methods
              setSuccess('');
            }}
            className={`relative flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-semibold transition-all duration-300 text-sm group overflow-hidden ${
              selectedPaymentMethod === 'cash'
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 border border-gray-700/50'
            }`}
          >
            <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <div className="flex flex-col items-start relative z-10">
              <span className="font-bold">Card/Bank</span>
              <span className="text-xs opacity-70">Visa, PayPal, Wire</span>
            </div>
            {selectedPaymentMethod === 'cash' && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Crypto Deposit Form */}
          {selectedPaymentMethod === 'crypto' && (
            <>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Create Crypto Deposit</h2>
                
                <div className="space-y-4">
                  {/* Popular Cryptocurrencies */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Asset</label>
                    <div className="flex gap-2 flex-wrap">
                      {supportedAssets.slice(0, 6).map((asset) => (
                        <button
                          key={asset.asset}
                          onClick={() => {
                            setSelectedAsset(asset.asset);
                            const networks = getNetworksForAsset(asset.asset);
                            if (networks.length > 0) {
                              // Always use TRC20 for USDT
                              if (asset.asset === 'USDT') {
                                setSelectedNetwork('TRC20');
                              } else {
                                setSelectedNetwork(networks[0]);
                              }
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                            selectedAsset === asset.asset
                              ? 'bg-yellow-500 text-black'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <img 
                            src={`/assets/deposit_ico/${asset.asset}.svg`} 
                            alt={asset.asset}
                            className="w-5 h-5"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span>{asset.asset}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="Enter amount in USD"
                      disabled={loading || !!depositAddress}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Currency</label>
                      <select
                        value={selectedAsset}
                        onChange={(e) => {
                          setSelectedAsset(e.target.value);
                          const networks = getNetworksForAsset(e.target.value);
                          if (networks.length > 0) {
                            // Always use TRC20 for USDT
                            if (e.target.value === 'USDT') {
                              setSelectedNetwork('TRC20');
                            } else {
                              setSelectedNetwork(networks[0]);
                            }
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        disabled={loading || !!depositAddress}
                      >
                        {supportedAssets.map((asset) => (
                          <option key={asset.asset} value={asset.asset}>
                            {asset.asset}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Network</label>
                      {selectedAsset === 'USDT' && getNetworksForAsset(selectedAsset).length === 1 ? (
                        // If USDT only has TRC20, show it as a read-only field
                        <div className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                          TRC20 (Only supported network)
                        </div>
                      ) : (
                        <select
                          value={selectedNetwork}
                          onChange={(e) => setSelectedNetwork(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                          disabled={loading || !!depositAddress}
                        >
                          {getNetworksForAsset(selectedAsset).map((network: string) => (
                            <option key={network} value={network}>
                              {network}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Warnings */}
                  <div className="space-y-2">
                    {/* Week 6 Day 5: Enhanced warning text for TRC20/USDT */}
                    {(selectedAsset === 'USDT' && selectedNetwork === 'TRC20') ? (
                      <div className="flex items-start gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-red-400 text-sm font-semibold mb-1">⚠️ Critical Warning</p>
                          <p className="text-red-300 text-xs leading-relaxed">
                            <strong>TRC20 only / USDT only:</strong> Only send USDT on the TRC20 network to this address. 
                            Deposits sent on the wrong network (Ethereum, Polygon, BSC, etc.) <strong>cannot be recovered</strong> and will be permanently lost.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-red-400 text-xs">
                          <strong>Important:</strong> Only send {selectedAsset} on {selectedNetwork} network. Wrong network deposits may be lost!
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                      <img src="/assets/deposit_ico/alarm.svg" alt="Warning" className="w-4 h-4" />
                      <p className="text-yellow-400 text-xs">
                        Minimum Deposit {selectedAsset} {getMinDeposit(selectedAsset)}
                      </p>
                    </div>
                  </div>

                  {!depositAddress && (
                    <button
                      onClick={initiateCryptoDeposit}
                      disabled={loading || !amount}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      {loading ? 'Generating Address...' : 'Generate Deposit Address'}
                    </button>
                  )}

                  {depositAddress && (
                    <button
                      onClick={() => {
                        setDepositAddress('');
                        setQrCode('');
                        setCurrentDepositId(null);
                        setDepositStatus('');
                        setPolling(false);
                        setSuccess('');
                        setError('');
                      }}
                      className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Create New Deposit
                    </button>
                  )}
                </div>
              </div>

              {/* Deposit Address & QR Code */}
              {depositAddress && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Deposit Address</h2>
                  
                  <div className="space-y-4">
                    {qrCode && (
                      <div className="flex justify-center mb-4">
                        <img
                          src={`data:image/png;base64,${qrCode}`}
                          alt="Deposit QR Code"
                          className="w-48 h-48 border-2 border-gray-600 rounded-lg p-2 bg-white"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">Deposit Address</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={depositAddress}
                          readOnly
                          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
                        />
                        <button
                          onClick={copyAddress}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {depositStatus && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Status</label>
                        <div className={`px-4 py-2 rounded-lg border ${getStatusColor(depositStatus)}`}>
                          <div className="flex items-center justify-between whitespace-nowrap">
                            <span className="font-medium">{getStatusLabel(depositStatus)}</span>
                            {polling && <span className="text-xs animate-pulse ml-2">Updating...</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    {(depositStatus === 'detected' || depositStatus === 'confirmed') && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Confirmations</label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{confirmations} / {requiredConfirmations}</span>
                            <span className="text-gray-400">
                              {Math.round((confirmations / requiredConfirmations) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min((confirmations / requiredConfirmations) * 100, 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {txHash && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Transaction Hash</label>
                        <a
                          href={explorerUrl || `https://tronscan.org/#/transaction/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm hover:bg-gray-600 transition-colors truncate"
                          title={txHash}
                        >
                          {txHash.substring(0, 20)}...
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Card/Bank Payment Form */}
          {selectedPaymentMethod === 'cash' && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 lg:col-span-2">
              <h2 className="text-xl font-bold mb-4">Card/Bank Payment</h2>
              
              <div className="space-y-4">
                {/* Payment Method Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <div className="flex gap-2 flex-wrap">
                    {['VISA', 'Mastercard', 'PayPal', 'Bank Transfer'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setSelectedCashMethod(method)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                          selectedCashMethod === method
                            ? 'bg-yellow-500 text-black'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {method === 'VISA' && (
                          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">V</span>
                          </div>
                        )}
                        {method === 'Mastercard' && (
                          <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">M</span>
                          </div>
                        )}
                        {method === 'PayPal' && (
                          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">P</span>
                          </div>
                        )}
                        {method === 'Bank Transfer' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        )}
                        <span>{method}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter amount in USD"
                    disabled={isProcessingPayment}
                  />
                </div>

                {/* Card Payment Form */}
                {(selectedCashMethod === 'VISA' || selectedCashMethod === 'Mastercard') && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        disabled={isProcessingPayment}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        disabled={isProcessingPayment}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">Expiry Date</label>
                        <input
                          type="text"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                          disabled={isProcessingPayment}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">CVV</label>
                        <input
                          type="text"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="123"
                          maxLength={4}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                          disabled={isProcessingPayment}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PayPal Form */}
                {selectedCashMethod === 'PayPal' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">PayPal Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      disabled={isProcessingPayment}
                    />
                  </div>
                )}

                {/* Bank Transfer Form */}
                {selectedCashMethod === 'Bank Transfer' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Account Holder Name</label>
                      <input
                        type="text"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        disabled={isProcessingPayment}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="1234567890"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        disabled={isProcessingPayment}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Routing Number</label>
                      <input
                        type="text"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="021000021"
                        maxLength={9}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        disabled={isProcessingPayment}
                      />
                    </div>
                  </div>
                )}

                {/* Payment Info */}
                <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-xs">
                    Processing fee: {selectedCashMethod === 'Bank Transfer' ? '1.5%' : '2.5%'} + $0.30 per transaction
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={processCashPayment}
                  disabled={isProcessingPayment || !amount}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isProcessingPayment ? 'Processing...' : `Confirm ${selectedCashMethod} Payment`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Deposit History */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Deposit History</h2>
            <button
              onClick={fetchHistory}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              Refresh
            </button>
          </div>

          {history.length === 0 && paymentHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No deposit history yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-700/50">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-700/90 to-gray-700/80 backdrop-blur-sm sticky top-0 z-10">
                  <tr>
                    <th 
                      className={`px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none transition-all duration-200 group ${
                        sortColumn === 'id' 
                          ? 'bg-blue-500/20 text-blue-300 border-l-2 border-blue-400' 
                          : 'text-gray-300 hover:bg-gray-600/70 hover:text-white'
                      }`}
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>ID</span>
                        <SortIndicator column="id" />
                      </div>
                    </th>
                    <th 
                      className={`px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none transition-all duration-200 group ${
                        sortColumn === 'type' 
                          ? 'bg-blue-500/20 text-blue-300 border-l-2 border-blue-400' 
                          : 'text-gray-300 hover:bg-gray-600/70 hover:text-white'
                      }`}
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Type</span>
                        <SortIndicator column="type" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Asset/Method</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Network</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Confirmations</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Transaction</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Detected</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Confirmed</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Settled</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30">
                  {getSortedHistory().map((item) => {
                    if (item.type === 'crypto' && item.deposit) {
                      const deposit = item.deposit;
                      return (
                        <tr key={`crypto-${deposit.id}`} className="hover:bg-gray-700/60 transition-colors duration-150 border-b border-gray-700/30">
                          <td className="px-4 py-3 text-sm">{deposit.id}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                              Crypto
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                              {deposit.asset}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">{deposit.network}</td>
                          <td className="px-4 py-3 text-sm">
                            <div>
                              <div className="font-medium">
                                ${deposit.amount_usd.toFixed(2)} USD
                              </div>
                              {deposit.amount_crypto && (
                                <div className="text-xs text-gray-400">
                                  {deposit.amount_crypto.toFixed(6)} {deposit.asset}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium border whitespace-nowrap ${getStatusColor(deposit.status)}`}>
                              {getStatusLabel(deposit.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {deposit.status === 'detected' || deposit.status === 'confirmed' ? (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                deposit.confirmations >= deposit.required_confirmations
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {deposit.confirmations}/{deposit.required_confirmations}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {deposit.tx_hash ? (
                              <a
                                href={`https://tronscan.org/#/transaction/${deposit.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-blue-400 hover:text-blue-300 truncate max-w-[120px] block"
                                title={deposit.tx_hash}
                              >
                                {deposit.tx_hash.substring(0, 12)}...
                              </a>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {formatDate(deposit.created_at)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {deposit.detected_at ? formatDate(deposit.detected_at) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {deposit.confirmed_at ? formatDate(deposit.confirmed_at) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {deposit.settled_at ? formatDate(deposit.settled_at) : '-'}
                          </td>
                        </tr>
                      );
                    } else if (item.type === 'card' && item.payment) {
                      const payment = item.payment;
                      const getPaymentMethodLabel = (method?: string) => {
                        if (!method) return 'Card';
                        if (method.includes('stripe_visa') || method.includes('visa')) return 'Visa';
                        if (method.includes('stripe_mastercard') || method.includes('mastercard')) return 'Mastercard';
                        if (method.includes('paypal')) return 'PayPal';
                        if (method.includes('bank_transfer')) return 'Bank Transfer';
                        return 'Card';
                      };
                      
                      return (
                        <tr key={`payment-${payment.id}`} className="hover:bg-gray-700/60 transition-colors duration-150 border-b border-gray-700/30">
                          <td className="px-4 py-3 text-sm">{payment.id}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                              Card/Bank
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                              {getPaymentMethodLabel(payment.payment_method)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">-</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium">
                              ${payment.amount.toFixed(2)} USD
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium border whitespace-nowrap ${
                              payment.status === 'completed'
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : payment.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              {payment.status === 'completed' ? 'Completed' : payment.status === 'pending' ? 'Pending' : 'Failed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="text-gray-500">-</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {payment.external_reference ? (
                              <span className="font-mono text-xs text-blue-400 truncate max-w-[120px] block" title={payment.external_reference}>
                                {payment.external_reference.substring(0, 12)}...
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {formatDate(payment.created_at)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">-</td>
                          <td className="px-4 py-3 text-sm text-gray-400">-</td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {payment.status === 'completed' ? formatDate(payment.created_at) : '-'}
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Deposit;
