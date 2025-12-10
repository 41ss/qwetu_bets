import React, { useState, useEffect } from 'react';
import { X, Smartphone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  phoneNumber: string;
  onSuccess?: () => void;
}

type DepositStatus = 'idle' | 'initiating' | 'waiting' | 'processing' | 'success' | 'failed';

export default function DepositModal({ isOpen, onClose, userId, phoneNumber, onSuccess }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<DepositStatus>('idle');
  const [error, setError] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  
  // Polling interval reference
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Preset amounts
  const presetAmounts = [50, 100, 200, 500, 1000];

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setStatus('idle');
      setError('');
      setCheckoutRequestId('');
      setReceiptNumber('');
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
    }
  }, [isOpen]);

  const handleAmountChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setAmount(numericValue);
    setError('');
  };

  const handlePresetClick = (presetAmount: number) => {
    setAmount(presetAmount.toString());
    setError('');
  };

  const pollTransactionStatus = (requestId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 3 minutes (60 * 3s)

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(`/api/mpesa/status?checkout_request_id=${requestId}`);
        const data = await response.json();

        if (data.status === 'COMPLETED') {
          clearInterval(interval);
          setPollInterval(null);
          
          if (data.isMinted) {
            setStatus('success');
            setReceiptNumber(data.mpesaReceipt || '');
            setTimeout(() => {
              onSuccess?.();
              onClose();
            }, 3000);
          } else {
            setStatus('processing');
          }
        } else if (data.status === 'FAILED' || data.status === 'CANCELLED' || data.status === 'EXPIRED') {
          clearInterval(interval);
          setPollInterval(null);
          setStatus('failed');
          setError(data.message || 'Payment failed. Please try again.');
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPollInterval(null);
          setStatus('failed');
          setError('Payment request timed out. Please try again.');
        }
      } catch (err) {
        console.error('Polling error:', err);
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPollInterval(null);
          setStatus('failed');
          setError('Could not verify payment status. Please contact support.');
        }
      }
    }, 3000); // Poll every 3 seconds

    setPollInterval(interval);
  };

  const handleDeposit = async () => {
    const amountNum = parseInt(amount);

    // Validation
    if (!amount || amountNum < 10) {
      setError('Minimum deposit is KES 10');
      return;
    }

    if (amountNum > 150000) {
      setError('Maximum deposit is KES 150,000');
      return;
    }

    setStatus('initiating');
    setError('');

    try {
      // Initiate STK Push
      const response = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace('+', ''),
          amount: amountNum,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'Failed to initiate payment');
      }

      // Start polling for status
      setCheckoutRequestId(data.checkoutRequestId);
      setStatus('waiting');
      pollTransactionStatus(data.checkoutRequestId);

    } catch (err) {
      console.error('Deposit error:', err);
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Payment initiation failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
            disabled={status === 'initiating' || status === 'waiting'}
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full">
              <Smartphone className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Deposit Funds</h2>
              <p className="text-white/90 text-sm">via M-Pesa</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {status === 'idle' || status === 'initiating' ? (
            <>
              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black font-semibold">
                    KES
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0"
                    className="w-full pl-16 pr-4 py-4 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition text-black"
                    disabled={status === 'initiating'}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Min: KES 10 • Max: KES 150,000
                </p>
              </div>

              {/* Preset Amounts */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Quick amounts:</p>
                <div className="grid grid-cols-5 gap-2">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick(preset)}
                      className={`py-2 rounded-lg text-sm font-medium transition ${
                        amount === preset.toString()
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      disabled={status === 'initiating'}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>How it works:</strong>
                  <br />
                  1. Enter amount and tap "Pay with M-Pesa"
                  <br />
                  2. Enter your M-Pesa PIN on your phone
                  <br />
                  3. You'll receive tokens instantly
                </p>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleDeposit}
                disabled={!amount || status === 'initiating'}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {status === 'initiating' ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Initiating...
                  </>
                ) : (
                  <>Pay with M-Pesa</>
                )}
              </button>
            </>
          ) : status === 'waiting' ? (
            <div className="text-center py-8">
              <div className="bg-emerald-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="text-emerald-600 animate-pulse" size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Check Your Phone</h3>
              <p className="text-gray-600 mb-4">
                Enter your M-Pesa PIN to complete the payment
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="animate-spin" size={16} />
                Waiting for confirmation...
              </div>
            </div>
          ) : status === 'processing' ? (
            <div className="text-center py-8">
              <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="text-blue-600 animate-spin" size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h3>
              <p className="text-gray-600">
                Your payment was successful!
                <br />
                We're depositing tokens to your wallet...
              </p>
            </div>
          ) : status === 'success' ? (
            <div className="text-center py-8">
              <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-green-600" size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Deposit Successful!</h3>
              <p className="text-gray-600 mb-2">
                KES {amount} has been deposited to your wallet
              </p>
              {receiptNumber && (
                <p className="text-sm text-gray-500">
                  Receipt: {receiptNumber}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-600" size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => setStatus('idle')}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}