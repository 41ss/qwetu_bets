import React, { useState } from 'react';
import { Smartphone, Loader2, TrendingUp, Shield, Zap } from 'lucide-react';

interface LoginScreenProps {
  onAuthenticate: (phoneNumber: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export default function LoginScreen({ onAuthenticate, isLoading, error }: LoginScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [localError, setLocalError] = useState('');

  const handlePhoneChange = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/[^0-9]/g, '');
    
    // Format as we type (0712 345 678)
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`;
    }
    
    setPhoneNumber(formatted);
    setLocalError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleaned = phoneNumber.replace(/\s/g, '');
    
    // Validation
    if (!cleaned) {
      setLocalError('Phone number is required');
      return;
    }

    if (!cleaned.match(/^(254|0)[17]\d{8}$/)) {
      setLocalError('Invalid phone number. Use format: 0712345678');
      return;
    }

    await onAuthenticate(cleaned);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <TrendingUp className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Qwetu Bets
          </h1>
          <p className="text-gray-600">
            Predict campus events. Win real money.
          </p>
        </div>

        {/* Features */}
        <div className="bg-white/60 backdrop-blur rounded-2xl p-6 mb-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
              <Smartphone className="text-emerald-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Pay with M-Pesa</h3>
              <p className="text-sm text-gray-600">Deposit and withdraw using your phone</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-teal-100 p-2 rounded-lg flex-shrink-0">
              <Zap className="text-teal-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Instant Payouts</h3>
              <p className="text-sm text-gray-600">Win bets and claim rewards instantly</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-cyan-100 p-2 rounded-lg flex-shrink-0">
              <Shield className="text-cyan-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Blockchain Secure</h3>
              <p className="text-sm text-gray-600">Powered by Solana for transparency</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h2>
          <p className="text-gray-600 mb-6">
            Enter your phone number to login or create an account
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black font-medium">
                  +254
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="712 345 678"
                  className="w-full pl-20 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition text-black"
                  disabled={isLoading}
                  maxLength={12}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Safaricom, Airtel, or Telkom number
              </p>
            </div>

            {/* Error Message */}
            {(error || localError) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error || localError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !phoneNumber}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Authenticating...
                </>
              ) : (
                <>Continue</>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          2026 All Rights Reserved
        </p>
      </div>
    </div>
  );
}