import React, { useState, useEffect, useRef } from 'react';
import { useDepositModal } from '../contexts/DepositModalContext';
import { useAuth } from '../contexts/AuthContext';
import { depositService } from '../services/depositService';
import { getBaseUrl } from '../config/api';

const AddFundsModal: React.FC = () => {
  const { isOpen, closeModal } = useDepositModal();
  const { isAuthenticated } = useAuth();
  
  // Payment method states
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("crypto");
  const [selectedCurrency, setSelectedCurrency] = useState("USDT");
  const [selectedNetwork, setSelectedNetwork] = useState("TRC20");
  const [amount, setAmount] = useState("");
  
  // Deposit states
  const [depositAddress, setDepositAddress] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [explorerUrl, setExplorerUrl] = useState("");
  const [requiredConfirmations, setRequiredConfirmations] = useState(1);
  const [currentConfirmations, setCurrentConfirmations] = useState(0);
  const [depositStatus, setDepositStatus] = useState("pending");
  const [depositId, setDepositId] = useState<number | null>(null);
  const [supportedAssets, setSupportedAssets] = useState<any[]>([
    { asset: "USDT", networks: ["TRC20", "Ethereum", "Polygon", "BSC"], memo_required: false },
    { asset: "USDC", networks: ["Ethereum", "Polygon", "Base", "BSC"], memo_required: false },
    { asset: "BNB", networks: ["BSC"], memo_required: false },
    { asset: "TRX", networks: ["TRON"], memo_required: false },
    { asset: "BTC", networks: ["Bitcoin"], memo_required: false }
  ]);
  
  // Cash payment states
  const [selectedCashMethod, setSelectedCashMethod] = useState("VISA");
  const [email, setEmail] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  
  // UI states
  const [fundLoading, setFundLoading] = useState(false);
  const [fundError, setFundError] = useState("");
  const [fundSuccess, setFundSuccess] = useState("");
  const [paymentErrors, setPaymentErrors] = useState<any>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Fetch supported assets on mount
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchSupportedAssets();
    }
  }, [isOpen, isAuthenticated]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setFundError("");
      setFundSuccess("");
      setDepositAddress("");
      setQrCode("");
      setExplorerUrl("");
      setDepositId(null);
      setDepositStatus("pending");
      setCurrentConfirmations(0);
      setSelectedPaymentMethod("crypto");
      setSelectedCurrency("USDT");
      setSelectedNetwork("TRC20");
    }
  }, [isOpen]);

  const fetchSupportedAssets = async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/deposits/supported-assets`);
      if (response.ok) {
        const assets = await response.json();
        setSupportedAssets(assets);
      }
    } catch (error) {
      console.error('Failed to fetch supported assets:', error);
    }
  };

  const getNetworksForAsset = (asset: string) => {
    const assetData = supportedAssets.find(a => a.asset === asset);
    return assetData ? assetData.networks : [];
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
    try {
      setFundLoading(true);
      setFundError("");
      setFundSuccess("");
      
      // Validate amount
      if (!amount || parseFloat(amount) <= 0) {
        setFundError("Please enter a valid deposit amount");
        return;
      }

      // Use the deposit service
      const depositResponse = await depositService.initiateDeposit({
        asset: selectedCurrency,
        network: selectedNetwork === "TRC20" ? "TRC20" : selectedNetwork, // Normalize TRC20
        amount_usd: parseFloat(amount)
      });

      // Set deposit details
      setDepositAddress(depositResponse.address);
      setQrCode(depositResponse.qr_code);
      setExplorerUrl(depositResponse.explorer_url);
      setDepositId(depositResponse.id);
      setDepositStatus(depositResponse.status);
      setRequiredConfirmations(depositResponse.required_confirmations);
      
      setFundSuccess(`Deposit address generated! Send ${selectedCurrency} to this address.`);
      
      // Close modal after showing success - user can see deposit in history
      setTimeout(() => {
        closeModal();
      }, 2000);
      
    } catch (error: any) {
      console.error('Deposit initiation error:', error);
      setFundError(`Failed to initiate deposit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFundLoading(false);
    }
  };

  const processCashPayment = async () => {
    // Cash payment processing logic (Stripe integration)
    setIsProcessingPayment(true);
    setFundError("");
    setFundSuccess("");
    
    // TODO: Implement Stripe payment processing
    setTimeout(() => {
      setFundError("Cash payment processing is not yet implemented");
      setIsProcessingPayment(false);
    }, 1000);
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-black/80 via-black/70 to-blue-900/30 backdrop-blur-sm flex items-center justify-center z-[100000] p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
    >
      <div 
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-blue-500/30 rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto backdrop-blur-xl transform transition-all duration-300 scale-100 hover:scale-[1.01]"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 80px rgba(59, 130, 246, 0.1)'
        }}
      >
        {/* Header with gradient */}
        <div className="relative p-6 border-b border-blue-500/20 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 backdrop-blur-sm"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Add Funds</h3>
                <p className="text-xs text-gray-400 mt-0.5">Choose your preferred payment method</p>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-all duration-200 group"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Payment Method Tabs */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedPaymentMethod("crypto")}
              className={`relative flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-semibold transition-all duration-300 text-sm group overflow-hidden ${
                selectedPaymentMethod === "crypto"
                  ? "bg-gradient-to-br from-yellow-500 to-orange-500 text-black shadow-lg shadow-yellow-500/30"
                  : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 border border-gray-700/50"
              }`}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                selectedPaymentMethod === "crypto" ? "" : "bg-gradient-to-br from-yellow-500/10 to-orange-500/10"
              }`}></div>
              <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <div className="flex flex-col items-start relative z-10">
                <span className="font-bold">Cryptocurrency</span>
                <span className="text-xs opacity-70">BTC, ETH, USDT +9</span>
              </div>
              {selectedPaymentMethod === "crypto" && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
            <button
              onClick={() => setSelectedPaymentMethod("cash")}
              className={`relative flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-semibold transition-all duration-300 text-sm group overflow-hidden ${
                selectedPaymentMethod === "cash"
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                  : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 border border-gray-700/50"
              }`}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                selectedPaymentMethod === "cash" ? "" : "bg-gradient-to-br from-blue-500/10 to-indigo-500/10"
              }`}></div>
              <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <div className="flex flex-col items-start relative z-10">
                <span className="font-bold">Card/Bank</span>
                <span className="text-xs opacity-70">Visa, PayPal, Wire</span>
              </div>
              {selectedPaymentMethod === "cash" && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          {selectedPaymentMethod === "crypto" && (
            <>
              {/* Popular Cryptocurrencies */}
              <div className="mb-4">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {supportedAssets.slice(0, 6).map((asset) => (
                    <button
                      key={asset.asset}
                      onClick={() => {
                        setSelectedCurrency(asset.asset);
                        const networks = getNetworksForAsset(asset.asset);
                        if (networks.length > 0) {
                          setSelectedNetwork(networks[0]);
                        }
                      }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                        selectedCurrency === asset.asset
                          ? "bg-yellow-500 text-black"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
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

                {/* Amount Input */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Amount (USD)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      paymentErrors.amount ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {paymentErrors.amount && (
                    <p className="text-red-400 text-xs mt-1">{paymentErrors.amount}</p>
                  )}
                </div>

                {/* Currency and Network Dropdowns */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Choose Currency</label>
                    <div className="relative">
                      <select
                        value={selectedCurrency}
                        onChange={(e) => {
                          setSelectedCurrency(e.target.value);
                          const networks = getNetworksForAsset(e.target.value);
                          if (networks.length > 0) {
                            setSelectedNetwork(networks[0]);
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                      >
                        {supportedAssets.map((asset) => (
                          <option key={asset.asset} value={asset.asset}>
                            {asset.asset}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <img 
                          src={`/assets/deposit_ico/${selectedCurrency}.svg`} 
                          alt={selectedCurrency}
                          className="w-4 h-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Choose Network</label>
                    <select
                      value={selectedNetwork}
                      onChange={(e) => setSelectedNetwork(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {getNetworksForAsset(selectedCurrency).map((network: string) => (
                        <option key={network} value={network}>
                          {network}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Warnings and Info */}
              <div className="space-y-3 mb-4">
                {/* Network Warning */}
                <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-red-400 text-xs">
                    <strong>Important:</strong> Only send {selectedCurrency} on {selectedNetwork} network. Wrong network deposits may be lost!
                  </p>
                </div>

                {/* Minimum Deposit Warning */}
                <div className="flex items-center gap-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <img src="/assets/deposit_ico/alarm.svg" alt="Warning" className="w-4 h-4" />
                  <p className="text-yellow-400 text-xs">
                    Minimum Deposit {selectedCurrency} {getMinDeposit(selectedCurrency)}
                  </p>
                </div>

                {/* Transaction Info */}
                <div className="flex items-center gap-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                  <p className="text-blue-400 text-xs">
                    {selectedCurrency} transaction requires {requiredConfirmations} confirmation{requiredConfirmations > 1 ? 's' : ''} on blockchain.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="space-y-2">
                <button
                  onClick={initiateCryptoDeposit}
                  disabled={fundLoading || !amount}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {fundLoading ? "Generating Address..." : "Generate Deposit Address"}
                </button>
              </div>
            </>
          )}

          {selectedPaymentMethod === "cash" && (
            <>
              {/* Cash Payment Methods */}
              <div className="mb-4">
                <div className="flex gap-2 mb-3">
                  {["VISA", "Mastercard", "PayPal", "Bank Transfer"].map((method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedCashMethod(method)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                        selectedCashMethod === method
                          ? "bg-yellow-500 text-black"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {method === "VISA" && (
                        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">V</span>
                        </div>
                      )}
                      {method === "Mastercard" && (
                        <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">M</span>
                        </div>
                      )}
                      {method === "PayPal" && (
                        <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">P</span>
                        </div>
                      )}
                      {method === "Bank Transfer" && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      )}
                      <span>{method}</span>
                    </button>
                  ))}
                </div>

                {/* Amount Input */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Amount (USD)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Payment Details Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-white mb-3">
                  {selectedCashMethod} Payment Details
                </h4>
                
                {/* Simplified cash payment form */}
                <div className="space-y-3">
                  <p className="text-gray-400 text-xs">
                    Cash payment processing will be available soon. Please use cryptocurrency for now.
                  </p>
                </div>
              </div>

              {/* Confirm Payment Button */}
              <button
                onClick={processCashPayment}
                disabled={isProcessingPayment || !amount}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
              >
                {isProcessingPayment ? "Processing..." : `Confirm ${selectedCashMethod} Payment`}
              </button>
            </>
          )}

          {/* Error/Success Messages */}
          {fundError && (
            <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-400 text-xs">{fundError}</p>
              </div>
            </div>
          )}

          {fundSuccess && (
            <div className="mb-3 p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-400 text-xs">{fundSuccess}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFundsModal;
