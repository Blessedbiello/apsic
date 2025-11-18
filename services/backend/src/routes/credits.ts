import { Router } from 'express';
import { CreditService } from '../services/creditService';

export function createCreditRoutes(creditService: CreditService): Router {
  const router = Router();

  /**
   * GET /api/credits/:wallet - Get credit balance
   */
  router.get('/:wallet', async (req, res, next) => {
    try {
      const { wallet } = req.params;
      const credits = await creditService.getCredits(wallet);
      res.json(credits);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/credits/add - Add credits (admin or purchase)
   */
  router.post('/add', async (req, res, next) => {
    try {
      const { wallet, amount, transaction_type } = req.body;

      if (!wallet || !amount) {
        return res.status(400).json({ error: 'Wallet and amount required' });
      }

      await creditService.addCredits(wallet, amount, transaction_type);
      res.json({ success: true, message: `Added ${amount} credits to ${wallet}` });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/credits/:wallet/history - Get transaction history
   */
  router.get('/:wallet/history', async (req, res, next) => {
    try {
      const { wallet } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const history = await creditService.getTransactionHistory(wallet, limit);
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
