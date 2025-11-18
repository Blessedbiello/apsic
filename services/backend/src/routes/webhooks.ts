import { Router } from 'express';

export function createWebhookRoutes(): Router {
  const router = Router();

  /**
   * POST /api/webhooks/opus-callback - Opus workflow callback
   */
  router.post('/opus-callback', async (req, res, next) => {
    try {
      const { job_id, status, result } = req.body;

      console.log('[OPUS CALLBACK]', { job_id, status });

      if (status === 'completed') {
        // Process the audit log from Opus
        const auditLog = result?.audit_log_json;

        if (auditLog) {
          // TODO: Update incident with Opus results
          console.log('Opus workflow completed successfully');
        }
      } else if (status === 'failed') {
        console.error('Opus workflow failed:', result);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/webhooks/health - Health check endpoint
   */
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'APSIC Backend API',
    });
  });

  return router;
}
