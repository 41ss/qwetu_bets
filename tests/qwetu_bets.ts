import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { QwetuBets } from "../target/types/qwetu_bets";
import { assert } from "chai";

describe("qwetu_bets", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.QwetuBets as Program<QwetuBets>;
  
  // Test Wallets
  const admin = provider.wallet;
  const student = anchor.web3.Keypair.generate();

  // PDAs (Program Derived Addresses) - The specific storage accounts
  let marketPda: anchor.web3.PublicKey;
  let betPda: anchor.web3.PublicKey;

  const marketId = "market_01";

  it("Is initialized!", async () => {
    // 1. Calculate the address for the market
    [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(marketId)],
      program.programId
    );

    // 2. Call create_market
    await program.methods
      .createMarket(marketId)
      .accounts({
        market: marketPda,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Market Created at:", marketPda.toBase58());
  });

  it("Student places a bet", async () => {
    // Airdrop some fake SOL to the student so they can bet
    const airdropSig = await provider.connection.requestAirdrop(student.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(airdropSig);

    // Calculate the bet address
    [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), marketPda.toBuffer(), student.publicKey.toBuffer()],
      program.programId
    );

    // Place 1 SOL bet on YES (Vote = 1)
    await program.methods
      .placeBet(1, new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL))
      .accounts({
        market: marketPda,
        bet: betPda,
        user: student.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([student]) // Student must sign
      .rpc();

    console.log("✅ Bet Placed by Student");
  });

  it("Admin resolves the market", async () => {
    // Resolve to YES (Winner = 1)
    await program.methods
      .resolveMarket(1)
      .accounts({
        market: marketPda,
        admin: admin.publicKey,
      })
      .rpc();

    console.log("✅ Market Resolved: YES wins");
  });

  it("Student claims winnings", async () => {
    const balanceBefore = await provider.connection.getBalance(student.publicKey);
    
    await program.methods
      .claim()
      .accounts({
        market: marketPda,
        bet: betPda,
        user: student.publicKey,
      })
      .signers([student])
      .rpc();

    const balanceAfter = await provider.connection.getBalance(student.publicKey);
    console.log("✅ Winnings Claimed!");
    console.log("💰 Balance Before:", balanceBefore / anchor.web3.LAMPORTS_PER_SOL);
    console.log("💰 Balance After: ", balanceAfter / anchor.web3.LAMPORTS_PER_SOL);
    
    // Since they were the only bettor, they should get their 1 SOL back (minus tiny gas fees)
    assert.isAbove(balanceAfter, balanceBefore);
  });
});
