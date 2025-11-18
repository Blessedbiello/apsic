import { PrismaClient } from '@prisma/client';
import { SolanaClient } from '../lib/solanaClient';

const prisma = new PrismaClient();

export class CreditService {
  constructor(private solana: SolanaClient) {}

  /**
   * Get credits for wallet
   */
  async getCredits(walletAddress: string): Promise<{
    credits: number;
    priority_tier: string;
    staked: boolean;
  }> {
    // Get from Solana (or mock)
    const credits = await this.solana.getCredits(walletAddress);
    const priority_tier = this.solana.getPriorityTier(credits);

    // Check if user exists in DB
    const user = await prisma.user.findUnique({
      where: { wallet_address: walletAddress },
    });

    return {
      credits,
      priority_tier,
      staked: user?.staked || false,
    };
  }

  /**
   * Add credits to wallet (admin function or purchase)
   */
  async addCredits(
    walletAddress: string,
    amount: number,
    transactionType: string = 'purchase'
  ): Promise<void> {
    // Update mock credits
    const current = await this.solana.getCredits(walletAddress);
    this.solana.setMockCredits(walletAddress, current + amount);

    // Update or create user
    await prisma.user.upsert({
      where: { wallet_address: walletAddress },
      create: {
        wallet_address: walletAddress,
        credits: current + amount,
      },
      update: {
        credits: current + amount,
      },
    });

    // Log transaction
    await prisma.creditLedger.create({
      data: {
        wallet_address: walletAddress,
        amount,
        transaction_type: transactionType,
      },
    });
  }

  /**
   * Decrement credits after incident processing
   */
  async decrementCredits(
    walletAddress: string,
    amount: number,
    incidentId: string
  ): Promise<boolean> {
    const success = this.solana.decrementMockCredits(walletAddress, amount);

    if (success) {
      await prisma.creditLedger.create({
        data: {
          wallet_address: walletAddress,
          amount: -amount,
          transaction_type: 'incident_processing',
          incident_id: incidentId,
        },
      });

      // Update user credits
      await prisma.user.updateMany({
        where: { wallet_address: walletAddress },
        data: {
          credits: {
            decrement: amount,
          },
        },
      });
    }

    return success;
  }

  /**
   * Get credit transaction history
   */
  async getTransactionHistory(walletAddress: string, limit: number = 20): Promise<any[]> {
    return prisma.creditLedger.findMany({
      where: { wallet_address: walletAddress },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
