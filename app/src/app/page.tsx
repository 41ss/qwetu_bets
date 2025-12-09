"use client";

import { useState, useEffect } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import idl from "../utils/idl.json";

// --- CONFIGURATION ---
const PROGRAM_ID = new web3.PublicKey("FgzZbmGBW7y749xrgMWETpwH5DHBYhWmoed5jrvmGE5b"); 

export default function Home() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  
  // State
  const [balance, setBalance] = useState(0);
  const [marketId, setMarketId] = useState("market_01");
  const [betAmount, setBetAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Helper: Get the Program Object
  const getProgram = () => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {});
    // @ts-ignore
    return new Program(idl as any, provider);
  };

  // 1. Simulate M-Pesa Deposit (Demo Mode)
  const handleMpesaDeposit = async () => {
    if (!wallet) return alert("Connect Wallet first!");
    setIsLoading(true);
    setStatus("Initiating STK Push...");

    // Fake delay for realism
    setTimeout(() => {
      setStatus("Payment Received! Airdropping SOL...");
      
      // --- DEMO MODE ON: Just pretend we got money ---
      // Instead of asking the blockchain (which fails), we just update the UI.
      alert("Success! 1 SOL deposited via M-Pesa Simulation.");
      setBalance(balance + 1); // Manually add 1 SOL to the display
      
      setIsLoading(false);
      setStatus("");
    }, 2000);
  };

  // 2. Place Bet
  const placeBet = async (vote: number) => {
    if (!wallet || !betAmount) return;
    const program = getProgram();
    if (!program) return;

    try {
      setIsLoading(true);
      setStatus(`Betting on ${vote === 1 ? "YES" : "NO"}...`);

      // Calculate Addresses (PDA)
      const [marketPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(marketId)],
        PROGRAM_ID
      );

      const [betPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), marketPda.toBuffer(), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Call Smart Contract
      await program.methods
        .placeBet(vote, new BN(parseFloat(betAmount) * web3.LAMPORTS_PER_SOL))
        .accounts({
          market: marketPda,
          bet: betPda,
          user: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      alert("Bet Placed Successfully!");
      updateBalance();
    } catch (e) {
      console.error(e);
      alert("Error placing bet. (Did the Admin create the market yet?)");
    }
    setIsLoading(false);
    setStatus("");
  };

  const updateBalance = async () => {
    if (wallet) {
      const val = await connection.getBalance(wallet.publicKey);
      setBalance(val / web3.LAMPORTS_PER_SOL);
    }
  };

  useEffect(() => {
    updateBalance();
  }, [wallet]);

  return (
    <main className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      {/* HEADER */}
      <nav className="bg-green-600 p-4 text-white flex justify-between items-center shadow-md">
        <h1 className="text-2xl font-bold tracking-tight">Qwetu Bets 🇰🇪</h1>
        <WalletMultiButton style={{ backgroundColor: "#15803d" }} />
      </nav>

      <div className="max-w-md mx-auto mt-8 p-4">
        {/* BALANCE CARD */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-t-4 border-green-500">
          <p className="text-sm text-gray-500 uppercase font-semibold">Wallet Balance</p>
          <h2 className="text-4xl font-bold text-gray-900">{balance.toFixed(2)} SOL</h2>
          
          <button
            onClick={handleMpesaDeposit}
            disabled={isLoading}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center transition-all"
          >
            {isLoading ? "Processing..." : "Deposit with M-Pesa"}
          </button>
          {status && <p className="text-center text-sm mt-2 text-green-600 animate-pulse">{status}</p>}
        </div>

        {/* MARKET CARD */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold">Will Cleanshelf have chapati tomorrow?</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">Live</span>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bet Amount (SOL)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              placeholder="0.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => placeBet(1)}
              className="bg-green-100 hover:bg-green-200 text-green-800 font-bold py-4 rounded-lg border border-green-300 transition-colors"
            >
              YES
            </button>
            <button
              onClick={() => placeBet(2)}
              className="bg-red-100 hover:bg-red-200 text-red-800 font-bold py-4 rounded-lg border border-red-300 transition-colors"
            >
              NO
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}