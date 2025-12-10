import { useState } from "react";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { getProvider } from "../utils/anchor-helper";
import IDL from "../utils/idl.json";

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;
  vote: number; // 1 = YES, 2 = NO
  keypair: Keypair | null;
  connection: Connection;
  programId: PublicKey;
  onSuccess: () => void;
}

export default function BetModal({
  isOpen,
  onClose,
  marketId,
  vote,
  keypair,
  connection,
  programId,
  onSuccess
}: BetModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handlePlaceBet = async () => {
    if (!keypair || !amount) return;
    setLoading(true);
    setError("");

    try {
      // 1. Setup Anchor Provider with Local Keypair
      const provider = getProvider(keypair, connection);
      const program = new Program(IDL as any, provider);

      // 2. Derive PDAs (Program Derived Addresses)
      // Market PDA: [b"market", marketId]
      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(marketId)],
        programId
      );

      // Bet PDA: [b"bet", marketPda, user]
      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), marketPda.toBuffer(), keypair.publicKey.toBuffer()],
        programId
      );

      // 3. Send Transaction
      const lamports = parseFloat(amount) * 1_000_000_000; // Convert SOL to Lamports
      
      await program.methods
        .placeBet(vote, new BN(lamports))
        .accounts({
          market: marketPda,
          bet: betPda,
          user: keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([keypair]) // Sign with local keypair
        .rpc();

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Bet failed. Check balance or try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold mb-4">
          Betting on <span className={vote === 1 ? "text-green-600" : "text-red-600"}>
            {vote === 1 ? "YES" : "NO"}
          </span>
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (SOL)
          </label>
          <div className="flex gap-2 mb-2">
            {[0.05, 0.1, 0.5].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className="bg-gray-100 hover:bg-gray-200 text-xs py-1 px-3 rounded-full transition-colors"
              >
                {val} SOL
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg"
            placeholder="0.00"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePlaceBet}
            disabled={loading || !amount}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              "Place Bet"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}