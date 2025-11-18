import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export class SolanaClient {
  private connection: Connection;
  private sicMint?: PublicKey;

  constructor(rpcUrl: string, sicTokenMint?: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    if (sicTokenMint) {
      this.sicMint = new PublicKey(sicTokenMint);
    }
  }

  /**
   * Get SIC token balance for wallet
   */
  async getCredits(walletAddress: string): Promise<number> {
    if (!this.sicMint) {
      console.log('SIC token mint not configured, using mock credits');
      return this.getMockCredits(walletAddress);
    }

    try {
      const walletPubkey = new PublicKey(walletAddress);
      const tokenAccount = await getAssociatedTokenAddress(
        this.sicMint,
        walletPubkey
      );

      const account = await getAccount(this.connection, tokenAccount);
      return Number(account.amount);
    } catch (error: any) {
      console.log('Token account not found or error:', error.message);
      return 0;
    }
  }

  /**
   * Mock credits for demo/testing
   */
  private mockCreditsMap = new Map<string, number>();

  private getMockCredits(walletAddress: string): number {
    if (!this.mockCreditsMap.has(walletAddress)) {
      // New wallets get 10 free credits for demo
      this.mockCreditsMap.set(walletAddress, 10);
    }
    return this.mockCreditsMap.get(walletAddress) || 0;
  }

  /**
   * Set mock credits (for testing)
   */
  setMockCredits(walletAddress: string, amount: number): void {
    this.mockCreditsMap.set(walletAddress, amount);
  }

  /**
   * Decrement mock credits
   */
  decrementMockCredits(walletAddress: string, amount: number): boolean {
    const current = this.getMockCredits(walletAddress);
    if (current < amount) {
      return false;
    }
    this.mockCreditsMap.set(walletAddress, current - amount);
    return true;
  }

  /**
   * Verify wallet signature
   */
  async verifyWalletSignature(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);

      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      return verified;
    } catch (error: any) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Get SOL balance
   */
  async getSolBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error: any) {
      console.error('Get SOL balance error:', error);
      return 0;
    }
  }

  /**
   * Check if wallet is valid
   */
  isValidWalletAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get priority tier based on credit balance
   */
  getPriorityTier(credits: number): string {
    if (credits >= 1000) return 'enterprise';
    if (credits >= 100) return 'premium';
    return 'standard';
  }

  /**
   * Request airdrop (Devnet only)
   */
  async requestAirdrop(walletAddress: string, amount: number = 1): Promise<string> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );

      await this.connection.confirmTransaction(signature);
      return signature;
    } catch (error: any) {
      console.error('Airdrop error:', error);
      throw error;
    }
  }
}
