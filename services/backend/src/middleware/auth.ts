import { Request, Response, NextFunction } from 'express';
import { SolanaClient } from '../lib/solanaClient';

const solanaClient = new SolanaClient(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
);

/**
 * Authenticate wallet via signature verification
 */
export const authenticateWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { wallet, signature, message } = req.body;

    if (!wallet) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    // For demo purposes, skip signature verification if no signature provided
    if (!signature || !message) {
      console.log('[AUTH] Skipping signature verification for demo');
      (req as any).wallet = wallet;
      return next();
    }

    // Verify signature
    const verified = await solanaClient.verifyWalletSignature(wallet, message, signature);

    if (!verified) {
      return res.status(401).json({ error: 'Invalid wallet signature' });
    }

    (req as any).wallet = wallet;
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional wallet authentication (doesn't block if auth fails)
 */
export const optionalWalletAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { wallet } = req.query;

  if (wallet && typeof wallet === 'string') {
    (req as any).wallet = wallet;
  }

  next();
};
