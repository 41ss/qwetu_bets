
import { useState, useEffect } from 'react';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

interface User {
  id: string;
  phoneNumber: string;
  walletAddress: string;
  displayName: string | null;
  totalDepositsKes: number;
  totalBetsPlaced: number;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  keypair: Keypair | null;
  error: string | null;
}

const STORAGE_KEY = 'qwetu_wallet';
const USER_KEY = 'qwetu_user';

/**
 * Encrypts keypair using simple XOR with phone number
 * WARNING: This is NOT production-grade encryption!
 * For production, use Web Crypto API or a proper key management solution
 */
function encryptKeypair(keypair: Keypair, phoneNumber: string): string {
  const secretKey = Array.from(keypair.secretKey);
  const phoneBytes = Buffer.from(phoneNumber);
  
  // Simple XOR encryption (NOT secure for production!)
  const encrypted = secretKey.map((byte, i) => {
    return byte ^ phoneBytes[i % phoneBytes.length];
  });
  
  return bs58.encode(Buffer.from(encrypted));
}

function decryptKeypair(encrypted: string, phoneNumber: string): Keypair {
  const encryptedBytes = bs58.decode(encrypted);
  const phoneBytes = Buffer.from(phoneNumber);
  
  // XOR decryption
  const secretKey = Array.from(encryptedBytes).map((byte, i) => {
    return byte ^ phoneBytes[i % phoneBytes.length];
  });
  
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export function useUserAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    keypair: null,
    error: null,
  });

  /**
   * Check for existing session on mount
   */
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const storedUser = localStorage.getItem(USER_KEY);
        const storedWallet = localStorage.getItem(STORAGE_KEY);

        if (storedUser && storedWallet) {
          const user: User = JSON.parse(storedUser);
          const keypair = decryptKeypair(storedWallet, user.phoneNumber);

          // Verify wallet address matches
          if (keypair.publicKey.toString() === user.walletAddress) {
            setState({
              isLoading: false,
              isAuthenticated: true,
              user,
              keypair,
              error: null,
            });
            return;
          }
        }

        // No valid session found
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          keypair: null,
          error: null,
        });
      } catch (error) {
        console.error('Session check failed:', error);
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          keypair: null,
          error: 'Session expired. Please login again.',
        });
      }
    };

    checkExistingSession();
  }, []);

  /**
   * Login or signup with phone number
   */
  const authenticate = async (phoneNumber: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Validate phone format (Kenyan numbers)
      const cleanPhone = phoneNumber.replace(/[\s\-+]/g, '');
      if (!cleanPhone.match(/^(254|0)[17]\d{8}$/)) {
        throw new Error('Invalid Kenyan phone number. Use format: 0712345678 or 254712345678');
      }

      // Normalize to +254 format
      const normalizedPhone = cleanPhone.startsWith('0') 
        ? `+254${cleanPhone.slice(1)}` 
        : cleanPhone.startsWith('254')
        ? `+${cleanPhone}`
        : `+${cleanPhone}`;

      // Check if user exists
      const checkResponse = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhone }),
      });

      const checkData = await checkResponse.json();

      let user: User;
      let keypair: Keypair;

      if (checkData.exists) {
        // Existing user - retrieve stored keypair
        user = checkData.user;
        
        // Try to decrypt existing keypair
        const storedWallet = localStorage.getItem(STORAGE_KEY);
        if (storedWallet) {
          try {
            keypair = decryptKeypair(storedWallet, normalizedPhone);
            
            // Verify it matches the stored wallet address
            if (keypair.publicKey.toString() !== user.walletAddress) {
              throw new Error('Keypair mismatch - generating new one');
            }
          } catch {
            // If decryption fails, user needs to restore wallet or create new account
            throw new Error('Could not restore wallet. Please contact support or create a new account.');
          }
        } else {
          throw new Error('Wallet not found on this device. Please login from your original device.');
        }
      } else {
        // New user - generate fresh keypair
        keypair = Keypair.generate();
        
        // Create user account
        const createResponse = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: normalizedPhone,
            walletAddress: keypair.publicKey.toString(),
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create user account');
        }

        const createData = await createResponse.json();
        user = createData.user;
      }

      // Store encrypted keypair and user data
      const encryptedWallet = encryptKeypair(keypair, normalizedPhone);
      localStorage.setItem(STORAGE_KEY, encryptedWallet);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      setState({
        isLoading: false,
        isAuthenticated: true,
        user,
        keypair,
        error: null,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return false;
    }
  };

  /**
   * Logout - clear all local data
   */
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      keypair: null,
      error: null,
    });
  };

  /**
   * Refresh user data from server
   */
  const refreshUser = async () => {
    if (!state.user) return;

    try {
      const response = await fetch(`/api/users/${state.user.id}`);
      const data = await response.json();
      
      if (data.user) {
        const updatedUser = data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        setState(prev => ({ ...prev, user: updatedUser }));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  /**
   * Get wallet balance from Solana network
   */
  const getBalance = async (): Promise<number> => {
    if (!state.keypair) return 0;

    try {
      const response = await fetch(`/api/wallet/balance?address=${state.keypair.publicKey.toString()}`);
      const data = await response.json();
      return data.balance || 0;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return 0;
    }
  };

  return {
    ...state,
    authenticate,
    logout,
    refreshUser,
    getBalance,
  };
}