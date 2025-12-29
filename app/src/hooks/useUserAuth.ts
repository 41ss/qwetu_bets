import { useState, useEffect } from 'react';
import { Keypair, Connection, clusterApiUrl } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js'; // Import Supabase
import bs58 from 'bs58';

// --- HELPER CONFIGURATION ---
const CONNECTION = new Connection(clusterApiUrl('devnet'), 'confirmed');
const STORAGE_KEY = 'qwetu_wallet';
const USER_KEY = 'qwetu_user';

const mapUser = (dbUser: any): User => {
  return {
    id: dbUser.id,
    phoneNumber: dbUser.phone_number, // The fix!
    walletAddress: dbUser.wallet_address,
    displayName: dbUser.display_name,
    totalDepositsKes: dbUser.total_deposits_kes || 0,
    totalBetsPlaced: dbUser.total_bets_placed || 0,
  };
};


// Helper to update wallet in Supabase (resetting the account)
async function updateUserWallet(userId: string, newWallet: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await supabase
    .from('users')
    .update({ wallet_address: newWallet })
    .eq('id', userId);
}

// --- TYPES ---
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

// --- ENCRYPTION HELPERS ---
function encryptKeypair(keypair: Keypair, phoneNumber: string): string {
  const secretKey = Array.from(keypair.secretKey);
  const phoneBytes = Buffer.from(phoneNumber);
  const encrypted = secretKey.map((byte, i) => byte ^ phoneBytes[i % phoneBytes.length]);
  return bs58.encode(Buffer.from(encrypted));
}

function decryptKeypair(encrypted: string, phoneNumber: string): Keypair {
  const encryptedBytes = bs58.decode(encrypted);
  const phoneBytes = Buffer.from(phoneNumber);
  const secretKey = Array.from(encryptedBytes).map((byte, i) => byte ^ phoneBytes[i % phoneBytes.length]);
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

// --- MAIN HOOK ---
export function useUserAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    keypair: null,
    error: null,
  });

  // 1. Check for existing session on mount
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

        setState({ isLoading: false, isAuthenticated: false, user: null, keypair: null, error: null });
      } catch (error) {
        console.error('Session check failed:', error);
        setState({ isLoading: false, isAuthenticated: false, user: null, keypair: null, error: 'Session expired.' });
      }
    };

    checkExistingSession();
  }, []);

  // 2. Login or Signup Logic
  const authenticate = async (phoneNumber: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const cleanPhone = phoneNumber.replace(/[\s\-+]/g, '');
      const normalizedPhone = cleanPhone.startsWith('0') ? `+254${cleanPhone.slice(1)}` : `+${cleanPhone}`;

      // Check User API
      const checkResponse = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhone }),
      });
      const checkData = await checkResponse.json();

      let user: User;
      let keypair: Keypair;

      if (checkData.exists) {
        // === EXISTING USER RECOVERY FLOW ===
        user = mapUser(checkData.user);
        const storedWallet = localStorage.getItem(STORAGE_KEY);

        if (storedWallet) {
          try {
            keypair = decryptKeypair(storedWallet, normalizedPhone);
          } catch {
             // Decryption failed? Recover wallet
             console.warn("Wallet lost/corrupted. Generating new hackathon wallet...");
             keypair = Keypair.generate();
             await updateUserWallet(user.id, keypair.publicKey.toString());
             user.walletAddress = keypair.publicKey.toString();
          }
        } else {
          // No wallet found on device? Recover wallet
          console.log("New device detected. Generating new hackathon wallet...");
          keypair = Keypair.generate();
          await updateUserWallet(user.id, keypair.publicKey.toString());
          user.walletAddress = keypair.publicKey.toString();
        }

      } else {
        // === NEW USER REGISTRATION ===
        keypair = Keypair.generate();
        const createResponse = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: normalizedPhone,
            walletAddress: keypair.publicKey.toString(),
          }),
        });

        if (!createResponse.ok) throw new Error('Failed to create user');
        const createData = await createResponse.json();
        user = mapUser(createData.user);
      }

      // Save Session
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
      const msg = error instanceof Error ? error.message : 'Authentication failed';
      setState(prev => ({ ...prev, isLoading: false, error: msg }));
      return false;
    }
  };

  // 3. Logout (Keeps Keypair safe)
  const logout = () => {
    localStorage.removeItem(USER_KEY); // Only clear user data, NOT the wallet key
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      keypair: state.keypair, // Keep keypair in memory
      error: null,
    });
  };

  // 4. Refresh User
  const refreshUser = async () => {
    if (!state.user) return;
    try {
      // Re-fetch user stats from Supabase to show updated deposits/bets
      // Note: This needs a GET endpoint, or you can use the check-user POST logic again
    } catch (error) {
      console.error(error);
    }
  };

  // 5. Get Balance (Client Side)
  // MOVED INSIDE THE HOOK SO IT CAN SEE 'state'
  const getBalance = async (): Promise<number> => {
    if (!state.keypair) return 0;

    try {
      const lamports = await CONNECTION.getBalance(state.keypair.publicKey);
      return lamports / 1_000_000_000; // Correct division for SOL (1e9)
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