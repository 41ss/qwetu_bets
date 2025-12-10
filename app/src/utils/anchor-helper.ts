import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";

// FIX: Define our own Wallet class since the import is broken
export class SimpleWallet {
  constructor(readonly payer: Keypair) {}

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof Transaction) {
      tx.partialSign(this.payer);
    } else {
      // Handle VersionedTransactions if necessary
      tx.sign([this.payer]);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return txs.map((t) => {
      if (t instanceof Transaction) {
        t.partialSign(this.payer);
      } else {
        t.sign([this.payer]);
      }
      return t;
    });
  }
}

// This creates a Provider using your local "Invisible Wallet" keypair
export const getProvider = (keypair: Keypair, connection: Connection) => {
  const wallet = new SimpleWallet(keypair);
  return new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
};