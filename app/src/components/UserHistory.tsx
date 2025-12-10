import { useState } from "react";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { getProvider } from "../utils/anchor-helper";
import IDL from "../utils/idl.json";

// For the hackathon, we can pass bet data as props or fetch from Supabase
// This is a simplified view of a single bet row
interface BetRowProps {
  marketId: string;
  marketQuestion: string;
  amount: number;
  vote: number; // 1=Yes, 2=No
  claimed: boolean;
  isResolved: boolean;
  winner: number;
  keypair: Keypair;
  connection: Connection;
  programId: PublicKey;
  onClaimSuccess: () => void;
}

export default function BetRow({
  marketId,
  marketQuestion,
  amount,
  vote,
  claimed,
  isResolved,
  winner,
  keypair,
  connection,
  programId,
  onClaimSuccess
}: BetRowProps) {
  const [claiming, setClaiming] = useState(false);

  const isWinner = isResolved && vote === winner;
  const canClaim = isWinner && !claimed;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const provider = getProvider(keypair, connection);
      const program = new Program(IDL as any, provider);

      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(marketId)],
        programId
      );

      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), marketPda.toBuffer(), keypair.publicKey.toBuffer()],
        programId
      );

      await program.methods
        .claim()
        .accounts({
          market: marketPda,
          bet: betPda,
          user: keypair.publicKey,
          admin: keypair.publicKey, // Note: IDL might expect admin, check logic if admin is needed for fees
        })
        .signers([keypair])
        .rpc();

      alert("Winnings Claimed! 🎉");
      onClaimSuccess();
    } catch (err) {
      console.error(err);
      alert("Claim failed.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="font-medium text-sm text-gray-800">{marketQuestion}</div>
        <div className="text-xs text-gray-500">
          Bet: {amount} SOL on <span className={vote === 1 ? "text-green-600" : "text-red-600"}>{vote === 1 ? "YES" : "NO"}</span>
        </div>
      </div>
      
      <div>
        {!isResolved && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Pending</span>
        )}
        {isResolved && !isWinner && (
          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Lost</span>
        )}
        {canClaim && (
          <button 
            onClick={handleClaim}
            disabled={claiming}
            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded font-bold shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            {claiming ? "..." : "CLAIM"}
          </button>
        )}
        {isWinner && claimed && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">Won & Claimed</span>
        )}
      </div>
    </div>
  );
}